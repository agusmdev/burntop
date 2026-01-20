import logging
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.exceptions import AppException
from app.middleware.correlation_id import get_correlation_id
from app.schemas.error import ErrorResponse, ValidationErrorDetail, ValidationErrorResponse

logger = logging.getLogger(__name__)


def _get_correlation_id_or_generate() -> str:
    """Get correlation ID from context or generate a new one."""
    correlation_id = get_correlation_id()
    return correlation_id if correlation_id else str(uuid4())


async def app_exception_handler(
    request: Request,
    exc: AppException,
) -> JSONResponse:
    """
    Handle all AppException subclasses.

    Converts application exceptions to standardized JSON responses.
    """
    correlation_id = _get_correlation_id_or_generate()

    # Log the error
    logger.warning(
        "Application error occurred",
        extra={
            "error_code": exc.error_code,
            "status_code": exc.status_code,
            "error_message": exc.message,
            "details": exc.details,
            "correlation_id": correlation_id,
            "path": str(request.url.path),
        },
    )

    error_response = ErrorResponse(
        detail=exc.message,
        error_code=exc.error_code,
        correlation_id=correlation_id,
        timestamp=datetime.now(UTC),
        details=exc.details,
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump(mode="json"),
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """
    Handle Pydantic/FastAPI validation errors.

    Converts validation errors to standardized format while
    preserving the detailed error information.
    """
    correlation_id = _get_correlation_id_or_generate()

    logger.warning(
        "Validation error",
        extra={
            "errors": exc.errors(),
            "correlation_id": correlation_id,
            "path": str(request.url.path),
        },
    )

    # Convert error dicts to ValidationErrorDetail objects
    error_details: list[ValidationErrorDetail] = []
    for err in exc.errors():
        error_details.append(
            ValidationErrorDetail(
                loc=list(err["loc"]),
                msg=err["msg"],
                type=err["type"],
            )
        )

    error_response = ValidationErrorResponse(
        detail=error_details,
        correlation_id=correlation_id,
        timestamp=datetime.now(UTC),
    )

    return JSONResponse(
        status_code=422,
        content=error_response.model_dump(mode="json"),
    )


async def pydantic_validation_exception_handler(
    _request: Request,
    exc: PydanticValidationError,
) -> JSONResponse:
    """
    Handle raw Pydantic validation errors (not from FastAPI).
    """
    correlation_id = _get_correlation_id_or_generate()

    # Convert error dicts to ValidationErrorDetail objects
    error_details: list[ValidationErrorDetail] = []
    for err in exc.errors():
        error_details.append(
            ValidationErrorDetail(
                loc=[str(loc) for loc in err["loc"]],
                msg=err["msg"],
                type=err["type"],
            )
        )

    error_response = ValidationErrorResponse(
        detail=error_details,
        correlation_id=correlation_id,
        timestamp=datetime.now(UTC),
    )

    return JSONResponse(
        status_code=422,
        content=error_response.model_dump(mode="json"),
    )


async def integrity_error_handler(
    request: Request,
    exc: IntegrityError,
) -> JSONResponse:
    """
    Handle SQLAlchemy IntegrityError (constraint violations).

    Attempts to parse the error and return a user-friendly message.
    """
    correlation_id = _get_correlation_id_or_generate()

    logger.error(
        "Database integrity error",
        extra={
            "error": str(exc.orig),
            "correlation_id": correlation_id,
            "path": str(request.url.path),
        },
    )

    # Try to extract constraint name for better error message
    error_str = str(exc.orig)

    # Common patterns for PostgreSQL unique constraint violations
    if "unique constraint" in error_str.lower():
        error_response = ErrorResponse(
            detail="A record with this value already exists",
            error_code="CONFLICT",
            correlation_id=correlation_id,
            timestamp=datetime.now(UTC),
        )
        return JSONResponse(
            status_code=409,
            content=error_response.model_dump(mode="json"),
        )

    # Foreign key violation
    if "foreign key constraint" in error_str.lower():
        error_response = ErrorResponse(
            detail="Referenced record does not exist",
            error_code="VALIDATION_ERROR",
            correlation_id=correlation_id,
            timestamp=datetime.now(UTC),
        )
        return JSONResponse(
            status_code=422,
            content=error_response.model_dump(mode="json"),
        )

    # Generic database error
    error_response = ErrorResponse(
        detail="A database constraint was violated",
        error_code="DATABASE_ERROR",
        correlation_id=correlation_id,
        timestamp=datetime.now(UTC),
    )
    return JSONResponse(
        status_code=500,
        content=error_response.model_dump(mode="json"),
    )


async def sqlalchemy_error_handler(
    request: Request,
    exc: SQLAlchemyError,
) -> JSONResponse:
    """
    Handle generic SQLAlchemy errors.

    Logs the full error but returns a generic message to avoid
    exposing database internals.
    """
    correlation_id = _get_correlation_id_or_generate()

    logger.error(
        "Database error",
        extra={
            "error": str(exc),
            "correlation_id": correlation_id,
            "path": str(request.url.path),
        },
        exc_info=True,
    )

    error_response = ErrorResponse(
        detail="A database error occurred",
        error_code="DATABASE_ERROR",
        correlation_id=correlation_id,
        timestamp=datetime.now(UTC),
    )

    return JSONResponse(
        status_code=500,
        content=error_response.model_dump(mode="json"),
    )


async def unhandled_exception_handler(
    request: Request,
    _exc: Exception,
) -> JSONResponse:
    """
    Catch-all handler for unhandled exceptions.

    Logs the full exception but returns a generic error to the client.
    """
    correlation_id = _get_correlation_id_or_generate()

    logger.exception(
        "Unhandled exception",
        extra={
            "correlation_id": correlation_id,
            "path": str(request.url.path),
        },
    )

    error_response = ErrorResponse(
        detail="An unexpected error occurred",
        error_code="INTERNAL_ERROR",
        correlation_id=correlation_id,
        timestamp=datetime.now(UTC),
    )

    return JSONResponse(
        status_code=500,
        content=error_response.model_dump(mode="json"),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """
    Register all exception handlers with the FastAPI app.

    Call this in your app factory:
        register_exception_handlers(app)
    """
    # Application exceptions
    app.add_exception_handler(AppException, app_exception_handler)  # type: ignore[arg-type]

    # Validation exceptions
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(PydanticValidationError, pydantic_validation_exception_handler)  # type: ignore[arg-type]

    # Database exceptions
    app.add_exception_handler(IntegrityError, integrity_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)  # type: ignore[arg-type]

    # Catch-all (must be last)
    app.add_exception_handler(Exception, unhandled_exception_handler)  # type: ignore[arg-type]
