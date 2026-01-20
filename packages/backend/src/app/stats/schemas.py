"""Platform statistics schemas."""

from pydantic import BaseModel, Field


class PlatformStatsResponse(BaseModel):
    """
    Platform-wide statistics for public display.

    Used on the landing page to show aggregate platform metrics.
    """

    total_tokens: int = Field(
        ...,
        description="Total tokens tracked across all users",
        examples=[1_234_567_890],
    )
    total_users: int = Field(
        ...,
        description="Total number of active users on the platform",
        examples=[523],
    )
    total_tools: int = Field(
        ...,
        description="Number of AI tools supported",
        examples=[6],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "total_tokens": 1_234_567_890,
                    "total_users": 523,
                    "total_tools": 6,
                }
            ]
        }
    }
