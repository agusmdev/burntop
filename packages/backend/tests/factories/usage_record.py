"""
Factory for UsageRecord model testing.

Generates realistic usage data with faker.
"""

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import uuid4

import factory
from factory import LazyAttribute, LazyFunction

from app.usage_record.models import UsageRecord


class UsageRecordFactory(factory.Factory):
    """
    Factory for creating UsageRecord model instances.

    Usage:
        # Create usage record with default data
        record = UsageRecordFactory.build()

        # Create usage record for specific user
        record = UsageRecordFactory.build(user_id=user.id)

        # Create usage record with specific model
        record = UsageRecordFactory.build(model="claude-3-5-sonnet-20241022")
    """

    class Meta:
        model = UsageRecord

    # Primary key and timestamps
    id = LazyFunction(lambda: str(uuid4()))
    created_at = LazyFunction(lambda: datetime.now(UTC))
    updated_at = LazyFunction(lambda: datetime.now(UTC))

    # Foreign key to User
    user_id = LazyFunction(lambda: str(uuid4()))

    # Usage metadata
    date = LazyFunction(lambda: date.today())
    source = "cursor"  # cursor, claude-code, web
    model = "claude-3-5-sonnet-20241022"

    # Token counts (realistic ranges)
    input_tokens = LazyAttribute(lambda obj: factory.Faker("random_int", min=100, max=10000).generate())
    output_tokens = LazyAttribute(lambda obj: factory.Faker("random_int", min=50, max=5000).generate())
    cache_read_tokens = LazyAttribute(lambda obj: factory.Faker("random_int", min=0, max=50000).generate())
    cache_write_tokens = LazyAttribute(lambda obj: factory.Faker("random_int", min=0, max=10000).generate())
    reasoning_tokens = 0

    # Cost calculation (will be calculated based on tokens)
    cost = LazyAttribute(
        lambda obj: Decimal(
            str(round(
                (obj.input_tokens * 0.003 / 1000)
                + (obj.output_tokens * 0.015 / 1000)
                + (obj.cache_read_tokens * 0.0003 / 1000)
                + (obj.cache_write_tokens * 0.00375 / 1000),
                4
            ))
        )
    )

    # Timestamps
    usage_timestamp = LazyFunction(lambda: datetime.now(UTC))
    synced_at = LazyFunction(lambda: datetime.now(UTC))
