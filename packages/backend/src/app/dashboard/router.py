"""Dashboard router with endpoints for user dashboard data."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.auth.dependencies import get_current_user
from app.auth.schemas import SessionUserResponse
from app.dashboard.dependencies import get_dashboard_service
from app.dashboard.schemas import (
    DashboardModelsResponse,
    DashboardOverviewResponse,
    DashboardToolsResponse,
    DashboardTrendsResponse,
)
from app.dashboard.service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get(
    "/overview",
    response_model=DashboardOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get dashboard overview",
    description="Get aggregated statistics for the authenticated user's dashboard overview.",
)
async def get_overview(
    dashboard_service: Annotated[DashboardService, Depends(get_dashboard_service)],
    current_user: Annotated[SessionUserResponse, Depends(get_current_user)],
) -> DashboardOverviewResponse:
    """
    Get dashboard overview statistics.

    Returns aggregated stats including:
    - Total tokens and cost
    - Streak information (current and longest)
    - Achievement count
    - Usage stats (unique days, models, sources)
    - Cache efficiency percentage
    - Level and XP

    Args:
        dashboard_service: Dashboard service instance
        current_user: Authenticated user (from Bearer token)

    Returns:
        DashboardOverviewResponse with aggregated statistics

    Raises:
        UnauthorizedError: If not authenticated (401)
    """
    return await dashboard_service.get_overview(user_id=current_user.id)


@router.get(
    "/trends",
    response_model=DashboardTrendsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get dashboard trends",
    description="Get daily usage trends for charting over a specified time period.",
)
async def get_trends(
    dashboard_service: Annotated[DashboardService, Depends(get_dashboard_service)],
    current_user: Annotated[SessionUserResponse, Depends(get_current_user)],
    days: int = Query(default=30, ge=1, le=365, description="Number of days to include (1-365)"),
) -> DashboardTrendsResponse:
    """
    Get daily usage trends for charting.

    Returns daily data points with:
    - Date
    - Total tokens (sum of all token types)
    - Cost in USD
    - Breakdown by token type (input, output, cache read/write, reasoning)

    Args:
        dashboard_service: Dashboard service instance
        current_user: Authenticated user (from Bearer token)
        days: Number of days to include (default 30, max 365)

    Returns:
        DashboardTrendsResponse with daily data points and period info

    Raises:
        UnauthorizedError: If not authenticated (401)
    """
    return await dashboard_service.get_trends(user_id=current_user.id, days=days)


@router.get(
    "/tools",
    response_model=DashboardToolsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get tools breakdown",
    description="Get usage breakdown by tool/source for the authenticated user.",
)
async def get_tools_breakdown(
    dashboard_service: Annotated[DashboardService, Depends(get_dashboard_service)],
    current_user: Annotated[SessionUserResponse, Depends(get_current_user)],
) -> DashboardToolsResponse:
    """
    Get usage breakdown by tool/source.

    Returns breakdown with:
    - Source/tool identifier
    - Total tokens
    - Total cost in USD
    - Percentage of total usage
    - Number of days the tool was active

    Sorted by cost descending.

    Args:
        dashboard_service: Dashboard service instance
        current_user: Authenticated user (from Bearer token)

    Returns:
        DashboardToolsResponse with tool usage data

    Raises:
        UnauthorizedError: If not authenticated (401)
    """
    return await dashboard_service.get_tools_breakdown(user_id=current_user.id)


@router.get(
    "/models",
    response_model=DashboardModelsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get models breakdown",
    description="Get usage breakdown by AI model for the authenticated user.",
)
async def get_models_breakdown(
    dashboard_service: Annotated[DashboardService, Depends(get_dashboard_service)],
    current_user: Annotated[SessionUserResponse, Depends(get_current_user)],
) -> DashboardModelsResponse:
    """
    Get usage breakdown by AI model.

    Returns breakdown with:
    - Model identifier
    - Total tokens
    - Total cost in USD
    - Percentage of total usage
    - Number of days the model was active

    Sorted by cost descending.

    Args:
        dashboard_service: Dashboard service instance
        current_user: Authenticated user (from Bearer token)

    Returns:
        DashboardModelsResponse with model usage data

    Raises:
        UnauthorizedError: If not authenticated (401)
    """
    return await dashboard_service.get_models_breakdown(user_id=current_user.id)
