from typing import Any
from uuid import UUID


class AppException(Exception):
    """
    Base exception for all application errors.

    All custom exceptions should inherit from this class.
    Provides consistent error structure across the application.

    Attributes:
        message: Human-readable error description
        error_code: Machine-readable error code (e.g., "NOT_FOUND")
        status_code: HTTP status code
        details: Additional error context
    """

    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = 500,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(AppException):
    """
    Raised when a requested resource is not found.

    HTTP Status: 404
    """

    def __init__(
        self,
        resource: str,
        id: UUID | str | None = None,
        field: str | None = None,
        value: Any = None,
    ):
        if id is not None:
            message = f"{resource} with id '{id}' not found"
            details = {"resource": resource, "id": str(id)}
        elif field is not None:
            message = f"{resource} with {field}='{value}' not found"
            details = {"resource": resource, "field": field, "value": str(value)}
        else:
            message = f"{resource} not found"
            details = {"resource": resource}

        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=404,
            details=details,
        )


class ConflictError(AppException):
    """
    Raised when an operation conflicts with existing data.

    Examples:
    - Duplicate unique constraint violation
    - Resource already exists
    - Concurrent modification conflict

    HTTP Status: 409
    """

    def __init__(
        self,
        resource: str,
        field: str,
        value: Any,
        message: str | None = None,
    ):
        default_message = f"{resource} with {field}='{value}' already exists"
        super().__init__(
            message=message or default_message,
            error_code="CONFLICT",
            status_code=409,
            details={
                "resource": resource,
                "field": field,
                "value": str(value),
            },
        )


class ValidationError(AppException):
    """
    Raised for business logic validation failures.

    Use for validation that goes beyond Pydantic schema validation.

    HTTP Status: 422
    """

    def __init__(
        self,
        message: str,
        field: str | None = None,
        details: dict[str, Any] | None = None,
    ):
        error_details = details or {}
        if field:
            error_details["field"] = field

        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=422,
            details=error_details,
        )


class ForbiddenError(AppException):
    """
    Raised when user lacks permission for an operation.

    HTTP Status: 403
    """

    def __init__(
        self,
        message: str = "You do not have permission to perform this action",
        resource: str | None = None,
        action: str | None = None,
    ):
        details = {}
        if resource:
            details["resource"] = resource
        if action:
            details["action"] = action

        super().__init__(
            message=message,
            error_code="FORBIDDEN",
            status_code=403,
            details=details,
        )


class UnauthorizedError(AppException):
    """
    Raised when authentication is required but missing or invalid.

    HTTP Status: 401
    """

    def __init__(
        self,
        message: str = "Authentication required",
    ):
        super().__init__(
            message=message,
            error_code="UNAUTHORIZED",
            status_code=401,
        )


class BadRequestError(AppException):
    """
    Raised for malformed or invalid requests.

    HTTP Status: 400
    """

    def __init__(
        self,
        message: str,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(
            message=message,
            error_code="BAD_REQUEST",
            status_code=400,
            details=details or {},
        )


class DatabaseError(AppException):
    """
    Raised for database-related errors.

    HTTP Status: 500

    Note: Be careful not to expose sensitive database information.
    """

    def __init__(
        self,
        message: str = "A database error occurred",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            status_code=500,
            details=details or {},
        )


class ServiceUnavailableError(AppException):
    """
    Raised when an external service is unavailable.

    HTTP Status: 503
    """

    def __init__(
        self,
        service: str,
        message: str | None = None,
    ):
        super().__init__(
            message=message or f"Service '{service}' is currently unavailable",
            error_code="SERVICE_UNAVAILABLE",
            status_code=503,
            details={"service": service},
        )


class RateLimitError(AppException):
    """
    Raised when rate limit is exceeded.

    HTTP Status: 429
    """

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: int | None = None,
    ):
        details = {}
        if retry_after:
            details["retry_after"] = retry_after

        super().__init__(
            message=message,
            error_code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details=details,
        )
