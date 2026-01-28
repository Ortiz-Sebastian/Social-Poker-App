from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.api import api_router

from slowapi import Limiter
from slowapi.util import get_remote_address



app = FastAPI(
    title="PocketPoker API",
    description="Location-based social app for discovering and organizing private poker games",
    version="0.1.0",
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "PocketPoker API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

