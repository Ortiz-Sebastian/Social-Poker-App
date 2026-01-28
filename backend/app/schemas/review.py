from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
from app.schemas.user import User


class ReviewBase(BaseModel):
    rating: int
    comment: Optional[str] = None

    @field_validator('rating')
    @classmethod
    def validate_rating(cls, v):
        """Validate rating is between 1 and 5"""
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


class ReviewCreate(ReviewBase):
    room_id: int
    target_user_id: int


class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None

    @field_validator('rating')
    @classmethod
    def validate_rating(cls, v):
        """Validate rating is between 1 and 5"""
        if v is not None and (v < 1 or v > 5):
            raise ValueError('Rating must be between 1 and 5')
        return v


class Review(ReviewBase):
    id: int
    room_id: int
    reviewer_id: int
    target_user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReviewWithUsers(Review):
    """Review with full user details for reviewer and target"""
    reviewer: User
    target_user: User

    class Config:
        from_attributes = True


class UserReputationSummary(BaseModel):
    """Summary of a user's reputation based on reviews received"""
    user_id: int
    average_rating: float
    total_reviews: int
    rating_breakdown: dict  # e.g., {1: 0, 2: 1, 3: 5, 4: 10, 5: 20}
