from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
from decimal import Decimal


class RoomBase(BaseModel):
    name: str
    description: Optional[str] = None
    # API accepts lat/long for convenience, backend converts to PostGIS Geography Point
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    address: Optional[str] = None
    buy_in_info: Optional[str] = None  # Informational only
    max_players: Optional[int] = None

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
    is_active: Optional[bool] = None


class Room(RoomBase):
    id: int
    host_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

