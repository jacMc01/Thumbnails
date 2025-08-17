"""
Thumbnail Composition Service using Pillow

This module handles the complex image composition process that combines
AI-generated backgrounds with text overlays, accent bars, and optional logos.
It includes font rendering, JPEG optimization, and file size management.

Key features:
- Professional text rendering with stroke and shadow effects
- Dynamic font sizing based on content
- Logo overlay with aspect ratio preservation
- JPEG quality optimization to stay within 2MB limit
- 16:9 aspect ratio handling and image resizing
"""

import logging
import os
from io import BytesIO
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import textwrap

from ..settings import Settings

logger = logging.getLogger(__name__)


class ThumbnailComposer:
    """
    Service for composing final thumbnails from components.
    
    This service takes an AI-generated background and overlays text,
    accent bars, and logos to create a professional YouTube thumbnail.
    """
    
    def __init__(self, settings: Settings):
        """
        Initialize the composer with settings.
        
        Args:
            settings: Application settings for fonts, sizes, etc.
        """
        self.settings = settings
        
        # Canvas dimensions (YouTube thumbnail standard)
        self.canvas_width = 1280
        self.canvas_height = 720
        
        # Text area configuration (left side for readability)
        self.text_area_width = int(self.canvas_width * 0.45)  # 45% of width
        self.text_margin_left = 40
        self.text_margin_top = 60
        
        # Logo configuration
        self.logo_max_width = int(self.canvas_width * 0.18)  # 18% of canvas width
        self.logo_margin = 30
        
        logger.info("Thumbnail Composer initialized")

    def _resize_background_to_canvas(self, background: Image.Image) -> Image.Image:
        """
        Resize and crop background image to fit 1280x720 canvas.
        
        Handles different aspect ratios by scaling to cover the entire
        canvas and center-cropping any excess. This ensures the background
        always fills the frame while maintaining image quality.
        
        Args:
            background: PIL Image from OpenAI
            
        Returns:
            PIL Image sized exactly 1280x720
        """
        bg_width, bg_height = background.size
        target_ratio = self.canvas_width / self.canvas_height  # 16:9 = ~1.778
        bg_ratio = bg_width / bg_height
        
        logger.info(f"Resizing background: {bg_width}x{bg_height} (ratio: {bg_ratio:.3f}) "
                   f"to {self.canvas_width}x{self.canvas_height} (ratio: {target_ratio:.3f})")
        
        if abs(bg_ratio - target_ratio) < 0.01:
            # Aspect ratios are very close, just resize
            return background.resize((self.canvas_width, self.canvas_height), Image.Resampling.LANCZOS)
        
        # Calculate scaling to cover entire canvas
        if bg_ratio > target_ratio:
            # Background is wider - scale by height and crop width
            new_height = self.canvas_height
            new_width = int(bg_height * target_ratio)
            scaled = background.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Center crop the width
            left = (new_width - self.canvas_width) // 2
            cropped = scaled.crop((left, 0, left + self.canvas_width, self.canvas_height))
        else:
            # Background is taller - scale by width and crop height
            new_width = self.canvas_width
            new_height = int(bg_width / target_ratio)
            scaled = background.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Center crop the height
            top = (new_height - self.canvas_height) // 2
            cropped = scaled.crop((0, top, self.canvas_width, top + self.canvas_height))
        
        logger.info(f"Background resized and cropped to {cropped.size}")
        return cropped

    def _get_font(self, size: int) -> ImageFont.FreeTypeFont:
        """
        Get a font for text rendering with fallback support.
        
        Tries to load a high-quality font for professional appearance,
        with fallbacks to ensure the service works on any system.
        
        Args:
            size: Font size in pixels
            
        Returns:
            ImageFont object ready for use
        """
        # Font priority list (best to fallback)
        font_candidates = [
            # Professional fonts (if available)
            "Arial-Bold",
            "ArialBold", 
            "Arial Bold",
            "Helvetica-Bold",
            "Impact",
            
            # System fallbacks
            "arial.ttf",
            "Arial.ttf", 
            "ARIAL.TTF",
            "ARIALBD.TTF",  # Arial Bold on Windows
            
            # Linux fallbacks
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            
            # macOS fallbacks
            "/System/Library/Fonts/Arial.ttc",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
        
        # Try each font candidate
        for font_name in font_candidates:
            try:
                if font_name.endswith(('.ttf', '.ttc', '.otf')):
                    # Full path to font file
                    if os.path.exists(font_name):
                        return ImageFont.truetype(font_name, size)
                else:
                    # System font name
                    return ImageFont.truetype(font_name, size)
            except Exception:
                continue
        
        # Ultimate fallback - default font
        logger.warning(f"Could not load any preferred fonts, using default font at size {size}")
        try:
            return ImageFont.load_default()
        except Exception:
            # If even default fails, create a basic font
            return ImageFont.truetype("arial.ttf", size) if os.path.exists("arial.ttf") else None

    def _calculate_text_size(self, text: str, font: ImageFont.FreeTypeFont) -> Tuple[int, int]:
        """
        Calculate text bounding box size.
        
        Uses PIL's textbbox method for accurate text measurement,
        which is essential for proper text positioning and wrapping.
        
        Args:
            text: Text to measure
            font: Font to use for measurement
            
        Returns:
            Tuple of (width, height) in pixels
        """
        # Create a temporary image for measurement
        temp_img = Image.new('RGB', (1, 1))
        temp_draw = ImageDraw.Draw(temp_img)
        
        # Get bounding box
        bbox = temp_draw.textbbox((0, 0), text, font=font)
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        
        return width, height

    def _wrap_text_to_fit(self, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list:
        """
        Wrap text to fit within specified width.
        
        Intelligently breaks text at word boundaries while ensuring
        each line fits within the available space. This is crucial
        for creating readable thumbnails.
        
        Args:
            text: Text to wrap
            font: Font being used
            max_width: Maximum line width in pixels
            
        Returns:
            List of text lines that fit within max_width
        """
        words = text.split()
        lines = []
        current_line = ""
        
        for word in words:
            # Test if adding this word would exceed width
            test_line = current_line + (" " + word if current_line else word)
            test_width, _ = self._calculate_text_size(test_line, font)
            
            if test_width <= max_width:
                current_line = test_line
            else:
                # Current line is full, start new line
                if current_line:
                    lines.append(current_line)
                    current_line = word
                else:
                    # Single word is too long - force it and break
                    lines.append(word)
                    current_line = ""
        
        # Add remaining text
        if current_line:
            lines.append(current_line)
        
        return lines

    def _find_optimal_font_size(self, text: str, max_width: int, max_height: int) -> Tuple[ImageFont.FreeTypeFont, list, int]:
        """
        Find the largest font size that fits the text in the available space.
        
        Uses binary search approach to efficiently find the optimal font size
        that maximizes readability while fitting within the text area.
        
        Args:
            text: Text to fit
            max_width: Maximum width for text area
            max_height: Maximum height for text area
            
        Returns:
            Tuple of (font, wrapped_lines, font_size)
        """
        # Binary search for optimal font size
        min_size = 20
        max_size = 120
        best_font = None
        best_lines = []
        best_size = min_size
        
        while min_size <= max_size:
            size = (min_size + max_size) // 2
            font = self._get_font(size)
            
            if not font:
                max_size = size - 1
                continue
            
            # Try wrapping text at this size
            lines = self._wrap_text_to_fit(text, font, max_width)
            
            # Calculate total height
            line_height = self._calculate_text_size("Ay", font)[1]  # Use chars with ascenders/descenders
            total_height = len(lines) * line_height * 1.2  # Add line spacing
            
            if total_height <= max_height:
                # This size fits - try larger
                best_font = font
                best_lines = lines
                best_size = size
                min_size = size + 1
            else:
                # Too big - try smaller
                max_size = size - 1
        
        logger.info(f"Optimal font size: {best_size}pt, {len(best_lines)} lines")
        return best_font, best_lines, best_size

    def _draw_text_with_effects(
        self, 
        draw: ImageDraw.Draw, 
        position: Tuple[int, int], 
        text: str, 
        font: ImageFont.FreeTypeFont,
        fill_color: str = "#FFFFFF",
        stroke_color: str = "#000000",
        stroke_width: int = 6
    ):
        """
        Draw text with stroke and shadow effects for maximum readability.
        
        Creates professional text effects that ensure readability against
        any background by combining stroke outlines and subtle shadows.
        
        Args:
            draw: PIL ImageDraw object
            position: (x, y) position for text
            text: Text to draw
            font: Font to use
            fill_color: Text fill color
            stroke_color: Stroke/outline color
            stroke_width: Stroke width in pixels
        """
        x, y = position
        
        # Draw stroke/outline by drawing text multiple times in different positions
        for dx in range(-stroke_width, stroke_width + 1):
            for dy in range(-stroke_width, stroke_width + 1):
                if dx == 0 and dy == 0:
                    continue
                draw.text((x + dx, y + dy), text, font=font, fill=stroke_color)
        
        # Draw main text on top
        draw.text((x, y), text, font=font, fill=fill_color)

    def _add_accent_bar(self, draw: ImageDraw.Draw, text_y: int, accent_color: str):
        """
        Add colored accent bar above text for brand consistency.
        
        Creates a horizontal bar that adds visual interest and brand
        recognition to the thumbnail design.
        
        Args:
            draw: PIL ImageDraw object
            text_y: Y position of text (bar goes above)
            accent_color: Hex color for the accent bar
        """
        bar_height = 8
        bar_width = 200
        bar_x = self.text_margin_left
        bar_y = text_y - 25  # Position above text
        
        # Draw the accent bar
        draw.rectangle(
            [bar_x, bar_y, bar_x + bar_width, bar_y + bar_height],
            fill=accent_color
        )
        
        logger.debug(f"Added accent bar: {accent_color} at ({bar_x}, {bar_y})")

    def _process_logo(self, logo_data: bytes) -> Optional[Image.Image]:
        """
        Process uploaded logo for overlay.
        
        Handles logo validation, resizing, and transparency preservation
        to create a professional logo overlay that doesn't overwhelm
        the thumbnail design.
        
        Args:
            logo_data: Raw logo file bytes
            
        Returns:
            Processed PIL Image or None if processing fails
        """
        try:
            logo = Image.open(BytesIO(logo_data))
            logger.info(f"Processing logo: {logo.size}, mode: {logo.mode}")
            
            # Convert to RGBA for transparency support
            if logo.mode != 'RGBA':
                # If PNG with transparency, preserve it
                if logo.mode in ('P', 'LA') and 'transparency' in logo.info:
                    logo = logo.convert('RGBA')
                else:
                    # For JPEG, create RGBA with full opacity
                    logo = logo.convert('RGBA')
            
            # Calculate resize dimensions while preserving aspect ratio
            logo_width, logo_height = logo.size
            aspect_ratio = logo_width / logo_height
            
            if logo_width > logo_height:
                # Landscape logo
                new_width = min(self.logo_max_width, logo_width)
                new_height = int(new_width / aspect_ratio)
            else:
                # Portrait or square logo
                max_height = int(self.canvas_height * 0.15)  # Max 15% of canvas height
                new_height = min(max_height, logo_height)
                new_width = int(new_height * aspect_ratio)
            
            # Resize logo
            logo_resized = logo.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            logger.info(f"Logo resized to: {logo_resized.size}")
            return logo_resized
            
        except Exception as e:
            logger.error(f"Failed to process logo: {e}")
            return None

    def _add_logo_overlay(self, canvas: Image.Image, logo: Image.Image):
        """
        Add logo overlay to bottom-right corner.
        
        Positions the logo in a visually pleasing location that doesn't
        interfere with text while maintaining brand presence.
        
        Args:
            canvas: Main canvas image
            logo: Processed logo image
        """
        # Position in bottom-right corner
        logo_x = self.canvas_width - logo.width - self.logo_margin
        logo_y = self.canvas_height - logo.height - self.logo_margin
        
        # Paste logo with alpha blending for transparency
        canvas.paste(logo, (logo_x, logo_y), logo)
        
        logger.info(f"Logo added at position ({logo_x}, {logo_y})")

    def _optimize_jpeg_size(self, image: Image.Image, max_size_bytes: int) -> bytes:
        """
        Optimize JPEG quality to stay within file size limit.
        
        Uses iterative quality reduction to ensure the final file
        meets the 2MB requirement while maintaining the best possible
        visual quality.
        
        Args:
            image: PIL Image to optimize
            max_size_bytes: Maximum allowed file size
            
        Returns:
            Optimized JPEG data as bytes
        """
        quality = self.settings.jpeg_quality_start
        min_quality = self.settings.jpeg_quality_min
        
        while quality >= min_quality:
            # Create JPEG data at current quality
            buffer = BytesIO()
            image.save(
                buffer,
                format='JPEG',
                quality=quality,
                optimize=True,
                progressive=True,
                subsampling=0  # Best quality subsampling
            )
            
            jpeg_data = buffer.getvalue()
            file_size = len(jpeg_data)
            
            logger.debug(f"JPEG quality {quality}: {file_size} bytes")
            
            if file_size <= max_size_bytes:
                logger.info(f"Optimized JPEG: quality={quality}, size={file_size} bytes")
                return jpeg_data
            
            # Reduce quality and try again
            quality -= 5
        
        # If we still exceed the limit at minimum quality, return anyway
        logger.warning(f"Could not optimize below {max_size_bytes} bytes, final size: {file_size}")
        return jpeg_data

    async def compose_thumbnail(
        self,
        background_image: Image.Image,
        title: str,
        accent_color: str,
        logo_image: Optional[bytes] = None,
        request_id: str = None
    ) -> Path:
        """
        Compose the final thumbnail from all components.
        
        This is the main method that orchestrates the entire composition
        process, combining background, text, accent bar, and logo into
        a professional YouTube thumbnail.
        
        Args:
            background_image: AI-generated background
            title: Title text to overlay
            accent_color: Hex color for accent bar
            logo_image: Optional logo file bytes
            request_id: Request ID for filename generation
            
        Returns:
            Path to the saved thumbnail file
        """
        try:
            logger.info(f"Starting thumbnail composition for: {title[:30]}...")
            
            # Step 1: Prepare canvas
            canvas = self._resize_background_to_canvas(background_image)
            draw = ImageDraw.Draw(canvas)
            
            # Step 2: Calculate text layout
            text_area_height = self.canvas_height - (self.text_margin_top * 2)
            font, text_lines, font_size = self._find_optimal_font_size(
                title, self.text_area_width, text_area_height
            )
            
            if not font or not text_lines:
                raise ValueError("Could not fit text in available space")
            
            # Step 3: Position and draw text
            line_height = int(font_size * 1.2)  # Add 20% line spacing
            total_text_height = len(text_lines) * line_height
            
            # Center text vertically in available space
            text_start_y = self.text_margin_top + (text_area_height - total_text_height) // 2
            
            # Add accent bar above first line
            self._add_accent_bar(draw, text_start_y, accent_color)
            
            # Draw each line of text
            current_y = text_start_y
            for line in text_lines:
                self._draw_text_with_effects(
                    draw, 
                    (self.text_margin_left, current_y), 
                    line, 
                    font
                )
                current_y += line_height
            
            # Step 4: Add logo if provided
            if logo_image:
                logo = self._process_logo(logo_image)
                if logo:
                    self._add_logo_overlay(canvas, logo)
            
            # Step 5: Generate filename and save
            timestamp = request_id or datetime.now().strftime("%Y-%m-%d_%H%M%S")
            filename = f"{timestamp}_thumbnail.jpg"
            file_path = self.settings.data_dir / filename
            
            # Step 6: Optimize and save
            jpeg_data = self._optimize_jpeg_size(canvas, self.settings.max_file_size_bytes)
            
            with open(file_path, 'wb') as f:
                f.write(jpeg_data)
            
            logger.info(f"Thumbnail saved: {filename} ({len(jpeg_data)} bytes)")
            return file_path
            
        except Exception as e:
            logger.error(f"Thumbnail composition failed: {e}", exc_info=True)
            raise