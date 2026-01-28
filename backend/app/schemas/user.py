from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    age: Optional[int] = None


class UserCreate(UserBase):
    password: Optional[str] = None  # Optional for OAuth users


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    age: Optional[int] = None
    password: Optional[str] = None


class User(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# OAuth schemas
class GoogleSignIn(BaseModel):
    id_token: str


class AppleSignIn(BaseModel):
    id_token: str
    user: Optional[dict] = None  # Apple may send user info on first sign-in


class EmailLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

