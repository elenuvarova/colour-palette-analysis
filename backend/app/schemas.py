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


class _UrlRequestBase(BaseModel):
    """Shared URL field with a bounded length (defense-in-depth in front of the
    runtime scheme/SSRF guard, which returns the friendly error messages)."""

    url: str = Field(max_length=2048)


class ExtractUrlRequest(_UrlRequestBase):
    """JSON request body for the ``/api/extract-url`` endpoint."""

    limit: int = 6
    tolerance: int = 16
    mode: Literal["fast", "precision"] = "fast"
    ignore_alpha: bool = Field(default=True)


class ExtractSiteRequest(_UrlRequestBase):
    """JSON request body for the ``/api/extract-site`` endpoint."""

    limit: int = 6
