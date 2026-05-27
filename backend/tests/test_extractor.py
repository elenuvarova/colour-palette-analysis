"""Tests for the fast and precision extraction services."""

from __future__ import annotations

import io

from PIL import Image

from app.services.extractor_fast import extract_fast
from app.services.extractor_precision import extract_precision


def _open(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data)).convert("RGB")


def test_fast_solid_red_single_colour(solid_red_bytes):
    results, processed = extract_fast(_open(solid_red_bytes), limit=8, tolerance=32)
    assert len(results) == 1
    assert results[0].hex == "#FF0000"
    assert abs(results[0].percentage - 100.0) < 0.01
    assert processed == 100 * 100


def test_fast_gradient_multiple_colours(gradient_bytes):
    results, _ = extract_fast(_open(gradient_bytes), limit=8, tolerance=32)
    assert len(results) >= 2
    assert sum(c.percentage for c in results) <= 100.5


def test_precision_solid_red_single_colour(solid_red_bytes):
    results, processed = extract_precision(_open(solid_red_bytes), limit=8)
    assert len(results) == 1
    assert results[0].hex == "#FF0000"
    assert abs(results[0].percentage - 100.0) < 0.01
    assert processed == 100 * 100


def test_precision_gradient_multiple_colours(gradient_bytes):
    results, _ = extract_precision(_open(gradient_bytes), limit=6)
    assert len(results) >= 2
    assert sum(c.percentage for c in results) <= 100.5


def test_both_engines_on_blocks(blocks_bytes):
    img = _open(blocks_bytes)
    fast_results, _ = extract_fast(img, limit=8, tolerance=32)
    precision_results, _ = extract_precision(img, limit=4)

    assert len(fast_results) >= 2
    assert len(precision_results) >= 2
    # Sorted descending by percentage.
    fast_pcts = [c.percentage for c in fast_results]
    assert fast_pcts == sorted(fast_pcts, reverse=True)
