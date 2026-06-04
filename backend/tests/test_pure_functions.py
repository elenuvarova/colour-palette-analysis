"""High-value pure-function tests: LAB round-trip, EXIF transpose, alpha handling."""

from __future__ import annotations

import io

import numpy as np
from PIL import Image

from app.services.color_utils import lab_to_rgb, oklch_to_rgb, rgb_to_oklch
from app.services.extractor_precision import _lab_to_rgb, _rgb_to_lab
from app.services.image_loader import _open_and_normalise

# --- LAB round-trip -----------------------------------------------------------


def test_lab_roundtrip_within_tolerance():
    """_lab_to_rgb(_rgb_to_lab(x)) reproduces x within a tight tolerance."""
    rng = np.random.default_rng(7)
    rgb = rng.integers(0, 256, (500, 3), dtype=np.uint8)
    back = _lab_to_rgb(_rgb_to_lab(rgb))
    diff = np.abs(back - rgb.astype(np.float64))
    # In-gamut sRGB should round-trip essentially exactly (sub-1 LSB).
    assert diff.max() < 1.0


def test_lab_roundtrip_primaries_exact():
    primaries = np.array(
        [[0, 0, 0], [255, 255, 255], [255, 0, 0], [0, 255, 0], [0, 0, 255]],
        dtype=np.uint8,
    )
    back = np.round(_lab_to_rgb(_rgb_to_lab(primaries))).astype(np.uint8)
    assert np.array_equal(back, primaries)


def test_oklch_roundtrip_scalar():
    for rgb in [(255, 0, 0), (12, 200, 90), (123, 45, 200), (0, 0, 0), (255, 255, 255)]:
        ok_l, chroma, hue = rgb_to_oklch(rgb)
        back = oklch_to_rgb(ok_l, chroma, hue)
        assert all(abs(a - b) <= 2 for a, b in zip(rgb, back, strict=True)), (rgb, back)


def test_lab_to_rgb_known_red():
    r, g, b = lab_to_rgb(54.29, 80.81, 69.89)
    assert r > 240 and g < 30 and b < 30


# --- EXIF orientation transpose ----------------------------------------------


def _exif_oriented_png() -> bytes:
    """A landscape 40x20 image (left red, right blue) tagged orientation=6.

    Orientation 6 means "rotate 90 CW for display", so after exif_transpose the
    stored 40x20 becomes a 20x40 portrait. PNG is lossless so colours survive
    exactly, letting us assert both the geometry flip and the colour positions.
    """
    img = Image.new("RGB", (40, 20))
    for y in range(20):
        for x in range(40):
            img.putpixel((x, y), (255, 0, 0) if x < 20 else (0, 0, 255))
    exif = img.getexif()
    exif[0x0112] = 6  # Orientation: rotate 90 CW on display
    buf = io.BytesIO()
    img.save(buf, format="PNG", exif=exif)
    return buf.getvalue()


def test_exif_orientation_is_applied():
    data = _exif_oriented_png()
    # Sanity: the stored image is 40x20 (landscape) before transpose.
    raw = Image.open(io.BytesIO(data))
    assert raw.size == (40, 20)

    out = _open_and_normalise(data, ignore_alpha=True)
    # Orientation 6 transposes landscape -> portrait geometry.
    assert out.size == (20, 40)
    # The left-red / right-blue source becomes top-red / bottom-blue after the
    # 90 CW rotation. Sample interior pixels of each band.
    assert out.getpixel((10, 5)) == (255, 0, 0)
    assert out.getpixel((10, 34)) == (0, 0, 255)


# --- Alpha flatten vs keep ----------------------------------------------------


def _rgba_half_transparent() -> bytes:
    """50x50: left half fully transparent, right half opaque blue."""
    img = Image.new("RGBA", (50, 50), (0, 0, 255, 255))
    for y in range(50):
        for x in range(25):
            img.putpixel((x, y), (0, 0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_alpha_flatten_to_white_when_ignored():
    out = _open_and_normalise(_rgba_half_transparent(), ignore_alpha=True)
    assert out.mode == "RGB"
    # Transparent region flattens onto white.
    assert out.getpixel((0, 0)) == (255, 255, 255)
    # Opaque region stays blue.
    assert out.getpixel((40, 0)) == (0, 0, 255)


def test_alpha_kept_drops_to_black_when_not_ignored():
    out = _open_and_normalise(_rgba_half_transparent(), ignore_alpha=False)
    assert out.mode == "RGB"
    # Keeping alpha then dropping to RGB composites over black, not white.
    assert out.getpixel((0, 0)) == (0, 0, 0)
    assert out.getpixel((40, 0)) == (0, 0, 255)
