"""Application configuration using pydantic-settings."""

import json
from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Application
    app_name: str = "Burntop API"
    debug: bool = False
    secret_key: str = Field(min_length=32)

    # Database (PostgreSQL required)
    database_url: str = Field(description="PostgreSQL database URL (postgresql+asyncpg://...)")
    test_database_url: str | None = Field(
        default=None,
        description="Test database URL (optional, falls back to modifying database_url)",
    )
    database_echo: bool = False
    database_pool_size: int = 5
    database_max_overflow: int = 10

    # Logging
    log_level: str = "INFO"
    log_json_format: bool = True

    # Frontend
    frontend_url: str = "http://localhost:3000"

    # Backend (for OAuth callbacks)
    backend_url: str = "http://localhost:8000"

    # CORS
    # cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    # @field_validator("cors_origins", mode="before")
    # @classmethod
    # def parse_cors_origins(cls, v: Any) -> list[str]:
    #     """Parse CORS origins from string or list."""
    #     if isinstance(v, str):
    #         # Handle JSON string format: ["url1", "url2"]
    #         try:
    #             return json.loads(v)
    #         except json.JSONDecodeError:
    #             # Handle comma-separated format: url1,url2
    #             return [origin.strip() for origin in v.split(",")]
    #     return v

    # OAuth - GitHub
    github_client_id: str | None = None
    github_client_secret: str | None = None

    # Computed properties
    @property
    def github_oauth_enabled(self) -> bool:
        """Check if GitHub OAuth is configured."""
        return bool(self.github_client_id and self.github_client_secret)


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.

    This function is cached to ensure Settings is instantiated only once.
    Use this in FastAPI dependencies.

    Note: Create .env from .env.example before running the application.
    Required environment variables: SECRET_KEY, DATABASE_URL
    """
    return Settings()  # type: ignore[call-arg]
