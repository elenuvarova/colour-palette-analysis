"""Extract a colour palette from a web page's declared CSS colours.

No browser/rendering: fetches the HTML and its linked stylesheets server-side
(reusing the SSRF host guard and IP pinning), parses CSS colour values, and
tallies them by frequency. These are the colours *declared* in CSS (brand/UI
colours), not pixel proportions.

Supported syntaxes: #hex, rgb()/rgba(), hsl()/hsla(), oklch(), oklab(), lab(),
lch(), hwb(), the 148 CSS named colours, and ``var(--name)`` references resolved
against their ``--name: <color>`` custom-property declarations. Fully transparent
(alpha 0) values are skipped.
"""

from __future__ import annotations

import re
import time
from collections import Counter
from urllib.parse import urljoin, urlparse

import httpx

from ..exceptions import AppError
from .color_utils import (
    RGB,
    hsl_to_rgb,
    hwb_to_rgb,
    lab_to_rgb,
    lch_to_rgb,
    oklab_to_rgb,
    oklch_to_rgb,
)
from .css_named_colors import NAMED_COLORS
from .image_loader import _assert_host_allowed, _pinned_client

_HEX = re.compile(r"#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b")
_RGB = re.compile(
    r"rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)",
    re.I,
)
_HSL = re.compile(
    r"hsla?\(\s*([\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?))?\s*\)",
    re.I,
)
# A number that may carry a "%" suffix; used by the modern oklch/oklab/lab/lch/hwb
# functional forms which all use space-separated components and an optional
# "/ alpha" tail.
_NUM = r"([+-]?[\d.]+%?)"
_OKLCH = re.compile(
    rf"oklch\(\s*{_NUM}\s+{_NUM}\s+{_NUM}(?:\s*/\s*([\d.]+%?))?\s*\)", re.I
)
_OKLAB = re.compile(
    rf"oklab\(\s*{_NUM}\s+{_NUM}\s+{_NUM}(?:\s*/\s*([\d.]+%?))?\s*\)", re.I
)
_LAB = re.compile(
    rf"\blab\(\s*{_NUM}\s+{_NUM}\s+{_NUM}(?:\s*/\s*([\d.]+%?))?\s*\)", re.I
)
_LCH = re.compile(
    rf"\blch\(\s*{_NUM}\s+{_NUM}\s+{_NUM}(?:\s*/\s*([\d.]+%?))?\s*\)", re.I
)
_HWB = re.compile(
    rf"hwb\(\s*{_NUM}\s+{_NUM}\s+{_NUM}(?:\s*/\s*([\d.]+%?))?\s*\)", re.I
)
# A CSS custom-property declaration: --name: <value> ;  (value up to ; or })
_VAR_DECL = re.compile(r"(--[\w-]+)\s*:\s*([^;}]+)")
# A var(--name) reference, optionally with a fallback we ignore for the tally.
_VAR_USE = re.compile(r"var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)", re.I)
# A bare named colour used as a property value. Anchored so it must sit in a
# value position -- preceded by ":", ",", or whitespace, and followed by a
# value terminator -- which avoids false positives like "red" inside the class
# ".text-red" or "blue" inside an identifier.
_NAMED_NAMES = "|".join(sorted(NAMED_COLORS, key=len, reverse=True))
_NAMED = re.compile(
    r"(?<![\w#-])(?:" + _NAMED_NAMES + r")(?![\w-])",
    re.I,
)
_LINK = re.compile(r"<link\b[^>]*>", re.I)
_REL_SHEET = re.compile(r"""rel\s*=\s*["']?[^"'>]*stylesheet""", re.I)
_HREF = re.compile(r"""href\s*=\s*["']([^"']+)["']""", re.I)

_MAX_BYTES = 3 * 1024 * 1024
_MAX_STYLESHEETS = 8
_TIMEOUT = 6.0
# Aggregate budget across the page + all stylesheet sub-fetches: a single
# request can't be used to relay/amplify against third parties for minutes or
# pull tens of MB (each sub-fetch is already capped by _TIMEOUT / _MAX_BYTES).
_TOTAL_FETCH_BUDGET_S = 20.0
_TOTAL_CSS_BYTES = 6 * 1024 * 1024
# A realistic browser UA gets past simple user-agent blocks. Advanced bot
# protection (JS challenges, TLS fingerprinting) can't be bypassed without a
# real browser — those sites will still fail, which is expected.
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _clamp(v: float) -> int:
    return int(max(0, min(255, round(v))))


def _alpha_is_zero(alpha: str | None) -> bool:
    if alpha is None:
        return False
    try:
        return float(alpha.replace("%", "")) == 0
    except ValueError:
        return False


def _num(token: str, *, pct_of: float) -> float:
    """Parse a CSS number that may carry a ``%``; ``%`` maps to ``pct_of``."""
    token = token.strip()
    if token.endswith("%"):
        return float(token[:-1]) / 100.0 * pct_of
    return float(token)


def _hex_to_rgb(h: str) -> RGB | None:
    if len(h) in (3, 4):
        if len(h) == 4 and int(h[3] * 2, 16) == 0:
            return None
        return (int(h[0] * 2, 16), int(h[1] * 2, 16), int(h[2] * 2, 16))
    if len(h) == 8 and int(h[6:8], 16) == 0:
        return None
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _hsl_to_rgb(h: float, s: float, lightness: float) -> RGB:
    return hsl_to_rgb(h % 360, s, lightness)


def _resolve_vars(css: str) -> str:
    """Resolve ``var(--name)`` uses by inlining the declared custom-property value.

    Two passes: first collect every ``--name: value`` declaration (last wins, as
    in the cascade for our flat tally), then substitute each ``var(--name)`` with
    its value so the downstream colour matchers count the referenced colour. Var
    references whose target is itself a ``var(...)`` are resolved transitively up
    to a small depth. Unknown vars are left untouched.
    """
    decls: dict[str, str] = {}
    for m in _VAR_DECL.finditer(css):
        decls[m.group(1).lower()] = m.group(2).strip()
    if not decls:
        return css

    def _sub(match: re.Match[str]) -> str:
        return decls.get(match.group(1).lower(), match.group(0))

    resolved = css
    for _ in range(5):
        new = _VAR_USE.sub(_sub, resolved)
        if new == resolved:
            break
        resolved = new
    return resolved


def parse_colors(css: str) -> list[RGB]:
    """Pull every supported CSS colour value out of ``css`` (skipping transparent).

    Resolves ``var(--name)`` references first, then matches hex, rgb()/rgba(),
    hsl()/hsla(), oklch(), oklab(), lab(), lch(), hwb(), and the 148 named colours.
    """
    css = _resolve_vars(css)
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
    for match in _OKLCH.finditer(css):
        if _alpha_is_zero(match.group(4)):
            continue
        okl = _num(match.group(1), pct_of=1.0)
        chroma = _num(match.group(2), pct_of=0.4)
        hue = _num(match.group(3), pct_of=360.0)
        found.append(oklch_to_rgb(okl, chroma, hue))
    for match in _OKLAB.finditer(css):
        if _alpha_is_zero(match.group(4)):
            continue
        okl = _num(match.group(1), pct_of=1.0)
        oka = _num(match.group(2), pct_of=0.4)
        okb = _num(match.group(3), pct_of=0.4)
        found.append(oklab_to_rgb(okl, oka, okb))
    for match in _LAB.finditer(css):
        if _alpha_is_zero(match.group(4)):
            continue
        lab_l = _num(match.group(1), pct_of=100.0)
        lab_a = _num(match.group(2), pct_of=125.0)
        lab_b = _num(match.group(3), pct_of=125.0)
        found.append(lab_to_rgb(lab_l, lab_a, lab_b))
    for match in _LCH.finditer(css):
        if _alpha_is_zero(match.group(4)):
            continue
        lch_l = _num(match.group(1), pct_of=100.0)
        chroma = _num(match.group(2), pct_of=150.0)
        hue = _num(match.group(3), pct_of=360.0)
        found.append(lch_to_rgb(lch_l, chroma, hue))
    for match in _HWB.finditer(css):
        if _alpha_is_zero(match.group(4)):
            continue
        hue = _num(match.group(1), pct_of=360.0)
        white = _num(match.group(2), pct_of=100.0)
        black = _num(match.group(3), pct_of=100.0)
        found.append(hwb_to_rgb(hue % 360, white, black))
    for match in _NAMED.finditer(css):
        name = match.group(0).lower()
        rgb = NAMED_COLORS[name]
        if rgb is not None:
            found.append(rgb)

    return found


def _pinned_get_url(url: str):
    """Open a streaming GET for ``url`` on a client pinned to the host's vetted IP.

    Vets the host (SSRF guard) and pins the actual TCP connection to a resolved,
    vetted IP so a DNS rebind between resolution and connect cannot reach an
    internal address. Returns an open ``(client, response)`` context the caller
    must close; the client is closed when the response context exits.
    """
    host = urlparse(url).hostname or ""
    ips = _assert_host_allowed(host)
    client = _pinned_client(
        host,
        ips,
        timeout=_TIMEOUT,
        follow_redirects=False,
        headers=_HEADERS,
    )
    return client, client.stream("GET", url)


def _read_body(resp: httpx.Response) -> str:
    """Read a response body up to the size cap and decode as text."""
    size = 0
    chunks: list[bytes] = []
    for chunk in resp.iter_bytes():
        size += len(chunk)
        if size > _MAX_BYTES:
            break
        chunks.append(chunk)
    return b"".join(chunks).decode("utf-8", errors="ignore")


def _raise_for_blocked_status(status_code: int) -> None:
    if status_code in (401, 403, 429):
        raise AppError(
            f"The site blocked the request (HTTP {status_code}). Many large "
            "sites block non-browser access — try another site.",
            status_code=400,
        )
    if status_code >= 400:
        raise AppError(
            f"The page returned an error (HTTP {status_code}).", status_code=400
        )


def _fetch_following_redirects(url: str) -> tuple[str, str]:
    """Follow up to 5 redirects manually, vetting and pinning every hop's host."""
    for _ in range(6):
        client, stream = _pinned_get_url(url)
        try:
            with stream as resp:
                if resp.status_code not in (301, 302, 303, 307, 308):
                    _raise_for_blocked_status(resp.status_code)
                    return _read_body(resp), str(resp.url)
                location = resp.headers.get("location", "")
        finally:
            client.close()
        next_url = urljoin(url, location)
        if not next_url.lower().startswith(("http://", "https://")):
            raise AppError("Redirect to non-HTTP URL blocked.", status_code=400)
        url = next_url
    raise AppError("Too many redirects.", status_code=400)


def _fetch(url: str) -> tuple[str, str]:
    """Fetch a resource as text, vetting/pinning the host and enforcing a size cap."""
    client, stream = _pinned_get_url(url)
    try:
        with stream as resp:
            _raise_for_blocked_status(resp.status_code)
            return _read_body(resp), str(resp.url)
    finally:
        client.close()


def extract_site(url: str, limit: int) -> tuple[list[tuple[RGB, int]], int]:
    """Fetch a page plus its stylesheets and return the top declared colours.

    Returns ``([(rgb, count), ...], total_count)`` sorted by frequency.
    """
    if not url.lower().startswith(("http://", "https://")):
        raise AppError("URL must start with http:// or https://.", status_code=400)
    host = urlparse(url).hostname
    if not host:
        raise AppError(
            "That doesn't look like a complete URL — include the full address, "
            "e.g. https://example.com.",
            status_code=400,
        )

    try:
        deadline = time.monotonic() + _TOTAL_FETCH_BUDGET_S
        html, base = _fetch_following_redirects(url)

        css = html
        hrefs = [
            m.group(1)
            for link in _LINK.findall(html)
            if _REL_SHEET.search(link)
            for m in [_HREF.search(link)]
            if m
        ]
        for href in hrefs[:_MAX_STYLESHEETS]:
            # Stop early once the aggregate time/byte budget is spent.
            if time.monotonic() > deadline or len(css) > _TOTAL_CSS_BYTES:
                break
            sheet_url = urljoin(base, href)
            if not sheet_url.lower().startswith(("http://", "https://")):
                continue
            if not urlparse(sheet_url).hostname:
                continue
            try:
                text, _ = _fetch(sheet_url)
                css += "\n" + text
            except AppError:
                continue
    except httpx.TimeoutException as exc:
        raise AppError(
            "Timed out loading that page — it may be slow or blocking automated requests.",
            status_code=400,
        ) from exc
    except httpx.HTTPError as exc:
        raise AppError(
            "Couldn't load that page — check the link is correct and reachable.",
            status_code=400,
        ) from exc

    colors = parse_colors(css)
    if not colors:
        raise AppError(
            "No CSS colours found on that page. Supported: hex, rgb(), hsl(), "
            "oklch(), oklab(), lab(), lch(), hwb(), named colours, and var() "
            "references. The page may load its styles with JavaScript, which "
            "this tool can't execute.",
            status_code=422,
        )

    counts = Counter(colors)
    total = sum(counts.values())
    return [(rgb, count) for rgb, count in counts.most_common(limit)], total
