"""
Rate limiting middleware for FastAPI.

Implements in-memory sliding window rate limiting to prevent abuse.
Adds rate limit headers (X-RateLimit-*) to all responses.
"""

import logging
import time
from collections import defaultdict
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.exceptions import RateLimitError

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using in-memory sliding window algorithm.

    Tracks requests per client IP and enforces configurable rate limits.
    Adds X-RateLimit-* headers to all responses for client transparency.

    Note: This is an in-memory implementation suitable for single-instance deployments.
    For distributed deployments, use Redis or similar distributed storage.
    """

    def __init__(
        self,
        app,
        requests_per_minute: int = 60,
        burst_size: int = 10,
    ):
        """
        Initialize rate limiter with configurable limits.

        Args:
            app: FastAPI application instance
            requests_per_minute: Maximum requests allowed per minute (default: 60)
            burst_size: Maximum burst requests within a short window (default: 10)
        """
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        self.window_size = 60  # 60 seconds for sliding window

        # In-memory storage: {client_id: [(timestamp, ...)]}
        self._requests: dict[str, list[float]] = defaultdict(list)

        logger.info(
            "RateLimitMiddleware initialized",
            extra={
                "requests_per_minute": requests_per_minute,
                "burst_size": burst_size,
            },
        )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request with rate limiting.

        Args:
            request: FastAPI request object
            call_next: Next middleware or endpoint handler

        Returns:
            Response with rate limit headers

        Raises:
            RateLimitError: If rate limit is exceeded (429)
        """
        # Skip rate limiting for health check endpoint
        if request.url.path == "/api/v1/health":
            return await call_next(request)

        # Get client identifier (IP address)
        client_id = self._get_client_id(request)

        # Check rate limit
        current_time = time.time()
        is_allowed, remaining, reset_time = self._check_rate_limit(client_id, current_time)

        # Add rate limit headers
        headers = {
            "X-RateLimit-Limit": str(self.requests_per_minute),
            "X-RateLimit-Remaining": str(max(0, remaining)),
            "X-RateLimit-Reset": str(int(reset_time)),
        }

        if not is_allowed:
            # Rate limit exceeded
            retry_after = int(reset_time - current_time)
            headers["Retry-After"] = str(retry_after)

            logger.warning(
                "Rate limit exceeded",
                extra={
                    "client_id": client_id,
                    "path": request.url.path,
                    "retry_after": retry_after,
                },
            )

            raise RateLimitError(
                message=f"Rate limit exceeded. Retry after {retry_after} seconds.",
                retry_after=retry_after,
            )

        # Record request
        self._record_request(client_id, current_time)

        # Process request
        response = await call_next(request)

        # Add rate limit headers to response
        for header, value in headers.items():
            response.headers[header] = value

        return response

    def _get_client_id(self, request: Request) -> str:
        """
        Get unique client identifier from request.

        Uses X-Forwarded-For header if behind a proxy, otherwise client IP.

        Args:
            request: FastAPI request object

        Returns:
            Client identifier string (IP address)
        """
        # Check for X-Forwarded-For header (behind proxy)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take first IP if multiple proxies
            return forwarded_for.split(",")[0].strip()

        # Use direct client IP
        if request.client:
            return request.client.host

        # Fallback for testing
        return "unknown"

    def _check_rate_limit(self, client_id: str, current_time: float) -> tuple[bool, int, float]:
        """
        Check if request is within rate limit.

        Uses sliding window algorithm to count requests in the last minute.

        Args:
            client_id: Client identifier (IP address)
            current_time: Current timestamp (seconds since epoch)

        Returns:
            Tuple of (is_allowed, remaining_requests, reset_timestamp)
        """
        # Get request timestamps for client
        timestamps = self._requests.get(client_id, [])

        # Remove timestamps outside the sliding window
        cutoff_time = current_time - self.window_size
        recent_requests = [ts for ts in timestamps if ts > cutoff_time]

        # Calculate remaining requests
        request_count = len(recent_requests)
        remaining = self.requests_per_minute - request_count

        # Calculate reset time (oldest request + window size)
        if recent_requests:
            reset_time = recent_requests[0] + self.window_size
        else:
            reset_time = current_time + self.window_size

        # Check if limit exceeded
        is_allowed = request_count < self.requests_per_minute

        return is_allowed, remaining, reset_time

    def _record_request(self, client_id: str, current_time: float) -> None:
        """
        Record a request timestamp for client.

        Also cleans up old timestamps outside the sliding window.

        Args:
            client_id: Client identifier (IP address)
            current_time: Current timestamp (seconds since epoch)
        """
        # Get existing timestamps
        timestamps = self._requests[client_id]

        # Add current request
        timestamps.append(current_time)

        # Clean up old timestamps (keep window + 10 seconds for safety)
        cutoff_time = current_time - (self.window_size + 10)
        self._requests[client_id] = [ts for ts in timestamps if ts > cutoff_time]

        # Clean up empty entries to prevent memory leak
        if not self._requests[client_id]:
            del self._requests[client_id]


def create_rate_limit_decorator(
    requests_per_minute: int = 60,  # noqa: ARG001
) -> Callable:
    """
    Create a decorator for route-specific rate limiting.

    This allows applying different rate limits to specific endpoints.

    Args:
        requests_per_minute: Maximum requests allowed per minute

    Returns:
        Decorator function for FastAPI routes

    Example:
        ```python
        from app.middleware.rate_limit import create_rate_limit_decorator

        rate_limit = create_rate_limit_decorator(requests_per_minute=10)


        @router.post("/sync")
        @rate_limit
        async def sync_endpoint(): ...
        ```

    Note: This is a placeholder. Actual implementation would require
    a global rate limiter instance or Redis for distributed rate limiting.
    For now, use the middleware for application-wide rate limiting.
    """

    # This is a simplified implementation
    # In production, use a proper rate limiting library like slowapi
    def decorator(func: Callable) -> Callable:
        return func

    return decorator
