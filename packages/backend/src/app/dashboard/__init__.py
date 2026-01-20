"""Dashboard module for dashboard data aggregation."""

from app.dashboard.dependencies import get_dashboard_service
from app.dashboard.router import router
from app.dashboard.schemas import (
    DailyTrendData,
    DashboardModelsResponse,
    DashboardOverviewResponse,
    DashboardToolsResponse,
    DashboardTrendsResponse,
    ModelUsageData,
    ToolUsageData,
)
from app.dashboard.service import DashboardService

__all__ = [
    "DailyTrendData",
    "DashboardModelsResponse",
    "DashboardOverviewResponse",
    "DashboardService",
    "DashboardToolsResponse",
    "DashboardTrendsResponse",
    "ModelUsageData",
    "ToolUsageData",
    "get_dashboard_service",
    "router",
]
