from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.schemas.join_request import JoinRequest, JoinRequestCreate, JoinRequestUpdate
from app.models.join_request import JoinRequest as JoinRequestModel, JoinRequestStatus
from app.models.room import Room as RoomModel
from app.models.room_member import RoomMember as RoomMemberModel, RoomMemberStatus
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter()


def get_active_member_count(db: Session, room_id: int) -> int:
    """Get count of active members in a room (excluding waitlisted)"""
    return db.query(RoomMemberModel).filter(
        RoomMemberModel.room_id == room_id,
        RoomMemberModel.status == RoomMemberStatus.ACTIVE
    ).count()


def get_next_queue_position(db: Session, room_id: int) -> int:
    """Get the next available queue position for a room's waitlist"""
    max_position = db.query(func.max(RoomMemberModel.queue_position)).filter(
        RoomMemberModel.room_id == room_id,
        RoomMemberModel.status == RoomMemberStatus.WAITLISTED
    ).scalar()
    return (max_position or 0) + 1


def reorder_queue_after_removal(db: Session, room_id: int, removed_position: int):
    """Decrement queue positions for all waitlisted members after a removed position"""
    db.query(RoomMemberModel).filter(
        RoomMemberModel.room_id == room_id,
        RoomMemberModel.status == RoomMemberStatus.WAITLISTED,
        RoomMemberModel.queue_position > removed_position
    ).update({
        RoomMemberModel.queue_position: RoomMemberModel.queue_position - 1
    })


@router.post("/", response_model=JoinRequest, status_code=status.HTTP_201_CREATED)
async def create_join_request(
    request_data: JoinRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a join request for a room"""
    # Check if room exists and is active
    room = db.query(RoomModel).filter(
        RoomModel.id == request_data.room_id,
        RoomModel.is_active == True
    ).first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found or inactive"
        )
    
    # Check if user is already the host
    if room.host_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are the host of this room"
        )
    
    # Check if user already has a pending request
    existing_request = db.query(JoinRequestModel).filter(
        JoinRequestModel.user_id == current_user.id,
        JoinRequestModel.room_id == request_data.room_id,
        JoinRequestModel.status == JoinRequestStatus.PENDING
    ).first()
    
    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending request for this room"
        )
    
    # Check if user is already an active member
    existing_member = db.query(RoomMemberModel).filter(
        RoomMemberModel.user_id == current_user.id,
        RoomMemberModel.room_id == request_data.room_id,
        RoomMemberModel.status == RoomMemberStatus.ACTIVE
    ).first()
    
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this room"
        )
    
    # Create the join request
    join_request = JoinRequestModel(
        user_id=current_user.id,
        room_id=request_data.room_id,
        message=request_data.message,
        status=JoinRequestStatus.PENDING
    )
    
    db.add(join_request)
    db.commit()
    db.refresh(join_request)
    
    return join_request


@router.get("/", response_model=List[JoinRequest])
async def list_join_requests(
    room_id: int = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List join requests.
    - If room_id provided and user is host: returns all requests for that room
    - Otherwise: returns user's own requests
    """
    # Debug logging
    print(f"DEBUG: list_join_requests called - room_id={room_id}, current_user.id={current_user.id}")
    
    if room_id:
        # Check if user is the host of this room
        room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
        print(f"DEBUG: room found={room is not None}, room.host_id={room.host_id if room else None}")
        if room and room.host_id == current_user.id:
            # Return all requests for this room
            requests = db.query(JoinRequestModel).filter(
                JoinRequestModel.room_id == room_id
            ).offset(skip).limit(limit).all()
            print(f"DEBUG: Returning {len(requests)} requests for room {room_id}")
            return requests
    
    # Return user's own requests
    requests = db.query(JoinRequestModel).filter(
        JoinRequestModel.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    print(f"DEBUG: Returning {len(requests)} user's own requests")
    
    return requests


@router.get("/{request_id}", response_model=JoinRequest)
async def get_join_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get join request by ID"""
    join_request = db.query(JoinRequestModel).filter(
        JoinRequestModel.id == request_id
    ).first()
    
    if not join_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found"
        )
    
    # Check permission: must be the requester or the room host
    room = db.query(RoomModel).filter(RoomModel.id == join_request.room_id).first()
    if join_request.user_id != current_user.id and room.host_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this request"
        )
    
    return join_request


@router.put("/{request_id}", response_model=JoinRequest)
async def update_join_request(
    request_id: int,
    request_update: JoinRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update join request status (approve/reject - host only).
    
    When APPROVED:
    - If room has space: Creates an ACTIVE RoomMember record
    - If room is full: Creates a WAITLISTED RoomMember with queue position
    
    Note: Host cannot approve a waitlisted user unless they are first in queue
    AND there is space available. Use the dedicated waitlist endpoints for that.
    """
    join_request = db.query(JoinRequestModel).filter(
        JoinRequestModel.id == request_id
    ).first()
    
    if not join_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found"
        )
    
    # Get the room
    room = db.query(RoomModel).filter(RoomModel.id == join_request.room_id).first()
    
    # Only the host can approve/reject requests
    if room.host_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the room host can approve or reject requests"
        )
    
    # Can only update pending requests
    if join_request.status != JoinRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update a request with status: {join_request.status.value}"
        )
    
    # Update the status
    if request_update.status:
        join_request.status = request_update.status
        
        # If APPROVED, create a RoomMember record
        if request_update.status == JoinRequestStatus.APPROVED:
            # Check if member record already exists
            existing_member = db.query(RoomMemberModel).filter(
                RoomMemberModel.user_id == join_request.user_id,
                RoomMemberModel.room_id == join_request.room_id
            ).first()
            
            # Check room capacity
            active_count = get_active_member_count(db, join_request.room_id)
            room_has_space = room.max_players is None or active_count < room.max_players
            
            if existing_member:
                if room_has_space:
                    # Reactivate as ACTIVE member
                    existing_member.status = RoomMemberStatus.ACTIVE
                    existing_member.queue_position = None
                    existing_member.joined_at = datetime.utcnow()
                    existing_member.left_at = None
                else:
                    # Add to waitlist
                    existing_member.status = RoomMemberStatus.WAITLISTED
                    existing_member.queue_position = get_next_queue_position(db, join_request.room_id)
                    existing_member.left_at = None
            else:
                if room_has_space:
                    # Create new ACTIVE member record
                    new_member = RoomMemberModel(
                        user_id=join_request.user_id,
                        room_id=join_request.room_id,
                        is_host=False,
                        status=RoomMemberStatus.ACTIVE,
                        queue_position=None,
                        joined_at=datetime.utcnow()
                    )
                else:
                    # Create new WAITLISTED member record
                    new_member = RoomMemberModel(
                        user_id=join_request.user_id,
                        room_id=join_request.room_id,
                        is_host=False,
                        status=RoomMemberStatus.WAITLISTED,
                        queue_position=get_next_queue_position(db, join_request.room_id),
                        joined_at=datetime.utcnow()
                    )
                db.add(new_member)
    
    if request_update.message is not None:
        join_request.message = request_update.message
    
    db.commit()
    db.refresh(join_request)
    
    return join_request


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_join_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a pending join request (requester only)"""
    join_request = db.query(JoinRequestModel).filter(
        JoinRequestModel.id == request_id
    ).first()
    
    if not join_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found"
        )
    
    # Only the requester can cancel their own request
    if join_request.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel your own requests"
        )
    
    # Can only cancel pending requests
    if join_request.status != JoinRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel pending requests"
        )
    
    join_request.status = JoinRequestStatus.CANCELLED
    db.commit()


# =============================================================================
# WAITLIST MANAGEMENT ENDPOINTS
# =============================================================================

@router.get("/rooms/{room_id}/waitlist")
async def get_room_waitlist(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the waitlist for a room (host only).
    Returns waitlisted members ordered by queue position.
    """
    # Check room exists
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Only host can view the full waitlist
    if room.host_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the room host can view the waitlist"
        )
    
    waitlist = db.query(RoomMemberModel).filter(
        RoomMemberModel.room_id == room_id,
        RoomMemberModel.status == RoomMemberStatus.WAITLISTED
    ).order_by(
        RoomMemberModel.queue_position.asc()
    ).all()
    
    return {
        "room_id": room_id,
        "max_players": room.max_players,
        "active_count": get_active_member_count(db, room_id),
        "waitlist_count": len(waitlist),
        "waitlist": [
            {
                "id": member.id,
                "user_id": member.user_id,
                "queue_position": member.queue_position,
                "joined_at": member.joined_at
            }
            for member in waitlist
        ]
    }


@router.post("/rooms/{room_id}/waitlist/{member_id}/promote")
async def promote_from_waitlist(
    room_id: int,
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Promote a waitlisted user to active member (host only).
    
    Rules:
    - User must be first in queue (queue_position = 1)
    - Room must have available space
    """
    # Check room exists
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Only host can promote
    if room.host_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the room host can promote waitlisted users"
        )
    
    # Get the member
    member = db.query(RoomMemberModel).filter(
        RoomMemberModel.id == member_id,
        RoomMemberModel.room_id == room_id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this room"
        )
    
    # Must be waitlisted
    if member.status != RoomMemberStatus.WAITLISTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not on the waitlist"
        )
    
    # Must be first in queue
    if member.queue_position != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User is at position {member.queue_position} in queue. Only the user at position 1 can be promoted."
        )
    
    # Check room has space
    active_count = get_active_member_count(db, room_id)
    if room.max_players is not None and active_count >= room.max_players:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room is full ({active_count}/{room.max_players}). Remove a member first."
        )
    
    # Promote the member
    member.status = RoomMemberStatus.ACTIVE
    member.queue_position = None
    member.joined_at = datetime.utcnow()
    
    # Reorder remaining queue
    reorder_queue_after_removal(db, room_id, 1)
    
    db.commit()
    db.refresh(member)
    
    return {
        "message": "User promoted to active member",
        "member_id": member.id,
        "user_id": member.user_id,
        "status": member.status.value
    }


@router.delete("/rooms/{room_id}/waitlist/{member_id}")
async def remove_from_waitlist(
    room_id: int,
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a user from the waitlist (host only).
    
    This removes the user from the waitlist and reorders remaining positions.
    """
    # Check room exists
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Only host can remove from waitlist
    if room.host_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the room host can remove users from the waitlist"
        )
    
    # Get the member
    member = db.query(RoomMemberModel).filter(
        RoomMemberModel.id == member_id,
        RoomMemberModel.room_id == room_id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this room"
        )
    
    # Must be waitlisted
    if member.status != RoomMemberStatus.WAITLISTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not on the waitlist"
        )
    
    # Store the position before removal
    removed_position = member.queue_position
    
    # Update member status to REMOVED
    member.status = RoomMemberStatus.REMOVED
    member.queue_position = None
    member.left_at = datetime.utcnow()
    
    # Reorder remaining queue positions
    if removed_position:
        reorder_queue_after_removal(db, room_id, removed_position)
    
    db.commit()
    
    return {
        "message": "User removed from waitlist",
        "member_id": member.id,
        "user_id": member.user_id
    }


@router.get("/rooms/{room_id}/waitlist/position")
async def get_my_waitlist_position(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's position in the waitlist for a room.
    """
    # Check room exists
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Get user's membership
    member = db.query(RoomMemberModel).filter(
        RoomMemberModel.room_id == room_id,
        RoomMemberModel.user_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not a member or on the waitlist for this room"
        )
    
    if member.status == RoomMemberStatus.ACTIVE:
        return {
            "status": "active",
            "message": "You are an active member of this room"
        }
    elif member.status == RoomMemberStatus.WAITLISTED:
        total_waitlisted = db.query(RoomMemberModel).filter(
            RoomMemberModel.room_id == room_id,
            RoomMemberModel.status == RoomMemberStatus.WAITLISTED
        ).count()
        
        return {
            "status": "waitlisted",
            "queue_position": member.queue_position,
            "total_in_queue": total_waitlisted,
            "message": f"You are #{member.queue_position} of {total_waitlisted} in the waitlist"
        }
    else:
        return {
            "status": member.status.value,
            "message": f"Your membership status is: {member.status.value}"
        }

