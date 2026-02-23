from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List, Optional, Union
from datetime import datetime
from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_MakePoint, ST_SetSRID

from app.core.database import get_db
from app.schemas.room import Room, RoomCreate, RoomUpdate, RoomWithDistance, RoomPublic, RoomPrivate, RoomStatusUpdate, GameType, GameFormat
from app.models.room import Room as RoomModel, RoomStatus
from app.models.room_member import RoomMember as RoomMemberModel, RoomMemberStatus
from app.models.user import User
from app.utils.auth import get_current_user
from app.utils.location import generate_public_location, create_postgis_point_wkt
from app.utils.location_security import (
    fuzz_distance,
    log_private_location_access,
    verify_room_membership,
    clamp_minimum_distance,
    sanitize_error_message
)

router = APIRouter()

MAX_RADIUS_METERS = 100000
DEFAULT_RADIUS_METERS = 10000
MAX_RESULTS = 50
DEFAULT_LIMIT = 20


def _room_base_dict(room) -> dict:
    """Extract common room fields into a dict for response construction."""
    return {
        "id": room.id,
        "name": room.name,
        "description": room.description,
        "address": room.address,
        "buy_in_info": room.buy_in_info,
        "max_players": room.max_players,
        "skill_level": room.skill_level,
        "game_type": room.game_type,
        "game_format": room.game_format,
        "blind_structure": room.blind_structure,
        "house_rules": room.house_rules,
        "host_id": room.host_id,
        "status": room.status,
        "scheduled_at": room.scheduled_at,
        "is_active": room.is_active,
        "created_at": room.created_at,
        "updated_at": room.updated_at,
        "finished_at": room.finished_at,
    }


def _extract_public_coords(db, room) -> tuple[float | None, float | None]:
    """Extract public lat/lon from a PostGIS geography column."""
    if not room.public_location:
        return None, None
    row = db.execute(
        text("SELECT ST_X(public_location::geometry), ST_Y(public_location::geometry) FROM rooms WHERE id = :id"),
        {"id": room.id},
    ).fetchone()
    if row:
        return float(row[1]), float(row[0])
    return None, None


@router.post("/", response_model=RoomPublic, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_data: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new room.
    
    - Exact location is stored privately (only shown to approved members)
    - Public/approximate location is generated automatically (shown to everyone)
    """
    room = RoomModel(
        name=room_data.name,
        description=room_data.description,
        address=room_data.address,
        buy_in_info=room_data.buy_in_info,
        max_players=room_data.max_players,
        skill_level=room_data.skill_level,
        scheduled_at=room_data.scheduled_at,
        game_type=room_data.game_type,
        game_format=room_data.game_format,
        blind_structure=room_data.blind_structure,
        house_rules=room_data.house_rules,
        host_id=current_user.id,
        is_active=True
    )
    
    if room_data.latitude is not None and room_data.longitude is not None:
        lat = float(room_data.latitude)
        lon = float(room_data.longitude)
        
        location_wkt = create_postgis_point_wkt(lon, lat)
        room.location = location_wkt
        
        public_lat, public_lon = generate_public_location(lat, lon)
        public_location_wkt = create_postgis_point_wkt(public_lon, public_lat)
        room.public_location = public_location_wkt
    
    db.add(room)
    db.commit()
    db.refresh(room)
    
    pub_lat, pub_lon = _extract_public_coords(db, room)
    response = {**_room_base_dict(room), "public_latitude": pub_lat, "public_longitude": pub_lon}
    
    return RoomPublic(**response)


@router.get("/my-rooms", response_model=List[RoomPublic])
async def get_my_rooms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all rooms the current user is hosting or is an active member of.
    
    Returns rooms where:
    - User is the host, OR
    - User is an active member (approved status)
    
    Includes both past and upcoming games.
    """
    from sqlalchemy import or_
    
    # Get room IDs where user is an active member
    member_room_ids = db.query(RoomMemberModel.room_id).filter(
        RoomMemberModel.user_id == current_user.id,
        RoomMemberModel.status == RoomMemberStatus.ACTIVE
    ).subquery()
    
    # Query rooms where user is host OR active member
    rooms = db.query(RoomModel).filter(
        or_(
            RoomModel.host_id == current_user.id,
            RoomModel.id.in_(member_room_ids)
        )
    ).order_by(RoomModel.created_at.desc()).all()
    
    result = []
    for room in rooms:
        pub_lat, pub_lon = _extract_public_coords(db, room)
        room_data = {
            **_room_base_dict(room),
            "public_latitude": pub_lat,
            "public_longitude": pub_lon,
            "is_host": room.host_id == current_user.id,
        }
        result.append(RoomPublic(**room_data))
    
    return result


@router.get("/", response_model=List[RoomWithDistance])
async def list_rooms(
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="User's latitude"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="User's longitude"),
    address: Optional[str] = Query(None, min_length=2, max_length=200, description="Address to search (geocoded to coordinates)"),
    radius: Optional[float] = Query(None, gt=0, description="Search radius in meters"),
    skip: int = Query(0, ge=0, description="Number of results to skip"),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_RESULTS, description="Maximum results to return"),
    db: Session = Depends(get_db)
):
    """
    List active rooms with optional geospatial filtering.
    
    Location can be provided via:
    - latitude/longitude coordinates (preferred, faster)
    - address string (city, zipcode, or full address - will be geocoded)
    
    - Queries using REAL location for accurate nearby results
    - Returns PUBLIC/APPROXIMATE location in response (exact location hidden until approved)
    - Radius is capped at 100km (100,000 meters)
    - Results are capped at 50 per page
    """
    from app.utils.geocoding import geocode_address
    
    # Cap the limit
    limit = min(limit, MAX_RESULTS)
    
    # If address is provided but no coordinates, geocode the address
    if address and latitude is None and longitude is None:
        coords = geocode_address(address)
        if coords:
            latitude, longitude = coords
            print(f"Geocoded '{address}' -> lat={latitude}, lon={longitude}")
        else:
            # Could not geocode address - return empty results or raise error
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not find location for address: {address}"
            )
    
    # Base query for active rooms
    query = db.query(RoomModel).filter(RoomModel.is_active == True)
    
    # If location parameters are provided, apply geospatial filtering
    if latitude is not None and longitude is not None:
        # Cap radius at maximum, use default if not provided
        if radius is None:
            radius = DEFAULT_RADIUS_METERS
        else:
            radius = min(radius, MAX_RADIUS_METERS)
        
        # Create a point from user's coordinates
        # PostGIS uses (longitude, latitude) order for POINT
        user_point = func.ST_SetSRID(
            func.ST_MakePoint(longitude, latitude),
            4326
        )
        
        # Cast to geography for accurate distance calculations in meters
        user_geography = func.ST_GeogFromWKB(func.ST_AsBinary(user_point))
        
        # SECURITY: Calculate distance using PUBLIC location to prevent triangulation attacks
        # Using real location for distance would allow attackers to triangulate exact position
        # by making queries from multiple known positions
        distance_expr = func.ST_Distance(
            RoomModel.public_location,  # Use PUBLIC location to prevent triangulation
            user_geography
        ).label('distance_meters')
        
        # SECURITY: Filter using REAL location for accurate results
        # (filtering doesn't leak exact position, only inclusion/exclusion)
        # But distance calculation uses public_location
        rooms_with_distance = db.query(
            RoomModel,
            distance_expr
        ).filter(
            RoomModel.is_active == True,
            RoomModel.location.isnot(None),  # Filter on real location for accuracy
            RoomModel.public_location.isnot(None),  # Must have public location too
            func.ST_DWithin(
                RoomModel.location,  # Use real location for filtering
                user_geography,
                radius
            )
        ).order_by(
            distance_expr
        ).offset(skip).limit(limit).all()
        
        result = []
        for room, distance in rooms_with_distance:
            safe_distance = None
            if distance is not None:
                safe_distance = fuzz_distance(clamp_minimum_distance(distance))
            
            pub_lat, pub_lon = _extract_public_coords(db, room)
            room_dict = {
                **_room_base_dict(room),
                "public_latitude": pub_lat,
                "public_longitude": pub_lon,
                "distance_meters": safe_distance,
            }
            result.append(RoomWithDistance(**room_dict))
        
        return result
    
    else:
        rooms = query.offset(skip).limit(limit).all()
        
        result = []
        for room in rooms:
            pub_lat, pub_lon = _extract_public_coords(db, room)
            room_dict = {
                **_room_base_dict(room),
                "public_latitude": pub_lat,
                "public_longitude": pub_lon,
                "distance_meters": None,
            }
            result.append(RoomWithDistance(**room_dict))
        
        return result


@router.get("/{room_id}", response_model=RoomPublic)
async def get_room(room_id: int, db: Session = Depends(get_db)):
    """
    Get room by ID.
    Returns PUBLIC location only (approximate).
    Use /{room_id}/private for exact location (members only).
    """
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    pub_lat, pub_lon = _extract_public_coords(db, room)
    response = {**_room_base_dict(room), "public_latitude": pub_lat, "public_longitude": pub_lon}
    
    return RoomPublic(**response)


@router.get("/{room_id}/private", response_model=RoomPrivate)
async def get_room_private(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get room with EXACT location (members only).
    
    SECURITY: This endpoint is protected and audited.
    
    Only accessible by:
    - Room host
    - Approved room members (active status)
    
    Returns the real address and exact coordinates after user is approved.
    All access attempts are logged for security auditing.
    """
    # SECURITY: Verify membership and log the access attempt
    is_authorized, reason = verify_room_membership(db, current_user.id, room_id)
    
    # Log all access attempts (both granted and denied)
    log_private_location_access(
        user_id=current_user.id,
        room_id=room_id,
        access_granted=is_authorized,
        reason=reason
    )
    
    if not is_authorized:
        # SECURITY: Use generic error message to avoid leaking room existence
        if reason == "room_not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        elif reason == "room_inactive":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found or inactive"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be an approved member to view the exact location"
            )
    
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    
    pub_lat, pub_lon = _extract_public_coords(db, room)
    response = {
        **_room_base_dict(room),
        "latitude": None,
        "longitude": None,
        "public_latitude": pub_lat,
        "public_longitude": pub_lon,
    }
    
    if room.location:
        point_text = db.execute(
            text("SELECT ST_X(location::geometry), ST_Y(location::geometry) FROM rooms WHERE id = :id"),
            {"id": room.id},
        ).fetchone()
        if point_text:
            response["longitude"] = float(point_text[0])
            response["latitude"] = float(point_text[1])
    
    return RoomPrivate(**response)


@router.put("/{room_id}", response_model=RoomPublic)
async def update_room(
    room_id: int,
    room_update: RoomUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update room (host only)"""
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Only the host can update the room
    if room.host_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the room host can update the room"
        )
    
    # Update fields
    update_data = room_update.model_dump(exclude_unset=True)
    
    # Handle location update
    if 'latitude' in update_data and 'longitude' in update_data:
        lat = update_data.pop('latitude')
        lon = update_data.pop('longitude')
        
        if lat is not None and lon is not None:
            lat = float(lat)
            lon = float(lon)
            
            # Update exact location
            location_wkt = create_postgis_point_wkt(lon, lat)
            room.location = location_wkt
            
            # Regenerate public location
            public_lat, public_lon = generate_public_location(lat, lon)
            public_location_wkt = create_postgis_point_wkt(public_lon, public_lat)
            room.public_location = public_location_wkt
    elif 'latitude' in update_data:
        update_data.pop('latitude')
    elif 'longitude' in update_data:
        update_data.pop('longitude')
    
    for field, value in update_data.items():
        setattr(room, field, value)
    
    db.commit()
    db.refresh(room)
    
    pub_lat, pub_lon = _extract_public_coords(db, room)
    response = {**_room_base_dict(room), "public_latitude": pub_lat, "public_longitude": pub_lon}
    
    return RoomPublic(**response)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete room (host only) - sets room as inactive"""
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Only the host can delete the room
    if room.host_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the room host can delete the room"
        )
    
    # Soft delete - set as inactive
    room.is_active = False
    db.commit()


@router.get("/{room_id}/members")
async def get_room_members(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get room members (host or member only).
    Returns list of active and waitlisted members.
    """
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Check if user is host or a member
    is_host = room.host_id == current_user.id
    is_member = db.query(RoomMemberModel).filter(
        RoomMemberModel.room_id == room_id,
        RoomMemberModel.user_id == current_user.id,
        RoomMemberModel.status.in_([RoomMemberStatus.ACTIVE, RoomMemberStatus.WAITLISTED])
    ).first() is not None
    
    if not is_host and not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only room members can view the member list"
        )
    
    # Get all active and waitlisted members
    members = db.query(RoomMemberModel).filter(
        RoomMemberModel.room_id == room_id,
        RoomMemberModel.status.in_([RoomMemberStatus.ACTIVE, RoomMemberStatus.WAITLISTED])
    ).all()
    
    # Return member info
    result = []
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        result.append({
            "id": member.id,
            "user_id": member.user_id,
            "username": user.username if user else "Unknown",
            "is_host": member.is_host,
            "status": member.status.value,
            "queue_position": member.queue_position,
            "joined_at": member.joined_at
        })
    
    return result


@router.post("/{room_id}/leave")
async def leave_room(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Leave a room (member only, not host).
    """
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Host cannot leave their own room
    if room.host_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Host cannot leave their own room. Delete or cancel the room instead."
        )
    
    # Find user's membership
    membership = db.query(RoomMemberModel).filter(
        RoomMemberModel.room_id == room_id,
        RoomMemberModel.user_id == current_user.id,
        RoomMemberModel.status.in_([RoomMemberStatus.ACTIVE, RoomMemberStatus.WAITLISTED])
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not a member of this room"
        )
    
    # Update membership status
    old_status = membership.status
    old_queue_position = membership.queue_position
    membership.status = RoomMemberStatus.LEFT
    membership.left_at = datetime.utcnow()
    membership.queue_position = None
    
    # If leaving from waitlist, reorder the queue
    if old_status == RoomMemberStatus.WAITLISTED and old_queue_position:
        db.query(RoomMemberModel).filter(
            RoomMemberModel.room_id == room_id,
            RoomMemberModel.status == RoomMemberStatus.WAITLISTED,
            RoomMemberModel.queue_position > old_queue_position
        ).update({
            RoomMemberModel.queue_position: RoomMemberModel.queue_position - 1
        })
    
    db.commit()
    
    return {"message": "Successfully left the room"}


@router.post("/{room_id}/members/{member_id}/kick")
async def kick_member(
    room_id: int,
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kick a member from the room (host only).
    """
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Only host can kick members
    if room.host_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the room host can kick members"
        )
    
    # Find the membership record
    membership = db.query(RoomMemberModel).filter(
        RoomMemberModel.id == member_id,
        RoomMemberModel.room_id == room_id,
        RoomMemberModel.status.in_([RoomMemberStatus.ACTIVE, RoomMemberStatus.WAITLISTED])
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    # Cannot kick the host
    if membership.is_host:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot kick the host"
        )
    
    # Update membership status
    old_queue_position = membership.queue_position
    membership.status = RoomMemberStatus.KICKED
    membership.left_at = datetime.utcnow()
    membership.queue_position = None
    
    # If kicking from waitlist, reorder the queue
    if old_queue_position:
        db.query(RoomMemberModel).filter(
            RoomMemberModel.room_id == room_id,
            RoomMemberModel.status == RoomMemberStatus.WAITLISTED,
            RoomMemberModel.queue_position > old_queue_position
        ).update({
            RoomMemberModel.queue_position: RoomMemberModel.queue_position - 1
        })
    
    db.commit()
    
    # Get user info for response
    kicked_user = db.query(User).filter(User.id == membership.user_id).first()
    
    return {"message": f"Successfully kicked {kicked_user.username if kicked_user else 'user'} from the room"}


@router.patch("/{room_id}/status", response_model=RoomPublic)
async def update_room_status(
    room_id: int,
    status_update: RoomStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update room status (host only).
    
    Valid status transitions:
    - SCHEDULED -> ACTIVE (start the game)
    - SCHEDULED -> CANCELLED (cancel before starting)
    - ACTIVE -> FINISHED (end the game - enables reviews)
    - ACTIVE -> CANCELLED (cancel mid-game)
    
    Once FINISHED or CANCELLED, status cannot be changed.
    """
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Only the host can update room status
    if room.host_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the room host can update room status"
        )
    
    # Validate status transitions
    current_status = room.status
    new_status = RoomStatus(status_update.status.value)
    
    # Cannot change from terminal states
    if current_status in [RoomStatus.FINISHED, RoomStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change status from {current_status.value}"
        )
    
    # Define valid transitions
    valid_transitions = {
        RoomStatus.SCHEDULED: [RoomStatus.ACTIVE, RoomStatus.CANCELLED],
        RoomStatus.ACTIVE: [RoomStatus.FINISHED, RoomStatus.CANCELLED],
    }
    
    if new_status not in valid_transitions.get(current_status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from {current_status.value} to {new_status.value}"
        )
    
    if current_status == RoomStatus.SCHEDULED and new_status == RoomStatus.ACTIVE and room.scheduled_at:
        if datetime.utcnow() < room.scheduled_at:
            time_remaining = room.scheduled_at - datetime.utcnow()
            hours = int(time_remaining.total_seconds() // 3600)
            minutes = int((time_remaining.total_seconds() % 3600) // 60)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot start game before scheduled time. Starts in {hours}h {minutes}m."
            )
    
    room.status = new_status
    
    if new_status == RoomStatus.FINISHED:
        room.finished_at = datetime.utcnow()
    
    db.commit()
    db.refresh(room)
    
    pub_lat, pub_lon = _extract_public_coords(db, room)
    response = {**_room_base_dict(room), "public_latitude": pub_lat, "public_longitude": pub_lon}
    
    return RoomPublic(**response)

