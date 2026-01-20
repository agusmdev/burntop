"""Streak Pydantic schemas for request/response validation."""

from datetime import date as date_type
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.schemas import BaseCreateSchema, BaseResponseSchema, BaseUpdateSchema


class StreakCreate(BaseCreateSchema):
    """Schema for creating a streak record."""

    user_id: UUID = Field(..., description="ID of the user")
    current_streak: int = Field(default=0, ge=0, description="Current streak count in days")
    longest_streak: int = Field(default=0, ge=0, description="Longest streak ever achieved")
    last_active_date: date_type | None = Field(
        default=None, description="Last date user was active"
    )
    timezone: str = Field(
        default="UTC", max_length=50, description="User's timezone (e.g., 'America/New_York')"
    )


class StreakUpdate(BaseUpdateSchema):
    """Schema for updating a streak record. All fields optional for PATCH."""

    current_streak: int | None = Field(
        default=None, ge=0, description="Current streak count in days"
    )
    longest_streak: int | None = Field(
        default=None, ge=0, description="Longest streak ever achieved"
    )
    last_active_date: date_type | None = Field(
        default=None, description="Last date user was active"
    )
    timezone: str | None = Field(default=None, max_length=50, description="User's timezone")


class StreakResponse(BaseResponseSchema):
    """Schema for streak response."""

    user_id: UUID = Field(..., description="ID of the user")
    current_streak: int = Field(..., description="Current streak count in days")
    longest_streak: int = Field(..., description="Longest streak ever achieved")
    last_active_date: date_type | None = Field(
        default=None, description="Last date user was active"
    )
    timezone: str = Field(..., description="User's timezone")


class StreakStatsResponse(BaseModel):
    """Schema for streak statistics."""

    current_streak: int = Field(..., description="Current active streak in days")
    longest_streak: int = Field(..., description="All-time longest streak")
    last_active_date: date_type | None = Field(default=None, description="Last date with activity")
    is_at_risk: bool = Field(
        ..., description="Whether streak is at risk (22+ hours since last activity)"
    )
