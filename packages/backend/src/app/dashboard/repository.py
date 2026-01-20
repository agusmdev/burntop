"""Dashboard repository for database access operations."""

from datetime import UTC, date as date_type, datetime, timedelta
from decimal import Decimal
from typing import NamedTuple
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.usage_record.models import UsageRecord


class UsageAggregation(NamedTuple):
    """Named tuple for usage aggregation results."""

    total_input_tokens: int
    total_output_tokens: int
    total_cache_read_tokens: int
    total_cache_write_tokens: int
    total_reasoning_tokens: int
    total_tokens: int
    total_cost: Decimal
    unique_days: int
    unique_models: int
    unique_sources: int


class DailyTrendRow(NamedTuple):
    """Named tuple for daily trend data."""

    date: date_type
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int
    cache_write_tokens: int
    reasoning_tokens: int
    cost: Decimal


class SourceBreakdownRow(NamedTuple):
    """Named tuple for source/tool breakdown data."""

    source: str
    tokens: int
    cost: Decimal
    days_active: int


class ModelBreakdownRow(NamedTuple):
    """Named tuple for model breakdown data."""

    model: str
    tokens: int
    cost: Decimal
    days_active: int


class DashboardRepository:
    """
    Repository for Dashboard data access operations.

    Handles all SQLAlchemy queries for dashboard aggregations.
    """

    def __init__(self, session: AsyncSession) -> None:
        """
        Initialize DashboardRepository.

        Args:
            session: Async database session
        """
        self._session = session

    async def get_usage_aggregations(self, user_id: UUID) -> UsageAggregation:
        """
        Get aggregated usage statistics for a user.

        Args:
            user_id: User ID to get aggregations for

        Returns:
            UsageAggregation with token counts, cost, and unique counts
        """
        query = select(
            func.coalesce(func.sum(UsageRecord.input_tokens), 0).label("total_input_tokens"),
            func.coalesce(func.sum(UsageRecord.output_tokens), 0).label("total_output_tokens"),
            func.coalesce(func.sum(UsageRecord.cache_read_tokens), 0).label(
                "total_cache_read_tokens"
            ),
            func.coalesce(func.sum(UsageRecord.cache_write_tokens), 0).label(
                "total_cache_write_tokens"
            ),
            func.coalesce(func.sum(UsageRecord.reasoning_tokens), 0).label(
                "total_reasoning_tokens"
            ),
            func.coalesce(
                func.sum(
                    UsageRecord.input_tokens
                    + UsageRecord.output_tokens
                    + UsageRecord.cache_read_tokens
                    + UsageRecord.cache_write_tokens
                    + UsageRecord.reasoning_tokens
                ),
                0,
            ).label("total_tokens"),
            func.coalesce(func.sum(UsageRecord.cost), Decimal("0.0000")).label("total_cost"),
            func.count(func.distinct(UsageRecord.date)).label("unique_days"),
            func.count(func.distinct(UsageRecord.model)).label("unique_models"),
            func.count(func.distinct(UsageRecord.source)).label("unique_sources"),
        ).where(UsageRecord.user_id == user_id)

        result = await self._session.execute(query)
        row = result.one()

        return UsageAggregation(
            total_input_tokens=int(row.total_input_tokens or 0),
            total_output_tokens=int(row.total_output_tokens or 0),
            total_cache_read_tokens=int(row.total_cache_read_tokens or 0),
            total_cache_write_tokens=int(row.total_cache_write_tokens or 0),
            total_reasoning_tokens=int(row.total_reasoning_tokens or 0),
            total_tokens=int(row.total_tokens or 0),
            total_cost=Decimal(str(row.total_cost or "0.0000")),
            unique_days=int(row.unique_days or 0),
            unique_models=int(row.unique_models or 0),
            unique_sources=int(row.unique_sources or 0),
        )

    async def get_daily_trends(
        self,
        user_id: UUID,
        period_start: date_type,
        period_end: date_type,
    ) -> list[DailyTrendRow]:
        """
        Get daily usage trends for a date range.

        Args:
            user_id: User ID to get trends for
            period_start: Start date of the period
            period_end: End date of the period

        Returns:
            List of DailyTrendRow with daily aggregations
        """
        query = (
            select(
                UsageRecord.date,
                func.sum(UsageRecord.input_tokens).label("input_tokens"),
                func.sum(UsageRecord.output_tokens).label("output_tokens"),
                func.sum(UsageRecord.cache_read_tokens).label("cache_read_tokens"),
                func.sum(UsageRecord.cache_write_tokens).label("cache_write_tokens"),
                func.sum(UsageRecord.reasoning_tokens).label("reasoning_tokens"),
                func.sum(UsageRecord.cost).label("cost"),
            )
            .where(
                and_(
                    UsageRecord.user_id == user_id,
                    UsageRecord.date >= period_start,
                    UsageRecord.date <= period_end,
                )
            )
            .group_by(UsageRecord.date)
            .order_by(UsageRecord.date)
        )

        result = await self._session.execute(query)
        rows = result.all()

        return [
            DailyTrendRow(
                date=row.date,
                input_tokens=int(row.input_tokens or 0),
                output_tokens=int(row.output_tokens or 0),
                cache_read_tokens=int(row.cache_read_tokens or 0),
                cache_write_tokens=int(row.cache_write_tokens or 0),
                reasoning_tokens=int(row.reasoning_tokens or 0),
                cost=Decimal(str(row.cost or "0.0000")),
            )
            for row in rows
        ]

    async def get_tools_breakdown(self, user_id: UUID) -> list[SourceBreakdownRow]:
        """
        Get usage breakdown by tool/source.

        Args:
            user_id: User ID to get breakdown for

        Returns:
            List of SourceBreakdownRow with source aggregations, ordered by cost desc
        """
        query = (
            select(
                UsageRecord.source,
                func.sum(
                    UsageRecord.input_tokens
                    + UsageRecord.output_tokens
                    + UsageRecord.cache_read_tokens
                    + UsageRecord.cache_write_tokens
                    + UsageRecord.reasoning_tokens
                ).label("tokens"),
                func.sum(UsageRecord.cost).label("cost"),
                func.count(func.distinct(UsageRecord.date)).label("days_active"),
            )
            .where(UsageRecord.user_id == user_id)
            .group_by(UsageRecord.source)
            .order_by(func.sum(UsageRecord.cost).desc())
        )

        result = await self._session.execute(query)
        rows = result.all()

        return [
            SourceBreakdownRow(
                source=row.source,
                tokens=int(row.tokens or 0),
                cost=Decimal(str(row.cost or "0.0000")),
                days_active=int(row.days_active or 0),
            )
            for row in rows
        ]

    async def get_models_breakdown(self, user_id: UUID) -> list[ModelBreakdownRow]:
        """
        Get usage breakdown by AI model.

        Args:
            user_id: User ID to get breakdown for

        Returns:
            List of ModelBreakdownRow with model aggregations, ordered by cost desc
        """
        query = (
            select(
                UsageRecord.model,
                func.sum(
                    UsageRecord.input_tokens
                    + UsageRecord.output_tokens
                    + UsageRecord.cache_read_tokens
                    + UsageRecord.cache_write_tokens
                    + UsageRecord.reasoning_tokens
                ).label("tokens"),
                func.sum(UsageRecord.cost).label("cost"),
                func.count(func.distinct(UsageRecord.date)).label("days_active"),
            )
            .where(UsageRecord.user_id == user_id)
            .group_by(UsageRecord.model)
            .order_by(func.sum(UsageRecord.cost).desc())
        )

        result = await self._session.execute(query)
        rows = result.all()

        return [
            ModelBreakdownRow(
                model=row.model,
                tokens=int(row.tokens or 0),
                cost=Decimal(str(row.cost or "0.0000")),
                days_active=int(row.days_active or 0),
            )
            for row in rows
        ]

    async def get_rolling_30_day_tokens(self, user_id: UUID) -> int:
        """
        Get total tokens for the last 30 days (rolling window).

        This is used to calculate AI Native tier badges based on recent activity.
        The 30-day window includes today and the previous 29 days.

        Args:
            user_id: User ID to get tokens for

        Returns:
            Total token count for the last 30 days
        """
        today = datetime.now(UTC).date()
        start_date = today - timedelta(days=29)  # 30 days including today

        query = select(
            func.coalesce(
                func.sum(
                    UsageRecord.input_tokens
                    + UsageRecord.output_tokens
                    + UsageRecord.cache_read_tokens
                    + UsageRecord.cache_write_tokens
                    + UsageRecord.reasoning_tokens
                ),
                0,
            ).label("rolling_30_day_tokens")
        ).where(
            and_(
                UsageRecord.user_id == user_id,
                UsageRecord.date >= start_date,
                UsageRecord.date <= today,
            )
        )

        result = await self._session.execute(query)
        row = result.one()
        return int(row.rolling_30_day_tokens or 0)
