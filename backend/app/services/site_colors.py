"""Extract a colour palette from a web page's declared CSS colours.

No browser/rendering: fetches the HTML and its linked stylesheets server-side
(reusing the SSRF host guard), parses hex/rgb()/hsl() colour values, and tallies
them by frequency. These are the colours *declared* in CSS (brand/UI colours),
not pixel proportions.
"""

from __future__ import annotations

import re
from collections import Counter
from urllib.parse import urljoin, urlparse

import httpx

from ..config import settings
from ..exceptions import AppError
from .color_utils import RGB
from .image_loader import _assert_host_allowed

_HEX = re.compile(r"#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b")
_RGB = re.compile(
    r"rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)",
    re.I,
)
_HSL = re.compile(
    r"hsla?\(\s*([\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?))?\s*\)",
    re.I,
)
_LINK = re.compile(r"<link\b[^>]*>", re.I)
_REL_SHEET = re.compile(r"""rel\s*=\s*["']?[^"'>]*stylesheet""", re.I)
_HREF = re.compile(r"""href\s*=\s*["']([^"']+)["']""", re.I)

_MAX_BYTES = 3 * 1024 * 1024
_MAX_STYLESHEETS = 8
_TIMEOUT = 6.0
_UA = "Mozilla/5.0 (compatible; colour-palette-analysis/1.0)"


def _clamp(v: float) -> int:
    return int(max(0, min(255, round(v))))


def _alpha_is_zero(alpha: str | None) -> bool:
    if alpha is None:
        return False
    try:
        return float(alpha.replace("%", "")) == 0
    except ValueError:
        return False


def _hex_to_rgb(h: str) -> RGB | None:
    if len(h) in (3, 4):
        if len(h) == 4 and int(h[3] * 2, 16) == 0:
            return None
        return (int(h[0] * 2, 16), int(h[1] * 2, 16), int(h[2] * 2, 16))
    if len(h) == 8 and int(h[6:8], 16) == 0:
        return None
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _hsl_to_rgb(h: float, s: float, lightness: float) -> RGB:
    s /= 100.0
    lightness /= 100.0
    c = (1 - abs(2 * lightness - 1)) * s
    x = c * (1 - abs(((h / 60.0) % 2) - 1))
    m = lightness - c / 2
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
    return (_clamp((rp + m) * 255), _clamp((gp + m) * 255), _clamp((bp + m) * 255))


def parse_colors(css: str) -> list[RGB]:
    """Pull every hex/rgb/hsl colour out of CSS text (skipping transparent)."""
    found: list[RGB] = []
    for match in _HEX.finditer(css):
        rgb = _hex_to_rgb(match.group(1))
        if rgb is not None:
            found.append(rgb)
    for match in _RGB.finditer(css):
        if _alpha_is_zero(match.group(4)):
            continue
        r, g, b = match.group(1), match.group(2), match.group(3)
        found.append((_clamp(float(r)), _clamp(float(g)), _clamp(float(b))))
    for match in _HSL.finditer(css):
        if _alpha_is_zero(match.group(4)):
            continue
        h, s, lt = match.group(1), match.group(2), match.group(3)
        found.append(_hsl_to_rgb(float(h) % 360, float(s), float(lt)))
    return found


def _fetch(client: httpx.Client, url: str) -> tuple[str, str]:
    """Fetch a resource as text, enforcing the host guard and a size cap."""
    with client.stream("GET", url) as resp:
        if resp.status_code >= 400:
            raise AppError(
                f"Could not fetch the page (HTTP {resp.status_code}).", status_code=400
            )
        host = resp.url.host
        if host and not settings.allow_private_hosts:
            _assert_host_allowed(host)
        size = 0
        chunks: list[bytes] = []
        for chunk in resp.iter_bytes():
            size += len(chunk)
            if size > _MAX_BYTES:
                break
            chunks.append(chunk)
        return b"".join(chunks).decode("utf-8", errors="ignore"), str(resp.url)


def extract_site(url: str, limit: int) -> tuple[list[tuple[RGB, int]], int]:
    """Fetch a page plus its stylesheets and return the top declared colours.

    Returns ``([(rgb, count), ...], total_count)`` sorted by frequency.
    """
    if not url.lower().startswith(("http://", "https://")):
        raise AppError("URL must start with http:// or https://.", status_code=400)
    host = urlparse(url).hostname
    if not host:
        raise AppError("URL is missing a host.", status_code=400)
    if not settings.allow_private_hosts:
        _assert_host_allowed(host)

    try:
        with httpx.Client(
            timeout=_TIMEOUT,
            follow_redirects=True,
            max_redirects=5,
            headers={"User-Agent": _UA},
        ) as client:
            html, base = _fetch(client, url)
            css = html
            hrefs = [
                m.group(1)
                for link in _LINK.findall(html)
                if _REL_SHEET.search(link)
                for m in [_HREF.search(link)]
                if m
            ]
            for href in hrefs[:_MAX_STYLESHEETS]:
                sheet_url = urljoin(base, href)
                if not sheet_url.lower().startswith(("http://", "https://")):
                    continue
                sheet_host = urlparse(sheet_url).hostname
                if not sheet_host:
                    continue
                try:
                    if not settings.allow_private_hosts:
                        _assert_host_allowed(sheet_host)
                    text, _ = _fetch(client, sheet_url)
                    css += "\n" + text
                except AppError:
                    continue
    except httpx.TimeoutException as exc:
        raise AppError("Timed out fetching the page.", status_code=400) from exc
    except httpx.HTTPError as exc:
        raise AppError("Failed to fetch the page.", status_code=400) from exc

    colors = parse_colors(css)
    if not colors:
        raise AppError("No CSS colours found on that page.", status_code=422)

    counts = Counter(colors)
    total = sum(counts.values())
    return [(rgb, count) for rgb, count in counts.most_common(limit)], total
