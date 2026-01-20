"""
Factory for Streak model testing.

Generates realistic streak data.
"""

from datetime import UTC, date, datetime
from uuid import uuid4

import factory
from factory import LazyFunction

from app.streak.models import Streak


class StreakFactory(factory.Factory):
    """
    Factory for creating Streak model instances.

    Usage:
        # Create streak with default data
        streak = StreakFactory.build()

        # Create streak for specific user
        streak = StreakFactory.build(user_id=user.id)
    """

    class Meta:
        model = Streak

    # Primary key and timestamps
    id = LazyFunction(lambda: str(uuid4()))
    created_at = LazyFunction(lambda: datetime.now(UTC))
    updated_at = LazyFunction(lambda: datetime.now(UTC))

    # Foreign key to User (unique)
    user_id = LazyFunction(lambda: str(uuid4()))

    # Streak tracking
    current_streak = 7
    longest_streak = 30
    last_active_date = LazyFunction(lambda: date.today())

    # Timezone
    timezone = "UTC"
