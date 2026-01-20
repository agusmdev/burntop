"""
Base Pydantic schemas for request validation and response serialization.

All entity schemas should inherit from these base schemas for consistency.
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer


class BaseSchema(BaseModel):
    """
    Base schema for all Pydantic models.

    Configured with:
    - from_attributes: Enables ORM mode (read from SQLAlchemy models)
    - populate_by_name: Allow using field names or aliases
    - str_strip_whitespace: Strip whitespace from string fields
    - validate_default: Validate default values
    """

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
        validate_default=True,
    )


class BaseCreateSchema(BaseSchema):
    """
    Base schema for create operations.

    Does NOT include id, timestamps, or deleted_at.
    Only fields that the client provides when creating a resource.
    """

    pass


class BaseUpdateSchema(BaseSchema):
    """
    Base schema for update operations.

    All fields should be Optional to support partial updates (PATCH).
    Does NOT include id, timestamps, or deleted_at.
    """

    pass


class BaseResponseSchema(BaseSchema):
    """
    Base schema for response serialization.

    Includes:
    - id: UUID primary key
    - created_at: Creation timestamp
    - updated_at: Last update timestamp
    """

    id: UUID
    created_at: datetime
    updated_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, value: Any) -> str:
        """Serialize UUID to string, handling asyncpg UUID objects."""
        if value is None:
            return None  # type: ignore
        # Convert asyncpg.pgproto.pgproto.UUID to standard UUID
        if hasattr(value, "hex"):
            # asyncpg UUID has .hex attribute
            return str(UUID(hex=value.hex))
        # Standard Python UUID
        return str(value)


class BaseResponseWithDeletedSchema(BaseResponseSchema):
    """
    Response schema that includes soft delete information.

    Use when the API needs to return deleted_at field,
    such as admin endpoints or trash/archive views.
    """

    deleted_at: datetime | None = None


class PaginationParams(BaseSchema):
    """
    Query parameters for pagination.

    Used with fastapi-pagination for cursor or offset-based pagination.
    """

    page: int = 1
    size: int = 50


class ErrorResponse(BaseSchema):
    """
    Standard error response schema.

    All error responses follow this format for consistency.
    """

    detail: str
    error_code: str | None = None
    correlation_id: str | None = None
    timestamp: datetime
    details: dict | None = None
