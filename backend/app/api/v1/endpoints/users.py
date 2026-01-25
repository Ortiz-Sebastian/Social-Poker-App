from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.user import User, UserUpdate
# TODO: Add authentication dependency

router = APIRouter()


@router.get("/me", response_model=User)
async def get_current_user(db: Session = Depends(get_db)):
    """Get current authenticated user"""
    # TODO: Implement get current user logic
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{user_id}", response_model=User)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user by ID"""
    # TODO: Implement get user logic
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.put("/me", response_model=User)
async def update_current_user(
    user_update: UserUpdate,
    db: Session = Depends(get_db)
):
    """Update current authenticated user"""
    # TODO: Implement update user logic
    raise HTTPException(status_code=501, detail="Not implemented yet")

