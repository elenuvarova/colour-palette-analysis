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


def _linear_to_srgb(c: float) -> float:
    """Convert a single linear-light channel in 0..1 to gamma-encoded sRGB."""
    if c <= 0.0031308:
        return c * 12.92
    return 1.055 * (max(c, 0.0) ** (1 / 2.4)) - 0.055


# CIE Lab uses a D65 reference white (same as sRGB) for these conversions.
_XN, _YN, _ZN = 95.0489, 100.0, 108.8840


def _linear_rgb_to_srgb(lr: float, lg: float, lb: float) -> RGB:
    """Clamp linear-light RGB to gamut and convert to 0..255 sRGB."""
    return clamp_rgb(
        _linear_to_srgb(lr) * 255.0,
        _linear_to_srgb(lg) * 255.0,
        _linear_to_srgb(lb) * 255.0,
    )


def oklab_to_rgb(okl: float, oka: float, okb: float) -> RGB:
    """Convert OKLab ``(L 0..1, a, b)`` to ``(r, g, b)`` (inverse of the OKLab transform)."""
    l_ = okl + 0.3963377774 * oka + 0.2158037573 * okb
    m_ = okl - 0.1055613458 * oka - 0.0638541728 * okb
    s_ = okl - 0.0894841775 * oka - 1.2914855480 * okb

    long_ = l_**3
    med = m_**3
    short = s_**3

    lr = 4.0767416621 * long_ - 3.3077115913 * med + 0.2309699292 * short
    lg = -1.2684380046 * long_ + 2.6097574011 * med - 0.3413193965 * short
    lb = -0.0041960863 * long_ - 0.7034186147 * med + 1.7076147010 * short
    return _linear_rgb_to_srgb(lr, lg, lb)


def oklch_to_rgb(okl: float, chroma: float, hue: float) -> RGB:
    """Convert OKLCH ``(L 0..1, C, H 0..360)`` to ``(r, g, b)``."""
    rad = math.radians(hue)
    return oklab_to_rgb(okl, chroma * math.cos(rad), chroma * math.sin(rad))


def lab_to_rgb(lab_l: float, lab_a: float, lab_b: float) -> RGB:
    """Convert CIE Lab ``(L 0..100, a, b)`` (D65) to ``(r, g, b)``."""
    fy = (lab_l + 16.0) / 116.0
    fx = fy + lab_a / 500.0
    fz = fy - lab_b / 200.0

    def _finv(t: float) -> float:
        eps = 6.0 / 29.0
        return t**3 if t > eps else 3 * eps**2 * (t - 4.0 / 29.0)

    x = _finv(fx) * _XN / 100.0
    y = _finv(fy) * _YN / 100.0
    z = _finv(fz) * _ZN / 100.0

    lr = 3.2406 * x - 1.5372 * y - 0.4986 * z
    lg = -0.9689 * x + 1.8758 * y + 0.0415 * z
    lb = 0.0557 * x - 0.2040 * y + 1.0570 * z
    return _linear_rgb_to_srgb(lr, lg, lb)


def lch_to_rgb(lch_l: float, chroma: float, hue: float) -> RGB:
    """Convert CIE LCH ``(L 0..100, C, H 0..360)`` to ``(r, g, b)``."""
    rad = math.radians(hue)
    return lab_to_rgb(lch_l, chroma * math.cos(rad), chroma * math.sin(rad))


def hwb_to_rgb(hue: float, white: float, black: float) -> RGB:
    """Convert HWB ``(H 0..360, W%, B%)`` to ``(r, g, b)``.

    Follows the CSS Color 4 definition: start from the pure hue, then mix in
    white and black. When ``W + B >= 100`` the result is an achromatic grey.
    """
    w = white / 100.0
    b = black / 100.0
    if w + b >= 1.0:
        grey = w / (w + b) if (w + b) > 0 else 0.0
        return clamp_rgb(grey * 255.0, grey * 255.0, grey * 255.0)

    base = hsl_to_rgb(hue, 100.0, 50.0)
    return clamp_rgb(
        (base[0] / 255.0 * (1 - w - b) + w) * 255.0,
        (base[1] / 255.0 * (1 - w - b) + w) * 255.0,
        (base[2] / 255.0 * (1 - w - b) + w) * 255.0,
    )


def hsl_to_rgb(hue: float, sat: float, lightness: float) -> RGB:
    """Convert HSL ``(H 0..360, S%, L%)`` to ``(r, g, b)``."""
    s = sat / 100.0
    lt = lightness / 100.0
    c = (1 - abs(2 * lt - 1)) * s
    x = c * (1 - abs(((hue / 60.0) % 2) - 1))
    m = lt - c / 2
    h = hue % 360
    if h < 60:
        rp, gp, bp = c, x, 0.0
    elif h < 120:
        rp, gp, bp = x, c, 0.0
    elif h < 180:
        rp, gp, bp = 0.0, c, x
    elif h < 240:
        rp, gp, bp = 0.0, x, c
    elif h < 300:
        rp, gp, bp = x, 0.0, c
    else:
        rp, gp, bp = c, 0.0, x
    return clamp_rgb((rp + m) * 255.0, (gp + m) * 255.0, (bp + m) * 255.0)


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
