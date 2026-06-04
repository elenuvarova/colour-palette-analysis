"""Custom application exceptions and FastAPI handlers."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("app")


class AppError(Exception):
    """Domain error carrying a human-readable message and an HTTP status code."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def register_exception_handlers(app: FastAPI) -> None:
    """Register handlers that render errors as a stable ``{"detail": ...}`` shape.

    Known :class:`AppError` cases keep their human-readable message and status.
    Any other unhandled exception is logged server-side and returned as a clean
    500 with no traceback or internal detail leaked to the client.
    """

    @app.exception_handler(AppError)
    async def _handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})

    @app.exception_handler(Exception)
    async def _handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Something went wrong on our end. Please try again."},
        )
