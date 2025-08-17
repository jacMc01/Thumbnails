"""
YouTube Thumbnail Generator - FastAPI Backend

This module sets up the main FastAPI application with proper CORS configuration,
error handling, and routing. It serves as the entry point for the thumbnail 
generation service.

Key Features:
- CORS middleware for local development
- Structured logging configuration  
- Centralized error handling
- Health check endpoints
- OpenAPI documentation
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from .settings import get_settings
from .routes import thumbnails


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles startup and shutdown events for the FastAPI application.
    This is where we can initialize services, check configurations,
    and clean up resources.
    """
    settings = get_settings()
    logger.info("Starting YouTube Thumbnail Generator API")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Data directory: {settings.data_dir}")
    
    # Startup logic
    yield
    
    # Shutdown logic
    logger.info("Shutting down YouTube Thumbnail Generator API")


def create_app() -> FastAPI:
    """
    Application factory pattern.
    
    Creates and configures the FastAPI application instance with all
    middleware, routes, and error handlers. This pattern makes testing
    easier and allows for different configurations.
    
    Returns:
        FastAPI: Configured application instance
    """
    settings = get_settings()
    
    # Create FastAPI app with custom configuration
    app = FastAPI(
        title="YouTube Thumbnail Generator",
        description="Generate branded YouTube thumbnails with AI backgrounds and custom text",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc"
    )
    
    # Configure CORS middleware
    # This allows the React frontend to communicate with the backend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.cors_origin],  # Only allow specified origin
        allow_credentials=True,  # Allow cookies and auth headers
        allow_methods=["GET", "POST"],  # Only allow needed methods
        allow_headers=["*"],  # Allow all headers for development
    )
    
    # Include API routes
    app.include_router(
        thumbnails.router,
        prefix="/api",
        tags=["thumbnails"]
    )
    
    # Health check endpoint
    @app.get("/health", tags=["health"])
    async def health_check():
        """
        Health check endpoint for monitoring and load balancers.
        
        Returns basic application status and configuration info.
        Useful for deployment health checks and debugging.
        """
        settings = get_settings()
        return {
            "status": "ok",
            "version": "1.0.0",
            "environment": settings.environment,
            "data_dir_exists": settings.data_dir.exists()
        }
    
    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        """
        Global exception handler for unhandled errors.
        
        Logs the error and returns a generic 500 response to avoid
        exposing sensitive information to clients.
        """
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "message": "An unexpected error occurred"
            }
        )
    
    return app


# Create the app instance
app = create_app()


if __name__ == "__main__":
    """
    Development server entry point.
    
    Runs the application with uvicorn for local development.
    In production, this should be run via uvicorn command or
    a production ASGI server like gunicorn.
    """
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,  # Enable auto-reload for development
        log_level=settings.log_level.lower()
    )