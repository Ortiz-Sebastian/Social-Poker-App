from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 rating
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    room = relationship("Room", back_populates="reviews", foreign_keys=[room_id])
    reviewer = relationship("User", back_populates="reviews_given", foreign_keys=[reviewer_id])
    target_user = relationship("User", back_populates="reviews_received", foreign_keys=[target_user_id])

    __table_args__ = (
        # Ensure rating is between 1 and 5
        CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
        # Prevent users from reviewing themselves
        CheckConstraint('reviewer_id != target_user_id', name='check_no_self_review'),
        # One review per reviewer per target user per room
        UniqueConstraint('room_id', 'reviewer_id', 'target_user_id', name='uq_review_room_reviewer_target'),
    )
