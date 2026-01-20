"""
Factory for Activity model testing.
"""

from datetime import UTC, datetime
from uuid import uuid4

import factory
from factory import LazyFunction

from app.activity.models import Activity


class ActivityFactory(factory.Factory):
    """Factory for creating Activity model instances."""

    class Meta:
        model = Activity

    id = LazyFunction(lambda: str(uuid4()))
    created_at = LazyFunction(lambda: datetime.now(UTC))
    updated_at = LazyFunction(lambda: datetime.now(UTC))

    user_id = LazyFunction(lambda: str(uuid4()))
    type = "streak_milestone"
    data = None
