from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.user import UserCreate, User
# TODO: Add authentication logic here

router = APIRouter()


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # TODO: Implement registration logic
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/login")
async def login(db: Session = Depends(get_db)):
    """Login and get access token"""
    # TODO: Implement login logic
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/logout")
async def logout():
    """Logout current user"""
    # TODO: Implement logout logic
    raise HTTPException(status_code=501, detail="Not implemented yet")

