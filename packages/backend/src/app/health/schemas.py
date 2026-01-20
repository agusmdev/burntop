"""Health check schemas for uptime monitoring."""

from datetime import datetime

from pydantic import BaseModel, Field


class HealthCheckResponse(BaseModel):
    """Individual health check result."""

    database: str = Field(
        ...,
        description="Database connection status: 'ok' or 'error'",
        examples=["ok"],
    )


class HealthResponse(BaseModel):
    """Overall health check response for uptime monitoring services."""

    status: str = Field(
        ...,
        description="Overall service status: 'ok' or 'degraded'",
        examples=["ok"],
    )
    timestamp: datetime = Field(
        ...,
        description="UTC timestamp of the health check",
    )
    checks: HealthCheckResponse = Field(
        ...,
        description="Individual service health checks",
    )

    model_config = {"from_attributes": True}
