"""Benchmark schemas for community statistics and user insights."""

from uuid import UUID

from pydantic import Field, computed_field

from app.core import BaseCreateSchema, BaseResponseSchema, BaseUpdateSchema


class CommunityBenchmarkCreate(BaseCreateSchema):
    """
    Schema for creating a community benchmark.

    Used internally by background tasks to create benchmark snapshots.
    """

    period: str = Field(..., description="Time period (all, month, week)")
    total_users: int = Field(default=0, ge=0)
    avg_tokens: int | None = Field(default=None, ge=0)
    median_tokens: int | None = Field(default=None, ge=0)
    total_community_tokens: int | None = Field(default=None, ge=0)
    avg_cost: float | None = Field(default=None, ge=0)
    avg_streak: int | None = Field(default=None, ge=0)
    avg_unique_tools: int | None = Field(default=None, ge=0)
    avg_cache_efficiency: float | None = Field(default=None, ge=0, le=100)


class CommunityBenchmarkUpdate(BaseUpdateSchema):
    """
    Schema for updating a community benchmark.

    All fields optional for PATCH operations.
    """

    total_users: int | None = Field(default=None, ge=0)
    avg_tokens: int | None = Field(default=None, ge=0)
    median_tokens: int | None = Field(default=None, ge=0)
    total_community_tokens: int | None = Field(default=None, ge=0)
    avg_cost: float | None = Field(default=None, ge=0)
    avg_streak: int | None = Field(default=None, ge=0)
    avg_unique_tools: int | None = Field(default=None, ge=0)
    avg_cache_efficiency: float | None = Field(default=None, ge=0, le=100)


class CommunityBenchmarkResponse(BaseResponseSchema):
    """
    Community benchmark response schema.

    Contains aggregate statistics for the community in a given period.
    """

    period: str
    total_users: int
    avg_tokens: int | None
    median_tokens: int | None
    total_community_tokens: int | None
    avg_cost: float | None
    avg_streak: int | None
    avg_unique_tools: int | None
    avg_cache_efficiency: float | None


class UserComparisonData(BaseCreateSchema):
    """
    User's personal statistics for comparison with community benchmarks.

    Used internally to compare user stats against community averages.
    """

    user_id: UUID
    username: str
    total_tokens: int
    total_cost: float
    current_streak: int
    unique_tools: int
    cache_efficiency: float | None
    unique_days: int


class InsightsResponse(BaseResponseSchema):
    """
    User insights response comparing user stats to community benchmarks.

    Provides percentile rankings and comparative metrics to help users
    understand how they compare to the broader community.
    """

    id: UUID
    username: str
    period: str = Field(..., description="Period for the comparison (all, month, week)")

    # User's actual statistics
    user_total_tokens: int
    user_total_cost: float
    user_current_streak: int
    user_unique_tools: int
    user_cache_efficiency: float | None
    user_unique_days: int

    # Community benchmarks
    community_avg_tokens: int | None
    community_median_tokens: int | None
    community_avg_cost: float | None
    community_avg_streak: int | None
    community_avg_unique_tools: int | None
    community_avg_cache_efficiency: float | None
    community_total_users: int

    # Percentile rankings (0-100, where 100 is top performer)
    tokens_percentile: float | None = Field(
        default=None, ge=0, le=100, description="User's percentile for total tokens"
    )
    cost_percentile: float | None = Field(
        default=None, ge=0, le=100, description="User's percentile for total cost"
    )
    streak_percentile: float | None = Field(
        default=None, ge=0, le=100, description="User's percentile for current streak"
    )
    tools_percentile: float | None = Field(
        default=None, ge=0, le=100, description="User's percentile for unique tools"
    )
    cache_efficiency_percentile: float | None = Field(
        default=None, ge=0, le=100, description="User's percentile for cache efficiency"
    )

    @computed_field
    @property
    def is_above_average_tokens(self) -> bool:
        """Whether user's token usage is above community average."""
        if self.community_avg_tokens is None:
            return False
        return self.user_total_tokens > self.community_avg_tokens

    @computed_field
    @property
    def is_above_average_streak(self) -> bool:
        """Whether user's streak is above community average."""
        if self.community_avg_streak is None:
            return False
        return self.user_current_streak > self.community_avg_streak

    @computed_field
    @property
    def is_above_average_cache_efficiency(self) -> bool:
        """Whether user's cache efficiency is above community average."""
        if self.community_avg_cache_efficiency is None or self.user_cache_efficiency is None:
            return False
        return self.user_cache_efficiency > self.community_avg_cache_efficiency
