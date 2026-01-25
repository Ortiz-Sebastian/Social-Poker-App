from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.join_request import JoinRequest, JoinRequestCreate, JoinRequestUpdate
# TODO: Add authentication dependency

router = APIRouter()


@router.post("/", response_model=JoinRequest, status_code=status.HTTP_201_CREATED)
async def create_join_request(
    request_data: JoinRequestCreate,
    db: Session = Depends(get_db)
):
    """Create a join request for a room"""
    # TODO: Implement create join request logic
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/", response_model=List[JoinRequest])
async def list_join_requests(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List join requests (filtered by user or room based on permissions)"""
    # TODO: Implement list join requests logic
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{request_id}", response_model=JoinRequest)
async def get_join_request(request_id: int, db: Session = Depends(get_db)):
    """Get join request by ID"""
    # TODO: Implement get join request logic
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.put("/{request_id}", response_model=JoinRequest)
async def update_join_request(
    request_id: int,
    request_update: JoinRequestUpdate,
    db: Session = Depends(get_db)
):
    """Update join request status (approve/reject - host only)"""
    # TODO: Implement update join request logic with permission check
    raise HTTPException(status_code=501, detail="Not implemented yet")

