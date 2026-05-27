"""Fast colour extraction backed by the ``extcolors`` library."""

from __future__ import annotations

from dataclasses import dataclass

import extcolors
from PIL import Image

from .color_utils import rgb_to_hex, rgb_to_hsl, rgb_to_oklch


@dataclass
class ColorResult:
    """A single extracted colour with all derived representations."""

    rgb: tuple[int, int, int]
    hex: str
    hsl: tuple[int, int, int]
    oklch: tuple[float, float, float]
    percentage: float
    pixel_count: int

    @classmethod
    def from_rgb(
        cls, rgb: tuple[int, int, int], pixel_count: int, percentage: float
    ) -> ColorResult:
        """Build a result, filling hex/hsl/oklch from the RGB tuple."""
        return cls(
            rgb=rgb,
            hex=rgb_to_hex(rgb),
            hsl=rgb_to_hsl(rgb),
            oklch=rgb_to_oklch(rgb),
            percentage=round(percentage, 2),
            pixel_count=pixel_count,
        )


def extract_fast(
    img: Image.Image, limit: int, tolerance: int
) -> tuple[list[ColorResult], int]:
    """Extract dominant colours using ``extcolors``.

    Returns ``(results, processed_pixels)`` where ``processed_pixels`` is the
    total pixel count analysed by extcolors.
    """
    colors, total_count = extcolors.extract_from_image(img, tolerance=tolerance, limit=limit)

    results: list[ColorResult] = []
    for rgb, pixel_count in colors:
        percentage = (pixel_count / total_count * 100) if total_count else 0.0
        results.append(
            ColorResult.from_rgb(
                (int(rgb[0]), int(rgb[1]), int(rgb[2])), int(pixel_count), percentage
            )
        )

    results.sort(key=lambda c: c.percentage, reverse=True)
    return results, int(total_count)
