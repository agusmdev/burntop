"""Authentication module."""

from app.auth.dependencies import (
    get_auth_service,
    get_current_user,
    get_current_user_id,
    get_current_user_optional,
    http_bearer,
)
from app.auth.models import Account, Session, Verification
from app.auth.repository import (
    AccountRepository,
    SessionRepository,
    VerificationRepository,
)
from app.auth.schemas import (
    AccountCreate,
    LoginRequest,
    OAuthCallbackRequest,
    OAuthUser,
    RegisterRequest,
    SessionCreate,
    SessionResponse,
    VerificationCreate,
)
from app.auth.service import AuthService

__all__ = [
    "Account",
    "AccountCreate",
    "AccountRepository",
    "AuthService",
    "LoginRequest",
    "OAuthCallbackRequest",
    "OAuthUser",
    "RegisterRequest",
    "Session",
    "SessionCreate",
    "SessionRepository",
    "SessionResponse",
    "Verification",
    "VerificationCreate",
    "VerificationRepository",
    "get_auth_service",
    "get_current_user",
    "get_current_user_id",
    "get_current_user_optional",
    "http_bearer",
]
