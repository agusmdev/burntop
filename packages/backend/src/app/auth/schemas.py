"""
Auth schemas for request validation and response serialization.

Includes schemas for login, registration, session management, and OAuth flows.
"""

from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.schemas import BaseSchema


class LoginRequest(BaseSchema):
    """
    Request schema for email/password login.

    Validates email format and requires both fields.
    """

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (min 8 chars)")


class RegisterRequest(BaseSchema):
    """
    Request schema for user registration.

    Validates:
    - Email format (EmailStr)
    - Password length (min 8 chars)
    - Username format (3-30 chars, alphanumeric + underscore)
    - Name (optional, max 100 chars)
    """

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (min 8 chars)")
    username: str = Field(
        ...,
        min_length=3,
        max_length=30,
        pattern=r"^[a-zA-Z0-9_]+$",
        description="Username (alphanumeric and underscore only)",
    )
    name: str | None = Field(default=None, max_length=100, description="Display name")


class SessionResponse(BaseSchema):
    """
    Response schema for session information.

    Includes computed `expires_in` field for client-side expiration handling.
    Note: Session uses string ID (not UUID) due to custom format: s_{token}.
    """

    id: str = Field(..., description="Session ID (e.g., s_...)")
    user_id: UUID = Field(..., description="User ID associated with session")
    token: str = Field(..., description="Bearer token for authentication")
    expires_at: datetime = Field(..., description="Expiration timestamp")
    created_at: datetime = Field(..., description="Session creation timestamp")

    @property
    def expires_in(self) -> int:
        """
        Compute seconds until expiration.

        Returns:
            Seconds remaining until session expires (0 if already expired)
        """
        remaining = (self.expires_at - datetime.now(UTC)).total_seconds()
        return max(0, int(remaining))


class OAuthCallbackRequest(BaseSchema):
    """
    Request schema for OAuth callback parameters.

    OAuth providers redirect to callback URL with these parameters.
    """

    code: str = Field(..., description="Authorization code from OAuth provider")
    state: str | None = Field(default=None, description="CSRF token (optional)")
    error: str | None = Field(default=None, description="Error code if OAuth failed (optional)")
    error_description: str | None = Field(
        default=None, description="Human-readable error description (optional)"
    )


class OAuthUser(BaseModel):
    """
    Schema for user information from OAuth providers.

    Standardized format that GitHub provider maps to.
    """

    token: str = Field(..., description="OAuth access token")
    email: str | None = Field(default=None, description="User email (if available)")
    display_name: str = Field(..., description="User's display name")
    avatar_url: str | None = Field(default=None, description="Profile image URL")
    provider_user_id: str = Field(..., description="Provider-specific user ID")
    provider_username: str | None = Field(
        default=None, description="Provider username (e.g., GitHub login)"
    )

    model_config = ConfigDict(from_attributes=True)


class SessionCreate(BaseSchema):
    """
    Internal schema for session creation.

    Used by AuthService to create session records.
    """

    id: str = Field(..., description="Session ID (e.g., s_...)")
    user_id: UUID = Field(..., description="User ID")
    token: str = Field(..., description="Bearer token")
    expires_at: datetime = Field(..., description="Expiration timestamp")
    ip_address: str | None = Field(default=None, description="Client IP address")
    user_agent: str | None = Field(default=None, description="Client user agent")


class AccountCreate(BaseSchema):
    """
    Internal schema for OAuth account creation.

    Used by AuthService to link OAuth providers to users.
    """

    id: str = Field(..., description="Account ID")
    user_id: UUID = Field(..., description="User ID")
    account_id: str = Field(..., description="Provider account ID")
    provider_id: str = Field(..., description="Provider name (github)")
    access_token: str = Field(..., description="OAuth access token")
    refresh_token: str | None = Field(default=None, description="OAuth refresh token")
    access_token_expires_at: datetime | None = Field(default=None, description="Token expiration")


class VerificationCreate(BaseSchema):
    """
    Internal schema for verification code creation.

    Used for email verification and password reset flows.
    """

    id: str = Field(..., description="Verification ID")
    identifier: str = Field(..., description="Email or phone number")
    value: str = Field(..., description="Verification code or token")
    expires_at: datetime = Field(..., description="Expiration timestamp")
    verification_type: str | None = Field(
        default=None, description="Type: email, phone, password_reset"
    )


class SessionUserResponse(BaseSchema):
    """
    Response schema for authenticated user from session check.

    Used by check_session to return user information without
    exposing the SQLAlchemy model.
    """

    id: UUID = Field(..., description="User ID")
    email: str = Field(..., description="User email address")
    email_verified: bool = Field(..., description="Whether email is verified")
    username: str = Field(..., description="Username")
    name: str | None = Field(default=None, description="Display name")
    image: str | None = Field(default=None, description="Profile image URL")
    is_public: bool = Field(..., description="Whether profile is public")
    created_at: datetime = Field(..., description="User creation timestamp")
    updated_at: datetime = Field(..., description="User last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class DeviceTokenExchangeRequest(BaseSchema):
    """
    Request schema for device flow token exchange.

    Used by CLI to exchange a GitHub access token for a burntop session.
    """

    access_token: str = Field(..., description="GitHub access token from device flow")
