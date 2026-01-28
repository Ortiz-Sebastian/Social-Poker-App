from pydantic_settings import BaseSettings
from typing import List, Optional
from pydantic import field_validator


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None  # Can be comma-separated for multiple clients (web, iOS, etc.)
    APPLE_CLIENT_ID: Optional[str] = None
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # CORS - accepts comma-separated string, converts to list
    CORS_ORIGINS: str = "*"
    
    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def parse_cors_origins(cls, v: str) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v if isinstance(v, list) else [v]
    
    @property
    def google_client_ids(self) -> List[str]:
        """Parse comma-separated Google client IDs"""
        if not self.GOOGLE_CLIENT_ID:
            return []
        if isinstance(self.GOOGLE_CLIENT_ID, str):
            return [cid.strip() for cid in self.GOOGLE_CLIENT_ID.split(",") if cid.strip()]
        return [self.GOOGLE_CLIENT_ID] if isinstance(self.GOOGLE_CLIENT_ID, str) else []
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

