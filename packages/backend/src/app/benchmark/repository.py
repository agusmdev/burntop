"""Repository for community benchmark data access operations."""

from datetime import date
from typing import NamedTuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.benchmark.models import CommunityBenchmark
from app.benchmark.schemas import CommunityBenchmarkCreate, CommunityBenchmarkUpdate
from app.common.postgres_repository import PostgresRepository
from app.streak.models import Streak
from app.usage_record.models import UsageRecord


class UserStatsRow(NamedTuple):
    """Named tuple for per-user stats aggregation."""

    user_id: UUID
    total_tokens: int
    total_cost: float
    unique_tools: int
    unique_days: int


class UserAggregateStats(NamedTuple):
    """Named tuple for user aggregate usage stats."""

    total_tokens: int
    total_cost: float
    unique_tools: int
    unique_days: int


class UserCacheStats(NamedTuple):
    """Named tuple for user cache efficiency stats."""

    cache_reads: int
    total_tokens: int


class CommunityBenchmarkRepository(
    PostgresRepository[CommunityBenchmark, CommunityBenchmarkCreate, CommunityBenchmarkUpdate]
):
    """
    Repository for CommunityBenchmark model.

    Handles aggregate statistics and benchmarks for the community.
    """

    def __init__(self, session: AsyncSession):
        """Initialize repository with async session."""
        super().__init__(session, CommunityBenchmark)

    async def get_current(self, period: str) -> CommunityBenchmark | None:
        """
        Get current benchmark for a specific period.

        Args:
            period: Time period identifier (all, month, week)

        Returns:
            CommunityBenchmark record if exists, None otherwise
        """
        result = await self._session.execute(
            select(CommunityBenchmark).where(CommunityBenchmark.period == period)
        )
        return result.scalar_one_or_none()

    async def upsert_benchmark(self, benchmark_data: dict) -> CommunityBenchmark:
        """
        Insert or update benchmark data for a period.

        Uses PostgreSQL's INSERT ... ON CONFLICT DO UPDATE to efficiently
        upsert benchmark data. If a record with the same period exists,
        it updates all fields. Otherwise, it creates a new record.

        Args:
            benchmark_data: Dictionary with benchmark fields including 'period'

        Returns:
            The upserted CommunityBenchmark record

        Raises:
            ValueError: If 'period' is not in benchmark_data
        """
        if "period" not in benchmark_data:
            msg = "benchmark_data must include 'period' field"
            raise ValueError(msg)

        # PostgreSQL INSERT ... ON CONFLICT DO UPDATE
        stmt = (
            insert(CommunityBenchmark)
            .values(**benchmark_data)
            .on_conflict_do_update(
                index_elements=["period"],  # Unique constraint on period
                set_={
                    key: value
                    for key, value in benchmark_data.items()
                    if key != "period"  # Don't update the unique key
                },
            )
            .returning(CommunityBenchmark)
        )

        result = await self._session.execute(stmt)
        await self._session.commit()
        benchmark = result.scalar_one()
        await self._session.refresh(benchmark)
        return benchmark

    async def count_active_users(self, date_filter: date | None = None) -> int:
        """
        Count users with usage records in period.

        Args:
            date_filter: Optional date cutoff for filtering

        Returns:
            Count of active users
        """
        query = select(func.count(func.distinct(UsageRecord.user_id))).select_from(UsageRecord)
        if date_filter:
            query = query.where(UsageRecord.date >= date_filter)

        result = await self._session.execute(query)
        return result.scalar() or 0

    async def get_per_user_stats(self, date_filter: date | None = None) -> list[UserStatsRow]:
        """
        Get aggregated stats per user for benchmark calculations.

        Args:
            date_filter: Optional date cutoff for filtering

        Returns:
            List of UserStatsRow with per-user aggregates
        """
        query = select(
            UsageRecord.user_id,
            func.sum(
                UsageRecord.input_tokens
                + UsageRecord.output_tokens
                + UsageRecord.cache_read_tokens
                + UsageRecord.cache_write_tokens
                + UsageRecord.reasoning_tokens
            ).label("total_tokens"),
            func.sum(UsageRecord.cost).label("total_cost"),
            func.count(func.distinct(UsageRecord.source)).label("unique_tools"),
            func.count(func.distinct(UsageRecord.date)).label("unique_days"),
        ).group_by(UsageRecord.user_id)

        if date_filter:
            query = query.where(UsageRecord.date >= date_filter)

        result = await self._session.execute(query)
        rows = result.all()

        return [
            UserStatsRow(
                user_id=row.user_id,
                total_tokens=int(row.total_tokens or 0),
                total_cost=float(row.total_cost or 0),
                unique_tools=int(row.unique_tools or 0),
                unique_days=int(row.unique_days or 0),
            )
            for row in rows
        ]

    async def get_avg_streak(self) -> float | None:
        """
        Get average streak across all users with active streaks.

        Returns:
            Average streak value or None if no streaks
        """
        query = select(func.avg(Streak.current_streak)).where(Streak.current_streak > 0)
        result = await self._session.execute(query)
        return result.scalar()

    async def get_avg_cache_efficiency(self, date_filter: date | None = None) -> float | None:
        """
        Get average cache efficiency across all usage records.

        Args:
            date_filter: Optional date cutoff for filtering

        Returns:
            Average cache efficiency percentage or None
        """
        query = select(
            func.avg(
                UsageRecord.cache_read_tokens
                / func.nullif(
                    UsageRecord.input_tokens
                    + UsageRecord.output_tokens
                    + UsageRecord.cache_read_tokens
                    + UsageRecord.cache_write_tokens
                    + UsageRecord.reasoning_tokens,
                    0,
                )
                * 100
            )
        )
        if date_filter:
            query = query.where(UsageRecord.date >= date_filter)

        result = await self._session.execute(query)
        return result.scalar()

    async def get_user_aggregate_stats(
        self, user_id: UUID, date_filter: date | None = None
    ) -> UserAggregateStats:
        """
        Get aggregated usage stats for a specific user.

        Args:
            user_id: User UUID
            date_filter: Optional date cutoff for filtering

        Returns:
            UserAggregateStats with totals
        """
        query = select(
            func.sum(
                UsageRecord.input_tokens
                + UsageRecord.output_tokens
                + UsageRecord.cache_read_tokens
                + UsageRecord.cache_write_tokens
                + UsageRecord.reasoning_tokens
            ).label("total_tokens"),
            func.sum(UsageRecord.cost).label("total_cost"),
            func.count(func.distinct(UsageRecord.source)).label("unique_tools"),
            func.count(func.distinct(UsageRecord.date)).label("unique_days"),
        ).where(UsageRecord.user_id == user_id)

        if date_filter:
            query = query.where(UsageRecord.date >= date_filter)

        result = await self._session.execute(query)
        row = result.one_or_none()

        if not row:
            return UserAggregateStats(
                total_tokens=0,
                total_cost=0.0,
                unique_tools=0,
                unique_days=0,
            )

        return UserAggregateStats(
            total_tokens=int(row.total_tokens or 0),
            total_cost=float(row.total_cost or 0),
            unique_tools=int(row.unique_tools or 0),
            unique_days=int(row.unique_days or 0),
        )

    async def get_user_current_streak(self, user_id: UUID) -> int:
        """
        Get user's current streak.

        Args:
            user_id: User UUID

        Returns:
            Current streak count or 0 if no streak
        """
        query = select(Streak.current_streak).where(Streak.user_id == user_id)
        result = await self._session.scalar(query)
        return result or 0

    async def get_user_cache_stats(
        self, user_id: UUID, date_filter: date | None = None
    ) -> UserCacheStats:
        """
        Get user's cache stats for efficiency calculation.

        Args:
            user_id: User UUID
            date_filter: Optional date cutoff for filtering

        Returns:
            UserCacheStats with cache reads and total tokens
        """
        query = select(
            func.sum(UsageRecord.cache_read_tokens).label("cache_reads"),
            func.sum(
                UsageRecord.input_tokens
                + UsageRecord.output_tokens
                + UsageRecord.cache_read_tokens
                + UsageRecord.cache_write_tokens
                + UsageRecord.reasoning_tokens
            ).label("total_tokens"),
        ).where(UsageRecord.user_id == user_id)

        if date_filter:
            query = query.where(UsageRecord.date >= date_filter)

        result = await self._session.execute(query)
        row = result.one_or_none()

        if not row:
            return UserCacheStats(cache_reads=0, total_tokens=0)

        return UserCacheStats(
            cache_reads=int(row.cache_reads or 0),
            total_tokens=int(row.total_tokens or 0),
        )

    async def calculate_streak_percentile(
        self, value: float, higher_is_better: bool = True
    ) -> float:
        """
        Calculate percentile rank for a streak value.

        Args:
            value: The streak value to rank
            higher_is_better: Whether higher values are better

        Returns:
            Percentile rank (0-100)
        """
        if higher_is_better:
            # Count users with LOWER streak (percentile = % of users we beat)
            count_query = select(func.count(Streak.user_id)).where(Streak.current_streak < value)
        else:
            # Count users with HIGHER streak
            count_query = select(func.count(Streak.user_id)).where(Streak.current_streak > value)

        total_query = select(func.count(Streak.user_id))

        count_result = await self._session.execute(count_query)
        count = count_result.scalar() or 0

        total_result = await self._session.execute(total_query)
        total = total_result.scalar() or 1  # Avoid division by zero

        percentile = (count / total) * 100 if total > 0 else 50.0
        return round(percentile, 2)
