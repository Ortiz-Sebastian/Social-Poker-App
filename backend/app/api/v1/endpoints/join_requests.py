from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
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
    if room_id:
        # Check if user is the host of this room
        room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
        if room and room.host_id == current_user.id:
            # Return all requests for this room
            requests = db.query(JoinRequestModel).filter(
                JoinRequestModel.room_id == room_id
            ).offset(skip).limit(limit).all()
            return requests
    
    # Return user's own requests
    requests = db.query(JoinRequestModel).filter(
        JoinRequestModel.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    
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
    - Creates a RoomMember record for the user
    - User can then access the exact room location
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
            # Check if member record already exists (shouldn't, but be safe)
            existing_member = db.query(RoomMemberModel).filter(
                RoomMemberModel.user_id == join_request.user_id,
                RoomMemberModel.room_id == join_request.room_id
            ).first()
            
            if existing_member:
                # Reactivate if previously left/removed
                existing_member.status = RoomMemberStatus.ACTIVE
                existing_member.joined_at = datetime.utcnow()
                existing_member.left_at = None
            else:
                # Create new member record
                new_member = RoomMemberModel(
                    user_id=join_request.user_id,
                    room_id=join_request.room_id,
                    is_host=False,
                    status=RoomMemberStatus.ACTIVE,
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

