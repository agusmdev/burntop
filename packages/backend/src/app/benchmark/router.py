"""Benchmark router for community insights endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import get_current_user_id
from app.benchmark.dependencies import get_benchmark_service
from app.benchmark.schemas import InsightsResponse
from app.benchmark.service import BenchmarkService
from app.exceptions import NotFoundError

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/", response_model=InsightsResponse)
async def get_user_insights(
    service: Annotated[BenchmarkService, Depends(get_benchmark_service)],
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    period: Annotated[
        str,
        Query(
            pattern="^(all|month|week)$",
            description="Time period for insights (all, month, week)",
        ),
    ] = "all",
) -> InsightsResponse:
    """
    Get user insights comparing stats to community benchmarks.

    This endpoint compares the authenticated user's statistics (tokens, cost,
    streak, tools usage, cache efficiency) against community averages and
    returns percentile rankings.

    **Percentile interpretation:**
    - 100 = Top performer (best 1%)
    - 50 = Median performer
    - 0 = Bottom performer

    **Requires authentication.**

    Args:
        service: Injected BenchmarkService instance
        user_id: Current authenticated user's ID from Bearer token
        period: Time period for comparison (all, month, week)

    Returns:
        InsightsResponse with user stats, community benchmarks, and percentile rankings

    Raises:
        NotFoundError: If user not found or benchmarks not available
    """
    insights = await service.get_user_insights(user_id, period)
    if not insights:
        raise NotFoundError(
            resource="Insights",
        )
    return insights
