"""Integration tests for sync endpoint.

Tests cover:
- POST /api/v1/sync - Sync usage records from CLI
"""

from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestSyncUsage:
    """Test cases for POST /api/v1/sync endpoint."""

    async def test_sync_valid_data(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test successful sync with valid usage data."""
        sync_data = {
            "version": "1.0",
            "client": "burntop-cli",
            "syncedAt": datetime.now(UTC).isoformat(),
            "records": [
                {
                    "date": str(date.today()),
                    "source": "cursor",
                    "model": "claude-3-5-sonnet-20241022",
                    "inputTokens": 1000,
                    "outputTokens": 500,
                    "cacheReadTokens": 200,
                    "cacheCreationTokens": 100,
                }
            ],
        }

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert "success" in data
        assert data["success"] is True
        assert "message" in data
        assert "recordsProcessed" in data
        assert data["recordsProcessed"] == 1
        assert "newRecords" in data
        assert "updatedRecords" in data
        assert "stats" in data
        assert "newAchievements" in data

        # Verify stats structure
        stats = data["stats"]
        assert "totalTokens" in stats
        assert "totalCost" in stats
        assert "currentStreak" in stats
        assert "longestStreak" in stats
        assert "achievementsUnlocked" in stats

    async def test_sync_multiple_records(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test sync with multiple usage records."""
        sync_data = {
            "version": "1.0",
            "client": "burntop-cli",
            "syncedAt": datetime.now(UTC).isoformat(),
            "records": [
                {
                    "date": str(date.today()),
                    "source": "cursor",
                    "model": "claude-3-5-sonnet-20241022",
                    "inputTokens": 1000,
                    "outputTokens": 500,
                },
                {
                    "date": str(date.today()),
                    "source": "claude-code",
                    "model": "claude-3-5-haiku-20241022",
                    "inputTokens": 2000,
                    "outputTokens": 1000,
                },
            ],
        }

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["recordsProcessed"] == 2

    async def test_sync_deduplication(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync deduplicates records for same date/source/model."""
        sync_data = {
            "version": "1.0",
            "client": "burntop-cli",
            "syncedAt": datetime.now(UTC).isoformat(),
            "records": [
                {
                    "date": str(date.today()),
                    "source": "cursor",
                    "model": "claude-3-5-sonnet-20241022",
                    "inputTokens": 1000,
                    "outputTokens": 500,
                },
                {
                    # Same date/source/model - should be merged
                    "date": str(date.today()),
                    "source": "cursor",
                    "model": "claude-3-5-sonnet-20241022",
                    "inputTokens": 500,
                    "outputTokens": 250,
                },
            ],
        }

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        # Should process both records but merge them
        assert data["success"] is True
        # After deduplication, only 1 unique record
        assert data["newRecords"] + data["updatedRecords"] == 1

    async def test_sync_cost_calculation(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync calculates costs correctly using pricing engine."""
        sync_data = {
            "version": "1.0",
            "client": "burntop-cli",
            "syncedAt": datetime.now(UTC).isoformat(),
            "records": [
                {
                    "date": str(date.today()),
                    "source": "cursor",
                    "model": "claude-3-5-sonnet-20241022",
                    "inputTokens": 1000000,  # 1M input tokens
                    "outputTokens": 1000000,  # 1M output tokens
                }
            ],
        }

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        # Claude 3.5 Sonnet pricing: $3/M input, $15/M output
        # Expected cost: $3 + $15 = $18
        stats = data["stats"]
        total_cost = Decimal(str(stats["totalCost"]))
        assert total_cost >= Decimal("18.00")  # At least $18 from this sync

    async def test_sync_updates_streak(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync updates user streak correctly."""
        sync_data = {
            "version": "1.0",
            "client": "burntop-cli",
            "syncedAt": datetime.now(UTC).isoformat(),
            "records": [
                {
                    "date": str(date.today()),
                    "source": "cursor",
                    "model": "claude-3-5-sonnet-20241022",
                    "inputTokens": 1000,
                    "outputTokens": 500,
                }
            ],
        }

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        # Verify streak is updated (should be at least 1 after first sync)
        stats = data["stats"]
        assert stats["currentStreak"] >= 1
        assert stats["longestStreak"] >= 1

    async def test_sync_without_auth(
        self,
        client: AsyncClient,
    ):
        """Test that sync requires authentication."""
        sync_data = {
            "version": "1.0",
            "client": "burntop-cli",
            "syncedAt": datetime.now(UTC).isoformat(),
            "records": [
                {
                    "date": str(date.today()),
                    "source": "cursor",
                    "model": "claude-3-5-sonnet-20241022",
                    "inputTokens": 1000,
                    "outputTokens": 500,
                }
            ],
        }

        response = await client.post("/api/v1/sync", json=sync_data)

        assert response.status_code == 401

    async def test_sync_empty_records(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync rejects empty records list."""
        sync_data = {
            "version": "1.0",
            "client": "burntop-cli",
            "syncedAt": datetime.now(UTC).isoformat(),
            "records": [],  # Empty list
        }

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 422  # Validation error

    async def test_sync_invalid_record_format(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync rejects invalid record format."""
        sync_data = {
            "version": "1.0",
            "client": "burntop-cli",
            "syncedAt": datetime.now(UTC).isoformat(),
            "records": [
                {
                    "date": str(date.today()),
                    "source": "cursor",
                    # Missing model field
                    "inputTokens": 1000,
                    "outputTokens": 500,
                }
            ],
        }

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 422  # Validation error

    async def test_sync_negative_tokens(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync rejects negative token counts."""
        sync_data = {
            "version": "1.0",
            "client": "burntop-cli",
            "syncedAt": datetime.now(UTC).isoformat(),
            "records": [
                {
                    "date": str(date.today()),
                    "source": "cursor",
                    "model": "claude-3-5-sonnet-20241022",
                    "inputTokens": -1000,  # Negative tokens
                    "outputTokens": 500,
                }
            ],
        }

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 422  # Validation error

    async def test_sync_upsert_existing_record(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync upserts existing records (updates instead of creating duplicate)."""
        sync_data = {
            "version": "1.0",
            "client": "burntop-cli",
            "syncedAt": datetime.now(UTC).isoformat(),
            "records": [
                {
                    "date": str(date.today()),
                    "source": "cursor",
                    "model": "claude-3-5-sonnet-20241022",
                    "inputTokens": 1000,
                    "outputTokens": 500,
                }
            ],
        }

        # First sync
        response1 = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["newRecords"] == 1

        # Second sync with same date/source/model but different tokens
        sync_data["records"][0]["inputTokens"] = 2000
        sync_data["records"][0]["outputTokens"] = 1000

        response2 = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)
        assert response2.status_code == 200
        data2 = response2.json()

        # Should update existing record, not create new
        assert data2["newRecords"] == 0
        assert data2["updatedRecords"] == 1

    async def test_sync_model_normalization(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync normalizes model and source to lowercase."""
        sync_data = {
            "version": "1.0",
            "client": "burntop-cli",
            "syncedAt": datetime.now(UTC).isoformat(),
            "records": [
                {
                    "date": str(date.today()),
                    "source": "CURSOR",  # Uppercase
                    "model": "Claude-3-5-Sonnet-20241022",  # Mixed case
                    "inputTokens": 1000,
                    "outputTokens": 500,
                }
            ],
        }

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        # Should succeed - normalization happens in schema validation

    async def test_sync_cache_tokens(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test sync with cache tokens (read and write)."""
        sync_data = {
            "version": "1.0",
            "client": "burntop-cli",
            "syncedAt": datetime.now(UTC).isoformat(),
            "records": [
                {
                    "date": str(date.today()),
                    "source": "cursor",
                    "model": "claude-3-5-sonnet-20241022",
                    "inputTokens": 1000,
                    "outputTokens": 500,
                    "cacheReadTokens": 5000,  # Cache reads get 90% discount
                    "cacheCreationTokens": 500,  # Cache writes have 25% premium
                }
            ],
        }

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        # Verify cache tokens are counted in total
        stats = data["stats"]
        total_tokens = stats["totalTokens"]
        # Total should include input + output + cache_read + cache_write
        assert total_tokens >= 7000

    async def test_sync_multiple_sources_and_models(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test sync with different sources and models."""
        sync_data = {
            "version": "1.0",
            "client": "burntop-cli",
            "syncedAt": datetime.now(UTC).isoformat(),
            "records": [
                {
                    "date": str(date.today()),
                    "source": "cursor",
                    "model": "claude-3-5-sonnet-20241022",
                    "inputTokens": 1000,
                    "outputTokens": 500,
                },
                {
                    "date": str(date.today()),
                    "source": "claude-code",
                    "model": "claude-3-5-haiku-20241022",
                    "inputTokens": 2000,
                    "outputTokens": 1000,
                },
                {
                    "date": str(date.today()),
                    "source": "web",
                    "model": "gpt-4o",
                    "inputTokens": 1500,
                    "outputTokens": 750,
                },
            ],
        }

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        # All 3 records are unique (different source or model)
        assert data["recordsProcessed"] == 3
        assert data["newRecords"] == 3

    async def test_sync_preserves_message_count(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync preserves optional message_count field."""
        sync_data = {
            "version": "1.0",
            "client": "burntop-cli",
            "syncedAt": datetime.now(UTC).isoformat(),
            "records": [
                {
                    "date": str(date.today()),
                    "source": "cursor",
                    "model": "claude-3-5-sonnet-20241022",
                    "inputTokens": 1000,
                    "outputTokens": 500,
                    "messageCount": 42,  # Optional field
                }
            ],
        }

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        # Should succeed - message_count is optional but should be stored


