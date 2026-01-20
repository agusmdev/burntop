"""Streak repository for data access operations."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.common import PostgresRepository
from app.streak.models import Streak
from app.streak.schemas import StreakCreate, StreakUpdate


class StreakRepository(PostgresRepository[Streak, StreakCreate, StreakUpdate]):
    """Repository for Streak entity with streak-specific queries."""

    def __init__(self, session: AsyncSession):
        """Initialize StreakRepository with async session."""
        super().__init__(session, Streak)

    async def get_by_user_id(self, user_id: UUID) -> Streak | None:
        """
        Get streak record for a user.

        Args:
            user_id: User ID to get streak for

        Returns:
            Streak instance if found, None otherwise
        """
        query = select(Streak).where(Streak.user_id == str(user_id))
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def get_or_create_for_user(self, user_id: UUID) -> Streak:
        """
        Get or create streak record for a user.

        Args:
            user_id: User ID to get or create streak for

        Returns:
            Streak instance for the user
        """
        # Try to get existing streak
        streak = await self.get_by_user_id(user_id)

        if streak:
            return streak

        # Create new streak if not found
        new_streak = Streak(
            user_id=str(user_id),
            current_streak=0,
            longest_streak=0,
            last_active_date=None,
            timezone="UTC",
        )
        self._session.add(new_streak)
        await self._session.commit()
        await self._session.refresh(new_streak)
        return new_streak

    async def get_active_streaks(self) -> list[Streak]:
        """
        Get all streaks with active streak count > 0.

        Returns:
            List of Streak records with active streaks
        """
        query = (
            select(Streak).where(Streak.current_streak > 0).order_by(Streak.current_streak.desc())
        )

        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def get_at_risk_streaks(self, hours: int = 22) -> list[Streak]:
        """
        Get streaks at risk of breaking (not updated within the given hours).

        Args:
            hours: Number of hours to consider "at risk" (default: 22)

        Returns:
            List of Streak records that are at risk of breaking
        """
        cutoff_time = datetime.now(UTC) - timedelta(hours=hours)

        query = (
            select(Streak)
            .where(Streak.current_streak > 0)
            .where(Streak.updated_at < cutoff_time)
            .order_by(Streak.current_streak.desc())
        )

        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def bulk_update_streaks(self, streak_updates: list[dict[str, int | str]]) -> int:
        """
        Bulk update streak records for efficient batch processing.

        Args:
            streak_updates: List of dicts with id and fields to update
                Example: [{"id": "uuid", "current_streak": 5, "longest_streak": 10}]

        Returns:
            Number of records updated
        """
        if not streak_updates:
            return 0

        # Use SQLAlchemy bulk update
        # Note: This is less efficient than PostgreSQL CASE WHEN, but more readable
        count = 0
        for update_data in streak_updates:
            streak_id = update_data.pop("id")
            query = update(Streak).where(Streak.id == streak_id).values(**update_data)
            result = await self._session.execute(query)
            count += result.rowcount  # type: ignore[operator]

        await self._session.commit()
        return count
