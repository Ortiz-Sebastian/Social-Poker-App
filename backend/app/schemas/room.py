from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
from decimal import Decimal
from enum import Enum


class RoomStatus(str, Enum):
    """Status of a poker room"""
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    FINISHED = "finished"
    CANCELLED = "cancelled"


class SkillLevel(str, Enum):
    """Poker skill level for users and rooms"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class RoomBase(BaseModel):
    name: str
    description: Optional[str] = None
    # API accepts lat/long for convenience, backend converts to PostGIS Geography Point
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    address: Optional[str] = None
    buy_in_info: Optional[str] = None  # Informational only
    max_players: Optional[int] = None
    skill_level: Optional[SkillLevel] = None  # Recommended skill level for the room

    @field_validator('latitude')
    @classmethod
    def validate_latitude(cls, v):
        """Validate latitude range"""
        if v is not None and not (-90 <= float(v) <= 90):
            raise ValueError('Latitude must be between -90 and 90')
        return v

    @field_validator('longitude')
    @classmethod
    def validate_longitude(cls, v):
        """Validate longitude range"""
        if v is not None and not (-180 <= float(v) <= 180):
            raise ValueError('Longitude must be between -180 and 180')
        return v


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    address: Optional[str] = None
    buy_in_info: Optional[str] = None
    max_players: Optional[int] = None
    skill_level: Optional[SkillLevel] = None
    is_active: Optional[bool] = None
    status: Optional[RoomStatus] = None


class Room(RoomBase):
    id: int
    host_id: int
    status: RoomStatus = RoomStatus.SCHEDULED
    is_active: bool
    created_at: datetime
    updated_at: datetime
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoomPublic(BaseModel):
    """
    Room with public/approximate location only.
    Used for unauthenticated users or non-members.
    Exact location is hidden until approved.
    """
    id: int
    name: str
    description: Optional[str] = None
    # Public/approximate location (offset from real location)
    public_latitude: Optional[float] = None
    public_longitude: Optional[float] = None
    # Address shown as general area only (e.g., "Midtown Manhattan")
    address: Optional[str] = None
    buy_in_info: Optional[str] = None
    max_players: Optional[int] = None
    skill_level: Optional[SkillLevel] = None
    host_id: int
    status: RoomStatus = RoomStatus.SCHEDULED
    is_active: bool
    created_at: datetime
    updated_at: datetime
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoomWithDistance(RoomPublic):
    """Room with distance from search point (in meters) - uses public location"""
    distance_meters: Optional[float] = None

    class Config:
        from_attributes = True


class RoomPrivate(Room):
    """
    Room with exact location.
    Only shown to approved room members.
    """
    # Exact location (only for members)
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    # Public location also included for reference
    public_latitude: Optional[float] = None
    public_longitude: Optional[float] = None

    class Config:
        from_attributes = True


class RoomStatusUpdate(BaseModel):
    """Schema for updating room status (host only)"""
    status: RoomStatus

