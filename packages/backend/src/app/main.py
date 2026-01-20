"""FastAPI application factory.

Creates and configures the FastAPI application with all necessary middleware,
exception handlers, and routers.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_pagination import add_pagination

from app.api.v1 import api_router
from app.config import get_settings
from app.exception_handlers import register_exception_handlers
from app.logging import get_logger, setup_logging
from app.middleware.correlation_id import CorrelationIdMiddleware
from app.middleware.request_logging import RequestLoggingMiddleware
from app.tasks import shutdown_scheduler, start_scheduler

# Initialize logger
logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """
    Application lifespan manager.

    Handles startup and shutdown events.
    """
    # Startup
    setup_logging()
    logger.info(
        "FastAPI application starting",
        extra={
            "app_name": settings.app_name,
            "debug": settings.debug,
        },
    )

    # Start scheduler for background tasks
    await start_scheduler()
    logger.info("Background task scheduler started")

    yield

    # Shutdown
    logger.info("FastAPI application shutting down")

    # Stop scheduler
    await shutdown_scheduler()
    logger.info("Background task scheduler stopped")


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        FastAPI: Configured FastAPI application instance
    """
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        lifespan=lifespan,
        docs_url="/docs" if settings.debug else None,  # Disable docs in production
        redoc_url="/redoc" if settings.debug else None,
    )

    # Configure CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add correlation ID middleware (must be early in the stack)
    app.add_middleware(CorrelationIdMiddleware)

    # Add request logging middleware (after correlation ID)
    app.add_middleware(RequestLoggingMiddleware)

    # Register exception handlers
    register_exception_handlers(app)

    # Configure fastapi-pagination
    add_pagination(app)

    # Include API v1 router
    app.include_router(api_router, prefix="/api/v1")

    logger.info("FastAPI application created successfully")

    return app


# Create application instance for uvicorn
app = create_app()
