"""Load and normalise images from uploads or remote URLs."""

from __future__ import annotations

import io
import ipaddress
import socket
from urllib.parse import urlparse

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
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise AppError(
            "Could not read the image; the file may be corrupt.", status_code=400
        ) from exc

    fmt = (img.format or "").upper()
    if fmt not in ALLOWED_FORMATS:
        raise AppError(
            f"Unsupported image format '{fmt or 'unknown'}'. Allowed: JPEG, PNG, WEBP.",
            status_code=400,
        )

    if max(img.size) > settings.max_dimension:
        raise AppError(
            f"Image dimensions exceed the maximum of {settings.max_dimension}px.",
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


def _assert_host_allowed(host: str) -> None:
    """Raise :class:`AppError` unless ``host`` is a safe public target (SSRF guard).

    Resolves the hostname and rejects private, loopback, link-local, reserved,
    multicast, or unspecified addresses. Fails closed when resolution fails.
    Skipped entirely when ``allow_private_hosts`` is set (local testing only).
    """
    if settings.allow_private_hosts:
        return
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise AppError("Could not resolve the URL's host.", status_code=400) from exc
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError as exc:
            raise AppError("Could not validate the URL's host.", status_code=400) from exc
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            raise AppError(
                "Refusing to fetch from a private, local, or non-public address.",
                status_code=400,
            )


def load_from_url(url: str, ignore_alpha: bool) -> Image.Image:
    """Fetch an image from ``url`` and normalise it.

    Enforces a 5s timeout, validates the content type, and rejects payloads
    larger than the configured maximum. Refuses to fetch private/loopback
    addresses and does not follow redirects, as an SSRF guard. Note: this does
    not pin the resolved IP, so it is not fully DNS-rebinding-proof.
    """
    if not url.lower().startswith(("http://", "https://")):
        raise AppError("URL must start with http:// or https://.", status_code=400)

    host = urlparse(url).hostname
    if not host:
        raise AppError("URL is missing a host.", status_code=400)
    _assert_host_allowed(host)

    try:
        with (
            httpx.Client(timeout=5.0, follow_redirects=False) as client,
            client.stream("GET", url) as response,
        ):
            if 300 <= response.status_code < 400:
                raise AppError(
                    "URL redirects are not supported; provide a direct image link.",
                    status_code=400,
                )
            if response.status_code >= 400:
                raise AppError(
                    f"Could not fetch the image (HTTP {response.status_code}).",
                    status_code=400,
                )

            raw_type = response.headers.get("content-type", "")
            content_type = raw_type.split(";")[0].strip().lower()
            if content_type and content_type not in _ALLOWED_CONTENT_TYPES:
                raise AppError(
                    f"URL did not return a supported image (content-type: {content_type}).",
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
                    raise AppError("Remote image is too large.", status_code=413)
                chunks.append(chunk)
            data = b"".join(chunks)
    except httpx.TimeoutException as exc:
        raise AppError("Timed out fetching the image URL.", status_code=400) from exc
    except httpx.HTTPError as exc:
        raise AppError("Failed to fetch the image URL.", status_code=400) from exc

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
