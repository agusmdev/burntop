"""Activity schemas for request/response validation."""

from uuid import UUID

from pydantic import ConfigDict, Field

from app.core import BaseCreateSchema, BaseResponseSchema


class ActivityCreate(BaseCreateSchema):
    """
    Schema for creating a new activity.

    Activities are public events that appear in feeds, such as streak milestones,
    badge earned, rank changes, and other notable actions.
    """

    user_id: UUID = Field(..., description="ID of the user who performed the activity")
    type: str = Field(
        ...,
        description="Type of activity (streak_milestone, badge_earned, rank_change, etc.)",
        min_length=1,
        max_length=50,
    )
    data: dict | None = Field(None, description="Additional type-specific data (flexible JSONB)")


class ActivityUpdate(BaseCreateSchema):
    """
    Schema for updating an activity.

    Note: Activities are typically immutable once created.
    This schema exists for completeness but updates should be rare.
    """

    type: str | None = Field(
        None,
        description="Type of activity",
        min_length=1,
        max_length=50,
    )
    data: dict | None = Field(None, description="Additional type-specific data")


class ActivityResponse(BaseResponseSchema):
    """
    Schema for activity response.

    Includes all activity fields plus user information for display in feeds.
    """

    user_id: UUID = Field(..., description="ID of the user who performed the activity")
    type: str = Field(..., description="Type of activity")
    data: dict | None = Field(None, description="Additional type-specific data")

    # User information (minimal for feed display)
    user: "UserMinimalResponse | None" = Field(
        None, description="User who performed the activity (for feed display)"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "type": "streak_milestone",
                "data": {"days": 30, "milestone": "1_month"},
                "created_at": "2024-01-05T12:00:00Z",
                "updated_at": "2024-01-05T12:00:00Z",
                "user": {
                    "id": "123e4567-e89b-12d3-a456-426614174001",
                    "username": "johndoe",
                    "name": "John Doe",
                    "image": "https://example.com/avatar.jpg",
                },
            }
        },
    )


class UserMinimalResponse(BaseResponseSchema):
    """
    Minimal user information for activity feed display.

    Avoids circular imports by defining a minimal user schema here.
    """

    username: str = Field(..., description="Username")
    name: str | None = Field(None, description="Display name")
    image: str | None = Field(None, description="Profile image URL")

    model_config = ConfigDict(from_attributes=True)


# Update forward reference
ActivityResponse.model_rebuild()
