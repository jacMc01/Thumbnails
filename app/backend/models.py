"""
Pydantic Models for YouTube Thumbnail Generator

This module defines all the data models used throughout the application.
Pydantic provides automatic validation, serialization, and API documentation
generation from these type-annotated classes.

Models include:
- Request models for API endpoints
- Response models for API responses  
- Internal data structures
- Configuration validation
"""

import re
from typing import Optional, List
from pathlib import Path
from pydantic import BaseModel, Field, validator, root_validator
from fastapi import UploadFile


class ThumbnailRequest(BaseModel):
    """
    Request model for thumbnail generation.
    
    Validates all input parameters according to the project specifications:
    - Title: 5-120 characters, required
    - Topic: 3-160 characters, required for AI prompt
    - Accent Color: Valid hex color with # prefix
    - Logo: Optional file upload (handled separately in multipart)
    """
    title: str = Field(
        ...,
        min_length=5,
        max_length=120,
        description="Thumbnail title text (5-120 characters)"
    )
    
    topic: str = Field(
        ...,
        min_length=3,
        max_length=160,
        description="Topic description for AI background generation (3-160 characters)"
    )
    
    accent_color: Optional[str] = Field(
        "#FFD000",
        regex=r"^#([0-9a-fA-F]{6})$",
        description="Hex color code for accent bar (e.g., #FFD000)"
    )

    @validator('title', 'topic')
    def strip_whitespace(cls, v):
        """Remove leading/trailing whitespace from text fields."""
        if isinstance(v, str):
            return v.strip()
        return v

    @validator('title')
    def validate_title_content(cls, v):
        """Ensure title has meaningful content after stripping."""
        if not v or len(v.strip()) < 5:
            raise ValueError('Title must have at least 5 meaningful characters')
        return v

    @validator('accent_color')
    def validate_accent_color(cls, v):
        """Validate hex color format and convert to uppercase."""
        if v and not re.match(r'^#([0-9a-fA-F]{6})$', v):
            raise ValueError('Accent color must be a valid hex color (e.g., #FFD000)')
        return v.upper() if v else "#FFD000"


class ThumbnailResponse(BaseModel):
    """
    Response model for successful thumbnail generation.
    
    Contains all information about the generated thumbnail including
    file details and access URL for the frontend.
    """
    filename: str = Field(
        ...,
        description="Generated filename in format YYYY-MM-DD_HHMMSS_thumbnail.jpg"
    )
    
    width: int = Field(
        1280,
        description="Image width in pixels"
    )
    
    height: int = Field(
        720,
        description="Image height in pixels"
    )
    
    size_bytes: int = Field(
        ...,
        description="File size in bytes (guaranteed ≤ 2MB)"
    )
    
    url: str = Field(
        ...,
        description="Relative URL to access the generated image"
    )

    @validator('size_bytes')
    def validate_size_limit(cls, v):
        """Ensure generated file is within 2MB limit."""
        max_size = 2 * 1024 * 1024  # 2MB in bytes
        if v > max_size:
            raise ValueError(f'File size {v} bytes exceeds 2MB limit')
        return v


class ThumbnailListItem(BaseModel):
    """
    Model for thumbnail list items.
    
    Used in the gallery endpoint to show recent thumbnails
    without requiring full file details.
    """
    filename: str = Field(
        ...,
        description="Thumbnail filename"
    )
    
    size_bytes: int = Field(
        ...,
        description="File size in bytes"
    )
    
    created_at: Optional[str] = Field(
        None,
        description="Creation timestamp in ISO format"
    )


class ThumbnailListResponse(BaseModel):
    """Response model for thumbnail listing endpoint."""
    thumbnails: List[ThumbnailListItem] = Field(
        default_factory=list,
        description="List of recent thumbnails"
    )
    
    total_count: int = Field(
        0,
        description="Total number of thumbnails"
    )


class ErrorResponse(BaseModel):
    """
    Standardized error response model.
    
    Provides consistent error format across all API endpoints
    with helpful error codes and user-friendly messages.
    """
    error: str = Field(
        ...,
        description="Error type or category"
    )
    
    message: str = Field(
        ...,
        description="Human-readable error message"
    )
    
    details: Optional[dict] = Field(
        None,
        description="Additional error details for debugging"
    )


class OpenAIImageRequest(BaseModel):
    """
    Internal model for OpenAI API requests.
    
    Used to structure and validate requests to OpenAI's image generation API.
    This is an internal model not exposed in the public API.
    """
    prompt: str = Field(
        ...,
        min_length=10,
        max_length=1000,
        description="Image generation prompt"
    )
    
    size: str = Field(
        "1536x864",
        regex=r"^\d+x\d+$",
        description="Image size in format WIDTHxHEIGHT"
    )
    
    model: str = Field(
        "dall-e-3",
        description="OpenAI model to use for image generation"
    )
    
    quality: str = Field(
        "standard",
        description="Image quality setting"
    )


class ImageCompositionConfig(BaseModel):
    """
    Configuration for image composition.
    
    Internal model that defines how text, logos, and other elements
    are composed onto the AI-generated background.
    """
    canvas_width: int = Field(1280, description="Final canvas width")
    canvas_height: int = Field(720, description="Final canvas height")
    
    # Text styling configuration
    title_font_size: int = Field(72, description="Base title font size")
    title_stroke_width: int = Field(6, description="Text stroke width in pixels")
    title_color: str = Field("#FFFFFF", description="Title text color")
    title_stroke_color: str = Field("#000000", description="Title stroke color")
    
    # Accent bar configuration
    accent_bar_height: int = Field(10, description="Accent bar height in pixels")
    accent_bar_margin: int = Field(20, description="Accent bar margin from text")
    
    # Logo configuration
    logo_max_width_percent: float = Field(0.18, description="Max logo width as % of canvas")
    logo_margin: int = Field(30, description="Logo margin from edges")
    
    # JPEG export settings
    jpeg_quality: int = Field(92, description="Initial JPEG quality")
    jpeg_quality_min: int = Field(76, description="Minimum JPEG quality")
    max_file_size: int = Field(2 * 1024 * 1024, description="Max file size in bytes")


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str = Field("ok", description="Service status")
    version: str = Field("1.0.0", description="API version")
    environment: str = Field(..., description="Environment name")
    data_dir_exists: bool = Field(..., description="Whether data directory exists")