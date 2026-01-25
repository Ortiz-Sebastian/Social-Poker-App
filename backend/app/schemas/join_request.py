from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.join_request import JoinRequestStatus


class JoinRequestBase(BaseModel):
    message: Optional[str] = None


class JoinRequestCreate(JoinRequestBase):
    room_id: int


class JoinRequestUpdate(BaseModel):
    status: Optional[JoinRequestStatus] = None
    message: Optional[str] = None


class JoinRequest(JoinRequestBase):
    id: int
    user_id: int
    room_id: int
    status: JoinRequestStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

