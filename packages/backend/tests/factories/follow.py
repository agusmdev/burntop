"""
Factory for Follow model testing.

Generates follow relationships.
"""

from datetime import UTC, datetime
from uuid import uuid4

import factory
from factory import LazyFunction

from app.follow.models import Follow


class FollowFactory(factory.Factory):
    """
    Factory for creating Follow model instances.

    Usage:
        # Create follow relationship with default data
        follow = FollowFactory.build()

        # Create follow relationship between specific users
        follow = FollowFactory.build(follower_id=user1.id, following_id=user2.id)
    """

    class Meta:
        model = Follow

    # Composite primary key (no UUID id field)
    follower_id = LazyFunction(lambda: str(uuid4()))
    following_id = LazyFunction(lambda: str(uuid4()))

    # Timestamp
    created_at = LazyFunction(lambda: datetime.now(UTC))
