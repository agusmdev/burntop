"""UsageRecord Pydantic schemas for request validation and response serialization."""

from datetime import date as date_type, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, PlainSerializer, WithJsonSchema, field_validator

from app.core.schemas import BaseCreateSchema, BaseResponseSchema, BaseUpdateSchema

# Custom serializer to convert Decimal to float for JSON responses
# WithJsonSchema ensures the OpenAPI schema shows type: number instead of string
DecimalAsFloat = Annotated[
    Decimal,
    PlainSerializer(lambda x: float(x), return_type=float),
    WithJsonSchema({"type": "number"}),
]


class SyncMessageRequest(BaseModel):
    """
    Individual message with its unique ID for message-level deduplication.

    Each message has a stable unique ID from the parser:
    - Claude Code: UUID from JSONL (record.id)
    - Cursor: bubbleId from SQLite
    - Continue: ${sessionId}-${index}
    - Cline/Roo/Kilo: Task ULID

    This enables idempotent sync: syncing the same data twice won't double-count tokens.
    """

    id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Message ID from parser (UUID, bubbleId, ULID, etc.)",
    )
    timestamp: str = Field(
        ...,
        description="Full ISO timestamp of the message",
    )
    model: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Model identifier (e.g., claude-3-5-sonnet-20241022)",
    )

    # Token counts - using Field aliases to match CLI camelCase format
    input_tokens: int = Field(default=0, ge=0, alias="inputTokens", description="Input tokens used")
    output_tokens: int = Field(
        default=0, ge=0, alias="outputTokens", description="Output tokens used"
    )
    cache_read_tokens: int = Field(
        default=0, ge=0, alias="cacheReadTokens", description="Cache read tokens"
    )
    cache_write_tokens: int = Field(
        default=0, ge=0, alias="cacheCreationTokens", description="Cache write tokens"
    )
    reasoning_tokens: int = Field(
        default=0, ge=0, alias="reasoningTokens", description="Reasoning tokens used"
    )

    model_config = {"populate_by_name": True}

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: str) -> str:
        """Normalize model identifier to lowercase."""
        return v.lower()


class SyncRequest(BaseModel):
    """
    Sync request payload from CLI (v2.0.0).

    Contains metadata and list of individual messages to sync.
    Source is at payload level (one source per sync batch).

    Breaking change from v1.0.0:
    - Replaces aggregated `records` with individual `messages`
    - Adds `source` at payload level
    - Each message includes its unique ID for deduplication
    """

    version: str = Field(..., description="Sync payload format version (2.0.0)")
    client: str = Field(..., description="Client identifier (e.g., burntop-cli)")
    machine_id: str = Field(
        default="default",
        min_length=1,
        max_length=50,
        alias="machineId",
        description="Machine identifier for multi-machine sync",
    )
    synced_at: datetime = Field(
        ..., alias="syncedAt", description="Timestamp when sync was initiated"
    )
    source: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Source tool identifier (e.g., cursor, claude-code)",
    )
    messages: list[SyncMessageRequest] = Field(
        ...,
        min_length=1,
        description="Individual messages to sync with their unique IDs",
    )

    model_config = {"populate_by_name": True}

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        """Normalize source to lowercase."""
        return v.lower()

    @field_validator("messages")
    @classmethod
    def validate_messages_not_empty(cls, v: list[SyncMessageRequest]) -> list[SyncMessageRequest]:
        """Ensure messages list is not empty."""
        if not v:
            raise ValueError("Messages list cannot be empty")
        return v


class AchievementUnlockResponse(BaseModel):
    """Achievement unlock notification in sync response."""

    id: UUID = Field(..., description="Achievement ID")
    name: str = Field(..., description="Achievement name")
    description: str = Field(..., description="Achievement description")
    category: str = Field(..., description="Achievement category")
    rarity: str = Field(..., description="Achievement rarity level")
    xp_reward: int = Field(..., description="XP awarded for this achievement")
    tier: int = Field(
        default=1,
        ge=1,
        le=5,
        description="Tier level (1-5: Bronze, Silver, Gold, Platinum, Diamond)",
    )
    icon_url: str | None = Field(default=None, description="Achievement icon URL")


class SyncStatsResponse(BaseModel):
    """User statistics after sync operation."""

    total_tokens: int = Field(..., alias="totalTokens", description="Total tokens across all usage")
    total_cost: DecimalAsFloat = Field(..., alias="totalCost", description="Total cost in USD")
    current_streak: int = Field(
        ..., alias="currentStreak", description="Current consecutive days streak"
    )
    longest_streak: int = Field(..., alias="longestStreak", description="Longest streak achieved")
    achievements_unlocked: int = Field(
        ..., alias="achievementsUnlocked", description="Total achievements unlocked"
    )

    model_config = {"populate_by_name": True}


class SyncResponse(BaseModel):
    """
    Response from sync endpoint.

    Returns processing statistics and any new achievements unlocked.
    """

    success: bool = Field(default=True, description="Whether sync was successful")
    message: str | None = Field(default=None, description="Optional message")
    messages_received: int = Field(
        ..., alias="messagesReceived", description="Total messages received in request"
    )
    messages_synced: int = Field(
        ..., alias="messagesSynced", description="Number of new messages synced (excludes duplicates)"
    )
    records_processed: int = Field(
        ..., alias="recordsProcessed", description="Total aggregated records processed"
    )
    new_records: int = Field(..., alias="newRecords", description="Number of new records created")
    updated_records: int = Field(
        ..., alias="updatedRecords", description="Number of existing records updated"
    )
    stats: SyncStatsResponse = Field(..., description="Updated user statistics")
    new_achievements: list[AchievementUnlockResponse] = Field(
        default_factory=list,
        alias="newAchievements",
        description="Achievements unlocked during this sync",
    )

    model_config = {"populate_by_name": True}


class UsageStatsResponse(BaseModel):
    """Aggregated usage statistics for a user."""

    total_tokens: int = Field(..., description="Total tokens across all usage")
    total_input_tokens: int = Field(..., description="Total input tokens")
    total_output_tokens: int = Field(..., description="Total output tokens")
    total_cache_read_tokens: int = Field(..., description="Total cache read tokens")
    total_cache_write_tokens: int = Field(..., description="Total cache write tokens")
    total_reasoning_tokens: int = Field(..., description="Total reasoning tokens")
    total_cost: DecimalAsFloat = Field(..., description="Total cost in USD")
    cache_efficiency: DecimalAsFloat = Field(
        ..., description="Average cache efficiency percentage (0-100)"
    )

    # Grouping stats
    unique_models: int = Field(..., description="Number of unique models used")
    unique_sources: int = Field(..., description="Number of unique sources used")
    total_days: int = Field(..., description="Total days with usage")

    # Date range
    first_usage_date: date_type | None = Field(default=None, description="First usage date")
    last_usage_date: date_type | None = Field(default=None, description="Most recent usage date")


# Internal schemas for repository operations


class UsageRecordCreate(BaseCreateSchema):
    """Schema for creating a usage record (internal)."""

    user_id: UUID
    date: date_type
    source: str
    model: str
    machine_id: str = "default"
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0
    reasoning_tokens: int = 0
    cost: Decimal = Decimal("0.0000")
    usage_timestamp: datetime
    synced_at: datetime


class UsageRecordUpdate(BaseUpdateSchema):
    """Schema for updating a usage record (internal)."""

    input_tokens: int | None = None
    output_tokens: int | None = None
    cache_read_tokens: int | None = None
    cache_write_tokens: int | None = None
    reasoning_tokens: int | None = None
    cost: Decimal | None = None
    usage_timestamp: datetime | None = None


class UsageRecordResponse(BaseResponseSchema):
    """Schema for usage record response."""

    user_id: UUID
    date: date_type
    source: str
    model: str
    machine_id: str
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int
    cache_write_tokens: int
    reasoning_tokens: int
    cost: DecimalAsFloat
    usage_timestamp: datetime
    synced_at: datetime

    # Computed properties could be added here if needed
    # total_tokens and cache_efficiency are on the model
