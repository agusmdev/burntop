"""Dashboard Pydantic schemas for request validation and response serialization."""

from datetime import date as date_type
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, Field, PlainSerializer, WithJsonSchema

# Custom serializer to convert Decimal to float for JSON responses
# WithJsonSchema ensures the OpenAPI schema shows type: number instead of string
DecimalAsFloat = Annotated[
    Decimal,
    PlainSerializer(lambda x: float(x), return_type=float),
    WithJsonSchema({"type": "number"}),
]


class DashboardOverviewResponse(BaseModel):
    """
    Dashboard overview statistics.

    Aggregated stats for user's overall activity and usage.
    """

    total_tokens: int = Field(..., description="Total tokens across all usage")
    total_input_tokens: int = Field(..., description="Total input tokens")
    total_output_tokens: int = Field(..., description="Total output tokens")
    total_cache_read_tokens: int = Field(..., description="Total cache read tokens")
    total_cache_write_tokens: int = Field(..., description="Total cache write tokens")
    total_reasoning_tokens: int = Field(..., description="Total reasoning tokens")
    total_cost: DecimalAsFloat = Field(..., description="Total cost in USD")

    # Streak stats
    current_streak: int = Field(..., description="Current consecutive days streak")
    longest_streak: int = Field(..., description="Longest streak achieved")

    # AI Native tier (based on rolling 30-day usage)
    monthly_tokens: int = Field(..., description="Total tokens for last 30 days (rolling window)")
    monthly_badge: str | None = Field(
        None, description="AI Native tier badge (Power User, AI Native, Token Titan) based on 30-day usage"
    )

    # Usage stats
    unique_days: int = Field(..., description="Total days with usage")
    unique_models: int = Field(..., description="Number of unique models used")
    unique_sources: int = Field(..., description="Number of unique sources used")

    # Efficiency
    cache_efficiency: DecimalAsFloat = Field(
        ..., description="Average cache efficiency percentage (0-100)"
    )


class DailyTrendData(BaseModel):
    """Daily trend data point for charts."""

    date: date_type = Field(..., description="Date of the data point")
    tokens: int = Field(..., description="Total tokens for the day")
    cost: DecimalAsFloat = Field(..., description="Total cost in USD for the day")
    input_tokens: int = Field(default=0, description="Input tokens for the day")
    output_tokens: int = Field(default=0, description="Output tokens for the day")
    cache_read_tokens: int = Field(default=0, description="Cache read tokens for the day")
    cache_write_tokens: int = Field(default=0, description="Cache write tokens for the day")
    reasoning_tokens: int = Field(default=0, description="Reasoning tokens for the day")


class DashboardTrendsResponse(BaseModel):
    """
    Dashboard trends over time.

    Daily usage data for charting and trend analysis.
    """

    daily_data: list[DailyTrendData] = Field(..., description="Daily usage data points")
    period_start: date_type = Field(..., description="Start date of the period")
    period_end: date_type = Field(..., description="End date of the period")


class ToolUsageData(BaseModel):
    """Tool/source usage breakdown."""

    source: str = Field(..., description="Source/tool identifier")
    tokens: int = Field(..., description="Total tokens for this source")
    cost: DecimalAsFloat = Field(..., description="Total cost in USD for this source")
    percentage: DecimalAsFloat = Field(..., description="Percentage of total usage (0-100)")
    days_active: int = Field(..., description="Number of days this source was used")


class DashboardToolsResponse(BaseModel):
    """
    Dashboard tools/sources breakdown.

    Aggregated usage by source/tool for visualization.
    """

    tools: list[ToolUsageData] = Field(..., description="Usage breakdown by source/tool")
    total_tools: int = Field(..., description="Total unique tools/sources used")


class ModelUsageData(BaseModel):
    """Model usage breakdown."""

    model: str = Field(..., description="Model identifier")
    tokens: int = Field(..., description="Total tokens for this model")
    cost: DecimalAsFloat = Field(..., description="Total cost in USD for this model")
    percentage: DecimalAsFloat = Field(..., description="Percentage of total usage (0-100)")
    days_active: int = Field(..., description="Number of days this model was used")


class DashboardModelsResponse(BaseModel):
    """
    Dashboard models breakdown.

    Aggregated usage by AI model for visualization.
    """

    models: list[ModelUsageData] = Field(..., description="Usage breakdown by model")
    total_models: int = Field(..., description="Total unique models used")
