"""UsageRecord service layer for sync operations and usage statistics.

This service handles the core sync endpoint logic:
1. Filters new messages using message-level deduplication
2. Aggregates new messages by date/model
3. Calculates costs using pricing engine
4. Updates daily records (ADD tokens from new messages only)
5. Stores synced message IDs for future deduplication
6. Updates streaks (via StreakService)
7. Returns comprehensive sync response
"""

from datetime import UTC, date as date_type, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any
from uuid import UUID

from app.core import BaseService
from app.synced_message.repository import SyncedMessageIdRepository
from app.usage_record.models import UsageRecord
from app.usage_record.pricing import calculate_cost
from app.usage_record.pricing_fetcher import fetch_litellm_pricing
from app.usage_record.repository import UsageRecordRepository
from app.usage_record.schemas import (
    SyncMessageRequest,
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
        synced_message_repository: SyncedMessageIdRepository | None = None,
        streak_service: "StreakService | None" = None,
    ):
        """Initialize usage record service.

        Args:
            repository: UsageRecord repository instance
            synced_message_repository: Repository for message-level deduplication (required for sync)
            streak_service: Streak service for streak updates (optional)
        """
        super().__init__(repository)
        self.repository: UsageRecordRepository = repository  # Type hint for IDE
        self._synced_message_repository = synced_message_repository
        self._streak_service = streak_service

    async def process_sync(
        self,
        user_id: UUID,
        source: str,
        messages: list[SyncMessageRequest],
        machine_id: str = "default",
    ) -> SyncResponse:
        """
        Process sync request from CLI client with message-level deduplication.

        This is the main entry point for the POST /sync endpoint.
        Orchestrates the full sync workflow:
        1. Extract message IDs from incoming messages
        2. Filter to only NEW messages (not previously synced)
        3. Aggregate new messages by date/model
        4. Calculate costs using LiteLLM pricing
        5. ADD to daily records (accumulate only NEW tokens)
        6. Store synced message IDs for future deduplication
        7. Update user streak (via StreakService)
        8. Return comprehensive sync response

        Args:
            user_id: User ID performing the sync
            source: Source tool identifier (claude-code, cursor, etc.)
            messages: List of individual messages to sync
            machine_id: Machine identifier for multi-machine sync support

        Returns:
            SyncResponse with statistics

        Raises:
            RuntimeError: If synced_message_repository is not configured
        """
        # Validate repository is available for sync operations
        if self._synced_message_repository is None:
            raise RuntimeError(
                "synced_message_repository is required for sync operations. "
                "Ensure it is injected when creating UsageRecordService for sync endpoints."
            )

        messages_received = len(messages)

        # Step 1: Extract message IDs and create lookup map
        message_ids = [m.id for m in messages]
        id_to_msg = {m.id: m for m in messages}

        # Step 2: Filter to only NEW messages (not seen before)
        new_ids = await self._synced_message_repository.filter_new_ids(
            user_id=user_id,
            source=source,
            message_ids=message_ids,
        )
        new_messages = [id_to_msg[msg_id] for msg_id in new_ids]
        messages_synced = len(new_messages)

        # If no new messages, return early with success
        if not new_messages:
            # Get current streak for stats
            streak = None
            if self._streak_service:
                streak = await self._streak_service.get_by_user_id(user_id)

            stats = SyncStatsResponse(
                totalTokens=0,
                totalCost=Decimal("0.0000"),
                currentStreak=streak.current_streak if streak else 0,
                longestStreak=streak.longest_streak if streak else 0,
                achievementsUnlocked=0,
            )

            return SyncResponse(
                success=True,
                message="No new messages to sync",
                messagesReceived=messages_received,
                messagesSynced=0,
                recordsProcessed=0,
                newRecords=0,
                updatedRecords=0,
                stats=stats,
                newAchievements=[],
            )

        # Step 3: Fetch LiteLLM pricing (cached with 1-hour TTL)
        litellm_data = await fetch_litellm_pricing()

        # Step 4: Aggregate NEW messages by date/model
        aggregated = self._aggregate_messages(new_messages, source)

        # Step 5: Calculate costs for aggregated records
        records_with_costs = self._calculate_costs(
            aggregated=aggregated,
            user_id=user_id,
            machine_id=machine_id,
            litellm_data=litellm_data,
        )

        # Step 6: Upsert to daily records (accumulates token values)
        _, new_records_count, updated_records = await self.repository.upsert_daily_records(
            _user_id=str(user_id),
            records=records_with_costs,
        )

        # Step 7: Store synced message IDs for future deduplication
        await self._synced_message_repository.bulk_insert_ids(
            user_id=user_id,
            source=source,
            message_ids=list(new_ids),
        )

        # Count total records processed
        records_processed = len(aggregated)

        # Step 8: Calculate total tokens from this sync batch
        total_tokens_synced = sum(
            rec.input_tokens
            + rec.output_tokens
            + rec.cache_read_tokens
            + rec.cache_write_tokens
            + rec.reasoning_tokens
            for rec in records_with_costs
        )

        # Step 9: Update streak
        streak = None
        if self._streak_service:
            streak = await self._streak_service.get_by_user_id(user_id)

        if self._streak_service and records_with_costs:
            latest_date = max(rec.date for rec in records_with_costs)
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

        # Build stats response
        stats = SyncStatsResponse(
            totalTokens=total_tokens_synced,
            totalCost=Decimal(str(total_cost)) if total_cost else Decimal("0.0000"),
            currentStreak=streak.current_streak if streak else 0,
            longestStreak=streak.longest_streak if streak else 0,
            achievementsUnlocked=0,
        )

        # Step 10: Return sync response
        return SyncResponse(
            success=True,
            message=f"Synced {messages_synced} new messages",
            messagesReceived=messages_received,
            messagesSynced=messages_synced,
            recordsProcessed=records_processed,
            newRecords=new_records_count,
            updatedRecords=updated_records,
            stats=stats,
            newAchievements=[],
        )

    def _aggregate_messages(
        self,
        messages: list[SyncMessageRequest],
        source: str,
    ) -> list[dict[str, Any]]:
        """
        Aggregate messages by date and model.

        Messages with same date/model are merged by summing token counts.

        Args:
            messages: List of individual messages
            source: Source tool identifier

        Returns:
            List of aggregated records as dictionaries
        """
        merged: dict[tuple, dict[str, Any]] = {}

        for msg in messages:
            # Extract date from timestamp (YYYY-MM-DD)
            date_str = msg.timestamp.split("T")[0]
            date_obj = date_type.fromisoformat(date_str)

            key = (date_obj, msg.model)

            if key in merged:
                merged[key]["input_tokens"] += msg.input_tokens
                merged[key]["output_tokens"] += msg.output_tokens
                merged[key]["cache_read_tokens"] += msg.cache_read_tokens
                merged[key]["cache_write_tokens"] += msg.cache_write_tokens
                merged[key]["reasoning_tokens"] += msg.reasoning_tokens
            else:
                merged[key] = {
                    "date": date_obj,
                    "source": source,
                    "model": msg.model,
                    "input_tokens": msg.input_tokens,
                    "output_tokens": msg.output_tokens,
                    "cache_read_tokens": msg.cache_read_tokens,
                    "cache_write_tokens": msg.cache_write_tokens,
                    "reasoning_tokens": msg.reasoning_tokens,
                }

        return list(merged.values())

    def _calculate_costs(
        self,
        aggregated: list[dict[str, Any]],
        user_id: UUID,
        machine_id: str,
        litellm_data: dict | None = None,
    ) -> list[UsageRecordCreate]:
        """
        Calculate costs for aggregated records using pricing engine.

        Converts aggregated dicts to UsageRecordCreate with calculated cost field.
        Uses LiteLLM pricing data if provided for accurate, up-to-date pricing.

        Args:
            aggregated: List of aggregated records as dictionaries
            user_id: User ID for record creation
            machine_id: Machine identifier for multi-machine sync
            litellm_data: Optional LiteLLM pricing data for real-time pricing

        Returns:
            List of UsageRecordCreate schemas with calculated costs
        """
        records_with_costs: list[UsageRecordCreate] = []

        for record in aggregated:
            cost = calculate_cost(
                model=record["model"],
                input_tokens=record["input_tokens"],
                output_tokens=record["output_tokens"],
                cache_read_tokens=record["cache_read_tokens"],
                cache_write_tokens=record["cache_write_tokens"],
                reasoning_tokens=record["reasoning_tokens"],
                litellm_data=litellm_data,
            )

            usage_record = UsageRecordCreate(
                user_id=user_id,
                date=record["date"],
                source=record["source"],
                model=record["model"],
                machine_id=machine_id,
                input_tokens=record["input_tokens"],
                output_tokens=record["output_tokens"],
                cache_read_tokens=record["cache_read_tokens"],
                cache_write_tokens=record["cache_write_tokens"],
                reasoning_tokens=record["reasoning_tokens"],
                cost=cost,
                usage_timestamp=datetime.now(UTC),
                synced_at=datetime.now(UTC),
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
