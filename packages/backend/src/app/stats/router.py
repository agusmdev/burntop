"""Platform statistics router."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.stats.dependencies import get_stats_service
from app.stats.schemas import PlatformStatsResponse
from app.stats.service import StatsService

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get(
    "/platform",
    response_model=PlatformStatsResponse,
    summary="Get platform statistics",
    description="Public endpoint returning aggregate platform metrics for landing page display.",
)
async def get_platform_stats(
    response: Response,
    service: Annotated[StatsService, Depends(get_stats_service)],
) -> PlatformStatsResponse:
    """
    Get platform-wide statistics.

    Returns aggregate metrics including total tokens tracked,
    active users count, and supported AI tools count.

    This is a public endpoint (no authentication required).
    Results are cached for 15 minutes.
    """
    # Cache for 15 minutes (stats don't change frequently)
    response.headers["Cache-Control"] = "public, max-age=900"

    return await service.get_platform_stats()
