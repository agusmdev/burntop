"""UsageRecord repository implementation."""

from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common import PostgresRepository
from app.usage_record.models import UsageRecord
from app.usage_record.schemas import UsageRecordCreate, UsageRecordUpdate


class UsageRecordRepository(PostgresRepository[UsageRecord, UsageRecordCreate, UsageRecordUpdate]):
    """
    Repository for UsageRecord model.

    Provides usage-specific query methods for:
    - Date range queries
    - Aggregated statistics
    - Bulk upsert for sync operations
    - Source and model filtering
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize UsageRecordRepository.

        Args:
            session: SQLAlchemy async session
        """
        super().__init__(session, UsageRecord)

    async def get_by_date_range(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
    ) -> Sequence[UsageRecord]:
        """
        Get usage records for a user within a date range.

        Args:
            user_id: User UUID
            start_date: Start date (inclusive)
            end_date: End date (inclusive)

        Returns:
            List of usage records within the date range
        """
        query = (
            self._base_query()
            .where(
                and_(
                    UsageRecord.user_id == user_id,
                    UsageRecord.date >= start_date,
                    UsageRecord.date <= end_date,
                )
            )
            .order_by(UsageRecord.date.desc())
        )
        result = await self._session.execute(query)
        return result.scalars().all()

    async def get_aggregated_stats(
        self,
        user_id: str,
        start_date: date | None = None,
        end_date: date | None = None,
        group_by: str | None = None,
    ) -> Sequence[dict[str, Any]]:
        """
        Get aggregated usage statistics for a user.

        Aggregates token counts and costs with optional grouping.

        Args:
            user_id: User UUID
            start_date: Optional start date filter
            end_date: Optional end date filter
            group_by: Optional grouping field (date, source, model)

        Returns:
            List of aggregated statistics dictionaries
        """
        # Base aggregation columns
        agg_columns = [
            func.sum(UsageRecord.input_tokens).label("total_input_tokens"),
            func.sum(UsageRecord.output_tokens).label("total_output_tokens"),
            func.sum(UsageRecord.cache_read_tokens).label("total_cache_read_tokens"),
            func.sum(UsageRecord.cache_write_tokens).label("total_cache_write_tokens"),
            func.sum(UsageRecord.reasoning_tokens).label("total_reasoning_tokens"),
            func.sum(UsageRecord.cost).label("total_cost"),
            func.count(UsageRecord.id).label("record_count"),
        ]

        # Add group_by column if specified
        group_column = None
        if group_by:
            if group_by == "date":
                group_column = UsageRecord.date
            elif group_by == "source":
                group_column = UsageRecord.source
            elif group_by == "model":
                group_column = UsageRecord.model
            else:
                msg = f"Invalid group_by field: {group_by}"
                raise ValueError(msg)
            agg_columns.insert(0, group_column.label(group_by))

        # Build query
        query = select(*agg_columns).where(UsageRecord.user_id == user_id)

        # Apply date filters
        if start_date:
            query = query.where(UsageRecord.date >= start_date)
        if end_date:
            query = query.where(UsageRecord.date <= end_date)

        # Apply grouping
        if group_column is not None:
            query = query.group_by(group_column)
            # Order by group column
            if group_by == "date":
                query = query.order_by(group_column.desc())
            else:
                query = query.order_by(group_column)

        result = await self._session.execute(query)
        rows = result.all()

        # Convert rows to dictionaries
        return [row._asdict() for row in rows]

    async def upsert_daily_records(
        self,
        _user_id: str,
        records: Sequence[UsageRecordCreate],
    ) -> tuple[Sequence[UsageRecord], int, int]:
        """
        Upsert usage records using the unique constraint on (user_id, date, source, model, machine_id).

        This is the primary method for the sync endpoint to update daily usage records.
        If a record already exists for the same user/date/source/model/machine combination,
        it will be updated with the new values.

        Args:
            _user_id: User UUID (unused - for signature compatibility)
            records: List of usage records to upsert

        Returns:
            Tuple of (all_records, new_count, updated_count)
        """
        if not records:
            return [], 0, 0

        # Query existing records to determine which will be updated
        existing_keys = set()
        if records:
            # Build query to check for existing records
            conditions = []
            for rec in records:
                conditions.append(
                    and_(
                        UsageRecord.user_id == rec.user_id,
                        UsageRecord.date == rec.date,
                        UsageRecord.source == rec.source,
                        UsageRecord.model == rec.model,
                        UsageRecord.machine_id == rec.machine_id,
                    )
                )

            query = select(
                UsageRecord.user_id,
                UsageRecord.date,
                UsageRecord.source,
                UsageRecord.model,
                UsageRecord.machine_id,
            ).where(or_(*conditions))

            result = await self._session.execute(query)
            existing_keys = {
                (str(row[0]), row[1], row[2], row[3], row[4]) for row in result.all()
            }

        # Determine which records are new vs updated
        new_count = 0
        updated_count = 0
        for rec in records:
            key = (str(rec.user_id), rec.date, rec.source, rec.model, rec.machine_id)
            if key in existing_keys:
                updated_count += 1
            else:
                new_count += 1

        # Perform the upsert
        result = await self.bulk_upsert(
            objs_in=records,
            index_elements=["user_id", "date", "source", "model", "machine_id"],
            update_fields=[
                "input_tokens",
                "output_tokens",
                "cache_read_tokens",
                "cache_write_tokens",
                "reasoning_tokens",
                "cost",
                "usage_timestamp",
                "synced_at",  # Update sync timestamp on conflict to track last sync time
            ],
        )

        return result, new_count, updated_count

    async def get_by_source_and_model(
        self,
        user_id: str,
        source: str | None = None,
        model: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> Sequence[UsageRecord]:
        """
        Get usage records filtered by source and/or model.

        Args:
            user_id: User UUID
            source: Optional source filter (cursor, claude-code, web)
            model: Optional model filter (claude-3-5-sonnet-20241022, etc.)
            start_date: Optional start date filter
            end_date: Optional end date filter

        Returns:
            List of matching usage records
        """
        conditions = [UsageRecord.user_id == user_id]

        if source:
            conditions.append(UsageRecord.source == source)
        if model:
            conditions.append(UsageRecord.model == model)
        if start_date:
            conditions.append(UsageRecord.date >= start_date)
        if end_date:
            conditions.append(UsageRecord.date <= end_date)

        query = self._base_query().where(and_(*conditions)).order_by(UsageRecord.date.desc())
        result = await self._session.execute(query)
        return result.scalars().all()

    async def get_user_stats_aggregates(
        self,
        user_id: str,
    ) -> dict[str, Any]:
        """
        Get aggregated usage statistics for user stats.

        Computes total tokens, total cost, unique days, and cache efficiency.

        Args:
            user_id: User UUID string

        Returns:
            Dict with total_tokens, total_cost, unique_days, cache_efficiency
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
            func.count(func.distinct(UsageRecord.date)).label("unique_days"),
            func.avg(
                (UsageRecord.cache_read_tokens * 100.0)
                / func.nullif(
                    UsageRecord.input_tokens
                    + UsageRecord.output_tokens
                    + UsageRecord.cache_read_tokens
                    + UsageRecord.cache_write_tokens
                    + UsageRecord.reasoning_tokens,
                    0,
                )
            ).label("cache_efficiency"),
        ).where(UsageRecord.user_id == user_id)

        result = await self._session.execute(query)
        row = result.one()

        return {
            "total_tokens": int(row.total_tokens or 0),
            "total_cost": float(row.total_cost or 0.0),
            "unique_days": int(row.unique_days or 0),
            "cache_efficiency": float(row.cache_efficiency or 0.0)
            if row.cache_efficiency
            else None,
        }

    async def get_user_comparison_aggregates(
        self,
        user_id: str,
    ) -> dict[str, Any]:
        """
        Get aggregated usage statistics for user comparison.

        Computes total tokens and total cost.

        Args:
            user_id: User UUID string

        Returns:
            Dict with total_tokens and total_cost
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
        ).where(UsageRecord.user_id == user_id)

        result = await self._session.execute(query)
        row = result.one()

        return {
            "total_tokens": int(row.total_tokens or 0),
            "total_cost": float(row.total_cost or 0.0),
        }

    async def get_top_models_by_cost(
        self,
        user_id: str,
        limit: int = 3,
    ) -> list[dict[str, Any]]:
        """
        Get top models by cost for a user.

        Args:
            user_id: User UUID string
            limit: Maximum number of models to return

        Returns:
            List of dicts with model, total_tokens, total_cost
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
                ).label("total_tokens"),
                func.sum(UsageRecord.cost).label("total_cost"),
            )
            .where(UsageRecord.user_id == user_id)
            .group_by(UsageRecord.model)
            .order_by(func.sum(UsageRecord.cost).desc())
            .limit(limit)
        )

        result = await self._session.execute(query)
        rows = result.all()

        return [
            {
                "model": row.model,
                "total_tokens": int(row.total_tokens or 0),
                "total_cost": str(float(row.total_cost or 0.0)),
            }
            for row in rows
        ]

    async def get_top_sources_by_cost(
        self,
        user_id: str,
        limit: int = 3,
    ) -> list[dict[str, Any]]:
        """
        Get top sources by cost for a user.

        Args:
            user_id: User UUID string
            limit: Maximum number of sources to return

        Returns:
            List of dicts with source, total_tokens, total_cost
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
                ).label("total_tokens"),
                func.sum(UsageRecord.cost).label("total_cost"),
            )
            .where(UsageRecord.user_id == user_id)
            .group_by(UsageRecord.source)
            .order_by(func.sum(UsageRecord.cost).desc())
            .limit(limit)
        )

        result = await self._session.execute(query)
        rows = result.all()

        return [
            {
                "source": row.source,
                "total_tokens": int(row.total_tokens or 0),
                "total_cost": str(float(row.total_cost or 0.0)),
            }
            for row in rows
        ]

    async def get_user_total_tokens(self, user_id: str) -> int:
        """Get total tokens used by a user across all records.

        Args:
            user_id: User UUID string

        Returns:
            Total token count (all token types summed)
        """
        stmt = select(
            func.coalesce(
                func.sum(
                    UsageRecord.input_tokens
                    + UsageRecord.output_tokens
                    + UsageRecord.cache_read_tokens
                    + UsageRecord.cache_write_tokens
                    + UsageRecord.reasoning_tokens
                ),
                0,
            )
        ).where(UsageRecord.user_id == user_id)
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def get_user_unique_models_count(self, user_id: str) -> int:
        """Get count of unique models used by a user.

        Args:
            user_id: User UUID string

        Returns:
            Number of unique models
        """
        stmt = select(func.count(func.distinct(UsageRecord.model))).where(
            UsageRecord.user_id == user_id
        )
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def get_user_unique_sources_count(self, user_id: str) -> int:
        """Get count of unique sources used by a user.

        Args:
            user_id: User UUID string

        Returns:
            Number of unique sources
        """
        stmt = select(func.count(func.distinct(UsageRecord.source))).where(
            UsageRecord.user_id == user_id
        )
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def get_user_avg_cache_efficiency(self, user_id: str) -> float:
        """Get user's average cache efficiency percentage.

        Args:
            user_id: User UUID string

        Returns:
            Average cache efficiency (0-100)
        """
        stmt = select(
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
        ).where(UsageRecord.user_id == user_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none() or 0.0

    async def get_user_usage_timestamps(self, user_id: str) -> list[datetime]:
        """Get all usage timestamps for a user.

        Args:
            user_id: User UUID string

        Returns:
            List of usage timestamps
        """
        stmt = select(UsageRecord.usage_timestamp).where(UsageRecord.user_id == user_id)
        result = await self._session.execute(stmt)
        return [row[0] for row in result.all() if row[0] is not None]

    async def get_user_usage_count(self, user_id: str) -> int:
        """Get count of usage records for a user.

        Args:
            user_id: User UUID string

        Returns:
            Number of usage records
        """
        stmt = select(func.count(UsageRecord.id)).where(UsageRecord.user_id == user_id)
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def get_user_monthly_tokens(self, user_id: str, year: int, month: int) -> int:
        """Get total tokens used by a user for a specific month.

        Args:
            user_id: User UUID string
            year: Year (e.g., 2024)
            month: Month (1-12)

        Returns:
            Total token count for the month (all token types summed)
        """
        # Calculate start and end dates for the month
        start_date = date(year, month, 1)
        end_date = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)

        stmt = select(
            func.coalesce(
                func.sum(
                    UsageRecord.input_tokens
                    + UsageRecord.output_tokens
                    + UsageRecord.cache_read_tokens
                    + UsageRecord.cache_write_tokens
                    + UsageRecord.reasoning_tokens
                ),
                0,
            )
        ).where(
            and_(
                UsageRecord.user_id == user_id,
                UsageRecord.date >= start_date,
                UsageRecord.date < end_date,
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def get_user_rolling_30_day_tokens(self, user_id: str) -> int:
        """Get total tokens used by a user in the last 30 days (rolling window).

        This is used for AI Native tier badge calculation.
        The 30-day window includes today and the previous 29 days.

        Args:
            user_id: User UUID string

        Returns:
            Total token count for the last 30 days (all token types summed)
        """
        today = datetime.now(UTC).date()
        start_date = today - timedelta(days=29)  # 30 days including today

        stmt = select(
            func.coalesce(
                func.sum(
                    UsageRecord.input_tokens
                    + UsageRecord.output_tokens
                    + UsageRecord.cache_read_tokens
                    + UsageRecord.cache_write_tokens
                    + UsageRecord.reasoning_tokens
                ),
                0,
            )
        ).where(
            and_(
                UsageRecord.user_id == user_id,
                UsageRecord.date >= start_date,
                UsageRecord.date <= today,
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one()
