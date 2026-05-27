"""Custom application exceptions and FastAPI handlers."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Domain error carrying a human-readable message and an HTTP status code."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def register_exception_handlers(app: FastAPI) -> None:
    """Register handlers that render :class:`AppError` as ``{"detail": ...}``."""

    @app.exception_handler(AppError)
    async def _handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})
