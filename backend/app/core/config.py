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
    GOOGLE_CLIENT_ID: Optional[str] = None  
    APPLE_CLIENT_ID: Optional[str] = None
    
    # Rate Limiting (for location-based endpoints to prevent triangulation attacks)
    RATE_LIMIT_LOCATION_REQUESTS_PER_MINUTE: int = 30  # Max location queries per minute
    RATE_LIMIT_PRIVATE_LOCATION_PER_HOUR: int = 100    # Max private location accesses per hour
    
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
    
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

