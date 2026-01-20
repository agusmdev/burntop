"""Dashboard service with business logic for dashboard data aggregation."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from app.dashboard.repository import DashboardRepository
from app.dashboard.schemas import (
    DailyTrendData,
    DashboardModelsResponse,
    DashboardOverviewResponse,
    DashboardToolsResponse,
    DashboardTrendsResponse,
    ModelUsageData,
    ToolUsageData,
)

if TYPE_CHECKING:
    from app.streak.service import StreakService
    from app.user.service import UserService

# Badge thresholds (in tokens)
BADGE_THRESHOLD_POWER_USER = 10_000_000  # 10M tokens
BADGE_THRESHOLD_AI_NATIVE = 100_000_000  # 100M tokens
BADGE_THRESHOLD_TOKEN_TITAN = 1_000_000_000  # 1B tokens


def calculate_ai_native_badge(total_tokens: int) -> str | None:
    """
    Calculate the AI Native tier badge based on rolling 30-day token usage.

    Badge thresholds:
    - None: < 10M tokens
    - "Power User": 10M - 100M tokens
    - "AI Native": 100M - 1B tokens
    - "Token Titan": > 1B tokens

    Args:
        total_tokens: Total number of tokens used in the last 30 days

    Returns:
        Badge name or None if below minimum threshold
    """
    if total_tokens >= BADGE_THRESHOLD_TOKEN_TITAN:
        return "Token Titan"
    elif total_tokens >= BADGE_THRESHOLD_AI_NATIVE:
        return "AI Native"
    elif total_tokens >= BADGE_THRESHOLD_POWER_USER:
        return "Power User"
    else:
        return None


class DashboardService:
    """
    Service for Dashboard with business logic.

    Aggregates data from UsageRecord, Streak, and UserAchievement models
    for dashboard display. Uses entity services for cross-entity data access.
    """

    def __init__(
        self,
        repository: DashboardRepository,
        streak_service: "StreakService",
        user_service: "UserService",
    ) -> None:
        """
        Initialize DashboardService.

        Args:
            repository: Dashboard repository for UsageRecord data access
            streak_service: StreakService for streak data
            user_service: UserService for user data
        """
        self._repository = repository
        self._streak_service = streak_service
        self._user_service = user_service

    async def get_overview(self, user_id: UUID) -> DashboardOverviewResponse:
        """
        Get dashboard overview statistics for a user.

        Aggregates:
        - Total tokens and cost
        - Streak information
        - Achievement count
        - Usage stats (unique days, models, sources)
        - Cache efficiency

        Args:
            user_id: User ID to get overview for

        Returns:
            DashboardOverviewResponse with aggregated statistics
        """
        # Get usage aggregations from repository (UsageRecord queries only)
        usage = await self._repository.get_usage_aggregations(user_id)

        # Calculate cache efficiency
        total_input = usage.total_input_tokens
        total_cache_read = usage.total_cache_read_tokens
        if total_input + total_cache_read > 0:
            cache_efficiency = (
                Decimal(total_cache_read)
                / Decimal(total_input + total_cache_read)
                * Decimal("100.0")
            )
        else:
            cache_efficiency = Decimal("0.0")

        streak = await self._streak_service.get_by_user_id(user_id)
        # Get rolling 30-day tokens for AI Native tier calculation
        monthly_tokens = await self._repository.get_rolling_30_day_tokens(user_id)
        monthly_badge = calculate_ai_native_badge(monthly_tokens)

        return DashboardOverviewResponse(
            total_tokens=usage.total_tokens,
            total_input_tokens=usage.total_input_tokens,
            total_output_tokens=usage.total_output_tokens,
            total_cache_read_tokens=usage.total_cache_read_tokens,
            total_cache_write_tokens=usage.total_cache_write_tokens,
            total_reasoning_tokens=usage.total_reasoning_tokens,
            total_cost=usage.total_cost,
            current_streak=streak.current_streak if streak else 0,
            longest_streak=streak.longest_streak if streak else 0,
            monthly_tokens=monthly_tokens,
            monthly_badge=monthly_badge,
            unique_days=usage.unique_days,
            unique_models=usage.unique_models,
            unique_sources=usage.unique_sources,
            cache_efficiency=cache_efficiency.quantize(Decimal("0.01")),
        )

    async def get_trends(self, user_id: UUID, days: int = 30) -> DashboardTrendsResponse:
        """
        Get daily usage trends for charting.

        Returns data for all days in the requested range, with zero values
        for days without usage data (to support consistent chart rendering).

        Args:
            user_id: User ID to get trends for
            days: Number of days to include (default 30)

        Returns:
            DashboardTrendsResponse with daily data points
        """
        # Calculate date range
        period_end = datetime.now(tz=UTC).date()
        period_start = period_end - timedelta(days=days - 1)

        # Get daily aggregations from repository
        rows = await self._repository.get_daily_trends(user_id, period_start, period_end)

        # Create a map of date -> data for quick lookup
        data_by_date: dict = {}
        for row in rows:
            total_tokens = (
                row.input_tokens
                + row.output_tokens
                + row.cache_read_tokens
                + row.cache_write_tokens
                + row.reasoning_tokens
            )
            data_by_date[row.date] = DailyTrendData(
                date=row.date,
                tokens=total_tokens,
                cost=row.cost,
                input_tokens=row.input_tokens,
                output_tokens=row.output_tokens,
                cache_read_tokens=row.cache_read_tokens,
                cache_write_tokens=row.cache_write_tokens,
                reasoning_tokens=row.reasoning_tokens,
            )

        # Generate all dates in range, filling in zeros for missing days
        daily_data = []
        current_date = period_start
        while current_date <= period_end:
            if current_date in data_by_date:
                daily_data.append(data_by_date[current_date])
            else:
                # Fill in zero values for days without data
                daily_data.append(
                    DailyTrendData(
                        date=current_date,
                        tokens=0,
                        cost=Decimal("0.0"),
                        input_tokens=0,
                        output_tokens=0,
                        cache_read_tokens=0,
                        cache_write_tokens=0,
                        reasoning_tokens=0,
                    )
                )
            current_date += timedelta(days=1)

        return DashboardTrendsResponse(
            daily_data=daily_data,
            period_start=period_start,
            period_end=period_end,
        )

    async def get_tools_breakdown(self, user_id: UUID) -> DashboardToolsResponse:
        """
        Get usage breakdown by tool/source.

        Args:
            user_id: User ID to get breakdown for

        Returns:
            DashboardToolsResponse with tool usage data
        """
        # Get source aggregations from repository
        rows = await self._repository.get_tools_breakdown(user_id)

        # Calculate total for percentages
        total_tokens = sum(row.tokens for row in rows)

        # Convert to response format
        tools = []
        for row in rows:
            percentage = (
                (Decimal(row.tokens) / Decimal(total_tokens) * Decimal("100.0"))
                if total_tokens > 0
                else Decimal("0.0")
            )
            tools.append(
                ToolUsageData(
                    source=row.source,
                    tokens=row.tokens,
                    cost=row.cost,
                    percentage=percentage.quantize(Decimal("0.01")),
                    days_active=row.days_active,
                )
            )

        return DashboardToolsResponse(
            tools=tools,
            total_tools=len(tools),
        )

    async def get_models_breakdown(self, user_id: UUID) -> DashboardModelsResponse:
        """
        Get usage breakdown by AI model.

        Args:
            user_id: User ID to get breakdown for

        Returns:
            DashboardModelsResponse with model usage data
        """
        # Get model aggregations from repository
        rows = await self._repository.get_models_breakdown(user_id)

        # Calculate total for percentages
        total_tokens = sum(row.tokens for row in rows)

        # Convert to response format
        models = []
        for row in rows:
            percentage = (
                (Decimal(row.tokens) / Decimal(total_tokens) * Decimal("100.0"))
                if total_tokens > 0
                else Decimal("0.0")
            )
            models.append(
                ModelUsageData(
                    model=row.model,
                    tokens=row.tokens,
                    cost=row.cost,
                    percentage=percentage.quantize(Decimal("0.01")),
                    days_active=row.days_active,
                )
            )

        return DashboardModelsResponse(
            models=models,
            total_models=len(models),
        )
