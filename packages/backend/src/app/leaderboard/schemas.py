"""Leaderboard schemas for API requests and responses."""

from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, Field, PlainSerializer, WithJsonSchema

from app.core import BaseResponseSchema

DecimalAsFloat = Annotated[
    Decimal,
    PlainSerializer(lambda x: float(x), return_type=float),
    WithJsonSchema({"type": "number"}),
]


class LeaderboardEntryResponse(BaseResponseSchema):
    """Response schema for a single leaderboard entry."""

    user_id: str = Field(..., description="User's UUID")
    username: str = Field(..., description="User's username")
    display_name: str | None = Field(None, description="User's display name (if set)")
    image: str | None = Field(None, description="User's profile image URL")

    rank: int = Field(..., description="Current rank on leaderboard", ge=1)
    rank_change: int | None = Field(
        None, description="Rank change since last update (positive = improved)"
    )

    total_tokens: int = Field(..., description="Total tokens used", ge=0)
    total_cost: DecimalAsFloat | None = Field(
        None, description="Total cost in USD", decimal_places=4
    )
    streak_days: int | None = Field(None, description="Current streak in days", ge=0)
    preferred_tool: str | None = Field(
        None, description="User's most used tool (by token count)"
    )
    followers_count: int = Field(0, description="Number of followers", ge=0)
    is_following: bool | None = Field(
        None, description="Whether the current user is following this user (null if not authenticated)"
    )


class PaginationMeta(BaseModel):
    """Pagination metadata for leaderboard responses."""

    total: int = Field(..., description="Total number of entries", ge=0)
    limit: int = Field(..., description="Entries per page", ge=1)
    offset: int = Field(..., description="Current offset", ge=0)
    has_more: bool = Field(..., description="Whether there are more results")


class LeaderboardResponse(BaseModel):
    """Paginated leaderboard response with metadata."""

    entries: list[LeaderboardEntryResponse] = Field(..., description="List of leaderboard entries")
    pagination: PaginationMeta = Field(..., description="Pagination information")
    period: str = Field(..., description="Time period (all, month, week)")
    sort_by: str = Field(..., description="Sort field (tokens, cost, streak)")


class DebugRankingEntry(BaseModel):
    """Debug entry for ranking preview."""

    user_id: str = Field(..., description="User's UUID")
    total_tokens: int = Field(..., description="Total tokens used", ge=0)
    rank: int = Field(..., description="Rank by token usage", ge=1)


class DebugStatsResponse(BaseModel):
    """Response schema for debug stats endpoint."""

    usage_record_count: int = Field(..., description="Total usage records in database", ge=0)
    unique_users: int = Field(..., description="Number of unique users with usage data", ge=0)
    top_users: list[DebugRankingEntry] = Field(..., description="Top users by token usage")
    cache_entry_count: int = Field(..., description="Number of leaderboard cache entries", ge=0)
