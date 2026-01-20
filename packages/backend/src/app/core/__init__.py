"""Core models, schemas, and mixins for the application."""

from app.core.models import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin
from app.core.repository import AbstractRepository
from app.core.schemas import (
    BaseCreateSchema,
    BaseResponseSchema,
    BaseResponseWithDeletedSchema,
    BaseSchema,
    BaseUpdateSchema,
    ErrorResponse,
    PaginationParams,
)
from app.core.service import BaseService

__all__ = [
    "AbstractRepository",
    "Base",
    "BaseCreateSchema",
    "BaseResponseSchema",
    "BaseResponseWithDeletedSchema",
    "BaseSchema",
    "BaseService",
    "BaseUpdateSchema",
    "ErrorResponse",
    "PaginationParams",
    "SoftDeleteMixin",
    "TimestampMixin",
    "UUIDMixin",
]
