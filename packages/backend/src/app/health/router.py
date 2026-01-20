"""Health check router for uptime monitoring services."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.health.dependencies import get_health_service
from app.health.schemas import HealthResponse
from app.health.service import HealthService

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check endpoint",
    description="Check service health for uptime monitoring. Returns 200 OK if all checks pass, 503 Service Unavailable otherwise.",
)
async def health_check(
    response: Response,
    health_service: Annotated[HealthService, Depends(get_health_service)],
) -> HealthResponse:
    """
    Health check endpoint for uptime monitoring services.

    Checks:
    - Database connectivity

    Returns:
        HealthResponse: Overall health status and individual check results

    Response Status Codes:
        - 200 OK: Service is healthy (all checks passed)
        - 503 Service Unavailable: Service is unhealthy (one or more checks failed)

    Response Headers:
        - Cache-Control: no-cache, no-store, must-revalidate
          (ensures monitoring services always get fresh results)
    """
    # Set no-cache headers to ensure monitoring services get fresh results
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    # Perform health checks via service
    health_response, is_healthy = await health_service.check_health()

    # Set HTTP status code based on overall health
    if not is_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return health_response
