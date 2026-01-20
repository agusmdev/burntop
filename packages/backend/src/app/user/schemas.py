"""User schemas for request/response validation."""

from pydantic import EmailStr, Field, field_validator

from app.core import BaseCreateSchema, BaseResponseSchema, BaseUpdateSchema


class UserCreate(BaseCreateSchema):
    """
    Schema for creating a new user.

    Used during registration with email/password or OAuth.
    """

    email: EmailStr
    username: str = Field(
        ...,
        min_length=3,
        max_length=30,
        pattern=r"^[a-zA-Z0-9_]+$",
        description="Alphanumeric username with underscores allowed",
    )
    name: str | None = Field(default=None, max_length=100)
    password: str | None = Field(
        default=None,
        min_length=8,
        description="Required for email/password registration, optional for OAuth",
    )
    image: str | None = Field(default=None, max_length=500)


class UserUpdate(BaseUpdateSchema):
    """
    Schema for updating user profile.

    All fields optional for PATCH operations.
    """

    name: str | None = Field(default=None, max_length=100)
    bio: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=100)
    region: str | None = Field(default=None, max_length=100)
    website_url: str | None = Field(default=None, max_length=500)
    is_public: bool | None = None
    image: str | None = Field(default=None, max_length=500)

    @field_validator("website_url")
    @classmethod
    def validate_website_url(cls, v: str | None) -> str | None:
        """Validate website URL format."""
        if v is None:
            return v
        # Basic URL validation
        if not v.startswith(("http://", "https://")):
            msg = "Website URL must start with http:// or https://"
            raise ValueError(msg)
        return v


class UserResponse(BaseResponseSchema):
    """
    Full user response schema.

    Includes all user fields except password_hash.
    Used for authenticated requests where user is viewing their own profile.
    """

    email: str
    email_verified: bool
    username: str
    name: str | None
    bio: str | None
    location: str | None
    region: str | None
    website_url: str | None
    is_public: bool
    image: str | None
    monthly_badge: str | None
    monthly_tokens: int


class UserPublicResponse(BaseResponseSchema):
    """
    Limited user response for public profiles.

    Only includes publicly visible fields.
    Used when viewing other users' profiles.
    """

    username: str
    name: str | None
    bio: str | None
    location: str | None
    region: str | None
    website_url: str | None
    is_public: bool
    image: str | None
    monthly_badge: str | None
    monthly_tokens: int


class UserStatsResponse(BaseResponseSchema):
    """
    User statistics response.

    Aggregated usage and achievement statistics.
    """

    username: str
    total_tokens: int
    total_cost: float
    current_streak: int
    longest_streak: int
    achievements_unlocked: int
    unique_days: int
    cache_efficiency: float | None
    monthly_tokens: int
    monthly_badge: str | None


class UserComparisonDataResponse(BaseResponseSchema):
    """
    User comparison data for compare page.

    Includes profile info, stats, and top models/sources.
    """

    username: str
    name: str | None
    image: str | None
    tokens: dict  # {total: int}
    cost: dict  # {total: str}
    streak: dict  # {current: int, longest: int}
    top_models: list[dict]  # [{model: str, total_tokens: int, total_cost: str}]
    top_sources: list[dict]  # [{source: str, total_tokens: int, total_cost: str}]


class ComparisonResponse(BaseResponseSchema):
    """
    Comparison response for two users.

    Contains comparison data for both users.
    """

    user_a: UserComparisonDataResponse
    user_b: UserComparisonDataResponse
