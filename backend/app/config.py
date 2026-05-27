"""Application settings loaded from environment variables via pydantic-settings."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration.

    Values are read from environment variables (case-insensitive), e.g.
    ``ALLOWED_ORIGINS``, ``MAX_FILE_SIZE``, ``PROCESS_MAX_SIDE``, ``RATE_LIMIT``.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Comma-separated list of allowed CORS origins.
    allowed_origins: str = "http://localhost:5173"

    # Maximum accepted upload size in bytes (default 10 MB).
    max_file_size: int = 10 * 1024 * 1024

    # Reject images whose width or height exceeds this before any resize.
    max_dimension: int = 6000

    # Longest side (px) used for the analysed image; larger images are downscaled.
    process_max_side: int = 512

    # Rate limit applied to extract endpoints, slowapi syntax e.g. "60/minute".
    rate_limit: str = "60/minute"

    # Allow /api/extract-url to fetch private/loopback/link-local hosts.
    # Keep False in production (SSRF guard); set True only for local testing.
    allow_private_hosts: bool = False

    @property
    def allowed_origins_list(self) -> list[str]:
        """Return ``allowed_origins`` split into a clean list."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
