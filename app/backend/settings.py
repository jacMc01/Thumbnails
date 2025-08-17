"""
Application Settings and Configuration

This module handles all environment-based configuration using Pydantic Settings.
It provides a centralized way to manage configuration with validation,
type safety, and environment variable support.

Key features:
- Environment variable loading from .env file
- Configuration validation and type conversion
- Singleton pattern for settings access
- Development/production environment support
"""

import os
from pathlib import Path
from typing import Optional
from functools import lru_cache
from pydantic import Field, validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings with environment variable support.
    
    This class defines all configuration options for the application.
    Values can be set via environment variables, .env file, or defaults.
    Pydantic automatically handles type conversion and validation.
    """
    
    # Core application settings
    environment: str = Field(
        default="development",
        description="Application environment (development/production)"
    )
    
    log_level: str = Field(
        default="INFO",
        description="Logging level (DEBUG/INFO/WARNING/ERROR)"
    )
    
    # OpenAI API configuration
    openai_api_key: str = Field(
        ...,
        description="OpenAI API key for image generation"
    )
    
    openai_image_size: str = Field(
        default="1536x864",
        regex=r"^\d+x\d+$",
        description="Preferred OpenAI image size (WIDTHxHEIGHT)"
    )
    
    openai_model: str = Field(
        default="dall-e-3",
        description="OpenAI model for image generation"
    )
    
    openai_quality: str = Field(
        default="standard",
        description="OpenAI image quality (standard/hd)"
    )
    
    # File storage configuration
    data_dir: Path = Field(
        default=Path("./data/thumbnails"),
        description="Directory for storing generated thumbnails"
    )
    
    # Server configuration
    cors_origin: str = Field(
        default="http://localhost:5173",
        description="Allowed CORS origin for frontend"
    )
    
    server_host: str = Field(
        default="127.0.0.1",
        description="Server host address"
    )
    
    server_port: int = Field(
        default=8000,
        description="Server port number"
    )
    
    # Image generation settings
    max_file_size_mb: int = Field(
        default=2,
        description="Maximum generated file size in MB"
    )
    
    jpeg_quality_start: int = Field(
        default=92,
        ge=1,
        le=100,
        description="Starting JPEG quality for optimization"
    )
    
    jpeg_quality_min: int = Field(
        default=76,
        ge=1,
        le=100,
        description="Minimum JPEG quality during optimization"
    )
    
    # Font configuration
    title_font_family: str = Field(
        default="Arial",
        description="Font family for title text (system fallback)"
    )
    
    title_font_size: int = Field(
        default=72,
        ge=20,
        le=200,
        description="Base font size for title text"
    )
    
    # Timeouts and limits
    openai_timeout_seconds: int = Field(
        default=30,
        ge=5,
        le=120,
        description="Timeout for OpenAI API requests"
    )
    
    max_thumbnails_list: int = Field(
        default=50,
        ge=1,
        le=200,
        description="Maximum thumbnails to return in list endpoint"
    )

    # Pydantic Settings configuration
    model_config = SettingsConfigDict(
        env_file=".env",  # Load from .env file if present
        env_file_encoding="utf-8",
        case_sensitive=False,  # Allow lowercase env vars
        extra="ignore"  # Ignore unknown env vars
    )

    @validator('data_dir')
    def validate_data_dir(cls, v):
        """
        Validate and create data directory if it doesn't exist.
        
        Ensures the thumbnails storage directory exists and is writable.
        Creates the directory structure if needed.
        """
        if isinstance(v, str):
            v = Path(v)
        
        # Create directory if it doesn't exist
        v.mkdir(parents=True, exist_ok=True)
        
        # Verify it's writable
        if not os.access(v, os.W_OK):
            raise ValueError(f"Data directory {v} is not writable")
        
        return v.resolve()  # Return absolute path

    @validator('openai_api_key')
    def validate_openai_key(cls, v):
        """Validate OpenAI API key format."""
        if not v:
            raise ValueError("OpenAI API key is required")
        
        if not v.startswith('sk-'):
            raise ValueError("OpenAI API key must start with 'sk-'")
        
        if len(v) < 20:
            raise ValueError("OpenAI API key appears to be too short")
        
        return v

    @validator('log_level')
    def validate_log_level(cls, v):
        """Validate logging level."""
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        v_upper = v.upper()
        if v_upper not in valid_levels:
            raise ValueError(f"Log level must be one of: {valid_levels}")
        return v_upper

    @validator('jpeg_quality_min', 'jpeg_quality_start')
    def validate_jpeg_quality_relationship(cls, v, values):
        """Ensure minimum quality is not higher than starting quality."""
        if 'jpeg_quality_start' in values and v > values['jpeg_quality_start']:
            raise ValueError("Minimum JPEG quality cannot be higher than starting quality")
        return v

    @property
    def max_file_size_bytes(self) -> int:
        """Convert max file size from MB to bytes."""
        return self.max_file_size_mb * 1024 * 1024

    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment.lower() == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment.lower() == "production"


@lru_cache()
def get_settings() -> Settings:
    """
    Get application settings (cached).
    
    Uses LRU cache to ensure settings are loaded only once per application
    lifecycle. This is the recommended pattern for accessing settings
    throughout the application.
    
    Returns:
        Settings: Configured and validated settings instance
    """
    return Settings()