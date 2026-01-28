from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography
from datetime import datetime
import enum

from app.core.database import Base


class RoomStatus(str, enum.Enum):
    """Status of a poker room"""
    SCHEDULED = "scheduled"  # Room created but game not started
    ACTIVE = "active"        # Game is in progress
    FINISHED = "finished"    # Game completed - reviews can now be submitted
    CANCELLED = "cancelled"  # Room was cancelled


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    host_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Room status - controls when reviews can be submitted
    status = Column(SQLEnum(RoomStatus), default=RoomStatus.SCHEDULED, nullable=False, index=True)
    
    # Exact location - only shown to approved members
    # Geography(Point, 4326) stores lat/long as a single point in WGS84 (standard GPS coordinates)
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=True)
    
    # Public/approximate location - shown to everyone (like Airbnb's obscured location)
    # Randomly offset from real location by 200-500 meters
    public_location = Column(Geography(geometry_type='POINT', srid=4326), nullable=True)
    
    address = Column(String, nullable=True)
    
    # Game details (informational only)
    buy_in_info = Column(String, nullable=True)  # Informational only, not enforced
    max_players = Column(Integer, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)  # When the room was marked as finished

    # Relationships
    host = relationship("User", back_populates="rooms_owned", foreign_keys=[host_id])
    join_requests = relationship("JoinRequest", back_populates="room", foreign_keys="JoinRequest.room_id")
    members = relationship("RoomMember", back_populates="room", foreign_keys="RoomMember.room_id")
    reviews = relationship("Review", back_populates="room", foreign_keys="Review.room_id")

