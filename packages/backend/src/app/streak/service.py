"""Streak service for business logic."""

from datetime import date as date_type, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from app.core import BaseService
from app.exceptions import NotFoundError
from app.streak.models import Streak
from app.streak.repository import StreakRepository
from app.streak.schemas import StreakCreate, StreakUpdate


class StreakService(BaseService[Streak, StreakCreate, StreakUpdate]):
    """
    Service for streak management with business logic.

    Handles streak calculation, timezone conversion, and streak break detection.
    """

    def __init__(self, repository: StreakRepository):
        """
        Initialize StreakService with repository.

        Args:
            repository: StreakRepository instance
        """
        super().__init__(repository)
        self._streak_repository: StreakRepository = repository

    async def get_by_user_id(self, user_id: UUID) -> Streak | None:
        """
        Get streak record for a user.

        Args:
            user_id: User ID to get streak for

        Returns:
            Streak instance if found, None otherwise
        """
        return await self._streak_repository.get_by_user_id(user_id)

    async def get_or_create_streak(self, user_id: UUID, timezone: str = "UTC") -> Streak:
        """
        Get or create streak record for a user.

        Args:
            user_id: User ID to get or create streak for
            timezone: User's timezone (default: UTC)

        Returns:
            Streak instance for the user
        """
        # Use repository's get_or_create method
        streak = await self._streak_repository.get_or_create_for_user(user_id)

        # Update timezone if different
        if streak.timezone != timezone:
            streak.timezone = timezone
            await self._streak_repository.update(streak.id, StreakUpdate(timezone=timezone))

        return streak

    async def update_streak(
        self, user_id: UUID, activity_date: date_type | None = None, timezone: str = "UTC"
    ) -> Streak:
        """
        Update user's streak based on activity date.

        Args:
            user_id: User ID to update streak for
            activity_date: Date of activity (defaults to today in user's timezone)
            timezone: User's timezone for accurate day boundaries

        Returns:
            Updated Streak instance
        """
        # Get or create streak
        streak = await self.get_or_create_streak(user_id, timezone)

        # Get activity date in user's timezone if not provided
        if activity_date is None:
            tz = ZoneInfo(timezone)
            activity_date = datetime.now(tz).date()

        # Calculate new streak values
        new_current, new_longest = self.calculate_streak(
            current_streak=streak.current_streak,
            longest_streak=streak.longest_streak,
            last_active_date=streak.last_active_date,
            new_activity_date=activity_date,
        )

        # Update streak
        update_data = StreakUpdate(
            current_streak=new_current,
            longest_streak=new_longest,
            last_active_date=activity_date,
            timezone=timezone,
        )

        updated_streak = await self._streak_repository.update(streak.id, update_data)
        if not updated_streak:
            # Should not happen since we just got the streak, but handle it safely
            return streak
        return updated_streak

    @staticmethod
    def calculate_streak(
        current_streak: int,
        longest_streak: int,
        last_active_date: date_type | None,
        new_activity_date: date_type,
    ) -> tuple[int, int]:
        """
        Calculate new streak values based on activity date.

        A streak continues if the new activity is on the same day or the next day.
        A streak breaks if there's a gap of more than 1 day.

        Args:
            current_streak: Current streak count
            longest_streak: Longest streak ever achieved
            last_active_date: Last date user was active (None for first activity)
            new_activity_date: Date of new activity

        Returns:
            Tuple of (new_current_streak, new_longest_streak)
        """
        # First activity ever
        if last_active_date is None:
            return (1, max(1, longest_streak))

        # Same day activity - no change
        if new_activity_date == last_active_date:
            return (current_streak, longest_streak)

        # Calculate day difference
        day_diff = (new_activity_date - last_active_date).days

        if day_diff == 1:
            # Next day - streak continues
            new_current = current_streak + 1
            new_longest = max(new_current, longest_streak)
            return (new_current, new_longest)
        elif day_diff > 1:
            # Gap - streak breaks, start new streak
            return (1, longest_streak)
        else:
            # Activity in the past (day_diff < 0) - ignore or handle as needed
            # For now, we'll ignore past activities to prevent manipulation
            return (current_streak, longest_streak)

    async def check_streak_break(self, user_id: UUID) -> bool:
        """
        Check if a user's streak has broken (24+ hours since last activity in their timezone).

        Args:
            user_id: User ID to check

        Returns:
            True if streak is broken, False if still active
        """
        try:
            # Get user's streak
            streak = await self._streak_repository.get_by_field("user_id", str(user_id))
            if not streak:
                return False  # No streak to break

            # If current_streak is 0, no active streak
            if streak.current_streak == 0:
                return False

            # If never been active, no streak to break
            if not streak.last_active_date:
                return False

            # Get current date in user's timezone
            tz = ZoneInfo(streak.timezone)
            today = datetime.now(tz).date()

            # Calculate day difference
            day_diff = (today - streak.last_active_date).days

            # Streak breaks if more than 1 day has passed
            return day_diff > 1

        except NotFoundError:
            return False

    async def get_at_risk_streaks(self, hours: int = 22) -> list[Streak]:
        """
        Get streaks at risk of breaking based on user's local timezone.

        A streak is "at risk" when:
        1. The user has an active streak (current_streak > 0)
        2. The user hasn't been active today in their local timezone
        3. It's past a certain hour (default 22:00) in the user's local timezone

        Args:
            hours: Hour of the day (0-23) in user's timezone after which
                   an inactive streak is considered "at risk" (default 22)

        Returns:
            List of Streak records at risk
        """
        # Get all active streaks from repository
        all_active_streaks = await self._streak_repository.get_active_streaks()

        at_risk_streaks = []
        for streak in all_active_streaks:
            # Skip if no last_active_date
            if not streak.last_active_date:
                continue

            # Get current time in user's timezone
            try:
                user_tz = ZoneInfo(streak.timezone)
            except Exception:
                # Fall back to UTC if timezone is invalid
                user_tz = ZoneInfo("UTC")

            user_now = datetime.now(user_tz)
            user_today = user_now.date()

            # Check if user was active today
            if streak.last_active_date == user_today:
                continue  # Not at risk - already active today

            # Check if it's past the "at risk" hour in user's timezone
            if user_now.hour >= hours:
                at_risk_streaks.append(streak)

        return at_risk_streaks

    async def get_current_streak(self, user_id: UUID) -> int | None:
        """Get user's current streak count.

        Args:
            user_id: User ID

        Returns:
            Current streak count, or None if no streak exists
        """
        streak = await self._streak_repository.get_by_user_id(user_id)
        if streak is None:
            return None
        return streak.current_streak
