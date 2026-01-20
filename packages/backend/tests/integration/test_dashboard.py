"""Integration tests for dashboard endpoints."""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Session
from tests.factories import (
    StreakFactory,
    UsageRecordFactory,
    UserFactory,
)


def get_utc_date() -> date:
    """Get current date in UTC timezone (consistent with service)."""
    return datetime.now(tz=UTC).date()


@pytest.fixture
async def user_with_usage_data(db_session: AsyncSession) -> dict:
    """
    Create a user with comprehensive usage data for dashboard testing.

    Returns:
        dict: User data with session token
    """
    # Create user
    user = UserFactory.build()
    db_session.add(user)
    await db_session.flush()  # Get user ID without committing

    # Create session token for authentication (use UUID for uniqueness)
    session_id = f"test_session_{str(uuid.uuid4())[:8]}"
    session_token = f"test_dashboard_token_{str(uuid.uuid4())[:8]}"
    session = Session(
        id=session_id,
        user_id=user.id,
        token=session_token,
        expires_at=datetime.now(UTC) + timedelta(days=30),
    )
    db_session.add(session)

    # Create usage records over the past 30 days
    # Use UTC date to match service behavior
    today = get_utc_date()
    for days_ago in range(30):
        record_date = today - timedelta(days=days_ago)

        # Cursor usage
        cursor_record = UsageRecordFactory.build(
            user_id=user.id,
            date=record_date,
            source="cursor",
            model="claude-3-5-sonnet-20241022",
            input_tokens=50000,
            output_tokens=25000,
            cache_read_tokens=10000 if days_ago % 3 == 0 else 0,
            cache_write_tokens=5000 if days_ago % 3 == 0 else 0,
            reasoning_tokens=0,
            cost=Decimal("3.75"),
        )
        db_session.add(cursor_record)

        # Web usage (only every 3 days)
        if days_ago % 3 == 0:
            web_record = UsageRecordFactory.build(
                user_id=user.id,
                date=record_date,
                source="web",
                model="gpt-4o",
                input_tokens=30000,
                output_tokens=15000,
                cache_read_tokens=5000,
                cache_write_tokens=0,
                reasoning_tokens=10000,
                cost=Decimal("1.25"),
            )
            db_session.add(web_record)

    # Create streak
    streak = StreakFactory.build(
        user_id=user.id,
        current_streak=15,
        longest_streak=25,
        last_active_date=today,
        timezone="UTC",
    )
    db_session.add(streak)

    await db_session.commit()
    await db_session.refresh(user)

    return {
        "user": user,
        "token": session_token,
    }


class TestGetDashboardOverview:
    """Tests for GET /api/v1/dashboard/overview"""

    async def test_overview_success_with_data(
        self,
        client: AsyncClient,
        user_with_usage_data: dict,
    ) -> None:
        """Test successful dashboard overview retrieval with usage data."""
        token = user_with_usage_data["token"]

        response = await client.get(
            "/api/v1/dashboard/overview",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert "total_tokens" in data
        assert "total_input_tokens" in data
        assert "total_output_tokens" in data
        assert "total_cache_read_tokens" in data
        assert "total_cache_write_tokens" in data
        assert "total_reasoning_tokens" in data
        assert "total_cost" in data

        # Streak stats
        assert data["current_streak"] == 15
        assert data["longest_streak"] == 25

        assert "monthly_tokens" in data
        assert "monthly_badge" in data

        # Usage stats
        assert data["unique_days"] == 30
        assert data["unique_models"] >= 2  # claude and gpt-4o
        assert data["unique_sources"] >= 2  # cursor and web

        # Efficiency (cache read tokens / total input tokens * 100)
        assert "cache_efficiency" in data
        assert Decimal(data["cache_efficiency"]) >= 0
        assert Decimal(data["cache_efficiency"]) <= 100

        # Token values should be positive
        assert data["total_tokens"] > 0
        assert data["total_input_tokens"] > 0
        assert data["total_output_tokens"] > 0

        # Cost should be positive
        assert Decimal(data["total_cost"]) > Decimal("0")

    async def test_overview_success_empty_data(
        self,
        client: AsyncClient,
        authenticated_client: tuple[AsyncClient, dict],
    ) -> None:
        """Test dashboard overview with no usage data."""
        client, _auth_data = authenticated_client

        response = await client.get("/api/v1/dashboard/overview")

        assert response.status_code == 200
        data = response.json()

        # Should return zero values for user with no usage
        assert data["total_tokens"] == 0
        assert data["total_input_tokens"] == 0
        assert data["total_output_tokens"] == 0
        assert data["total_cost"] == 0.0  # Decimal serialized as float
        assert data["current_streak"] == 0
        assert data["longest_streak"] == 0
        assert data["monthly_tokens"] == 0
        assert data["monthly_badge"] is None
        assert data["unique_days"] == 0
        assert data["cache_efficiency"] == 0.0  # Decimal serialized as float

    async def test_overview_requires_authentication(
        self,
        client: AsyncClient,
    ) -> None:
        """Test that overview endpoint requires authentication."""
        response = await client.get("/api/v1/dashboard/overview")

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data


class TestGetDashboardTrends:
    """Tests for GET /api/v1/dashboard/trends"""

    async def test_trends_success_default_30_days(
        self,
        client: AsyncClient,
        user_with_usage_data: dict,
    ) -> None:
        """Test trends endpoint with default 30 days period."""
        token = user_with_usage_data["token"]

        response = await client.get(
            "/api/v1/dashboard/trends",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert "daily_data" in data
        assert "period_start" in data
        assert "period_end" in data

        # Should have 30 days of data
        assert len(data["daily_data"]) == 30

        # Verify each data point has required fields
        for day_data in data["daily_data"]:
            assert "date" in day_data
            assert "tokens" in day_data
            assert "cost" in day_data
            assert "input_tokens" in day_data
            assert "output_tokens" in day_data
            assert "cache_read_tokens" in day_data
            assert "cache_write_tokens" in day_data
            assert "reasoning_tokens" in day_data

        # Verify period dates (use UTC to match service)
        today = get_utc_date()
        start_date = today - timedelta(days=29)
        assert data["period_start"] == str(start_date)
        assert data["period_end"] == str(today)

    async def test_trends_custom_days_parameter(
        self,
        client: AsyncClient,
        user_with_usage_data: dict,
    ) -> None:
        """Test trends endpoint with custom days parameter."""
        token = user_with_usage_data["token"]

        response = await client.get(
            "/api/v1/dashboard/trends?days=7",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should have 7 days of data
        assert len(data["daily_data"]) == 7

        # Verify period dates (use UTC to match service)
        today = get_utc_date()
        start_date = today - timedelta(days=6)
        assert data["period_start"] == str(start_date)
        assert data["period_end"] == str(today)

    async def test_trends_days_parameter_validation(
        self,
        client: AsyncClient,
        authenticated_client: tuple[AsyncClient, dict],
    ) -> None:
        """Test days parameter validation (1-365)."""
        client, _ = authenticated_client

        # Test below minimum (0)
        response = await client.get("/api/v1/dashboard/trends?days=0")
        assert response.status_code == 422

        # Test above maximum (366)
        response = await client.get("/api/v1/dashboard/trends?days=366")
        assert response.status_code == 422

        # Test valid edge cases
        response = await client.get("/api/v1/dashboard/trends?days=1")
        assert response.status_code == 200

        response = await client.get("/api/v1/dashboard/trends?days=365")
        assert response.status_code == 200

    async def test_trends_data_ordering(
        self,
        client: AsyncClient,
        user_with_usage_data: dict,
    ) -> None:
        """Test that daily data is ordered chronologically."""
        token = user_with_usage_data["token"]

        response = await client.get(
            "/api/v1/dashboard/trends?days=7",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Verify dates are in ascending order
        dates = [day["date"] for day in data["daily_data"]]
        assert dates == sorted(dates)

    async def test_trends_requires_authentication(
        self,
        client: AsyncClient,
    ) -> None:
        """Test that trends endpoint requires authentication."""
        response = await client.get("/api/v1/dashboard/trends")

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data


class TestGetToolsBreakdown:
    """Tests for GET /api/v1/dashboard/tools"""

    async def test_tools_breakdown_success(
        self,
        client: AsyncClient,
        user_with_usage_data: dict,
    ) -> None:
        """Test tools breakdown endpoint."""
        token = user_with_usage_data["token"]

        response = await client.get(
            "/api/v1/dashboard/tools",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert "tools" in data
        assert "total_tools" in data

        # Should have at least 2 tools (cursor and web)
        assert data["total_tools"] >= 2
        assert len(data["tools"]) >= 2

        # Verify each tool has required fields
        for tool in data["tools"]:
            assert "source" in tool
            assert "tokens" in tool
            assert "cost" in tool
            assert "percentage" in tool
            assert "days_active" in tool

            # Validate data types and ranges
            assert tool["tokens"] >= 0
            assert Decimal(tool["cost"]) >= Decimal("0")
            assert Decimal(tool["percentage"]) >= Decimal("0")
            assert Decimal(tool["percentage"]) <= Decimal("100")
            assert tool["days_active"] > 0

        # Verify sorting (by cost descending)
        costs = [Decimal(tool["cost"]) for tool in data["tools"]]
        assert costs == sorted(costs, reverse=True)

        # Verify percentages sum to 100
        total_percentage = sum(Decimal(tool["percentage"]) for tool in data["tools"])
        assert abs(total_percentage - Decimal("100")) < Decimal("0.01")  # Allow rounding error

    async def test_tools_breakdown_empty_data(
        self,
        client: AsyncClient,
        authenticated_client: tuple[AsyncClient, dict],
    ) -> None:
        """Test tools breakdown with no usage data."""
        client, _ = authenticated_client

        response = await client.get("/api/v1/dashboard/tools")

        assert response.status_code == 200
        data = response.json()

        # Should return empty list
        assert data["tools"] == []
        assert data["total_tools"] == 0

    async def test_tools_breakdown_requires_authentication(
        self,
        client: AsyncClient,
    ) -> None:
        """Test that tools breakdown requires authentication."""
        response = await client.get("/api/v1/dashboard/tools")

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data


class TestGetModelsBreakdown:
    """Tests for GET /api/v1/dashboard/models"""

    async def test_models_breakdown_success(
        self,
        client: AsyncClient,
        user_with_usage_data: dict,
    ) -> None:
        """Test models breakdown endpoint."""
        token = user_with_usage_data["token"]

        response = await client.get(
            "/api/v1/dashboard/models",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert "models" in data
        assert "total_models" in data

        # Should have at least 2 models (claude and gpt-4o)
        assert data["total_models"] >= 2
        assert len(data["models"]) >= 2

        # Verify each model has required fields
        for model in data["models"]:
            assert "model" in model
            assert "tokens" in model
            assert "cost" in model
            assert "percentage" in model
            assert "days_active" in model

            # Validate data types and ranges
            assert model["tokens"] >= 0
            assert Decimal(model["cost"]) >= Decimal("0")
            assert Decimal(model["percentage"]) >= Decimal("0")
            assert Decimal(model["percentage"]) <= Decimal("100")
            assert model["days_active"] > 0

        # Verify sorting (by cost descending)
        costs = [Decimal(model["cost"]) for model in data["models"]]
        assert costs == sorted(costs, reverse=True)

        # Verify percentages sum to 100
        total_percentage = sum(Decimal(model["percentage"]) for model in data["models"])
        assert abs(total_percentage - Decimal("100")) < Decimal("0.01")  # Allow rounding error

    async def test_models_breakdown_empty_data(
        self,
        client: AsyncClient,
        authenticated_client: tuple[AsyncClient, dict],
    ) -> None:
        """Test models breakdown with no usage data."""
        client, _ = authenticated_client

        response = await client.get("/api/v1/dashboard/models")

        assert response.status_code == 200
        data = response.json()

        # Should return empty list
        assert data["models"] == []
        assert data["total_models"] == 0

    async def test_models_breakdown_requires_authentication(
        self,
        client: AsyncClient,
    ) -> None:
        """Test that models breakdown requires authentication."""
        response = await client.get("/api/v1/dashboard/models")

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data


class TestDashboardEndpointsIntegration:
    """Integration tests across all dashboard endpoints."""

    async def test_all_endpoints_consistency(
        self,
        client: AsyncClient,
        user_with_usage_data: dict,
    ) -> None:
        """Test that all dashboard endpoints return consistent data."""
        token = user_with_usage_data["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get all dashboard data
        overview_response = await client.get("/api/v1/dashboard/overview", headers=headers)
        trends_response = await client.get("/api/v1/dashboard/trends", headers=headers)
        tools_response = await client.get("/api/v1/dashboard/tools", headers=headers)
        models_response = await client.get("/api/v1/dashboard/models", headers=headers)

        assert overview_response.status_code == 200
        assert trends_response.status_code == 200
        assert tools_response.status_code == 200
        assert models_response.status_code == 200

        overview = overview_response.json()
        trends = trends_response.json()
        tools = tools_response.json()
        models = models_response.json()

        # Verify total tokens consistency
        tools_total_tokens = sum(tool["tokens"] for tool in tools["tools"])
        models_total_tokens = sum(model["tokens"] for model in models["models"])

        # Overview all-time total should match tools and models breakdown
        # (these are both all-time aggregations)
        assert overview["total_tokens"] == tools_total_tokens
        assert overview["total_tokens"] == models_total_tokens

        # Trends may show fewer tokens than overview due to time window
        # (overview is all-time, trends is last N days)
        trends_total_tokens = sum(day["tokens"] for day in trends["daily_data"])
        assert trends_total_tokens <= overview["total_tokens"]

        # Verify unique counts
        assert overview["unique_sources"] == tools["total_tools"]
        assert overview["unique_models"] == models["total_models"]
