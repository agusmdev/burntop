import contextvars
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

# Context variable to store correlation ID for the current request
_correlation_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "correlation_id",
    default=None,
)

# Header name for correlation ID
CORRELATION_ID_HEADER = "X-Correlation-ID"


def get_correlation_id() -> str | None:
    """
    Get the correlation ID for the current request context.

    Returns None if called outside of a request context.

    Usage:
        from app.middleware.correlation_id import get_correlation_id

        correlation_id = get_correlation_id()
        logger.info("Processing", extra={"correlation_id": correlation_id})
    """
    return _correlation_id_ctx.get()


def set_correlation_id(correlation_id: str) -> None:
    """
    Set the correlation ID for the current context.

    Typically called by middleware, but can be used in tests
    or background tasks.
    """
    _correlation_id_ctx.set(correlation_id)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware that manages correlation IDs for request tracing.

    Behavior:
    1. Checks for X-Correlation-ID header in incoming request
    2. If present, uses that ID (for distributed tracing)
    3. If absent, generates a new UUID
    4. Stores ID in context variable (accessible via get_correlation_id())
    5. Adds ID to response headers

    This enables tracing requests across:
    - Multiple services (when ID is passed in headers)
    - Log aggregation systems
    - Error tracking systems
    """

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        # Get correlation ID from header or generate new one
        correlation_id = request.headers.get(CORRELATION_ID_HEADER)
        if not correlation_id:
            correlation_id = str(uuid4())

        # Store in context variable
        set_correlation_id(correlation_id)

        # Process request
        response = await call_next(request)

        # Add to response headers
        response.headers[CORRELATION_ID_HEADER] = correlation_id

        return response
