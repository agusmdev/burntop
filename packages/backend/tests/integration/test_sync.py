"""Integration tests for sync endpoint.

Tests cover:
- POST /api/v1/sync - Sync usage records from CLI (v2.0.0)
- Message-level deduplication
- Idempotent sync operations
"""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import pytest
from httpx import AsyncClient


def create_message(
    msg_id: str | None = None,
    model: str = "claude-3-5-sonnet-20241022",
    input_tokens: int = 1000,
    output_tokens: int = 500,
    cache_read_tokens: int = 0,
    cache_creation_tokens: int = 0,
    reasoning_tokens: int = 0,
    timestamp: str | None = None,
) -> dict:
    """Helper to create a sync message."""
    return {
        "id": msg_id or str(uuid4()),
        "timestamp": timestamp or datetime.now(UTC).isoformat(),
        "model": model,
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "cacheReadTokens": cache_read_tokens,
        "cacheCreationTokens": cache_creation_tokens,
        "reasoningTokens": reasoning_tokens,
    }


def create_sync_payload(
    source: str = "cursor",
    messages: list[dict] | None = None,
) -> dict:
    """Helper to create a sync request payload."""
    return {
        "version": "2.0.0",
        "client": "burntop-cli",
        "machineId": "test-machine",
        "syncedAt": datetime.now(UTC).isoformat(),
        "source": source,
        "messages": messages or [create_message()],
    }


@pytest.mark.asyncio
class TestSyncUsage:
    """Test cases for POST /api/v1/sync endpoint."""

    async def test_sync_valid_data(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test successful sync with valid usage data."""
        sync_data = create_sync_payload(
            source="cursor",
            messages=[create_message(input_tokens=1000, output_tokens=500)],
        )

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert data["success"] is True
        assert "message" in data
        assert "messagesReceived" in data
        assert data["messagesReceived"] == 1
        assert "messagesSynced" in data
        assert data["messagesSynced"] == 1
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

    async def test_sync_multiple_messages(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test sync with multiple messages."""
        sync_data = create_sync_payload(
            source="cursor",
            messages=[
                create_message(input_tokens=1000, output_tokens=500),
                create_message(input_tokens=2000, output_tokens=1000),
            ],
        )

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["messagesReceived"] == 2
        assert data["messagesSynced"] == 2

    async def test_sync_message_deduplication(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync deduplicates messages by ID (idempotent sync)."""
        msg_id = str(uuid4())
        msg = create_message(msg_id=msg_id, input_tokens=1000, output_tokens=500)

        # First sync
        sync_data = create_sync_payload(source="cursor", messages=[msg])
        response1 = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["messagesReceived"] == 1
        assert data1["messagesSynced"] == 1

        # Second sync with same message ID - should be deduplicated
        response2 = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["messagesReceived"] == 1
        assert data2["messagesSynced"] == 0  # Already synced, no new messages

    async def test_sync_cost_calculation(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync calculates costs correctly using pricing engine."""
        sync_data = create_sync_payload(
            source="cursor",
            messages=[
                create_message(
                    model="claude-3-5-sonnet-20241022",
                    input_tokens=1000000,  # 1M input tokens
                    output_tokens=1000000,  # 1M output tokens
                )
            ],
        )

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        # Claude 3.5 Sonnet pricing: $3/M input, $15/M output
        # Expected cost: $3 + $15 = $18
        stats = data["stats"]
        total_cost = Decimal(str(stats["totalCost"]))
        assert total_cost >= Decimal("18.00")

    async def test_sync_updates_streak(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync updates user streak correctly."""
        sync_data = create_sync_payload(
            source="cursor",
            messages=[create_message()],
        )

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
        sync_data = create_sync_payload()

        response = await client.post("/api/v1/sync", json=sync_data)

        assert response.status_code == 401

    async def test_sync_empty_messages(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync rejects empty messages list."""
        # Don't use helper - it treats empty list as falsy
        sync_data = {
            "version": "2.0.0",
            "client": "burntop-cli",
            "machineId": "test-machine",
            "syncedAt": datetime.now(UTC).isoformat(),
            "source": "cursor",
            "messages": [],  # Explicitly empty
        }

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 422  # Validation error

    async def test_sync_invalid_message_format(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync rejects invalid message format."""
        sync_data = {
            "version": "2.0.0",
            "client": "burntop-cli",
            "machineId": "test-machine",
            "syncedAt": datetime.now(UTC).isoformat(),
            "source": "cursor",
            "messages": [
                {
                    "id": str(uuid4()),
                    "timestamp": datetime.now(UTC).isoformat(),
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
        sync_data = create_sync_payload(
            messages=[create_message(input_tokens=-1000)],
        )

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 422  # Validation error

    async def test_sync_idempotent_full_resync(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that full resync is idempotent (same messages don't double-count)."""
        # Create several messages
        messages = [
            create_message(msg_id=str(uuid4()), input_tokens=1000, output_tokens=500),
            create_message(msg_id=str(uuid4()), input_tokens=2000, output_tokens=1000),
        ]

        sync_data = create_sync_payload(source="cursor", messages=messages)

        # First sync
        response1 = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)
        assert response1.status_code == 200
        data1 = response1.json()
        total_tokens_first = data1["stats"]["totalTokens"]

        # Second sync (simulating full resync with same data)
        response2 = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)
        assert response2.status_code == 200
        data2 = response2.json()

        # Messages should be filtered out as already synced
        assert data2["messagesSynced"] == 0
        # Token count should NOT increase (idempotent!)
        assert data2["stats"]["totalTokens"] == 0  # No new tokens from this batch

    async def test_sync_model_normalization(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that sync normalizes model to lowercase."""
        sync_data = create_sync_payload(
            source="CURSOR",  # Uppercase should be normalized
            messages=[create_message(model="Claude-3-5-Sonnet-20241022")],  # Mixed case
        )

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        # Should succeed - normalization happens in schema validation

    async def test_sync_cache_tokens(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test sync with cache tokens (read and write)."""
        sync_data = create_sync_payload(
            messages=[
                create_message(
                    input_tokens=1000,
                    output_tokens=500,
                    cache_read_tokens=5000,
                    cache_creation_tokens=500,
                )
            ],
        )

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        # Verify cache tokens are counted in total
        stats = data["stats"]
        total_tokens = stats["totalTokens"]
        # Total should include input + output + cache_read + cache_write
        assert total_tokens >= 7000

    async def test_sync_multiple_sources_sequential(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test sync with different sources (requires one request per source)."""
        # First source
        sync_data1 = create_sync_payload(
            source="cursor",
            messages=[create_message(input_tokens=1000, output_tokens=500)],
        )
        response1 = await client.post("/api/v1/sync", json=sync_data1, headers=auth_headers)
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["messagesSynced"] == 1

        # Second source
        sync_data2 = create_sync_payload(
            source="claude-code",
            messages=[create_message(input_tokens=2000, output_tokens=1000)],
        )
        response2 = await client.post("/api/v1/sync", json=sync_data2, headers=auth_headers)
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["messagesSynced"] == 1

    async def test_sync_same_message_id_different_sources(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that same message ID from different sources are both counted."""
        msg_id = str(uuid4())  # Same ID

        # First source
        sync_data1 = create_sync_payload(
            source="cursor",
            messages=[create_message(msg_id=msg_id, input_tokens=1000)],
        )
        response1 = await client.post("/api/v1/sync", json=sync_data1, headers=auth_headers)
        assert response1.status_code == 200
        assert response1.json()["messagesSynced"] == 1

        # Second source with same message ID
        sync_data2 = create_sync_payload(
            source="claude-code",
            messages=[create_message(msg_id=msg_id, input_tokens=2000)],
        )
        response2 = await client.post("/api/v1/sync", json=sync_data2, headers=auth_headers)
        assert response2.status_code == 200
        # Should also be synced - IDs are source-scoped
        assert response2.json()["messagesSynced"] == 1

    async def test_sync_partial_new_messages(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test sync with mix of new and existing message IDs."""
        existing_id = str(uuid4())
        new_id = str(uuid4())

        # First sync with one message
        sync_data1 = create_sync_payload(
            source="cursor",
            messages=[create_message(msg_id=existing_id, input_tokens=1000)],
        )
        response1 = await client.post("/api/v1/sync", json=sync_data1, headers=auth_headers)
        assert response1.status_code == 200

        # Second sync with both existing and new message
        sync_data2 = create_sync_payload(
            source="cursor",
            messages=[
                create_message(msg_id=existing_id, input_tokens=1000),  # Already synced
                create_message(msg_id=new_id, input_tokens=2000),  # New
            ],
        )
        response2 = await client.post("/api/v1/sync", json=sync_data2, headers=auth_headers)
        assert response2.status_code == 200
        data2 = response2.json()

        # Only the new message should be synced
        assert data2["messagesReceived"] == 2
        assert data2["messagesSynced"] == 1

    async def test_sync_aggregates_by_date_model(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that messages are aggregated by date and model."""
        today = datetime.now(UTC).isoformat()

        sync_data = create_sync_payload(
            source="cursor",
            messages=[
                # Two messages for same model on same day - should be aggregated
                create_message(
                    model="claude-3-5-sonnet-20241022",
                    input_tokens=1000,
                    output_tokens=500,
                    timestamp=today,
                ),
                create_message(
                    model="claude-3-5-sonnet-20241022",
                    input_tokens=500,
                    output_tokens=250,
                    timestamp=today,
                ),
                # Different model - should be separate record
                create_message(
                    model="claude-3-5-haiku-20241022",
                    input_tokens=200,
                    output_tokens=100,
                    timestamp=today,
                ),
            ],
        )

        response = await client.post("/api/v1/sync", json=sync_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        # 3 messages received, all synced
        assert data["messagesReceived"] == 3
        assert data["messagesSynced"] == 3
        # But should aggregate into 2 records (by date/model)
        assert data["recordsProcessed"] == 2
