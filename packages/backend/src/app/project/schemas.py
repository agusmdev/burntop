"""Project schemas for request/response validation."""

from uuid import UUID

from pydantic import Field, field_validator

from app.core import BaseCreateSchema, BaseResponseSchema, BaseUpdateSchema


class ProjectCreate(BaseCreateSchema):
    """
    Schema for creating a new project.

    Only the URL is required - OG metadata will be fetched automatically.
    User can optionally provide title/description to override OG values.
    """

    url: str = Field(
        ...,
        min_length=1,
        max_length=2048,
        description="Project URL (must be a valid http/https URL)",
    )
    title: str | None = Field(
        default=None,
        max_length=500,
        description="Optional custom title (overrides OG title)",
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
        description="Optional custom description (overrides OG description)",
    )
    is_featured: bool = Field(
        default=False,
        description="Whether this project should be featured prominently",
    )
    display_order: int = Field(
        default=0,
        ge=0,
        description="Display order for sorting projects",
    )

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate URL format."""
        if not v.startswith(("http://", "https://")):
            msg = "URL must start with http:// or https://"
            raise ValueError(msg)
        return v


class ProjectUpdate(BaseUpdateSchema):
    """
    Schema for updating a project.

    All fields optional for PATCH operations.
    """

    url: str | None = Field(
        default=None,
        min_length=1,
        max_length=2048,
        description="Project URL",
    )
    title: str | None = Field(
        default=None,
        max_length=500,
        description="Custom title",
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
        description="Custom description",
    )
    og_image_url: str | None = Field(
        default=None,
        max_length=2048,
        description="Open Graph image URL (auto-fetched from URL)",
    )
    og_description: str | None = Field(
        default=None,
        max_length=2000,
        description="Open Graph description (auto-fetched from URL)",
    )
    favicon_url: str | None = Field(
        default=None,
        max_length=2048,
        description="Favicon URL (auto-fetched from URL)",
    )
    is_featured: bool | None = Field(
        default=None,
        description="Whether this project should be featured",
    )
    display_order: int | None = Field(
        default=None,
        ge=0,
        description="Display order for sorting",
    )

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        """Validate URL format if provided."""
        if v is None:
            return v
        if not v.startswith(("http://", "https://")):
            msg = "URL must start with http:// or https://"
            raise ValueError(msg)
        return v


class ProjectResponse(BaseResponseSchema):
    """
    Full project response schema.

    Includes all project fields for API responses.
    """

    user_id: UUID
    url: str
    title: str | None
    description: str | None
    og_image_url: str | None
    og_description: str | None
    favicon_url: str | None
    is_featured: bool
    display_order: int


class ProjectListResponse(BaseResponseSchema):
    """
    Simplified project response for list views.

    Same as ProjectResponse but explicitly named for list endpoints.
    """

    user_id: UUID
    url: str
    title: str | None
    description: str | None
    og_image_url: str | None
    og_description: str | None
    favicon_url: str | None
    is_featured: bool
    display_order: int
