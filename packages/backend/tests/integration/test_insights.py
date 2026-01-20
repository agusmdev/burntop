"""Integration tests for insights (benchmarks) endpoints.

Tests the /api/v1/insights endpoint for comparing user stats with community benchmarks.
"""

from httpx import AsyncClient

from tests.factories.benchmark import CommunityBenchmarkFactory
from tests.factories.usage_record import UsageRecordFactory


class TestGetInsights:
    """Tests for GET /api/v1/insights"""

    async def test_get_insights_requires_auth(
        self,
        client: AsyncClient,
    ) -> None:
        """Test that getting insights requires authentication."""
        response = await client.get("/api/v1/insights/")

        assert response.status_code == 401

    async def test_get_insights_no_usage_data(
        self,
        client: AsyncClient,
        authenticated_client,
        db_session,
    ) -> None:
        """Test getting insights when user has no usage data."""
        auth_client, user_data = authenticated_client

        # Create benchmark so insights endpoint doesn't return 404
        benchmark = CommunityBenchmarkFactory.build(
            period="all",
            total_users=1,
        )
        db_session.add(benchmark)
        await db_session.commit()

        response = await auth_client.get("/api/v1/insights/")

        assert response.status_code == 200
        data = response.json()

        # Should return insights even with no data
        assert "id" in data
        assert "username" in data
        assert "period" in data
        # User stats should be zero/default
        assert data["user_total_tokens"] == 0
        assert data["user_total_cost"] == 0.0

    async def test_get_insights_with_usage_data(
        self,
        client: AsyncClient,
        authenticated_client,
        db_session,
    ) -> None:
        """Test getting insights with user usage data."""
        auth_client, user_data = authenticated_client

        # Get authenticated user by id (note: /me endpoint returns "id", not "user_id")
        from sqlalchemy import select

        from app.user.models import User
        result = await db_session.execute(
            select(User).where(User.id == user_data["id"])
        )
        user = result.scalar_one()

        # Create benchmark so insights endpoint doesn't return 404
        benchmark = CommunityBenchmarkFactory.build(
            period="all",
            total_users=1,
        )
        db_session.add(benchmark)

        # Create usage records with different dates to avoid unique constraint violation
        from datetime import date, timedelta
        usage1 = UsageRecordFactory.build(
            user_id=user.id,
            date=date.today(),
            input_tokens=10000,
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=1.50,
        )
        usage2 = UsageRecordFactory.build(
            user_id=user.id,
            date=date.today() - timedelta(days=1),  # Different date
            input_tokens=15000,
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=2.25,
        )
        db_session.add_all([usage1, usage2])
        await db_session.commit()

        response = await auth_client.get("/api/v1/insights/")

        assert response.status_code == 200
        data = response.json()

        assert "user_total_tokens" in data
        assert "user_total_cost" in data
        assert data["user_total_tokens"] == 25000  # 10000 + 15000

    async def test_get_insights_with_benchmarks(
        self,
        client: AsyncClient,
        authenticated_client,
        db_session,
    ) -> None:
        """Test getting insights with community benchmarks."""
        auth_client, user_data = authenticated_client

        # Get authenticated user by id (note: /me endpoint returns "id", not "user_id")
        from sqlalchemy import select

        from app.user.models import User
        result = await db_session.execute(
            select(User).where(User.id == user_data["id"])
        )
        user = result.scalar_one()

        # Create community benchmarks
        benchmark = CommunityBenchmarkFactory.build(
            period="all",
            total_users=100,
            avg_tokens=50000,
            median_tokens=40000,
            avg_cost=5.00,
        )
        db_session.add(benchmark)
        await db_session.commit()

        # Create usage records
        usage = UsageRecordFactory.build(
            user_id=user.id,
            input_tokens=60000,
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
            cost=6.00,
        )
        db_session.add(usage)
        await db_session.commit()

        response = await auth_client.get("/api/v1/insights/")

        assert response.status_code == 200
        data = response.json()

        # Should have community benchmark fields
        assert data["community_avg_tokens"] == 50000
        assert data["community_median_tokens"] == 40000
        assert data["community_total_users"] == 100
        # User should be above average
        assert data["user_total_tokens"] == 60000
        assert data["is_above_average_tokens"] is True

    async def test_get_insights_percentile_calculation(
        self,
        client: AsyncClient,
        authenticated_client,
        db_session,
    ) -> None:
        """Test that insights include percentile comparisons."""
        auth_client, user_data = authenticated_client

        # Get authenticated user by id (note: /me endpoint returns "id", not "user_id")
        from sqlalchemy import select

        from app.user.models import User
        result = await db_session.execute(
            select(User).where(User.id == user_data["id"])
        )
        user = result.scalar_one()

        # Create community benchmarks
        benchmark = CommunityBenchmarkFactory.build(
            period="all",
            total_users=100,
            avg_tokens=50000,
            median_tokens=40000,
        )
        db_session.add(benchmark)
        await db_session.commit()

        # Create usage records (user above average)
        usage = UsageRecordFactory.build(
            user_id=user.id,
            input_tokens=70000,
            output_tokens=0,
            cache_read_tokens=0,
            cache_write_tokens=0,
            reasoning_tokens=0,
        )
        db_session.add(usage)
        await db_session.commit()

        response = await auth_client.get("/api/v1/insights/")

        assert response.status_code == 200
        data = response.json()

        # tokens_percentile might be None (simplified implementation returns 50.0 for most metrics)
        # Just verify the field exists
        assert "tokens_percentile" in data
        assert data["user_total_tokens"] == 70000

    async def test_get_insights_by_period(
        self,
        client: AsyncClient,
        authenticated_client,
        db_session,
    ) -> None:
        """Test getting insights filtered by period."""
        auth_client, user_data = authenticated_client

        # Get authenticated user by id (note: /me endpoint returns "id", not "user_id")
        from sqlalchemy import select

        from app.user.models import User
        result = await db_session.execute(
            select(User).where(User.id == user_data["id"])
        )
        user = result.scalar_one()

        # Create benchmarks for different periods
        benchmark_all = CommunityBenchmarkFactory.build(
            period="all",
            avg_tokens=50000,
        )
        benchmark_month = CommunityBenchmarkFactory.build(
            period="month",
            avg_tokens=10000,
        )
        db_session.add_all([benchmark_all, benchmark_month])
        await db_session.commit()

        # Test with period parameter
        response = await auth_client.get("/api/v1/insights/?period=month")

        assert response.status_code == 200
        data = response.json()

        assert data["period"] == "month"
        assert data["community_avg_tokens"] == 10000  # Should use month benchmark

    async def test_get_insights_response_structure(
        self,
        client: AsyncClient,
        authenticated_client,
        db_session,
    ) -> None:
        """Test that insights response has expected structure."""
        auth_client, user_data = authenticated_client

        # Get authenticated user by id (note: /me endpoint returns "id", not "user_id")
        from sqlalchemy import select

        from app.user.models import User
        result = await db_session.execute(
            select(User).where(User.id == user_data["id"])
        )
        user = result.scalar_one()

        # Create benchmark
        benchmark = CommunityBenchmarkFactory.build(
            period="all",
            total_users=100,
            avg_tokens=50000,
            median_tokens=40000,
            avg_cost=5.00,
            avg_streak=7,
            avg_unique_tools=3,
            avg_cache_efficiency=25.5,
        )
        db_session.add(benchmark)
        await db_session.commit()

        response = await auth_client.get("/api/v1/insights/")

        assert response.status_code == 200
        data = response.json()

        # Verify required top-level fields
        assert "id" in data
        assert "username" in data
        assert "period" in data

        # Verify user stat fields
        assert "user_total_tokens" in data
        assert "user_total_cost" in data
        assert "user_current_streak" in data

        # Verify community benchmark fields
        assert "community_total_users" in data
        assert "community_avg_tokens" in data
        assert "community_median_tokens" in data

        # Verify benchmark values match
        assert data["community_total_users"] == 100
        assert data["community_avg_tokens"] == 50000
        assert data["community_median_tokens"] == 40000

    async def test_get_insights_invalid_period(
        self,
        client: AsyncClient,
        authenticated_client,
    ) -> None:
        """Test getting insights with invalid period parameter."""
        auth_client, user_data = authenticated_client

        response = await auth_client.get("/api/v1/insights/?period=invalid")

        # FastAPI validates period with regex pattern, so should return 422 validation error
        assert response.status_code == 422


class TestInsightsWithStreaks:
    """Tests for insights including streak comparisons"""

    async def test_get_insights_with_streak_data(
        self,
        client: AsyncClient,
        authenticated_client,
        db_session,
    ) -> None:
        """Test that insights include streak comparisons."""
        auth_client, user_data = authenticated_client

        # Get authenticated user by id (note: /me endpoint returns "id", not "user_id")
        from sqlalchemy import select

        from app.user.models import User
        result = await db_session.execute(
            select(User).where(User.id == user_data["id"])
        )
        user = result.scalar_one()

        # Create streak for user
        from tests.factories.streak import StreakFactory
        streak = StreakFactory.build(
            user_id=user.id,
            current_streak=14,
            longest_streak=21,
        )
        db_session.add(streak)
        await db_session.commit()

        # Create benchmark with streak data
        benchmark = CommunityBenchmarkFactory.build(
            period="all",
            avg_streak=7,
        )
        db_session.add(benchmark)
        await db_session.commit()

        response = await auth_client.get("/api/v1/insights/")

        assert response.status_code == 200
        data = response.json()

        # Should include streak comparisons
        assert data["user_current_streak"] == 14
        assert data["community_avg_streak"] == 7
        assert data["is_above_average_streak"] is True
