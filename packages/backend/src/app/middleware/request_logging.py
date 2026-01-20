"""Request logging middleware for HTTP request/response tracking."""

import logging
import time
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs all HTTP requests and responses.

    Logs:
    - Incoming request: method, path, query params, headers
    - Outgoing response: status code, duration
    - Request body (for non-GET requests, truncated for large payloads)
    """

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ) -> Response:
        # Start timer
        start_time = time.time()

        # Log incoming request
        logger.info(
            f"→ {request.method} {request.url.path}",
            extra={
                "method": request.method,
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "client_host": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
            },
        )

        # Log request headers in debug mode
        logger.debug(
            f"Request headers: {dict(request.headers)}",
            extra={"headers": dict(request.headers)},
        )

        # Process request
        try:
            response = await call_next(request)
        except Exception as exc:
            # Log exception
            duration = (time.time() - start_time) * 1000
            logger.error(
                f"✗ {request.method} {request.url.path} - Exception: {exc}",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration, 2),
                    "exception": str(exc),
                },
                exc_info=True,
            )
            raise

        # Calculate duration
        duration = (time.time() - start_time) * 1000

        # Log response
        status_emoji = "✓" if response.status_code < 400 else "✗"
        logger.info(
            f"{status_emoji} {request.method} {request.url.path} - {response.status_code} ({duration:.2f}ms)",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration, 2),
            },
        )

        # Log response headers in debug mode
        logger.debug(
            f"Response headers: {dict(response.headers)}",
            extra={"headers": dict(response.headers)},
        )

        return response
