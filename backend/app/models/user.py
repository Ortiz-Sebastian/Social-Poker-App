from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from app.models.enums import SkillLevel


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth users
    provider = Column(String, nullable=True)  # 'email', 'google', 'apple'
    provider_id = Column(String, nullable=True)  # OAuth provider user ID
    full_name = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    skill_level = Column(SQLEnum(SkillLevel), nullable=True, index=True)  # User's self-reported poker skill level
    isHost = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Cached reputation fields (derived from reviews table, recomputable)
    avg_rating = Column(Float, default=0.0, nullable=False)
    review_count = Column(Integer, default=0, nullable=False)
    games_completed = Column(Integer, default=0, nullable=False)

    # Relationships
    rooms_owned = relationship("Room", back_populates="host", foreign_keys="Room.host_id")
    join_requests = relationship("JoinRequest", back_populates="user", foreign_keys="JoinRequest.user_id")
    host_subscription = relationship("HostSubscription", back_populates="user", uselist=False, foreign_keys="HostSubscription.user_id")
    room_memberships = relationship("RoomMember", back_populates="user", foreign_keys="RoomMember.user_id")
    reviews_given = relationship("Review", back_populates="reviewer", foreign_keys="Review.reviewer_id")
    reviews_received = relationship("Review", back_populates="target_user", foreign_keys="Review.target_user_id")

