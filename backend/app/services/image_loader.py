"""Load and normalise images from uploads or remote URLs."""

from __future__ import annotations

import io
import ipaddress
import socket
import warnings
from urllib.parse import urlparse

import httpcore
import httpx
from PIL import Image, ImageOps, UnidentifiedImageError

from ..config import settings
from ..exceptions import AppError

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
_WHITE = (255, 255, 255)


def validate_size(data: bytes) -> None:
    """Raise :class:`AppError` if ``data`` exceeds the configured max size."""
    if len(data) > settings.max_file_size:
        limit_mb = settings.max_file_size / (1024 * 1024)
        raise AppError(f"File too large; maximum size is {limit_mb:.0f} MB.", status_code=413)


def _open_and_normalise(data: bytes, ignore_alpha: bool) -> Image.Image:
    """Open raw image bytes, validate, fix orientation, and return an RGB image."""
    try:
        # Pillow emits DecompressionBombWarning above MAX_IMAGE_PIXELS and raises
        # DecompressionBombError above 2x that. Promote the warning to an error so
        # a pixel-flood is rejected cleanly instead of decoded.
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            img = Image.open(io.BytesIO(data))
            img.load()
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise AppError(
            "Image is too large to process safely.",
            status_code=413,
        ) from exc
    except (UnidentifiedImageError, OSError) as exc:
        raise AppError(
            "Couldn't read that image — it may be corrupt or not a real image file.",
            status_code=400,
        ) from exc

    fmt = (img.format or "").upper()
    if fmt not in ALLOWED_FORMATS:
        raise AppError(
            f"That's a {fmt or 'unknown'} file — only JPG, PNG and WebP images are supported.",
            status_code=400,
        )

    if max(img.size) > settings.max_dimension:
        raise AppError(
            f"That image is too big — keep each side under {settings.max_dimension}px.",
            status_code=400,
        )

    # Apply EXIF orientation before any further processing.
    img = ImageOps.exif_transpose(img)

    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        if ignore_alpha:
            background = Image.new("RGB", rgba.size, _WHITE)
            background.paste(rgba, mask=rgba.split()[-1])
            return background
        return rgba.convert("RGB")

    return img.convert("RGB")


def load_from_upload(data: bytes, ignore_alpha: bool) -> Image.Image:
    """Load and normalise an uploaded image from raw bytes."""
    validate_size(data)
    return _open_and_normalise(data, ignore_alpha)


def _ip_is_blocked(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Return True if ``ip`` is a non-public address we must refuse to reach."""
    # Unwrap IPv4-mapped/compatible IPv6 (e.g. ::ffff:127.0.0.1) so the underlying
    # IPv4 address is vetted, not the wrapper which would otherwise look "global".
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def _resolve_allowed_ips(host: str) -> list[str]:
    """Resolve ``host`` and return its vetted public IPs, or raise :class:`AppError`.

    Rejects private, loopback, link-local, reserved, multicast, or unspecified
    addresses (including IPv4-mapped IPv6 forms). Fails closed when resolution
    fails. Returns the raw resolved literals so the caller can pin the actual
    connection to a vetted IP and close the DNS-rebinding TOCTOU window.
    """
    try:
        infos = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise AppError(
            "Couldn't resolve that URL's host — check the address is spelled correctly.",
            status_code=400,
        ) from exc

    ips: list[str] = []
    for info in infos:
        literal = info[4][0]
        try:
            ip = ipaddress.ip_address(literal)
        except ValueError as exc:
            raise AppError("Couldn't read that URL's address.", status_code=400) from exc
        if _ip_is_blocked(ip):
            raise AppError(
                "Can't fetch from a private or local address — use a public URL.",
                status_code=400,
            )
        if literal not in ips:
            ips.append(literal)

    if not ips:
        raise AppError(
            "Couldn't resolve that URL's host — check the address is spelled correctly.",
            status_code=400,
        )
    return ips


def _assert_host_allowed(host: str) -> list[str]:
    """Vet ``host`` against the SSRF guard and return the vetted IPs.

    Skipped (returns an empty list) when ``allow_private_hosts`` is set, the
    local-development escape hatch.
    """
    if settings.allow_private_hosts:
        return []
    return _resolve_allowed_ips(host)


class _PinnedResolverBackend(httpcore.SyncBackend):
    """httpcore backend that pins every TCP connect to a pre-vetted IP.

    httpcore passes the request's *hostname* to ``connect_tcp``; we substitute a
    vetted IP for the actual socket connect while leaving SNI/cert validation to
    httpcore (it derives ``server_hostname`` from the original origin). This makes
    the IP the app vetted identical to the IP it connects to, closing the
    DNS-rebinding TOCTOU window without a global resolver monkeypatch.
    """

    def __init__(self, pinned: dict[str, str]) -> None:
        super().__init__()
        self._pinned = pinned

    def connect_tcp(self, host: str, port: int, *args, **kwargs):  # type: ignore[override]
        target = self._pinned.get(host, host)
        return super().connect_tcp(target, port, *args, **kwargs)


def _pinned_client(host: str, ips: list[str], **kwargs) -> httpx.Client:
    """Build an httpx client that connects ``host`` only to its vetted ``ips``.

    When ``allow_private_hosts`` is set there is nothing to pin, so a plain client
    is returned (local-development escape hatch).
    """
    if settings.allow_private_hosts or not ips:
        return httpx.Client(**kwargs)
    backend = _PinnedResolverBackend({host: ips[0]})
    transport = httpx.HTTPTransport()
    # Replace the pool's network backend with our pinning one. httpx 0.28 builds
    # the pool eagerly in HTTPTransport.__init__, so we swap it in place.
    transport._pool._network_backend = backend  # noqa: SLF001
    return httpx.Client(transport=transport, **kwargs)


def load_from_url(url: str, ignore_alpha: bool) -> Image.Image:
    """Fetch an image from ``url`` and normalise it.

    Enforces a 5s timeout, validates the content type, and rejects payloads
    larger than the configured maximum. SSRF guard: refuses to fetch
    private/loopback addresses, does not follow redirects, and pins the actual
    TCP connection to the vetted IP so a DNS rebind between resolution and
    connect cannot redirect us to an internal address.
    """
    if not url.lower().startswith(("http://", "https://")):
        raise AppError("URL must start with http:// or https://.", status_code=400)

    host = urlparse(url).hostname
    if not host:
        raise AppError(
            "That doesn't look like a complete URL — include the full address, "
            "e.g. https://example.com/image.png.",
            status_code=400,
        )
    ips = _assert_host_allowed(host)

    try:
        with (
            _pinned_client(host, ips, timeout=5.0, follow_redirects=False) as client,
            client.stream("GET", url) as response,
        ):
            if 300 <= response.status_code < 400:
                raise AppError(
                    "That URL redirects somewhere else — paste the direct image link.",
                    status_code=400,
                )
            if response.status_code >= 400:
                raise AppError(
                    f"The image URL returned an error (HTTP {response.status_code}).",
                    status_code=400,
                )

            raw_type = response.headers.get("content-type", "")
            content_type = raw_type.split(";")[0].strip().lower()
            if content_type and content_type not in _ALLOWED_CONTENT_TYPES:
                raise AppError(
                    f"That link isn't an image (it returned {content_type}). "
                    "Use a direct link to a JPG, PNG or WebP.",
                    status_code=400,
                )

            declared = response.headers.get("content-length")
            if declared and int(declared) > settings.max_file_size:
                raise AppError("Remote image is too large.", status_code=413)

            chunks: list[bytes] = []
            size = 0
            for chunk in response.iter_bytes():
                size += len(chunk)
                if size > settings.max_file_size:
                    raise AppError("That image is over the 10 MB limit.", status_code=413)
                chunks.append(chunk)
            data = b"".join(chunks)
    except httpx.TimeoutException as exc:
        raise AppError(
            "Timed out loading that image URL — the server may be slow or unreachable.",
            status_code=400,
        ) from exc
    except httpx.HTTPError as exc:
        raise AppError(
            "Couldn't load the image from that URL — check the link is correct and public.",
            status_code=400,
        ) from exc

    return _open_and_normalise(data, ignore_alpha)


def resize_for_processing(img: Image.Image, max_side: int = 512) -> Image.Image:
    """Proportionally downscale ``img`` so its longest side is ``max_side`` px.

    Images already within the limit are returned unchanged.
    """
    longest = max(img.size)
    if longest <= max_side:
        return img
    scale = max_side / longest
    new_size = (max(1, round(img.width * scale)), max(1, round(img.height * scale)))
    return img.resize(new_size, Image.Resampling.LANCZOS)
