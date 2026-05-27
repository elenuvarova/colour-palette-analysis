"""Pydantic request/response models for the API (Pydantic v2)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ColorOut(BaseModel):
    """A single extracted colour."""

    hex: str
    rgb: list[int]
    hsl: list[int]
    oklch: list[float]
    percentage: float
    pixel_count: int


class MetaOut(BaseModel):
    """Metadata describing the analysed source and processing run."""

    total_pixels: int
    processed_pixels: int
    image_size: list[int]
    processing_ms: int
    mode: Literal["fast", "precision", "site"]


class ExtractResponse(BaseModel):
    """Response body for both extract endpoints."""

    colors: list[ColorOut]
    meta: MetaOut


class ExtractUrlRequest(BaseModel):
    """JSON request body for the ``/api/extract-url`` endpoint."""

    url: str
    limit: int = 8
    tolerance: int = 32
    mode: Literal["fast", "precision"] = "fast"
    ignore_alpha: bool = Field(default=True)


class ExtractSiteRequest(BaseModel):
    """JSON request body for the ``/api/extract-site`` endpoint."""

    url: str
    limit: int = 8
