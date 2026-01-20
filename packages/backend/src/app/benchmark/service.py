"""Benchmark service for community statistics and user insights."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from app.benchmark.repository import CommunityBenchmarkRepository
from app.benchmark.schemas import (
    CommunityBenchmarkCreate,
    CommunityBenchmarkResponse,
    CommunityBenchmarkUpdate,
    InsightsResponse,
)
from app.core import BaseService

if TYPE_CHECKING:
    from app.user.service import UserService


class BenchmarkService(
    BaseService["CommunityBenchmark", CommunityBenchmarkCreate, CommunityBenchmarkUpdate]
):
    """
    Service for community benchmarks and user insights.

    Provides:
    - Community-wide statistics aggregation
    - Percentile calculations for user comparisons
    - User insights comparing individual performance to community averages
    """

    def __init__(
        self,
        repository: CommunityBenchmarkRepository,
        user_service: "UserService",
    ):
        """
        Initialize service with repository.

        Args:
            repository: Repository for benchmark data access
            user_service: UserService for user data access
        """
        super().__init__(repository)
        self._repository: CommunityBenchmarkRepository = repository
        self._user_service = user_service

    async def get_current_benchmarks(
        self, period: str = "all"
    ) -> CommunityBenchmarkResponse | None:
        """
        Get current community benchmarks for a specific period.

        Args:
            period: Time period (all, month, week). Defaults to "all".

        Returns:
            Community benchmark data if exists, None otherwise
        """
        benchmark = await self._repository.get_current(period)
        if not benchmark:
            return None
        return CommunityBenchmarkResponse.model_validate(benchmark)

    async def update_benchmarks(self, period: str = "all") -> CommunityBenchmarkResponse:
        """
        Calculate and update community benchmarks for a period.

        This method aggregates statistics from all users and usage records
        for the specified period and updates the cached benchmark data.

        Called by background task on a regular schedule (e.g., hourly).

        Args:
            period: Time period to calculate ("all", "month", "week")

        Returns:
            Updated community benchmark data
        """
        # Determine date filter based on period
        date_filter = self._get_date_filter(period)

        # Calculate aggregated statistics
        benchmark_data = await self._calculate_benchmark_stats(period, date_filter)

        # Upsert benchmark (insert or update)
        benchmark = await self._repository.upsert_benchmark(benchmark_data)

        return CommunityBenchmarkResponse.model_validate(benchmark)

    async def get_user_insights(
        self, user_id: UUID, period: str = "all"
    ) -> InsightsResponse | None:
        """
        Get insights comparing user's stats to community benchmarks.

        Args:
            user_id: UUID of the user
            period: Time period for comparison (all, month, week)

        Returns:
            User insights with percentile rankings, or None if user not found
        """
        # Get user data via UserService
        user = await self._user_service.get_by_id(user_id)
        if not user:
            return None

        # Get community benchmarks
        benchmark = await self._repository.get_current(period)
        if not benchmark:
            # No benchmarks available yet
            return None

        # Get user's personal stats for the period
        user_stats = await self._get_user_stats(user_id, period)

        # Calculate percentiles
        percentiles = await self._calculate_percentiles(user_id, user_stats, period)

        # Build insights response
        return InsightsResponse(
            id=user_id,
            username=user.username,
            period=period,
            # User stats
            user_total_tokens=user_stats["total_tokens"],
            user_total_cost=user_stats["total_cost"],
            user_current_streak=user_stats["current_streak"],
            user_unique_tools=user_stats["unique_tools"],
            user_cache_efficiency=user_stats["cache_efficiency"],
            user_unique_days=user_stats["unique_days"],
            # Community benchmarks
            community_avg_tokens=benchmark.avg_tokens,
            community_median_tokens=benchmark.median_tokens,
            community_avg_cost=float(benchmark.avg_cost) if benchmark.avg_cost else None,
            community_avg_streak=benchmark.avg_streak,
            community_avg_unique_tools=benchmark.avg_unique_tools,
            community_avg_cache_efficiency=(
                float(benchmark.avg_cache_efficiency) if benchmark.avg_cache_efficiency else None
            ),
            community_total_users=benchmark.total_users,
            # Percentiles
            tokens_percentile=percentiles.get("tokens"),
            cost_percentile=percentiles.get("cost"),
            streak_percentile=percentiles.get("streak"),
            tools_percentile=percentiles.get("tools"),
            cache_efficiency_percentile=percentiles.get("cache_efficiency"),
            created_at=benchmark.created_at,
            updated_at=benchmark.updated_at,
        )

    async def _calculate_benchmark_stats(self, period: str, date_filter: datetime | None) -> dict:
        """
        Calculate aggregate statistics for all users in a period.

        Args:
            period: Time period identifier
            date_filter: Date cutoff for filtering (None for all-time)

        Returns:
            Dictionary of benchmark statistics
        """
        # Convert datetime to date for repository methods
        date_cutoff = date_filter.date() if date_filter else None

        # Count total active users (users with usage records in period)
        total_users = await self._repository.count_active_users(date_cutoff)

        if total_users == 0:
            # No users yet, return default values
            return {
                "period": period,
                "total_users": 0,
                "avg_tokens": None,
                "median_tokens": None,
                "total_community_tokens": None,
                "avg_cost": None,
                "avg_streak": None,
                "avg_unique_tools": None,
                "avg_cache_efficiency": None,
            }

        # Get per-user stats from repository
        user_stats = await self._repository.get_per_user_stats(date_cutoff)

        # Calculate averages and medians (business logic stays in service)
        token_counts = [row.total_tokens for row in user_stats]
        cost_totals = [row.total_cost for row in user_stats]
        unique_tools_counts = [row.unique_tools for row in user_stats]

        avg_tokens = int(sum(token_counts) / len(token_counts)) if token_counts else None
        median_tokens = int(sorted(token_counts)[len(token_counts) // 2]) if token_counts else None
        total_community_tokens = sum(token_counts) if token_counts else None
        avg_cost = Decimal(str(sum(cost_totals) / len(cost_totals))) if cost_totals else None
        avg_unique_tools = (
            int(sum(unique_tools_counts) / len(unique_tools_counts))
            if unique_tools_counts
            else None
        )

        # Calculate average streak (only for users with streaks)
        avg_streak_value = await self._repository.get_avg_streak()
        avg_streak = int(avg_streak_value) if avg_streak_value else None

        # Calculate average cache efficiency
        avg_cache_value = await self._repository.get_avg_cache_efficiency(date_cutoff)
        avg_cache_efficiency = Decimal(str(float(avg_cache_value))) if avg_cache_value else None

        return {
            "period": period,
            "total_users": total_users,
            "avg_tokens": avg_tokens,
            "median_tokens": median_tokens,
            "total_community_tokens": total_community_tokens,
            "avg_cost": avg_cost,
            "avg_streak": avg_streak,
            "avg_unique_tools": avg_unique_tools,
            "avg_cache_efficiency": avg_cache_efficiency,
        }

    async def _get_user_stats(self, user_id: UUID, period: str) -> dict:
        """
        Get user's personal statistics for a period.

        Args:
            user_id: UUID of the user
            period: Time period (all, month, week)

        Returns:
            Dictionary of user statistics
        """
        date_filter = self._get_date_filter(period)
        date_cutoff = date_filter.date() if date_filter else None

        # Get user's aggregate stats from repository
        aggregate_stats = await self._repository.get_user_aggregate_stats(user_id, date_cutoff)

        # Get user's current streak from repository
        current_streak = await self._repository.get_user_current_streak(user_id)

        # Get cache stats and calculate efficiency (business logic)
        cache_stats = await self._repository.get_user_cache_stats(user_id, date_cutoff)

        cache_efficiency = None
        if cache_stats.total_tokens > 0:
            cache_efficiency = (cache_stats.cache_reads / cache_stats.total_tokens) * 100

        return {
            "total_tokens": aggregate_stats.total_tokens,
            "total_cost": aggregate_stats.total_cost,
            "unique_tools": aggregate_stats.unique_tools,
            "unique_days": aggregate_stats.unique_days,
            "current_streak": current_streak,
            "cache_efficiency": cache_efficiency,
        }

    async def _calculate_percentiles(self, _user_id: UUID, user_stats: dict, _period: str) -> dict:
        """
        Calculate percentile rankings for a user compared to all users.

        Percentile interpretation:
        - 100 = Best performer (top 1%)
        - 50 = Median performer
        - 0 = Lowest performer

        Args:
            _user_id: UUID of the user (unused, reserved for future use)
            user_stats: User's statistics
            _period: Time period (unused, reserved for future period-based filtering)

        Returns:
            Dictionary of percentile rankings
        """
        percentiles: dict[str, float] = {}

        # Tokens percentile: Higher is better (placeholder for now)
        if user_stats["total_tokens"] > 0:
            percentiles["tokens"] = 50.0

        # Streak percentile: Higher is better - use repository method
        if user_stats["current_streak"] > 0:
            streak_percentile = await self._repository.calculate_streak_percentile(
                value=user_stats["current_streak"],
                higher_is_better=True,
            )
            percentiles["streak"] = streak_percentile

        # Unique tools percentile: Higher is better (placeholder for now)
        if user_stats["unique_tools"] > 0:
            percentiles["tools"] = 50.0

        # Cache efficiency percentile: Higher is better (placeholder for now)
        if user_stats["cache_efficiency"] is not None:
            percentiles["cache_efficiency"] = 50.0

        # Cost percentile: Lower is better (placeholder for now)
        if user_stats["total_cost"] > 0:
            percentiles["cost"] = 50.0

        return percentiles

    def _get_date_filter(self, period: str) -> datetime | None:
        """
        Get date filter based on period.

        Args:
            period: Time period (all, month, week)

        Returns:
            Datetime cutoff for filtering, or None for all-time
        """
        now = datetime.now(UTC)
        if period == "week":
            return now - timedelta(days=7)
        elif period == "month":
            return now - timedelta(days=30)
        else:  # "all"
            return None
