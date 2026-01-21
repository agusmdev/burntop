"""SyncedMessageId repository for message-level deduplication."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.synced_message.models import SyncedMessageId


class SyncedMessageIdRepository:
    """
    Repository for SyncedMessageId operations.

    Provides specialized methods for message-level deduplication:
    - filter_new_ids: Find which message IDs haven't been synced yet
    - bulk_insert_ids: Store synced message IDs with ON CONFLICT DO NOTHING
    """

    # PostgreSQL asyncpg has a limit of 32767 query parameters.
    # For filter_new_ids: query uses 2 params (user_id, source) + N message_ids
    # For bulk_insert_ids: each row uses 4 params (user_id, source, message_id, synced_at)
    # Use conservative batch sizes to stay well under the limit.
    FILTER_BATCH_SIZE = 10000  # For IN clause queries
    INSERT_BATCH_SIZE = 5000  # For bulk inserts (4 params per row = 20000 params)

    def __init__(self, session: AsyncSession):
        """Initialize repository with database session."""
        self._session = session

    async def filter_new_ids(
        self,
        user_id: UUID,
        source: str,
        message_ids: list[str],
    ) -> set[str]:
        """
        Return only message IDs that haven't been synced yet.

        Args:
            user_id: User UUID
            source: Source tool identifier (claude-code, cursor, etc.)
            message_ids: List of message IDs to check

        Returns:
            Set of message IDs that are NOT in the database (i.e., new messages)
        """
        if not message_ids:
            return set()

        existing_ids: set[str] = set()

        # Process in batches to avoid exceeding PostgreSQL's parameter limit
        for i in range(0, len(message_ids), self.FILTER_BATCH_SIZE):
            batch = message_ids[i : i + self.FILTER_BATCH_SIZE]

            query = select(SyncedMessageId.message_id).where(
                and_(
                    SyncedMessageId.user_id == user_id,
                    SyncedMessageId.source == source,
                    SyncedMessageId.message_id.in_(batch),
                )
            )

            result = await self._session.execute(query)
            existing_ids.update(row[0] for row in result.all())

        # Return the difference: input IDs minus existing IDs
        return set(message_ids) - existing_ids

    async def bulk_insert_ids(
        self,
        user_id: UUID,
        source: str,
        message_ids: list[str],
    ) -> int:
        """
        Insert message IDs using ON CONFLICT DO NOTHING.

        This is idempotent - inserting the same IDs twice has no effect.

        Args:
            user_id: User UUID
            source: Source tool identifier
            message_ids: List of message IDs to store

        Returns:
            Number of actually inserted rows (excludes conflicts)
        """
        if not message_ids:
            return 0

        now = datetime.now(UTC)
        total_inserted = 0

        # Process in batches to avoid exceeding PostgreSQL's parameter limit
        for i in range(0, len(message_ids), self.INSERT_BATCH_SIZE):
            batch = message_ids[i : i + self.INSERT_BATCH_SIZE]

            values = [
                {
                    "user_id": user_id,
                    "source": source,
                    "message_id": msg_id,
                    "synced_at": now,
                }
                for msg_id in batch
            ]

            stmt = (
                insert(SyncedMessageId)
                .values(values)
                .on_conflict_do_nothing(
                    constraint="uq_user_source_message",
                )
            )

            result = await self._session.execute(stmt)
            total_inserted += result.rowcount or 0

        await self._session.commit()

        return total_inserted

    async def get_synced_count(
        self,
        user_id: UUID,
        source: str | None = None,
    ) -> int:
        """
        Get count of synced message IDs for a user.

        Args:
            user_id: User UUID
            source: Optional source filter

        Returns:
            Count of synced message IDs
        """
        query = select(func.count(SyncedMessageId.id)).where(SyncedMessageId.user_id == user_id)

        if source:
            query = query.where(SyncedMessageId.source == source)

        result = await self._session.execute(query)
        return result.scalar_one()
