"""
Factory for LeaderboardCache model testing.
"""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import factory
from factory import LazyFunction

from app.leaderboard.models import LeaderboardCache


class LeaderboardCacheFactory(factory.Factory):
    """Factory for creating LeaderboardCache model instances."""

    class Meta:
        model = LeaderboardCache

    id = LazyFunction(lambda: str(uuid4()))
    created_at = LazyFunction(lambda: datetime.now(UTC))
    updated_at = LazyFunction(lambda: datetime.now(UTC))

    user_id = LazyFunction(lambda: str(uuid4()))
    leaderboard_type = "global"  # global, diverse, efficient, streak, rising, reasoning
    period = "all"  # all, month, week
    rank = 1
    score = Decimal("1000.00")

    total_tokens = 100000
    total_cost = Decimal("5.0000")
    streak_days = 30
    unique_days = 25
    achievements_unlocked = 10
    diversity_score = Decimal("75.50")
    cache_efficiency = Decimal("65.00")
    reasoning_tokens = 5000
    rank_change = 0
