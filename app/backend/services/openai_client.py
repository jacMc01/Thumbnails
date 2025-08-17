"""
OpenAI Image Generation Service

This module handles all communication with OpenAI's image generation API.
It includes prompt engineering, error handling, retry logic, and image
processing for the thumbnail generation pipeline.

Key features:
- Structured prompt generation for consistent results
- Automatic fallback to different image sizes
- Comprehensive error handling and logging
- Image format conversion and validation
"""

import logging
import asyncio
from io import BytesIO
from typing import Optional, Tuple
from PIL import Image
import httpx

from ..settings import Settings

logger = logging.getLogger(__name__)


class OpenAIImageService:
    """
    Service for generating AI backgrounds using OpenAI's image API.
    
    This service abstracts the complexity of OpenAI API interaction,
    providing a clean interface for background image generation with
    proper error handling and fallback mechanisms.
    """
    
    def __init__(self, settings: Settings):
        """
        Initialize the OpenAI service.
        
        Args:
            settings: Application settings containing API configuration
        """
        self.settings = settings
        self.api_key = settings.openai_api_key
        self.base_url = "https://api.openai.com/v1"
        
        # Configure HTTP client with timeouts and retries
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.openai_timeout_seconds),
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
        )
        
        logger.info("OpenAI Image Service initialized")

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - cleanup HTTP client."""
        await self.client.aclose()

    def _build_prompt(self, topic: str) -> str:
        """
        Build an optimized prompt for YouTube thumbnail backgrounds.
        
        The prompt is carefully engineered to produce backgrounds that:
        - Have strong visual impact for thumbnails
        - Leave space for text overlay (left side emphasis)
        - Are 16:9 aspect ratio friendly
        - Have high contrast and vibrant colors
        - Are relevant to the specified topic
        
        Args:
            topic: User-provided topic for background generation
            
        Returns:
            Optimized prompt string for OpenAI
        """
        # Base prompt template optimized for thumbnails
        base_prompt = (
            "Vibrant YouTube thumbnail background, 16:9 aspect ratio, "
            "strong focal composition with clear space on the left side for text overlay, "
            "cinematic lighting, bold contrast, high saturation, "
            "professional graphic design style, no text or logos, "
            "visually striking and attention-grabbing"
        )
        
        # Add topic-specific elements
        topic_prompt = f", related to: {topic.strip()}"
        
        # Combine and ensure we don't exceed OpenAI's limits
        full_prompt = base_prompt + topic_prompt
        
        # Truncate if needed (OpenAI has prompt length limits)
        if len(full_prompt) > 1000:
            # Keep base prompt and truncate topic
            available_chars = 1000 - len(base_prompt) - 20  # Buffer for connector
            truncated_topic = topic.strip()[:available_chars]
            full_prompt = base_prompt + f", related to: {truncated_topic}"
        
        logger.debug(f"Generated prompt: {full_prompt}")
        return full_prompt

    async def _make_api_request(
        self, 
        prompt: str, 
        size: str = None, 
        quality: str = None
    ) -> dict:
        """
        Make a request to OpenAI's image generation API.
        
        Args:
            prompt: Image generation prompt
            size: Image size (defaults to settings)
            quality: Image quality (defaults to settings)
            
        Returns:
            API response dictionary
            
        Raises:
            httpx.HTTPError: For API communication errors
            ValueError: For invalid API responses
        """
        # Use defaults from settings if not specified
        size = size or self.settings.openai_image_size
        quality = quality or self.settings.openai_quality
        
        # Prepare API request
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.settings.openai_model,
            "prompt": prompt,
            "size": size,
            "quality": quality,
            "n": 1,  # Generate only one image
            "response_format": "url"  # Get URL to download image
        }
        
        logger.info(f"Making OpenAI API request: {size}, quality={quality}")
        
        # Make the API request
        response = await self.client.post(
            f"{self.base_url}/images/generations",
            headers=headers,
            json=payload
        )
        
        # Handle HTTP errors
        if response.status_code != 200:
            error_text = response.text
            logger.error(f"OpenAI API error {response.status_code}: {error_text}")
            
            # Try to parse error details
            try:
                error_data = response.json()
                error_message = error_data.get("error", {}).get("message", error_text)
            except:
                error_message = error_text
            
            raise httpx.HTTPError(f"OpenAI API error: {error_message}")
        
        # Parse response
        try:
            response_data = response.json()
            if "data" not in response_data or not response_data["data"]:
                raise ValueError("Invalid API response: no image data")
            
            return response_data
        except Exception as e:
            logger.error(f"Failed to parse OpenAI response: {e}")
            raise ValueError(f"Invalid API response format: {e}")

    async def _download_image(self, image_url: str) -> bytes:
        """
        Download image from OpenAI's provided URL.
        
        Args:
            image_url: URL to download the generated image
            
        Returns:
            Image data as bytes
            
        Raises:
            httpx.HTTPError: For download errors
        """
        logger.info(f"Downloading image from OpenAI")
        
        try:
            response = await self.client.get(image_url)
            response.raise_for_status()
            
            image_data = response.content
            logger.info(f"Downloaded image: {len(image_data)} bytes")
            
            return image_data
        except Exception as e:
            logger.error(f"Failed to download image: {e}")
            raise httpx.HTTPError(f"Failed to download generated image: {e}")

    def _validate_and_convert_image(self, image_data: bytes) -> Image.Image:
        """
        Validate and convert downloaded image to PIL Image.
        
        Performs format validation and converts to RGB mode for
        consistent processing in the composition pipeline.
        
        Args:
            image_data: Raw image bytes from OpenAI
            
        Returns:
            PIL Image object in RGB mode
            
        Raises:
            ValueError: For invalid image data
        """
        try:
            # Load image with PIL
            image = Image.open(BytesIO(image_data))
            
            # Validate image
            if image.width < 512 or image.height < 512:
                raise ValueError(f"Image too small: {image.width}x{image.height}")
            
            # Convert to RGB mode (removes alpha channel, handles different formats)
            if image.mode != "RGB":
                logger.info(f"Converting image from {image.mode} to RGB")
                image = image.convert("RGB")
            
            logger.info(f"Validated image: {image.width}x{image.height}, mode={image.mode}")
            return image
            
        except Exception as e:
            logger.error(f"Image validation failed: {e}")
            raise ValueError(f"Invalid image data: {e}")

    async def generate_background(self, topic: str) -> Image.Image:
        """
        Generate a background image for thumbnail composition.
        
        This is the main public method that orchestrates the entire
        image generation process with fallback mechanisms and error handling.
        
        Process:
        1. Build optimized prompt from topic
        2. Try preferred image size first
        3. Fall back to smaller size if needed
        4. Download and validate the generated image
        5. Return PIL Image ready for composition
        
        Args:
            topic: Topic description for background generation
            
        Returns:
            PIL Image object ready for thumbnail composition
            
        Raises:
            Exception: If all generation attempts fail
        """
        if not topic or len(topic.strip()) < 3:
            raise ValueError("Topic must be at least 3 characters long")
        
        prompt = self._build_prompt(topic)
        
        # Define fallback sizes (prefer 16:9 ratios)
        size_attempts = [
            self.settings.openai_image_size,  # Preferred size from settings
            "1536x864",  # 16:9 aspect ratio, good quality
            "1024x1024",  # Square fallback (will be cropped)
        ]
        
        last_error = None
        
        # Try each size until one succeeds
        for attempt, size in enumerate(size_attempts, 1):
            try:
                logger.info(f"Attempt {attempt}/{len(size_attempts)}: generating {size} image")
                
                # Make API request
                response_data = await self._make_api_request(prompt, size)
                
                # Extract image URL
                image_url = response_data["data"][0]["url"]
                
                # Download image
                image_data = await self._download_image(image_url)
                
                # Validate and convert
                image = self._validate_and_convert_image(image_data)
                
                logger.info(f"Successfully generated background image: {image.width}x{image.height}")
                return image
                
            except Exception as e:
                last_error = e
                logger.warning(f"Attempt {attempt} failed with {size}: {e}")
                
                # If this isn't the last attempt, wait before retrying
                if attempt < len(size_attempts):
                    await asyncio.sleep(1)  # Brief pause between attempts
                continue
        
        # All attempts failed
        error_msg = f"Failed to generate background after {len(size_attempts)} attempts"
        if last_error:
            error_msg += f". Last error: {last_error}"
        
        logger.error(error_msg)
        raise Exception(error_msg)

    async def cleanup(self):
        """Clean up resources (close HTTP client)."""
        await self.client.aclose()
        logger.info("OpenAI service cleaned up")