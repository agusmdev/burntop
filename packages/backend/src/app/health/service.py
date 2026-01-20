"""Health service for business logic."""

from datetime import UTC, datetime

from app.health.repository import HealthRepository
from app.health.schemas import HealthCheckResponse, HealthResponse
from app.logging import get_logger

logger = get_logger(__name__)


class HealthService:
    """
    Service for health check operations.

    Orchestrates health checks across different system components.
    """

    def __init__(self, repository: HealthRepository):
        """
        Initialize HealthService with repository.

        Args:
            repository: HealthRepository instance
        """
        self._repository = repository

    async def check_health(self) -> tuple[HealthResponse, bool]:
        """
        Perform all health checks and return aggregated result.

        Returns:
            Tuple of (HealthResponse, is_healthy)
            - HealthResponse: Detailed health check results
            - is_healthy: Boolean indicating if all checks passed
        """
        # Check database connectivity
        database_ok = await self._repository.check_database_connectivity()

        # Build response
        checks = HealthCheckResponse(
            database="ok" if database_ok else "error",
        )

        overall_status = "ok" if database_ok else "degraded"
        is_healthy = database_ok

        response = HealthResponse(
            status=overall_status,
            timestamp=datetime.now(UTC),
            checks=checks,
        )

        return response, is_healthy
