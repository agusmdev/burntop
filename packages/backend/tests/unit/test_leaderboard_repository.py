"""Unit tests for LeaderboardRepository ranking data query.

Tests cover:
- Correct ordering by total tokens when computing rankings
- Period filtering (all, month, week) correctly filters usage records
- Rankings are ordered by aggregated tokens within the filtered period
"""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
import pytest_asyncio

from app.leaderboard.repository import LeaderboardRepository
from app.usage_record.models import UsageRecord
from app.user.models import User


@pytest_asyncio.fixture
async def test_users(db_session):
    """Create multiple test users for ranking tests."""
    users = []
    for i in range(5):
        user = User(
            id=uuid4(),
            email=f"rankuser{i}@example.com",
            username=f"rankuser{i}",
            name=f"Rank Test User {i}",
            email_verified=True,
            is_public=True,
        )
        db_session.add(user)
        users.append(user)

    await db_session.commit()
    for user in users:
        await db_session.refresh(user)
    return users


@pytest_asyncio.fixture
async def leaderboard_repository(db_session):
    """Create a LeaderboardRepository instance for testing."""
    return LeaderboardRepository(session=db_session)


@pytest.mark.asyncio
class TestGetRankingDataOrdering:
    """Test that get_ranking_data correctly orders results by total tokens."""

    async def test_all_time_ordering_by_tokens(
        self,
        db_session,
        leaderboard_repository: LeaderboardRepository,
        test_users: list[User],
    ):
        """Test all-time rankings are ordered by total tokens descending."""
        # Create usage records with varying token amounts (not in order)
        # User 0: 100K tokens, User 1: 500K tokens, User 2: 50K tokens,
        # User 3: 300K tokens, User 4: 200K tokens
        token_amounts = [100_000, 500_000, 50_000, 300_000, 200_000]

        for user, tokens in zip(test_users, token_amounts, strict=False):
            record = UsageRecord(
                id=uuid4(),
                user_id=user.id,
                date=date.today(),
                source="claude_code",
                model="claude-sonnet-4-5",
                machine_id="test-machine",
                input_tokens=tokens,
                output_tokens=0,
                cache_read_tokens=0,
                cache_write_tokens=0,
                reasoning_tokens=0,
                cost=Decimal(str(tokens / 1_000_000 * 3)),
                usage_timestamp=datetime.now(UTC),
                synced_at=datetime.now(UTC),
            )
            db_session.add(record)

        await db_session.commit()

        # Get ranking data
        rows = await leaderboard_repository.get_ranking_data(period="all")

        # Verify results are ordered by total_tokens descending
        assert len(rows) == 5
        tokens_list = [row.total_tokens for row in rows]
        assert tokens_list == sorted(tokens_list, reverse=True)

        # Verify specific order: 500K, 300K, 200K, 100K, 50K
        expected_order = [500_000, 300_000, 200_000, 100_000, 50_000]
        assert tokens_list == expected_order

    async def test_week_period_ordering_by_tokens(
        self,
        db_session,
        leaderboard_repository: LeaderboardRepository,
        test_users: list[User],
    ):
        """Test weekly rankings are ordered by total tokens within the week period."""
        today = date.today()
        three_days_ago = today - timedelta(days=3)
        ten_days_ago = today - timedelta(days=10)

        # User 0: 1M tokens from 10 days ago (outside week) + 50K this week
        # User 1: 100K tokens this week only
        # User 2: 500K tokens this week only
        # User 3: 200K tokens this week only
        # User 4: 300K tokens this week only

        # User 0: Old record (outside week period)
        old_record = UsageRecord(
            id=uuid4(),
            user_id=test_users[0].id,
            date=ten_days_ago,
            source="claude_code",
            model="claude-sonnet-4-5",
            machine_id="test-machine",
            input_tokens=1_000_000,  # 1M tokens - but outside week
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=Decimal("3.00"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )
        db_session.add(old_record)

        # User 0: Small recent record (within week)
        recent_record_0 = UsageRecord(
            id=uuid4(),
            user_id=test_users[0].id,
            date=three_days_ago,
            source="claude_code",
            model="claude-sonnet-4-5",
            machine_id="test-machine",
            input_tokens=50_000,  # Only 50K this week
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=Decimal("0.15"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )
        db_session.add(recent_record_0)

        # Other users: Recent records within the week (varying amounts)
        week_token_amounts = [100_000, 500_000, 200_000, 300_000]
        for i, (user, tokens) in enumerate(
            zip(test_users[1:], week_token_amounts, strict=False)
        ):
            record = UsageRecord(
                id=uuid4(),
                user_id=user.id,
                date=three_days_ago,
                source="claude_code",
                model="claude-sonnet-4-5",
                machine_id="test-machine",
                input_tokens=tokens,
                output_tokens=0,
                cache_read_tokens=0,
                cache_write_tokens=0,
                reasoning_tokens=0,
                cost=Decimal(str(tokens / 1_000_000 * 3)),
                usage_timestamp=datetime.now(UTC),
                synced_at=datetime.now(UTC),
            )
            db_session.add(record)

        await db_session.commit()

        # Get weekly ranking data
        rows = await leaderboard_repository.get_ranking_data(period="week")

        # Verify results are ordered by total_tokens descending
        tokens_list = [row.total_tokens for row in rows]
        assert tokens_list == sorted(tokens_list, reverse=True)

        # Expected order for week: 500K, 300K, 200K, 100K, 50K
        # User 0 should be LAST because they only have 50K this week
        # (their 1M from 10 days ago should NOT count)
        expected_order = [500_000, 300_000, 200_000, 100_000, 50_000]
        assert tokens_list == expected_order

        # Verify User 0 (with 1M all-time but only 50K this week) is ranked last
        user_0_row = next(row for row in rows if str(row.user_id) == str(test_users[0].id))
        assert user_0_row.total_tokens == 50_000

    async def test_month_period_ordering_by_tokens(
        self,
        db_session,
        leaderboard_repository: LeaderboardRepository,
        test_users: list[User],
    ):
        """Test monthly rankings are ordered by total tokens within the month period."""
        today = date.today()
        fifteen_days_ago = today - timedelta(days=15)
        forty_days_ago = today - timedelta(days=40)

        # User 0: 2M tokens from 40 days ago (outside month) + 25K this month
        # User 1: 150K tokens this month
        # User 2: 400K tokens this month

        # User 0: Old record (outside month period)
        old_record = UsageRecord(
            id=uuid4(),
            user_id=test_users[0].id,
            date=forty_days_ago,
            source="claude_code",
            model="claude-sonnet-4-5",
            machine_id="test-machine",
            input_tokens=2_000_000,  # 2M tokens - but outside month
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=Decimal("6.00"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )
        db_session.add(old_record)

        # User 0: Small recent record (within month)
        recent_record_0 = UsageRecord(
            id=uuid4(),
            user_id=test_users[0].id,
            date=fifteen_days_ago,
            source="claude_code",
            model="claude-sonnet-4-5",
            machine_id="test-machine",
            input_tokens=25_000,  # Only 25K this month
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=Decimal("0.075"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )
        db_session.add(recent_record_0)

        # User 1: Record within month
        record_1 = UsageRecord(
            id=uuid4(),
            user_id=test_users[1].id,
            date=fifteen_days_ago,
            source="claude_code",
            model="claude-sonnet-4-5",
            machine_id="test-machine",
            input_tokens=150_000,
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=Decimal("0.45"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )
        db_session.add(record_1)

        # User 2: Record within month (highest)
        record_2 = UsageRecord(
            id=uuid4(),
            user_id=test_users[2].id,
            date=fifteen_days_ago,
            source="claude_code",
            model="claude-sonnet-4-5",
            machine_id="test-machine",
            input_tokens=400_000,
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=Decimal("1.20"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )
        db_session.add(record_2)

        await db_session.commit()

        # Get monthly ranking data
        rows = await leaderboard_repository.get_ranking_data(period="month")

        # Verify results are ordered by total_tokens descending
        tokens_list = [row.total_tokens for row in rows]
        assert tokens_list == sorted(tokens_list, reverse=True)

        # Expected order: 400K (user2), 150K (user1), 25K (user0)
        expected_order = [400_000, 150_000, 25_000]
        assert tokens_list == expected_order

    async def test_aggregates_multiple_records_per_user(
        self,
        db_session,
        leaderboard_repository: LeaderboardRepository,
        test_users: list[User],
    ):
        """Test that tokens from multiple records per user are summed correctly."""
        today = date.today()
        yesterday = today - timedelta(days=1)

        # User 0: Two records, total 300K (100K + 200K)
        for tokens in [100_000, 200_000]:
            record = UsageRecord(
                id=uuid4(),
                user_id=test_users[0].id,
                date=today if tokens == 100_000 else yesterday,
                source="claude_code",
                model="claude-sonnet-4-5",
                machine_id="test-machine",
                input_tokens=tokens,
                output_tokens=0,
                cache_read_tokens=0,
                cache_write_tokens=0,
                reasoning_tokens=0,
                cost=Decimal(str(tokens / 1_000_000 * 3)),
                usage_timestamp=datetime.now(UTC),
                synced_at=datetime.now(UTC),
            )
            db_session.add(record)

        # User 1: One record with 250K
        record = UsageRecord(
            id=uuid4(),
            user_id=test_users[1].id,
            date=today,
            source="claude_code",
            model="claude-sonnet-4-5",
            machine_id="test-machine",
            input_tokens=250_000,
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=Decimal("0.75"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )
        db_session.add(record)

        await db_session.commit()

        # Get ranking data
        rows = await leaderboard_repository.get_ranking_data(period="all")

        # User 0 should be ranked first (300K total) over User 1 (250K)
        assert len(rows) == 2
        assert rows[0].total_tokens == 300_000
        assert rows[1].total_tokens == 250_000

    async def test_includes_all_token_types_in_sum(
        self,
        db_session,
        leaderboard_repository: LeaderboardRepository,
        test_users: list[User],
    ):
        """Test that all token types are included in the total."""
        today = date.today()

        # User 0: Various token types totaling 500K
        record_0 = UsageRecord(
            id=uuid4(),
            user_id=test_users[0].id,
            date=today,
            source="claude_code",
            model="claude-sonnet-4-5",
            machine_id="test-machine",
            input_tokens=100_000,
            output_tokens=150_000,
            cache_read_tokens=100_000,
            cache_write_tokens=50_000,
            reasoning_tokens=100_000,  # Total: 500K
            cost=Decimal("1.50"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )
        db_session.add(record_0)

        # User 1: Only input tokens, 400K
        record_1 = UsageRecord(
            id=uuid4(),
            user_id=test_users[1].id,
            date=today,
            source="claude_code",
            model="claude-sonnet-4-5",
            machine_id="test-machine",
            input_tokens=400_000,
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=Decimal("1.20"),
            usage_timestamp=datetime.now(UTC),
            synced_at=datetime.now(UTC),
        )
        db_session.add(record_1)

        await db_session.commit()

        rows = await leaderboard_repository.get_ranking_data(period="all")

        # User 0 should be first (500K from all token types)
        assert len(rows) == 2
        assert rows[0].total_tokens == 500_000
        assert rows[1].total_tokens == 400_000
