"""FastAPI application: routes, CORS, rate limiting, and error handling."""

from __future__ import annotations

import time

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .config import settings
from .exceptions import AppError, register_exception_handlers
from .schemas import (
    ColorOut,
    ExtractResponse,
    ExtractSiteRequest,
    ExtractUrlRequest,
    MetaOut,
)
from .services import image_loader
from .services.color_utils import rgb_to_hex, rgb_to_hsl, rgb_to_oklch
from .services.extractor_fast import ColorResult, extract_fast
from .services.extractor_precision import extract_precision
from .services.site_colors import extract_site

limiter = Limiter(key_func=get_remote_address, default_limits=[])

app = FastAPI(title="colour-palette-analysis API", version="0.1.0")
app.state.limiter = limiter

# Reject oversized requests by Content-Length before the body is buffered.
# Allows the image limit plus headroom for multipart boundaries/fields.
_MAX_BODY_BYTES = settings.max_file_size + 1024 * 1024


@app.middleware("http")
async def _limit_body_size(request: Request, call_next):
    declared = request.headers.get("content-length")
    if declared is not None:
        try:
            if int(declared) > _MAX_BODY_BYTES:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "That upload is too large — keep images under 10 MB."},
                )
        except ValueError:
            pass
    return await call_next(request)


# CORS is added last so it remains the outermost layer and decorates every
# response (including the 413 above) with the right headers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)


@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(_: Request, exc: RateLimitExceeded):
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=429,
        content={"detail": "You're going a bit fast — please wait a moment and try again."},
    )


def _clamp_limit(limit: int) -> int:
    return max(1, min(16, limit))


def _validate_tolerance(tolerance: int) -> int:
    if not 0 <= tolerance <= 100:
        raise AppError("tolerance must be between 0 and 100.", status_code=422)
    return tolerance


def _build_response(
    img: Image.Image,
    original_size: tuple[int, int],
    limit: int,
    tolerance: int,
    mode: str,
) -> ExtractResponse:
    """Run the extraction pipeline and assemble the API response."""
    processed = image_loader.resize_for_processing(img, settings.process_max_side)

    start = time.perf_counter()
    if mode == "precision":
        results, processed_pixels = extract_precision(processed, limit)
    else:
        results, processed_pixels = extract_fast(processed, limit, tolerance)
    elapsed_ms = int(round((time.perf_counter() - start) * 1000))

    colors = [_to_color_out(c) for c in results]
    total_pixels = original_size[0] * original_size[1]
    meta = MetaOut(
        total_pixels=total_pixels,
        processed_pixels=processed_pixels,
        image_size=[original_size[0], original_size[1]],
        processing_ms=elapsed_ms,
        mode=mode,  # type: ignore[arg-type]
    )
    return ExtractResponse(colors=colors, meta=meta)


def _to_color_out(c: ColorResult) -> ColorOut:
    return ColorOut(
        hex=c.hex,
        rgb=[c.rgb[0], c.rgb[1], c.rgb[2]],
        hsl=[c.hsl[0], c.hsl[1], c.hsl[2]],
        oklch=[c.oklch[0], c.oklch[1], c.oklch[2]],
        percentage=c.percentage,
        pixel_count=c.pixel_count,
    )


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}


@app.post("/api/extract", response_model=ExtractResponse)
@limiter.limit(settings.rate_limit)
async def extract(
    request: Request,
    file: UploadFile = File(...),
    limit: int = Form(8),
    tolerance: int = Form(32),
    mode: str = Form("fast"),
    ignore_alpha: bool = Form(True),
) -> ExtractResponse:
    """Extract dominant colours from an uploaded image."""
    if mode not in ("fast", "precision"):
        raise AppError("mode must be 'fast' or 'precision'.", status_code=422)
    tolerance = _validate_tolerance(tolerance)
    limit = _clamp_limit(limit)

    # Read at most the limit + 1 byte so a huge upload can't exhaust memory;
    # load_from_upload's validate_size turns an over-limit read into a 413.
    data = await file.read(settings.max_file_size + 1)
    if not data:
        raise AppError("That file is empty — choose an image with content.", status_code=400)

    img = image_loader.load_from_upload(data, ignore_alpha)
    original_size = img.size
    return _build_response(img, original_size, limit, tolerance, mode)


@app.post("/api/extract-url", response_model=ExtractResponse)
@limiter.limit(settings.rate_limit)
async def extract_url(request: Request, body: ExtractUrlRequest) -> ExtractResponse:
    """Extract dominant colours from an image fetched from a URL."""
    tolerance = _validate_tolerance(body.tolerance)
    limit = _clamp_limit(body.limit)

    img = image_loader.load_from_url(body.url, body.ignore_alpha)
    original_size = img.size
    return _build_response(img, original_size, limit, tolerance, body.mode)


@app.post("/api/extract-site", response_model=ExtractResponse)
@limiter.limit(settings.rate_limit)
async def extract_site_route(request: Request, body: ExtractSiteRequest) -> ExtractResponse:
    """Extract a palette from the CSS colours declared on a web page."""
    limit = _clamp_limit(body.limit)

    start = time.perf_counter()
    items, total = extract_site(body.url, limit)
    elapsed_ms = int(round((time.perf_counter() - start) * 1000))

    colors = [
        ColorOut(
            hex=rgb_to_hex(rgb),
            rgb=[rgb[0], rgb[1], rgb[2]],
            hsl=list(rgb_to_hsl(rgb)),
            oklch=list(rgb_to_oklch(rgb)),
            percentage=round(count / total * 100, 2),
            pixel_count=count,
        )
        for rgb, count in items
    ]
    meta = MetaOut(
        total_pixels=total,
        processed_pixels=total,
        image_size=[0, 0],
        processing_ms=elapsed_ms,
        mode="site",
    )
    return ExtractResponse(colors=colors, meta=meta)
