"""
Factory for CommunityBenchmark model testing.
"""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import factory
from factory import LazyFunction

from app.benchmark.models import CommunityBenchmark


class CommunityBenchmarkFactory(factory.Factory):
    """Factory for creating CommunityBenchmark model instances."""

    class Meta:
        model = CommunityBenchmark

    id = LazyFunction(lambda: str(uuid4()))
    created_at = LazyFunction(lambda: datetime.now(UTC))
    updated_at = LazyFunction(lambda: datetime.now(UTC))

    period = "all"  # all, month, week
    total_users = 1000
    avg_tokens = 50000
    median_tokens = 35000
    total_community_tokens = 50000000
    avg_cost = Decimal("2.5000")
    avg_streak = 15
    avg_unique_tools = 3
    avg_cache_efficiency = Decimal("60.00")
