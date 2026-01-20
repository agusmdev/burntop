"""Authentication dependencies for FastAPI route protection.

This module provides dependency injection functions for route protection using
Bearer token authentication. It integrates with AuthService to validate session
tokens and load the authenticated user.
"""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.repository import AccountRepository, SessionRepository
from app.auth.schemas import SessionUserResponse
from app.auth.service import AuthService
from app.config import Settings, get_settings
from app.dependencies import get_db
from app.user.dependencies import get_user_service
from app.user.service import UserService

# HTTPBearer security scheme for automatic token extraction
http_bearer = HTTPBearer(auto_error=True)


async def get_auth_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> AuthService:
    """Get AuthService instance with required dependencies.

    Args:
        db: Async database session
        settings: Application settings
        user_service: User service instance

    Returns:
        AuthService instance
    """
    session_repo = SessionRepository(db)
    account_repo = AccountRepository(db)
    return AuthService(settings, user_service, session_repo, account_repo)


async def get_current_user(
    request: Request,
    http_auth: Annotated[HTTPAuthorizationCredentials, Depends(http_bearer)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> SessionUserResponse:
    """Get currently authenticated user from Bearer token.

    This dependency validates the session token and returns the authenticated user.
    The user is cached in request.state to avoid repeated lookups within the same request.

    Args:
        request: FastAPI request object (for caching user in request.state)
        http_auth: Bearer token credentials (automatically extracted from Authorization header)
        auth_service: AuthService instance for session validation

    Returns:
        SessionUserResponse: The authenticated user's information

    Raises:
        UnauthorizedError: If session is invalid or expired
        NotFoundError: If user no longer exists
    """
    # Check if user is already cached in request state
    if hasattr(request.state, "user") and request.state.user:
        return request.state.user

    # Validate session and get user
    session_token = http_auth.credentials
    user = await auth_service.check_session(session_token)

    # Cache user in request state to avoid repeated lookups
    request.state.user = user

    return user


async def get_current_user_optional(
    request: Request,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    http_auth: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
) -> SessionUserResponse | None:
    """Get currently authenticated user from Bearer token (optional).

    This dependency validates the session token and returns the authenticated user.
    If no token is provided or the token is invalid, it returns None instead of raising an error.
    The user is cached in request.state to avoid repeated lookups within the same request.

    Args:
        request: FastAPI request object (for caching user in request.state)
        http_auth: Bearer token credentials (automatically extracted from Authorization header)
        auth_service: AuthService instance for session validation

    Returns:
        SessionUserResponse | None: The authenticated user or None if not authenticated
    """
    # Check if user is already cached in request state
    if hasattr(request.state, "user") and request.state.user:
        return request.state.user

    # If no token provided, return None
    if not http_auth:
        return None

    try:
        # Validate session and get user
        session_token = http_auth.credentials
        user = await auth_service.check_session(session_token)

        # Cache user in request state to avoid repeated lookups
        request.state.user = user

        return user
    except Exception:
        # Return None for any authentication errors (invalid token, expired session, etc.)
        return None


async def get_current_user_id(
    user: Annotated[SessionUserResponse, Depends(get_current_user)],
) -> UUID:
    """Get currently authenticated user's ID.

    This is a convenience dependency for endpoints that only need the user ID.

    Args:
        user: The authenticated user (from get_current_user dependency)

    Returns:
        UUID: The user's ID
    """
    return user.id
