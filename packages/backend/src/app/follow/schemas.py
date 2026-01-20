"""Follow schemas for request/response validation."""

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.core.schemas import BaseSchema


class FollowResponse(BaseSchema):
    """
    Schema for Follow response.

    Represents a follow relationship between two users.
    """

    follower_id: UUID = Field(
        ...,
        description="ID of the user who is following",
    )
    following_id: UUID = Field(
        ...,
        description="ID of the user being followed",
    )
    created_at: datetime = Field(
        ...,
        description="Timestamp when the follow relationship was created",
    )


class FollowerResponse(BaseSchema):
    """
    Schema for follower/following user information.

    Used when displaying lists of followers or following users.
    Includes basic user information.
    """

    id: UUID = Field(
        ...,
        description="User ID",
    )
    username: str = Field(
        ...,
        description="Username",
    )
    name: str | None = Field(
        default=None,
        description="Display name",
    )
    image: str | None = Field(
        default=None,
        description="Profile image URL",
    )
    bio: str | None = Field(
        default=None,
        description="User bio",
    )
    followed_at: datetime = Field(
        ...,
        description="Timestamp when the follow relationship was created",
    )


class FollowStatsResponse(BaseSchema):
    """
    Schema for follow statistics.

    Contains follower and following counts for a user.
    """

    followers_count: int = Field(
        ...,
        description="Number of followers",
    )
    following_count: int = Field(
        ...,
        description="Number of users being followed",
    )
    is_following: bool | None = Field(
        default=None,
        description="Whether the current user is following this user (requires authentication)",
    )
    follows_me: bool | None = Field(
        default=None,
        description="Whether this user is following the current user (requires authentication)",
    )
