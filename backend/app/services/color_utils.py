"""Pure colour-space conversion helpers (no heavy dependencies)."""

from __future__ import annotations

import math

RGB = tuple[int, int, int]


def clamp_rgb(r: float, g: float, b: float) -> RGB:
    """Clamp each channel to the 0..255 range and round to the nearest int."""

    def _c(v: float) -> int:
        return int(max(0, min(255, round(v))))

    return _c(r), _c(g), _c(b)


def rgb_to_hex(rgb: RGB) -> str:
    """Convert an ``(r, g, b)`` tuple to an uppercase ``#RRGGBB`` string."""
    r, g, b = clamp_rgb(*rgb)
    return f"#{r:02X}{g:02X}{b:02X}"


def rgb_to_hsl(rgb: RGB) -> tuple[int, int, int]:
    """Convert ``(r, g, b)`` to ``(H 0..360, S 0..100, L 0..100)`` integers."""
    r, g, b = clamp_rgb(*rgb)
    rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
    mx = max(rf, gf, bf)
    mn = min(rf, gf, bf)
    delta = mx - mn

    lightness = (mx + mn) / 2.0

    if delta == 0:
        hue = 0.0
        sat = 0.0
    else:
        sat = delta / (1 - abs(2 * lightness - 1)) if lightness not in (0.0, 1.0) else 0.0
        if mx == rf:
            hue = ((gf - bf) / delta) % 6
        elif mx == gf:
            hue = (bf - rf) / delta + 2
        else:
            hue = (rf - gf) / delta + 4
        hue *= 60.0

    return int(round(hue)) % 360, int(round(sat * 100)), int(round(lightness * 100))


def _srgb_to_linear(c: float) -> float:
    """Convert a single sRGB channel in 0..1 to linear-light."""
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def rgb_to_oklch(rgb: RGB) -> tuple[float, float, float]:
    """Convert ``(r, g, b)`` to OKLCH ``(L, C, H)``.

    Follows the reference OKLab transform (https://bottosson.github.io/posts/oklab/):
    sRGB -> linear -> LMS -> OKLab -> OKLCH. ``L`` is in 0..1, ``H`` in 0..360.
    For achromatic colours the chroma is ~0 and the hue defaults to 0.
    """
    r, g, b = clamp_rgb(*rgb)
    lr = _srgb_to_linear(r / 255.0)
    lg = _srgb_to_linear(g / 255.0)
    lb = _srgb_to_linear(b / 255.0)

    # Linear sRGB -> LMS
    long_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
    med = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
    short = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb

    l_ = math.copysign(abs(long_) ** (1 / 3), long_)
    m_ = math.copysign(abs(med) ** (1 / 3), med)
    s_ = math.copysign(abs(short) ** (1 / 3), short)

    # LMS' -> OKLab
    okl = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    oka = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    okb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_

    chroma = math.hypot(oka, okb)
    hue = 0.0 if chroma < 1e-6 else math.degrees(math.atan2(okb, oka)) % 360.0

    return round(okl, 3), round(chroma, 3), round(hue, 3)
