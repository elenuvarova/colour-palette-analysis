"""Precision colour extraction via K-Means clustering in CIE LAB space."""

from __future__ import annotations

import numpy as np
from PIL import Image
from sklearn.cluster import KMeans

from .color_utils import clamp_rgb
from .extractor_fast import ColorResult

# D65 reference white used for the XYZ <-> LAB transform.
_XN, _YN, _ZN = 95.047, 100.0, 108.883


def _srgb_to_linear(c: np.ndarray) -> np.ndarray:
    """Vectorised sRGB (0..1) -> linear-light conversion."""
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def _linear_to_srgb(c: np.ndarray) -> np.ndarray:
    """Vectorised linear-light -> sRGB (0..1) conversion."""
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.clip(c, 0, None) ** (1 / 2.4) - 0.055)


def _rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    """Convert an ``(N, 3)`` array of 0..255 RGB values to CIE LAB."""
    lin = _srgb_to_linear(rgb.astype(np.float64) / 255.0)

    # linear sRGB -> XYZ (D65), scaled to 0..100.
    x = (0.4124 * lin[:, 0] + 0.3576 * lin[:, 1] + 0.1805 * lin[:, 2]) * 100.0
    y = (0.2126 * lin[:, 0] + 0.7152 * lin[:, 1] + 0.0722 * lin[:, 2]) * 100.0
    z = (0.0193 * lin[:, 0] + 0.1192 * lin[:, 1] + 0.9505 * lin[:, 2]) * 100.0

    xr, yr, zr = x / _XN, y / _YN, z / _ZN

    def _f(t: np.ndarray) -> np.ndarray:
        eps = 216.0 / 24389.0
        kappa = 24389.0 / 27.0
        return np.where(t > eps, np.cbrt(t), (kappa * t + 16.0) / 116.0)

    fx, fy, fz = _f(xr), _f(yr), _f(zr)
    lab_l = 116.0 * fy - 16.0
    lab_a = 500.0 * (fx - fy)
    lab_b = 200.0 * (fy - fz)
    return np.stack([lab_l, lab_a, lab_b], axis=1)


def _lab_to_rgb(lab: np.ndarray) -> np.ndarray:
    """Convert an ``(N, 3)`` array of LAB values back to 0..255 RGB floats."""
    lab_l, lab_a, lab_b = lab[:, 0], lab[:, 1], lab[:, 2]
    fy = (lab_l + 16.0) / 116.0
    fx = fy + lab_a / 500.0
    fz = fy - lab_b / 200.0

    def _finv(t: np.ndarray) -> np.ndarray:
        eps = 6.0 / 29.0
        return np.where(t > eps, t**3, 3 * eps**2 * (t - 4.0 / 29.0))

    xr, yr, zr = _finv(fx), _finv(fy), _finv(fz)
    x = xr * _XN / 100.0
    y = yr * _YN / 100.0
    z = zr * _ZN / 100.0

    r = 3.2406 * x - 1.5372 * y - 0.4986 * z
    g = -0.9689 * x + 1.8758 * y + 0.0415 * z
    b = 0.0557 * x - 0.2040 * y + 1.0570 * z

    rgb_lin = np.stack([r, g, b], axis=1)
    srgb = _linear_to_srgb(rgb_lin)
    return np.clip(srgb, 0.0, 1.0) * 255.0


def extract_precision(img: Image.Image, limit: int) -> tuple[list[ColorResult], int]:
    """Extract dominant colours by K-Means clustering in LAB space.

    Returns ``(results, processed_pixels)``.
    """
    arr = np.asarray(img.convert("RGB"), dtype=np.uint8).reshape(-1, 3)
    total = int(arr.shape[0])

    unique = np.unique(arr, axis=0)
    n_unique = int(unique.shape[0])
    if n_unique == 0:
        return [], 0

    n_clusters = max(1, min(limit, n_unique))

    lab = _rgb_to_lab(arr)
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(lab)
    centroids_lab = kmeans.cluster_centers_

    counts = np.bincount(labels, minlength=n_clusters)
    centroids_rgb = _lab_to_rgb(centroids_lab)

    results: list[ColorResult] = []
    for i in range(n_clusters):
        pixel_count = int(counts[i])
        if pixel_count == 0:
            continue
        rgb = clamp_rgb(*centroids_rgb[i])
        percentage = pixel_count / total * 100 if total else 0.0
        results.append(ColorResult.from_rgb(rgb, pixel_count, percentage))

    results.sort(key=lambda c: c.percentage, reverse=True)
    return results, total
