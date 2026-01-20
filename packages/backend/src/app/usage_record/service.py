"""UsageRecord service layer for sync operations and usage statistics.

This service handles the core sync endpoint logic:
1. Deduplicates records (merge records for same user/date/source/model)
2. Calculates costs using pricing engine
3. Updates streaks (via StreakService)
4. Returns comprehensive sync response
"""

from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any
from uuid import UUID

from app.core import BaseService
from app.usage_record.models import UsageRecord
from app.usage_record.pricing import calculate_cost
from app.usage_record.pricing_fetcher import fetch_litellm_pricing
from app.usage_record.repository import UsageRecordRepository
from app.usage_record.schemas import (
    SyncRecordRequest,
    SyncResponse,
    SyncStatsResponse,
    UsageRecordCreate,
    UsageRecordUpdate,
)

if TYPE_CHECKING:
    from app.streak.service import StreakService


class UsageRecordService(BaseService[UsageRecord, UsageRecordCreate, UsageRecordUpdate]):
    """Service for usage record management and sync operations."""

    def __init__(
        self,
        repository: UsageRecordRepository,
        streak_service: "StreakService | None" = None,
    ):
        """Initialize usage record service.

        Args:
            repository: UsageRecord repository instance
            streak_service: Streak service for streak updates (optional)
        """
        super().__init__(repository)
        self.repository: UsageRecordRepository = repository  # Type hint for IDE
        self._streak_service = streak_service

    async def process_sync(
        self,
        user_id: UUID,
        records: list[SyncRecordRequest],
        _synced_at: datetime,
        machine_id: str = "default",
    ) -> SyncResponse:
        """
        Process sync request from CLI client.

        This is the main entry point for the POST /sync endpoint.
        Orchestrates the full sync workflow:
        1. Fetch LiteLLM pricing data (cached, 1-hour TTL)
        2. Deduplicate incoming records
        3. Calculate costs for each record using LiteLLM pricing
        4. Upsert records to database (using unique constraint on user_id, date, source, model, machine_id)
        5. Update user streak (via StreakService)
        6. Return comprehensive sync response

        Args:
            user_id: User ID performing the sync
            records: List of usage records to sync
            _synced_at: Timestamp when sync was initiated (unused for now)
            machine_id: Machine identifier for multi-machine sync support

        Returns:
            SyncResponse with statistics
        """
        # Step 0: Fetch LiteLLM pricing (cached with 1-hour TTL)
        litellm_data = await fetch_litellm_pricing()

        # Step 1: Deduplicate records (merge by date/source/model)
        deduplicated = self._deduplicate_records(records)

        # Step 2: Calculate costs for each record using LiteLLM pricing
        records_with_costs = self._calculate_costs(deduplicated, user_id, machine_id, litellm_data)

        # Step 3: Upsert records to database
        # The unique constraint on (user_id, date, source, model) ensures no duplicates
        _, new_records_count, updated_records = await self.repository.upsert_daily_records(
            _user_id=str(
                user_id
            ),  # Convert UUID to str for repository (unused parameter for compatibility)
            records=records_with_costs,
        )

        # Count total records processed
        records_processed = len(deduplicated)

        # Step 4: Calculate total tokens from this sync batch
        total_tokens_synced = sum(
            rec.input_tokens
            + rec.output_tokens
            + rec.cache_read_tokens
            + rec.cache_write_tokens
            + rec.reasoning_tokens
            for rec in records_with_costs
        )

        # Step 5: Update streak
        # Get streak for user to access timezone
        streak = None
        if self._streak_service:
            streak = await self._streak_service.get_by_user_id(user_id)

        # Use the most recent date from the synced records
        if self._streak_service and records_with_costs:
            # Get the latest date from all records
            latest_date = max(rec.date for rec in records_with_costs)
            # Use user's timezone from streak record (defaults to UTC if not set)
            user_timezone = streak.timezone if streak else "UTC"
            await self._streak_service.update_streak(
                user_id=user_id,
                activity_date=latest_date,
                timezone=user_timezone,
            )

        # Refresh streak after update
        if self._streak_service:
            streak = await self._streak_service.get_by_user_id(user_id)

        # Calculate total cost from this batch
        total_cost = sum(rec.cost for rec in records_with_costs)

        # Build stats response (use camelCase aliases as defined in Field())
        stats = SyncStatsResponse(
            totalTokens=total_tokens_synced,  # Tokens from this batch
            totalCost=Decimal(str(total_cost)) if total_cost else Decimal("0.0000"),
            currentStreak=streak.current_streak if streak else 0,
            longestStreak=streak.longest_streak if streak else 0,
            achievementsUnlocked=0,  # Achievement system removed
        )

        # Step 8: Return sync response (use camelCase aliases)
        return SyncResponse(
            success=True,
            message=f"Synced {records_processed} records",
            recordsProcessed=records_processed,
            newRecords=new_records_count,
            updatedRecords=updated_records,
            stats=stats,
            newAchievements=[],  # Achievement system removed
        )

    def _deduplicate_records(
        self,
        records: list[SyncRecordRequest],
    ) -> list[SyncRecordRequest]:
        """
        Deduplicate sync records by merging duplicates.

        Records with same date/source/model are merged by summing token counts.
        This handles cases where CLI sends multiple records for same day/source/model
        (e.g., if user syncs multiple times without clearing local cache).

        Args:
            records: List of sync records from CLI

        Returns:
            List of deduplicated records with merged token counts
        """
        # Group records by (date, source, model) key
        # Store merged token counts as dict values
        merged: dict[tuple, dict[str, Any]] = {}

        for record in records:
            key = (record.date, record.source, record.model)

            if key in merged:
                # Merge token counts into existing entry
                merged[key]["input_tokens"] += record.input_tokens
                merged[key]["output_tokens"] += record.output_tokens
                merged[key]["cache_read_tokens"] += record.cache_read_tokens
                merged[key]["cache_write_tokens"] += record.cache_write_tokens
                merged[key]["reasoning_tokens"] += record.reasoning_tokens
                # message_count is summed if present
                if record.message_count is not None:
                    if merged[key]["message_count"] is None:
                        merged[key]["message_count"] = 0
                    merged[key]["message_count"] += record.message_count
            else:
                # First occurrence of this key - add to dict
                merged[key] = {
                    "date": record.date,
                    "source": record.source,
                    "model": record.model,
                    "input_tokens": record.input_tokens,
                    "output_tokens": record.output_tokens,
                    "cache_read_tokens": record.cache_read_tokens,
                    "cache_write_tokens": record.cache_write_tokens,
                    "reasoning_tokens": record.reasoning_tokens,
                    "message_count": record.message_count,
                }

        # Convert dict values back to SyncRecordRequest objects
        return [SyncRecordRequest.model_validate(data) for data in merged.values()]

    def _calculate_costs(
        self,
        records: list[SyncRecordRequest],
        user_id: UUID,
        machine_id: str,
        litellm_data: dict | None = None,
    ) -> list[UsageRecordCreate]:
        """
        Calculate costs for each record using pricing engine.

        Converts SyncRecordRequest to UsageRecordCreate with calculated cost field.
        Uses LiteLLM pricing data if provided for accurate, up-to-date pricing.

        Args:
            records: List of deduplicated sync records
            user_id: User ID for record creation
            machine_id: Machine identifier for multi-machine sync
            litellm_data: Optional LiteLLM pricing data for real-time pricing

        Returns:
            List of UsageRecordCreate schemas with calculated costs
        """
        records_with_costs: list[UsageRecordCreate] = []

        for record in records:
            # Calculate cost using pricing engine with LiteLLM data
            cost = calculate_cost(
                model=record.model,
                input_tokens=record.input_tokens,
                output_tokens=record.output_tokens,
                cache_read_tokens=record.cache_read_tokens,
                cache_write_tokens=record.cache_write_tokens,
                reasoning_tokens=record.reasoning_tokens,
                litellm_data=litellm_data,
            )

            # Create UsageRecordCreate schema
            usage_record = UsageRecordCreate(
                user_id=user_id,
                date=record.date,
                source=record.source,
                model=record.model,
                machine_id=machine_id,
                input_tokens=record.input_tokens,
                output_tokens=record.output_tokens,
                cache_read_tokens=record.cache_read_tokens,
                cache_write_tokens=record.cache_write_tokens,
                reasoning_tokens=record.reasoning_tokens,
                cost=cost,
                usage_timestamp=datetime.now(UTC),  # Current time
                synced_at=datetime.now(UTC),  # Set sync timestamp
            )

            records_with_costs.append(usage_record)

        return records_with_costs

    async def get_user_stats_aggregates(self, user_id: str) -> dict[str, Any]:
        """
        Get aggregated usage statistics for user stats.

        Computes total tokens, total cost, unique days, and cache efficiency.

        Args:
            user_id: User UUID string

        Returns:
            Dict with total_tokens, total_cost, unique_days, cache_efficiency
        """
        return await self.repository.get_user_stats_aggregates(user_id)

    async def get_user_comparison_aggregates(self, user_id: str) -> dict[str, Any]:
        """
        Get aggregated usage statistics for user comparison.

        Computes total tokens and total cost.

        Args:
            user_id: User UUID string

        Returns:
            Dict with total_tokens and total_cost
        """
        return await self.repository.get_user_comparison_aggregates(user_id)

    async def get_top_models_by_cost(self, user_id: str, limit: int = 3) -> list[dict[str, Any]]:
        """
        Get top models by cost for a user.

        Args:
            user_id: User UUID string
            limit: Maximum number of models to return

        Returns:
            List of dicts with model, total_tokens, total_cost
        """
        return await self.repository.get_top_models_by_cost(user_id, limit)

    async def get_top_sources_by_cost(self, user_id: str, limit: int = 3) -> list[dict[str, Any]]:
        """
        Get top sources by cost for a user.

        Args:
            user_id: User UUID string
            limit: Maximum number of sources to return

        Returns:
            List of dicts with source, total_tokens, total_cost
        """
        return await self.repository.get_top_sources_by_cost(user_id, limit)

    async def get_user_total_tokens(self, user_id: UUID) -> int:
        """Get total tokens used by a user across all records.

        Args:
            user_id: User ID

        Returns:
            Total token count (all token types summed)
        """
        return await self.repository.get_user_total_tokens(str(user_id))

    async def get_user_unique_models_count(self, user_id: UUID) -> int:
        """Get count of unique models used by a user.

        Args:
            user_id: User ID

        Returns:
            Number of unique models
        """
        return await self.repository.get_user_unique_models_count(str(user_id))

    async def get_user_unique_sources_count(self, user_id: UUID) -> int:
        """Get count of unique sources used by a user.

        Args:
            user_id: User ID

        Returns:
            Number of unique sources
        """
        return await self.repository.get_user_unique_sources_count(str(user_id))

    async def get_user_avg_cache_efficiency(self, user_id: UUID) -> float:
        """Get user's average cache efficiency percentage.

        Args:
            user_id: User ID

        Returns:
            Average cache efficiency (0-100)
        """
        return await self.repository.get_user_avg_cache_efficiency(str(user_id))

    async def get_user_usage_timestamps(self, user_id: UUID) -> list[datetime]:
        """Get all usage timestamps for a user.

        Args:
            user_id: User ID

        Returns:
            List of usage timestamps
        """
        return await self.repository.get_user_usage_timestamps(str(user_id))

    async def get_user_usage_count(self, user_id: UUID) -> int:
        """Get count of usage records for a user.

        Args:
            user_id: User ID

        Returns:
            Number of usage records
        """
        return await self.repository.get_user_usage_count(str(user_id))

    async def get_user_monthly_tokens(self, user_id: UUID, year: int, month: int) -> int:
        """Get total tokens used by a user for a specific month.

        Args:
            user_id: User ID
            year: Year (e.g., 2024)
            month: Month (1-12)

        Returns:
            Total token count for the month (all token types summed)
        """
        return await self.repository.get_user_monthly_tokens(str(user_id), year, month)

    async def get_user_rolling_30_day_tokens(self, user_id: UUID) -> int:
        """Get total tokens used by a user in the last 30 days (rolling window).

        This is used for AI Native tier badge calculation.
        The 30-day window includes today and the previous 29 days.

        Args:
            user_id: User ID

        Returns:
            Total token count for the last 30 days (all token types summed)
        """
        return await self.repository.get_user_rolling_30_day_tokens(str(user_id))
