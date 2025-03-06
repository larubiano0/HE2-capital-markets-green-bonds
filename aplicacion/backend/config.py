import os
from typing import Optional

# Base configuration class
class Config:
    # JWT Configuration
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your_secret_key")  # Should be overridden in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    
    # CORS Configuration
    FRONTEND_URL: Optional[str] = os.getenv("FRONTEND_URL", None)

# Development configuration
class DevelopmentConfig(Config):
    DEBUG: bool = True
    
# Production configuration
class ProductionConfig(Config):
    DEBUG: bool = False

# Get configuration based on environment
def get_config():
    env = os.getenv("ENVIRONMENT", "development")
    if env == "production":
        return ProductionConfig()
    return DevelopmentConfig()

# Create a config instance
config = get_config()