"""
Reputation and Review endpoints.

Handles user reviews and reputation management for the poker social app.
Reviews can only be submitted after a room is finished.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.schemas.review import (
    Review,
    ReviewCreateForRoom,
    ReviewWithUsers,
    UserReputationSummary
)
from app.models.review import Review as ReviewModel
from app.models.room import Room as RoomModel, RoomStatus
from app.models.room_member import RoomMember as RoomMemberModel, RoomMemberStatus
from app.models.user import User as UserModel
from app.utils.auth import get_current_user

router = APIRouter()


def was_room_participant(db: Session, user_id: int, room_id: int) -> bool:
    """
    Check if a user was a participant in the room (either as host or member).
    
    For reviews, we check historical participation - even if they left,
    they can still submit reviews for a finished room.
    """
    # Check if user is the host
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    if room and room.host_id == user_id:
        return True
    
    # Check if user was ever a member (any status)
    member = db.query(RoomMemberModel).filter(
        RoomMemberModel.user_id == user_id,
        RoomMemberModel.room_id == room_id
    ).first()
    
    return member is not None


def update_user_reputation_cache(db: Session, user_id: int) -> None:
    """
    Update the cached reputation fields on the user table.
    
    This recalculates avg_rating, review_count from the reviews table.
    Called after a new review is submitted.
    """
    # Calculate aggregates from reviews
    result = db.query(
        func.count(ReviewModel.id).label('count'),
        func.coalesce(func.avg(ReviewModel.rating), 0).label('avg')
    ).filter(
        ReviewModel.target_user_id == user_id
    ).first()
    
    review_count = result.count or 0
    avg_rating = float(result.avg or 0)
    
    # Update user's cached fields
    db.query(UserModel).filter(UserModel.id == user_id).update({
        "review_count": review_count,
        "avg_rating": round(avg_rating, 2)
    })


@router.post("/rooms/{room_id}/reviews", response_model=Review, status_code=status.HTTP_201_CREATED)
async def create_review(
    room_id: int,
    review_data: ReviewCreateForRoom,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a review for a user in a finished room.
    
    Rules:
    - Room must be FINISHED (reviews only allowed after game ends)
    - Reviewer must have been a participant (host or member)
    - Target user must have been a participant (host or member)
    - Cannot review yourself
    - Only one review per reviewer per target per room (enforced by DB constraint)
    
    Who can review whom:
    - Host can review any room member
    - Room members can review the host
    - Room members can review other room members
    """
    # Get the room
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Check room is finished
    if room.status != RoomStatus.FINISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reviews can only be submitted for finished rooms"
        )
    
    # Check reviewer was a participant
    if not was_room_participant(db, current_user.id, room_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must have been a participant in this room to submit a review"
        )
    
    # Check target user exists
    target_user = db.query(UserModel).filter(UserModel.id == review_data.target_user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )
    
    # Check target was a participant
    if not was_room_participant(db, review_data.target_user_id, room_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target user was not a participant in this room"
        )
    
    # Prevent self-review (also enforced by DB constraint)
    if current_user.id == review_data.target_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot review yourself"
        )
    
    # Check if review already exists (also enforced by DB unique constraint)
    existing_review = db.query(ReviewModel).filter(
        ReviewModel.room_id == room_id,
        ReviewModel.reviewer_id == current_user.id,
        ReviewModel.target_user_id == review_data.target_user_id
    ).first()
    
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reviewed this user for this room"
        )
    
    # Create the review
    review = ReviewModel(
        room_id=room_id,
        reviewer_id=current_user.id,
        target_user_id=review_data.target_user_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    db.add(review)
    db.commit()
    db.refresh(review)
    
    # Update target user's reputation cache
    update_user_reputation_cache(db, review_data.target_user_id)
    db.commit()
    
    return review


@router.get("/rooms/{room_id}/reviews", response_model=List[Review])
async def get_room_reviews(
    room_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get all reviews for a specific room.
    
    Returns reviews submitted by participants after the room finished.
    """
    # Check room exists
    room = db.query(RoomModel).filter(RoomModel.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    reviews = db.query(ReviewModel).filter(
        ReviewModel.room_id == room_id
    ).order_by(
        ReviewModel.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return reviews


@router.get("/users/{user_id}/reputation", response_model=UserReputationSummary)
async def get_user_reputation(
    user_id: int,
    include_recent_reviews: bool = Query(True, description="Include recent reviews in response"),
    recent_limit: int = Query(5, ge=1, le=20, description="Number of recent reviews to include"),
    db: Session = Depends(get_db)
):
    """
    Get a user's reputation summary.
    
    Returns:
    - Average rating
    - Total review count
    - Games completed count
    - Rating breakdown (1-5 stars distribution)
    - Recent reviews (optional)
    """
    # Check user exists
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get rating breakdown (count of each rating 1-5)
    rating_counts = db.query(
        ReviewModel.rating,
        func.count(ReviewModel.id).label('count')
    ).filter(
        ReviewModel.target_user_id == user_id
    ).group_by(
        ReviewModel.rating
    ).all()
    
    # Build rating breakdown dict with all ratings 1-5
    rating_breakdown = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for rating, count in rating_counts:
        rating_breakdown[rating] = count
    
    # Get recent reviews if requested
    recent_reviews = []
    if include_recent_reviews:
        reviews = db.query(ReviewModel).filter(
            ReviewModel.target_user_id == user_id
        ).order_by(
            ReviewModel.created_at.desc()
        ).limit(recent_limit).all()
        
        recent_reviews = [
            {
                "id": r.id,
                "room_id": r.room_id,
                "reviewer_id": r.reviewer_id,
                "rating": r.rating,
                "comment": r.comment,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in reviews
        ]
    
    return UserReputationSummary(
        user_id=user.id,
        username=user.username,
        average_rating=user.avg_rating,  # Use cached value
        total_reviews=user.review_count,  # Use cached value
        games_completed=user.games_completed,  # Use cached value
        rating_breakdown=rating_breakdown,
        recent_reviews=recent_reviews
    )


@router.get("/users/{user_id}/reviews", response_model=List[Review])
async def get_user_reviews(
    user_id: int,
    review_type: str = Query("received", description="Type of reviews: 'received' or 'given'"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get reviews for a user.
    
    - review_type='received': Reviews where this user is the target
    - review_type='given': Reviews written by this user
    """
    # Check user exists
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if review_type == "received":
        reviews = db.query(ReviewModel).filter(
            ReviewModel.target_user_id == user_id
        ).order_by(
            ReviewModel.created_at.desc()
        ).offset(skip).limit(limit).all()
    elif review_type == "given":
        reviews = db.query(ReviewModel).filter(
            ReviewModel.reviewer_id == user_id
        ).order_by(
            ReviewModel.created_at.desc()
        ).offset(skip).limit(limit).all()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="review_type must be 'received' or 'given'"
        )
    
    return reviews
