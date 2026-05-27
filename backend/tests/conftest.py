"""Shared pytest fixtures: generate test images with Pillow at session scope."""

from __future__ import annotations

import io

import pytest
from PIL import Image


def _png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture(scope="session")
def solid_red_bytes() -> bytes:
    """A 100x100 image of pure #FF0000."""
    return _png_bytes(Image.new("RGB", (100, 100), (255, 0, 0)))


@pytest.fixture(scope="session")
def gradient_bytes() -> bytes:
    """A 256x64 horizontal gradient sweeping through several distinct colours."""
    img = Image.new("RGB", (256, 64))
    px = img.load()
    for x in range(256):
        # Sweep hue-ish across the width so we get many distinct colours.
        r = x
        g = (255 - x)
        b = (x * 2) % 256
        for y in range(64):
            px[x, y] = (r, g, b)
    return _png_bytes(img)


@pytest.fixture(scope="session")
def blocks_bytes() -> bytes:
    """A synthetic 'photo' made of four distinct colour blocks."""
    img = Image.new("RGB", (100, 100))
    px = img.load()
    colors = [(200, 30, 30), (30, 200, 30), (30, 30, 200), (220, 220, 40)]
    for y in range(100):
        for x in range(100):
            idx = (0 if x < 50 else 1) + (0 if y < 50 else 2)
            px[x, y] = colors[idx]
    return _png_bytes(img)


@pytest.fixture(scope="session")
def rgba_bytes() -> bytes:
    """A 50x50 RGBA image, half transparent, half opaque blue."""
    img = Image.new("RGBA", (50, 50), (0, 0, 255, 255))
    px = img.load()
    for y in range(50):
        for x in range(25):
            px[x, y] = (0, 0, 0, 0)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
