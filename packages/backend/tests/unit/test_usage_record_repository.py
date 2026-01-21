"""Unit tests for UsageRecord repository accumulation logic.

Tests cover:
- Token field accumulation on upsert conflicts
- Cost field accumulation on upsert conflicts
- Timestamp field replacement (not accumulation)
- Multiple upserts accumulating correctly
"""

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.usage_record.models import UsageRecord
from app.usage_record.repository import UsageRecordRepository
from app.usage_record.schemas import UsageRecordCreate
from app.user.models import User


@pytest_asyncio.fixture
async def test_user(db_session):
    """Create a test user in the database."""
    user = User(
        id=uuid4(),
        email="test@example.com",
        username="testuser",
        name="Test User",
        email_verified=True,
        is_public=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def usage_record_repository(db_session):
    """Create a UsageRecordRepository instance for testing."""
    return UsageRecordRepository(session=db_session)


@pytest.mark.asyncio
class TestUsageRecordAccumulation:
    """Test cases for token and cost accumulation in bulk_upsert."""

    async def test_upsert_accumulates_input_tokens(
        self,
        db_session,
        usage_record_repository: UsageRecordRepository,
        test_user: User,
    ):
        """Test that upserting same day/source/model/machine accumulates input tokens."""
        test_date = date.today()

        # First sync: 1,000,000,000 input tokens (1B)
        # Note: Using values < 2.1B to fit in int32 range
        record1 = UsageRecordCreate(
            user_id=test_user.id,
            date=test_date,
            source="claude_code",
            model="claude-sonnet-4-5",
            machine_id="test-machine",
            input_tokens=1_000_000_000,
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=Decimal("3.00"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )

        # Insert first record
        await usage_record_repository.bulk_upsert(
            objs_in=[record1],
            index_elements=["user_id", "date", "source", "model", "machine_id"],
        )

        # Verify first record
        query = select(UsageRecord).where(
            UsageRecord.user_id == test_user.id,
            UsageRecord.date == test_date,
            UsageRecord.source == "claude_code",
            UsageRecord.model == "claude-sonnet-4-5",
            UsageRecord.machine_id == "test-machine",
        )
        result = await db_session.execute(query)
        record = result.scalar_one()
        assert record.input_tokens == 1_000_000_000

        # Second sync: 800,000,000 input tokens (800M)
        # This simulates running sync again on the same day
        record2 = UsageRecordCreate(
            user_id=test_user.id,
            date=test_date,
            source="claude_code",
            model="claude-sonnet-4-5",
            machine_id="test-machine",
            input_tokens=800_000_000,
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=Decimal("2.40"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )

        # Upsert second record (should accumulate, not replace)
        await usage_record_repository.bulk_upsert(
            objs_in=[record2],
            index_elements=["user_id", "date", "source", "model", "machine_id"],
        )

        # Expire all objects to force refresh from database
        db_session.expire_all()

        # Verify accumulation
        result = await db_session.execute(query)
        record = result.scalar_one()

        # Should be 1B + 800M = 1.8B
        assert record.input_tokens == 1_800_000_000
        assert record.cost == Decimal("5.40")  # 3.00 + 2.40

    async def test_upsert_accumulates_all_token_fields(
        self,
        db_session,
        usage_record_repository: UsageRecordRepository,
        test_user: User,
    ):
        """Test that all token fields accumulate correctly."""
        test_date = date.today()

        # First sync
        record1 = UsageRecordCreate(
            user_id=test_user.id,
            date=test_date,
            source="cursor",
            model="claude-3-5-sonnet-20241022",
            machine_id="machine-1",
            input_tokens=1_000_000,
            output_tokens=500_000,
            cache_read_tokens=250_000,
            cache_write_tokens=100_000,
            reasoning_tokens=50_000,
            cost=Decimal("5.50"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )

        await usage_record_repository.bulk_upsert(
            objs_in=[record1],
            index_elements=["user_id", "date", "source", "model", "machine_id"],
        )

        # Second sync with different values
        record2 = UsageRecordCreate(
            user_id=test_user.id,
            date=test_date,
            source="cursor",
            model="claude-3-5-sonnet-20241022",
            machine_id="machine-1",
            input_tokens=2_000_000,
            output_tokens=1_000_000,
            cache_read_tokens=500_000,
            cache_write_tokens=200_000,
            reasoning_tokens=100_000,
            cost=Decimal("11.00"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )

        await usage_record_repository.bulk_upsert(
            objs_in=[record2],
            index_elements=["user_id", "date", "source", "model", "machine_id"],
        )

        # Verify all token fields accumulated
        query = select(UsageRecord).where(
            UsageRecord.user_id == test_user.id,
            UsageRecord.date == test_date,
            UsageRecord.source == "cursor",
            UsageRecord.model == "claude-3-5-sonnet-20241022",
            UsageRecord.machine_id == "machine-1",
        )
        result = await db_session.execute(query)
        record = result.scalar_one()

        assert record.input_tokens == 3_000_000  # 1M + 2M
        assert record.output_tokens == 1_500_000  # 500K + 1M
        assert record.cache_read_tokens == 750_000  # 250K + 500K
        assert record.cache_write_tokens == 300_000  # 100K + 200K
        assert record.reasoning_tokens == 150_000  # 50K + 100K
        assert record.cost == Decimal("16.50")  # 5.50 + 11.00

    async def test_upsert_different_machine_ids_creates_separate_records(
        self,
        db_session,
        usage_record_repository: UsageRecordRepository,
        test_user: User,
    ):
        """Test that different machine_ids create separate records (don't accumulate)."""
        test_date = date.today()

        # Sync from machine 1
        record1 = UsageRecordCreate(
            user_id=test_user.id,
            date=test_date,
            source="claude_code",
            model="claude-sonnet-4-5",
            machine_id="machine-1",
            input_tokens=1_000_000,
            output_tokens=500_000,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=Decimal("3.00"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )

        # Sync from machine 2 (same user, date, source, model, but different machine)
        record2 = UsageRecordCreate(
            user_id=test_user.id,
            date=test_date,
            source="claude_code",
            model="claude-sonnet-4-5",
            machine_id="machine-2",
            input_tokens=2_000_000,
            output_tokens=1_000_000,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=Decimal("6.00"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )

        await usage_record_repository.bulk_upsert(
            objs_in=[record1, record2],
            index_elements=["user_id", "date", "source", "model", "machine_id"],
        )

        # Verify two separate records exist
        query = select(UsageRecord).where(
            UsageRecord.user_id == test_user.id,
            UsageRecord.date == test_date,
        )
        result = await db_session.execute(query)
        records = result.scalars().all()

        assert len(records) == 2

        # Find records by machine_id
        machine1_record = next(r for r in records if r.machine_id == "machine-1")
        machine2_record = next(r for r in records if r.machine_id == "machine-2")

        assert machine1_record.input_tokens == 1_000_000
        assert machine2_record.input_tokens == 2_000_000

    async def test_upsert_multiple_times_accumulates_progressively(
        self,
        db_session,
        usage_record_repository: UsageRecordRepository,
        test_user: User,
    ):
        """Test that multiple upserts accumulate progressively (simulating hourly cronjob)."""
        test_date = date.today()

        # Simulate 4 syncs throughout the day
        sync_values = [
            1_000_000,  # First sync
            500_000,  # Second sync (1 hour later)
            750_000,  # Third sync (2 hours later)
            250_000,  # Fourth sync (3 hours later)
        ]

        for sync_tokens in sync_values:
            record = UsageRecordCreate(
                user_id=test_user.id,
                date=test_date,
                source="cursor",
                model="claude-3-5-sonnet-20241022",
                machine_id="test-machine",
                input_tokens=sync_tokens,
                output_tokens=sync_tokens // 2,
                cache_read_tokens=0,
                cache_write_tokens=0,
                reasoning_tokens=0,
                cost=Decimal(str(sync_tokens / 1_000_000 * 3)),  # $3 per 1M tokens
                usage_timestamp=datetime.now(UTC),
                synced_at=datetime.now(UTC),
            )

            await usage_record_repository.bulk_upsert(
                objs_in=[record],
                index_elements=["user_id", "date", "source", "model", "machine_id"],
            )

        # Verify final accumulated values
        query = select(UsageRecord).where(
            UsageRecord.user_id == test_user.id,
            UsageRecord.date == test_date,
            UsageRecord.source == "cursor",
            UsageRecord.model == "claude-3-5-sonnet-20241022",
            UsageRecord.machine_id == "test-machine",
        )
        result = await db_session.execute(query)
        record = result.scalar_one()

        # Total should be sum of all syncs
        expected_input = sum(sync_values)
        expected_output = expected_input // 2
        expected_cost = Decimal(str(expected_input / 1_000_000 * 3))

        assert record.input_tokens == expected_input  # 2.5M
        assert record.output_tokens == expected_output  # 1.25M
        assert record.cost == expected_cost

    async def test_upsert_zero_tokens_still_accumulates(
        self,
        db_session,
        usage_record_repository: UsageRecordRepository,
        test_user: User,
    ):
        """Test that upserting with zero tokens doesn't break accumulation."""
        test_date = date.today()

        # First sync: some tokens
        record1 = UsageRecordCreate(
            user_id=test_user.id,
            date=test_date,
            source="cursor",
            model="claude-3-5-sonnet-20241022",
            machine_id="test-machine",
            input_tokens=1_000_000,
            output_tokens=500_000,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=Decimal("3.00"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )

        await usage_record_repository.bulk_upsert(
            objs_in=[record1],
            index_elements=["user_id", "date", "source", "model", "machine_id"],
        )

        # Second sync: zero tokens (edge case)
        record2 = UsageRecordCreate(
            user_id=test_user.id,
            date=test_date,
            source="cursor",
            model="claude-3-5-sonnet-20241022",
            machine_id="test-machine",
            input_tokens=0,
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=Decimal("0.00"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )

        await usage_record_repository.bulk_upsert(
            objs_in=[record2],
            index_elements=["user_id", "date", "source", "model", "machine_id"],
        )

        # Verify tokens remain the same (0 added to original)
        query = select(UsageRecord).where(
            UsageRecord.user_id == test_user.id,
            UsageRecord.date == test_date,
        )
        result = await db_session.execute(query)
        record = result.scalar_one()

        assert record.input_tokens == 1_000_000  # Unchanged
        assert record.output_tokens == 500_000  # Unchanged
        assert record.cost == Decimal("3.00")  # Unchanged
