"""Authentication router for user registration, login, and OAuth flows."""

import hmac
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import RedirectResponse

from app.auth.dependencies import get_auth_service, get_current_user
from app.auth.schemas import (
    DeviceTokenExchangeRequest,
    LoginRequest,
    RegisterRequest,
    SessionResponse,
    SessionUserResponse,
)
from app.auth.service import AuthService
from app.exceptions import UnauthorizedError

# OAuth state token cookie configuration
OAUTH_STATE_COOKIE_NAME = "oauth_state"
OAUTH_STATE_COOKIE_MAX_AGE = 600  # 10 minutes - short expiry for security

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Register a new user with email and password. Returns a session token for authentication.",
)
async def register(
    request: Request,
    data: RegisterRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> SessionResponse:
    """
    Register a new user with email and password.

    Args:
        request: FastAPI request object for IP address extraction
        data: Registration data (email, password, username, name)
        auth_service: AuthService instance

    Returns:
        SessionResponse with session token and expiration

    Raises:
        ConflictError: If email or username already exists (409)
        ValidationError: If request data is invalid (422)
    """
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    session = await auth_service.register(data, ip_address=ip_address, user_agent=user_agent)
    return SessionResponse.model_validate(session)


@router.post(
    "/login",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Login with email and password",
    description="Authenticate with email and password. Returns a session token.",
)
async def login(
    request: Request,
    data: LoginRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> SessionResponse:
    """
    Login with email and password.

    Args:
        request: FastAPI request object for IP address extraction
        data: Login credentials (email, password)
        auth_service: AuthService instance

    Returns:
        SessionResponse with session token and expiration

    Raises:
        UnauthorizedError: If credentials are invalid (401)
    """
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    session = await auth_service.authenticate(data, ip_address=ip_address, user_agent=user_agent)
    return SessionResponse.model_validate(session)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout current user",
    description="Invalidate the current session token. Requires authentication.",
)
async def logout(
    request: Request,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> None:
    """
    Logout the current user by invalidating their session.

    Args:
        request: FastAPI request object for session token extraction
        auth_service: AuthService instance

    Raises:
        UnauthorizedError: If session token is invalid (401)
    """
    # Extract Bearer token from Authorization header
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise UnauthorizedError(message="Missing or invalid authorization header")

    session_token = auth_header.replace("Bearer ", "")
    await auth_service.logout(session_token)


@router.get(
    "/me",
    response_model=SessionUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user",
    description="Get the currently authenticated user's information. Requires authentication.",
)
async def get_me(
    user: Annotated[SessionUserResponse, Depends(get_current_user)],
) -> SessionUserResponse:
    """
    Get the currently authenticated user's information.

    Args:
        user: The authenticated user (from get_current_user dependency)

    Returns:
        User information (id, email, username, name, etc.)

    Raises:
        UnauthorizedError: If session token is invalid (401)
        NotFoundError: If user no longer exists (404)
    """
    return user


@router.get(
    "/oauth/{provider}",
    status_code=status.HTTP_302_FOUND,
    summary="Initiate OAuth flow",
    description="Redirect to OAuth provider for authentication. Supports 'github'.",
)
async def oauth_authorize(
    provider: str,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> RedirectResponse:
    """
    Initiate OAuth authorization flow by redirecting to provider.

    Args:
        provider: OAuth provider name ('github')
        auth_service: AuthService instance

    Returns:
        RedirectResponse to OAuth provider's authorization URL

    Raises:
        NotFoundError: If provider is not supported or not enabled (404)
    """
    # Get authorization URL and state token from service
    authorization_url, state = auth_service.get_oauth_authorization_url(provider)

    # Create response and set state token in HTTP-only cookie
    response = RedirectResponse(url=authorization_url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key=OAUTH_STATE_COOKIE_NAME,
        value=state,
        max_age=OAUTH_STATE_COOKIE_MAX_AGE,
        httponly=True,
        secure=True,  # Only send over HTTPS
        samesite="lax",  # Protect against CSRF while allowing OAuth redirects
    )

    return response


@router.get(
    "/oauth/{provider}/callback",
    status_code=status.HTTP_302_FOUND,
    summary="OAuth callback handler",
    description="Handle OAuth callback, create session, and redirect to frontend with token.",
)
async def oauth_callback(
    provider: str,
    request: Request,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
) -> RedirectResponse:
    """
    Handle OAuth callback and create/login user, then redirect to frontend.

    Args:
        provider: OAuth provider name ('github')
        request: FastAPI request object for IP address extraction
        auth_service: AuthService instance
        code: Authorization code from OAuth provider
        state: CSRF state token (required for security)
        error: Error code if OAuth failed (optional)
        error_description: Human-readable error description (optional)

    Returns:
        RedirectResponse to frontend /auth/callback with token or error parameters

    Raises:
        None - All errors are passed to frontend via redirect URL parameters
    """
    frontend_callback_url = auth_service.get_frontend_callback_url()

    # Check for OAuth errors from provider
    if error:
        error_url = f"{frontend_callback_url}?error={error}"
        if error_description:
            error_url += f"&error_description={error_description}"
        response = RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)
        response.delete_cookie(key=OAUTH_STATE_COOKIE_NAME)
        return response

    # Validate code parameter
    if not code:
        error_url = f"{frontend_callback_url}?error=missing_code&error_description=Authorization+code+is+missing"
        response = RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)
        response.delete_cookie(key=OAUTH_STATE_COOKIE_NAME)
        return response

    # Validate CSRF state token
    stored_state = request.cookies.get(OAUTH_STATE_COOKIE_NAME)
    if not stored_state or not state or not hmac.compare_digest(stored_state, state):
        error_url = f"{frontend_callback_url}?error=invalid_state&error_description=Invalid+or+missing+state+token"
        response = RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)
        response.delete_cookie(key=OAUTH_STATE_COOKIE_NAME)
        return response

    try:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # Construct redirect_uri (must match the one used in authorization request)
        redirect_uri = auth_service.get_oauth_redirect_uri(provider)

        # Process OAuth login
        session = await auth_service.oauth_login(
            provider=provider,
            code=code,
            redirect_uri=redirect_uri,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Redirect to frontend with session token
        success_url = f"{frontend_callback_url}?token={session.token}"
        response = RedirectResponse(url=success_url, status_code=status.HTTP_302_FOUND)
        response.delete_cookie(key=OAUTH_STATE_COOKIE_NAME)
        return response

    except Exception as e:
        # Catch all errors and redirect to frontend with error message
        error_msg = str(e) if str(e) else "Authentication failed"
        error_url = f"{frontend_callback_url}?error=auth_failed&error_description={error_msg}"
        response = RedirectResponse(url=error_url, status_code=status.HTTP_302_FOUND)
        response.delete_cookie(key=OAUTH_STATE_COOKIE_NAME)
        return response


@router.post(
    "/oauth/{provider}/device",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Exchange device flow token for session",
    description="Exchange a provider access token (from device flow) for a burntop session. Used by CLI.",
)
async def device_flow_token_exchange(
    provider: str,
    request: Request,
    data: DeviceTokenExchangeRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> SessionResponse:
    """
    Exchange a device flow access token for a burntop session.

    This endpoint is used by the CLI after completing the GitHub Device Flow.
    The CLI obtains an access token directly from GitHub, then exchanges it
    here for a burntop session token.

    Args:
        provider: OAuth provider name ('github')
        request: FastAPI request object for IP address extraction
        data: Request body containing the provider access token
        auth_service: AuthService instance

    Returns:
        SessionResponse with session token and expiration

    Raises:
        NotFoundError: If provider is not supported or not enabled (404)
        UnauthorizedError: If access token is invalid (401)
    """
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    session = await auth_service.device_flow_login(
        provider=provider,
        access_token=data.access_token,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return SessionResponse.model_validate(session)
