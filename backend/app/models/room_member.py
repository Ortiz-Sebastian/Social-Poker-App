from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class RoomMemberStatus(str, enum.Enum):
    ACTIVE = "active"
    LEFT = "left"
    REMOVED = "removed"
    KICKED = "kicked"
    WAITLISTED = "waitlisted"


class RoomMember(Base):
    __tablename__ = "room_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    is_host = Column(Boolean, default=False, nullable=False)
    status = Column(SQLEnum(RoomMemberStatus), default=RoomMemberStatus.ACTIVE, nullable=False)
    
    # Queue position for waitlisted members (1 = first in line, null = not waitlisted)
    queue_position = Column(Integer, nullable=True, index=True)
    
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    left_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="room_memberships", foreign_keys=[user_id])
    room = relationship("Room", back_populates="members", foreign_keys=[room_id])

    # Ensure a user can only be a member of a room once
    __table_args__ = (
        UniqueConstraint('user_id', 'room_id', name='uq_room_member_user_room'),
    )
