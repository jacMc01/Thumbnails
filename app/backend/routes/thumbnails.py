"""
Thumbnail Generation API Routes

This module defines all API endpoints for thumbnail generation and management.
It handles multipart form data, file uploads, error handling, and response formatting.

Endpoints:
- POST /generate - Generate new thumbnail
- GET /thumbnails - List recent thumbnails
- GET /files/{filename} - Serve generated images
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import FileResponse
from fastapi.security.utils import get_authorization_scheme_param

from ..models import (
    ThumbnailResponse, 
    ThumbnailListResponse, 
    ThumbnailListItem,
    ErrorResponse
)
from ..settings import get_settings, Settings
from ..services.openai_client import OpenAIImageService
from ..services.pillow_utils import ThumbnailComposer

# Set up logging
logger = logging.getLogger(__name__)

# Create API router
router = APIRouter()


def get_openai_service(settings: Settings = Depends(get_settings)) -> OpenAIImageService:
    """Dependency to get OpenAI service instance."""
    return OpenAIImageService(settings)


def get_thumbnail_composer(settings: Settings = Depends(get_settings)) -> ThumbnailComposer:
    """Dependency to get Thumbnail composer service instance."""
    return ThumbnailComposer(settings)


@router.post(
    "/generate",
    response_model=ThumbnailResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        502: {"model": ErrorResponse, "description": "OpenAI service error"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    },
    summary="Generate thumbnail",
    description="Generate a branded YouTube thumbnail with AI background and custom text"
)
async def generate_thumbnail(
    title: str = Form(..., min_length=5, max_length=120),
    topic: str = Form(..., min_length=3, max_length=160),
    accent_color: str = Form("#FFD000", regex=r"^#([0-9a-fA-F]{6})$"),
    logo: UploadFile = File(None),
    settings: Settings = Depends(get_settings),
    openai_service: OpenAIImageService = Depends(get_openai_service),
    composer: ThumbnailComposer = Depends(get_thumbnail_composer)
):
    """
    Generate a YouTube thumbnail with the following process:
    
    1. Validate input parameters and optional logo file
    2. Generate AI background using OpenAI's image API
    3. Compose text and logo overlay using Pillow
    4. Optimize JPEG to stay within 2MB limit
    5. Save to data directory and return metadata
    
    Args:
        title: Thumbnail title text (5-120 chars)
        topic: Topic for AI background generation (3-160 chars)
        accent_color: Hex color for accent bar (default: #FFD000)
        logo: Optional PNG/JPG logo file (≤2MB)
        
    Returns:
        ThumbnailResponse with file details and access URL
    """
    request_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    logger.info(f"[{request_id}] Starting thumbnail generation", extra={
        "request_id": request_id,
        "title_length": len(title),
        "topic": topic[:50] + "..." if len(topic) > 50 else topic,
        "accent_color": accent_color,
        "has_logo": logo is not None
    })
    
    try:
        # Validate and process logo if provided
        logo_image = None
        if logo:
            logger.info(f"[{request_id}] Processing logo upload: {logo.filename}")
            
            # Validate logo file
            if logo.content_type not in ["image/png", "image/jpeg"]:
                raise HTTPException(
                    status_code=400,
                    detail="Logo must be PNG or JPEG format"
                )
            
            # Check file size (2MB limit)
            logo_content = await logo.read()
            if len(logo_content) > 2 * 1024 * 1024:
                raise HTTPException(
                    status_code=400,
                    detail="Logo file size must be ≤ 2MB"
                )
            
            # Reset file pointer for composer
            await logo.seek(0)
            logo_image = logo_content
        
        # Step 1: Generate AI background
        logger.info(f"[{request_id}] Generating AI background")
        try:
            background_image = await openai_service.generate_background(topic)
        except Exception as e:
            logger.error(f"[{request_id}] OpenAI API error: {e}")
            raise HTTPException(
                status_code=502,
                detail="Failed to generate background image. Please try again."
            )
        
        # Step 2: Compose thumbnail
        logger.info(f"[{request_id}] Composing thumbnail")
        try:
            thumbnail_path = await composer.compose_thumbnail(
                background_image=background_image,
                title=title,
                accent_color=accent_color,
                logo_image=logo_image,
                request_id=request_id
            )
        except Exception as e:
            logger.error(f"[{request_id}] Composition error: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to compose thumbnail. Please try again."
            )
        
        # Get file stats
        file_stats = thumbnail_path.stat()
        
        logger.info(f"[{request_id}] Thumbnail generated successfully", extra={
            "filename": thumbnail_path.name,
            "size_bytes": file_stats.st_size,
            "duration_seconds": "calculated_in_production"
        })
        
        # Return response
        return ThumbnailResponse(
            filename=thumbnail_path.name,
            width=1280,
            height=720,
            size_bytes=file_stats.st_size,
            url=f"/api/files/{thumbnail_path.name}"
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors, etc.)
        raise
    except Exception as e:
        logger.error(f"[{request_id}] Unexpected error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during thumbnail generation"
        )


@router.get(
    "/thumbnails",
    response_model=ThumbnailListResponse,
    summary="List thumbnails",
    description="Get a list of recently generated thumbnails"
)
async def list_thumbnails(
    limit: int = 20,
    settings: Settings = Depends(get_settings)
):
    """
    List recently generated thumbnails.
    
    Returns thumbnail metadata for gallery display, sorted by creation time
    (newest first). Includes filename and file size for each thumbnail.
    
    Args:
        limit: Maximum number of thumbnails to return (default: 20, max: 50)
        
    Returns:
        ThumbnailListResponse with list of thumbnails and total count
    """
    try:
        # Clamp limit to maximum allowed
        limit = min(limit, settings.max_thumbnails_list)
        
        # Get all JPEG files from data directory
        data_dir = settings.data_dir
        if not data_dir.exists():
            return ThumbnailListResponse(thumbnails=[], total_count=0)
        
        # Find all thumbnail files (JPEG only)
        thumbnail_files = list(data_dir.glob("*_thumbnail.jpg"))
        
        # Sort by modification time (newest first)
        thumbnail_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
        
        # Create response list
        thumbnails = []
        for file_path in thumbnail_files[:limit]:
            try:
                file_stats = file_path.stat()
                created_at = datetime.fromtimestamp(file_stats.st_mtime).isoformat()
                
                thumbnails.append(ThumbnailListItem(
                    filename=file_path.name,
                    size_bytes=file_stats.st_size,
                    created_at=created_at
                ))
            except Exception as e:
                logger.warning(f"Error processing thumbnail file {file_path}: {e}")
                continue
        
        logger.info(f"Listed {len(thumbnails)} thumbnails (total: {len(thumbnail_files)})")
        
        return ThumbnailListResponse(
            thumbnails=thumbnails,
            total_count=len(thumbnail_files)
        )
        
    except Exception as e:
        logger.error(f"Error listing thumbnails: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve thumbnail list"
        )


@router.get(
    "/files/{filename}",
    response_class=FileResponse,
    responses={
        404: {"model": ErrorResponse, "description": "File not found"},
        400: {"model": ErrorResponse, "description": "Invalid filename"}
    },
    summary="Serve thumbnail file",
    description="Serve a generated thumbnail image file"
)
async def serve_thumbnail(
    filename: str,
    settings: Settings = Depends(get_settings)
):
    """
    Serve a generated thumbnail image.
    
    Returns the actual image file for display in the frontend or download.
    Includes security checks to prevent path traversal attacks.
    
    Args:
        filename: Name of the thumbnail file to serve
        
    Returns:
        FileResponse with the image file and appropriate headers
    """
    try:
        # Security: Validate filename to prevent path traversal
        if not filename or ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(
                status_code=400,
                detail="Invalid filename"
            )
        
        # Ensure it's a thumbnail file
        if not filename.endswith("_thumbnail.jpg"):
            raise HTTPException(
                status_code=400,
                detail="File must be a thumbnail image"
            )
        
        # Construct safe file path
        file_path = settings.data_dir / filename
        
        # Check if file exists and is within data directory
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(
                status_code=404,
                detail="Thumbnail not found"
            )
        
        # Verify file is actually in the data directory (prevent traversal)
        try:
            file_path.resolve().relative_to(settings.data_dir.resolve())
        except ValueError:
            logger.warning(f"Path traversal attempt: {filename}")
            raise HTTPException(
                status_code=400,
                detail="Invalid file path"
            )
        
        logger.info(f"Serving thumbnail: {filename}")
        
        # Return file with appropriate headers
        return FileResponse(
            path=file_path,
            media_type="image/jpeg",
            headers={
                "Content-Disposition": f"inline; filename={filename}",
                "Cache-Control": "public, max-age=31536000"  # Cache for 1 year
            }
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error serving file {filename}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to serve thumbnail file"
        )