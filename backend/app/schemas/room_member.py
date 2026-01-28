from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.schemas.user import User
from app.models.room_member import RoomMemberStatus


class RoomMemberBase(BaseModel):
    is_host: bool = False
    status: RoomMemberStatus = RoomMemberStatus.ACTIVE


class RoomMemberCreate(RoomMemberBase):
    user_id: int
    room_id: int


class RoomMemberUpdate(BaseModel):
    status: Optional[RoomMemberStatus] = None
    is_host: Optional[bool] = None


class RoomMember(RoomMemberBase):
    id: int
    user_id: int
    room_id: int
    joined_at: datetime
    left_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RoomMemberWithUser(RoomMember):
    """RoomMember with full user details"""
    user: User

    class Config:
        from_attributes = True
