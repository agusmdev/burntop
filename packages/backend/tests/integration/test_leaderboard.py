"""
Integration tests for leaderboard endpoint.

Tests the GET /api/v1/leaderboard endpoint with various filters:
- Default rankings (all-time, sorted by tokens)
- Period filters (all, month, week)
- Sort by filters (tokens, cost, streak)
- Pagination (limit, offset)
"""

from typing import Any
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.leaderboard.models import LeaderboardCache
from app.user.models import User


@pytest.fixture
async def leaderboard_data(db_session: AsyncSession) -> dict[str, Any]:
    """
    Create test data for leaderboard tests.

    Returns:
        Dict with users list and cache entries for testing
    """
    # Create 10 users with varying stats
    users = []
    for i in range(10):
        user = User(
            id=uuid4(),
            email=f"lbuser{i}@example.com",
            username=f"lbuser{i}",
            name=f"Test User {i}",
            is_public=True,
        )
        db_session.add(user)
        users.append(user)

    await db_session.flush()

    # Create leaderboard cache entries for each user (all-time period)
    cache_entries = []
    for idx, user in enumerate(users):
        rank = idx + 1
        entry = LeaderboardCache(
            id=uuid4(),
            user_id=user.id,
            period="all",
            rank=rank,
            total_tokens=(10 - idx) * 100000,  # Decreasing tokens by rank
            total_cost=(10 - idx) * 10.0,
            streak_days=10 - idx,
            rank_change=0,
        )
        db_session.add(entry)
        cache_entries.append(entry)

    await db_session.commit()
    await db_session.refresh(users[0])

    return {
        "users": users,
        "cache_entries": cache_entries,
    }


class TestGetLeaderboard:
    """Test GET /api/v1/leaderboard/ endpoint."""

    async def test_default_rankings(
        self, client: AsyncClient, leaderboard_data: dict[str, Any]
    ) -> None:
        """Test default leaderboard returns all-time rankings sorted by tokens."""
        response = await client.get("/api/v1/leaderboard/")

        assert response.status_code == 200
        data = response.json()

        assert "entries" in data
        assert "pagination" in data
        assert "period" in data
        assert "sort_by" in data
        assert len(data["entries"]) > 0

        # Verify default values
        assert data["period"] == "all"
        assert data["sort_by"] == "tokens"

        # Verify entries are ordered by rank
        ranks = [entry["rank"] for entry in data["entries"]]
        assert ranks == sorted(ranks)

        # Verify first entry structure
        first_entry = data["entries"][0]
        assert "user_id" in first_entry
        assert "username" in first_entry
        assert "rank" in first_entry
        assert "total_tokens" in first_entry
        assert "total_cost" in first_entry
        assert "streak_days" in first_entry
        assert first_entry["rank"] == 1

    async def test_with_period_filter_month(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        """Test leaderboard with period=month filter."""
        # Create monthly cache entry
        user = User(
            id=uuid4(),
            email="monthuser@example.com",
            username="monthuser",
            name="Month User",
            is_public=True,
        )
        db_session.add(user)
        await db_session.flush()

        cache = LeaderboardCache(
            id=uuid4(),
            user_id=user.id,
            period="month",
            rank=1,
            total_tokens=500000,
            total_cost=50.0,
            streak_days=15,
        )
        db_session.add(cache)
        await db_session.commit()

        response = await client.get("/api/v1/leaderboard/?period=month")

        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "month"
        assert len(data["entries"]) >= 1

    async def test_with_period_filter_week(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        """Test leaderboard with period=week filter."""
        # Create weekly cache entry
        user = User(
            id=uuid4(),
            email="weekuser@example.com",
            username="weekuser",
            name="Week User",
            is_public=True,
        )
        db_session.add(user)
        await db_session.flush()

        cache = LeaderboardCache(
            id=uuid4(),
            user_id=user.id,
            period="week",
            rank=1,
            total_tokens=200000,
            total_cost=20.0,
            streak_days=7,
        )
        db_session.add(cache)
        await db_session.commit()

        response = await client.get("/api/v1/leaderboard/?period=week")

        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "week"
        assert len(data["entries"]) >= 1

    async def test_with_sort_by_cost(
        self, client: AsyncClient, leaderboard_data: dict[str, Any]
    ) -> None:
        """Test leaderboard with sort_by=cost filter."""
        response = await client.get("/api/v1/leaderboard/?sort_by=cost")

        assert response.status_code == 200
        data = response.json()
        assert data["sort_by"] == "cost"
        assert len(data["entries"]) > 0

    async def test_with_sort_by_streak(
        self, client: AsyncClient, leaderboard_data: dict[str, Any]
    ) -> None:
        """Test leaderboard with sort_by=streak filter."""
        response = await client.get("/api/v1/leaderboard/?sort_by=streak")

        assert response.status_code == 200
        data = response.json()
        assert data["sort_by"] == "streak"
        assert len(data["entries"]) > 0

    async def test_with_pagination_limit(
        self, client: AsyncClient, leaderboard_data: dict[str, Any]
    ) -> None:
        """Test leaderboard with limit parameter."""
        response = await client.get("/api/v1/leaderboard/?limit=5")

        assert response.status_code == 200
        data = response.json()

        # Should return at most 5 entries
        assert len(data["entries"]) <= 5
        assert data["pagination"]["limit"] == 5

    async def test_with_pagination_offset(
        self, client: AsyncClient, leaderboard_data: dict[str, Any]
    ) -> None:
        """Test leaderboard with offset parameter."""
        # Get first page
        response1 = await client.get("/api/v1/leaderboard/?limit=3&offset=0")
        data1 = response1.json()

        # Get second page
        response2 = await client.get("/api/v1/leaderboard/?limit=3&offset=3")
        data2 = response2.json()

        assert response1.status_code == 200
        assert response2.status_code == 200

        # Entries should be different
        if len(data1["entries"]) > 0 and len(data2["entries"]) > 0:
            assert data1["entries"][0]["rank"] != data2["entries"][0]["rank"]

    async def test_invalid_period_parameter(self, client: AsyncClient) -> None:
        """Test leaderboard with invalid period parameter."""
        response = await client.get("/api/v1/leaderboard/?period=invalid")

        assert response.status_code == 422  # Validation error

    async def test_invalid_sort_by_parameter(self, client: AsyncClient) -> None:
        """Test leaderboard with invalid sort_by parameter."""
        response = await client.get("/api/v1/leaderboard/?sort_by=invalid")

        assert response.status_code == 422  # Validation error

    async def test_pagination_metadata(
        self, client: AsyncClient, leaderboard_data: dict[str, Any]
    ) -> None:
        """Test pagination metadata includes total and has_more."""
        response = await client.get("/api/v1/leaderboard/?limit=5")

        assert response.status_code == 200
        data = response.json()

        assert "pagination" in data
        assert "total" in data["pagination"]
        assert "limit" in data["pagination"]
        assert "offset" in data["pagination"]
        assert "has_more" in data["pagination"]
        assert isinstance(data["pagination"]["total"], int)
        assert isinstance(data["pagination"]["has_more"], bool)

    async def test_empty_leaderboard(self, client: AsyncClient) -> None:
        """Test leaderboard when no cache entries exist for a period."""
        # Query a period that has no data (week should be empty without fixture)
        response = await client.get("/api/v1/leaderboard/?period=week")

        assert response.status_code == 200
        data = response.json()

        assert data["entries"] == []
        assert data["pagination"]["total"] == 0


class TestLeaderboardIntegration:
    """Integration tests for leaderboard with multiple filters."""

    async def test_combined_filters(
        self, client: AsyncClient, leaderboard_data: dict[str, Any]
    ) -> None:
        """Test leaderboard with multiple filters combined."""
        response = await client.get(
            "/api/v1/leaderboard/?period=all&sort_by=tokens&limit=5&offset=0"
        )

        assert response.status_code == 200
        data = response.json()

        assert len(data["entries"]) <= 5
        assert data["pagination"]["limit"] == 5
        assert data["pagination"]["offset"] == 0
        assert data["period"] == "all"
        assert data["sort_by"] == "tokens"

    async def test_rank_ordering(
        self, client: AsyncClient, leaderboard_data: dict[str, Any]
    ) -> None:
        """Test that entries are ordered by rank ascending."""
        response = await client.get("/api/v1/leaderboard/?limit=10")

        assert response.status_code == 200
        data = response.json()

        ranks = [entry["rank"] for entry in data["entries"]]

        # Ranks should be in ascending order
        assert ranks == sorted(ranks)

        # Ranks should start from 1
        if len(ranks) > 0:
            assert ranks[0] >= 1

    async def test_token_values(
        self, client: AsyncClient, leaderboard_data: dict[str, Any]
    ) -> None:
        """Test that total_tokens values are present and valid."""
        response = await client.get("/api/v1/leaderboard/")

        assert response.status_code == 200
        data = response.json()

        for entry in data["entries"]:
            assert "total_tokens" in entry
            # total_tokens should be a number
            assert isinstance(entry["total_tokens"], int)
            assert entry["total_tokens"] >= 0

    async def test_entry_has_user_info(
        self, client: AsyncClient, leaderboard_data: dict[str, Any]
    ) -> None:
        """Test that entries include user information."""
        response = await client.get("/api/v1/leaderboard/")

        assert response.status_code == 200
        data = response.json()

        for entry in data["entries"]:
            assert "user_id" in entry
            assert "username" in entry
            # display_name and image can be None
            assert "display_name" in entry
            assert "image" in entry
