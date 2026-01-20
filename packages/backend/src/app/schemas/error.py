from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """
    Standardized error response schema.

    All API errors return this structure for consistency.
    """

    detail: str = Field(
        ...,
        description="Human-readable error message",
        examples=["Item with id '123' not found"],
    )
    error_code: str = Field(
        ...,
        description="Machine-readable error code",
        examples=["NOT_FOUND", "VALIDATION_ERROR", "CONFLICT"],
    )
    correlation_id: str = Field(
        ...,
        description="Request correlation ID for tracing",
        examples=["550e8400-e29b-41d4-a716-446655440000"],
    )
    timestamp: datetime = Field(
        ...,
        description="When the error occurred (UTC)",
    )
    details: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional error context",
        examples=[{"resource": "Item", "id": "123"}],
    )


class ValidationErrorDetail(BaseModel):
    """Detail for a single validation error."""

    loc: list[str | int] = Field(
        ...,
        description="Location of the error (field path)",
        examples=[["body", "name"]],
    )
    msg: str = Field(
        ...,
        description="Error message",
        examples=["field required"],
    )
    type: str = Field(
        ...,
        description="Error type",
        examples=["value_error.missing"],
    )


class ValidationErrorResponse(BaseModel):
    """
    Response schema for Pydantic validation errors.

    Maintains compatibility with FastAPI's default validation error format
    while adding correlation_id and timestamp.
    """

    detail: list[ValidationErrorDetail]
    error_code: str = "VALIDATION_ERROR"
    correlation_id: str
    timestamp: datetime
