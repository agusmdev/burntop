"""Authentication service for user registration, login, and session management."""

import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.auth.models import Session
from app.auth.oauth.github import GitHubOAuth
from app.auth.repository import AccountRepository, SessionRepository
from app.auth.schemas import (
    AccountCreate,
    LoginRequest,
    OAuthUser,
    RegisterRequest,
    SessionCreate,
    SessionUserResponse,
)
from app.config import Settings
from app.exceptions import ConflictError, NotFoundError, UnauthorizedError
from app.user.service import UserService


class AuthService:
    """
    Authentication service for user registration, login, OAuth, and session management.

    Handles:
    - Email/password registration and login
    - OAuth login (GitHub)
    - Session creation and validation
    - Logout
    """

    def __init__(
        self,
        settings: Settings,
        user_service: UserService,
        session_repository: SessionRepository,
        account_repository: AccountRepository,
    ) -> None:
        """
        Initialize AuthService with required dependencies.

        Args:
            settings: Application settings
            user_service: User service instance for user operations
            session_repository: Session repository instance
            account_repository: Account repository instance
        """
        self._settings = settings
        self._user_service = user_service
        self._session_repo = session_repository
        self._account_repo = account_repository

        # Register OAuth providers
        self._providers: dict[str, GitHubOAuth] = {}
        if settings.github_oauth_enabled:
            self._providers["github"] = GitHubOAuth(settings)

    @staticmethod
    def generate_session_id() -> str:
        """
        Generate a unique session ID with format: s_{64-char-token}.

        Returns:
            Session ID string (66 characters total: 's_' + 64 random hex chars)
        """
        token = secrets.token_hex(32)  # 32 bytes = 64 hex chars
        return f"s_{token}"

    async def register(
        self, request: RegisterRequest, ip_address: str | None = None, user_agent: str | None = None
    ) -> Session:
        """
        Register a new user with email and password.

        Creates user account and initial session.

        Args:
            request: Registration request with email, password, username, name
            ip_address: Client IP address for session tracking
            user_agent: Client user agent for session tracking

        Returns:
            Session model instance with relationship to user

        Raises:
            ConflictError: If email or username already exists
        """
        # Check if email already exists
        existing_user = await self._user_service.get_by_email(request.email)
        if existing_user:
            raise ConflictError(resource="User", field="email", value=request.email)

        # Check if username already exists
        existing_username = await self._user_service.get_by_username(request.username)
        if existing_username:
            raise ConflictError(resource="User", field="username", value=request.username)

        # Create user via service
        user = await self._user_service.create_with_password(
            email=request.email,
            username=request.username,
            password=request.password,
            name=request.name,
            email_verified=False,
        )

        # Create session
        session = await self._create_session(user.id, ip_address, user_agent)

        return session

    async def authenticate(
        self, request: LoginRequest, ip_address: str | None = None, user_agent: str | None = None
    ) -> Session:
        """
        Authenticate user with email and password.

        Creates a new session on successful authentication.

        Args:
            request: Login request with email and password
            ip_address: Client IP address for session tracking
            user_agent: Client user agent for session tracking

        Returns:
            Session model instance with relationship to user

        Raises:
            UnauthorizedError: If credentials are invalid
        """
        # Find user by email
        user = await self._user_service.get_by_email(request.email)
        if not user:
            raise UnauthorizedError("Invalid email or password")

        # Check if password authentication is available
        has_password = await self._user_service.has_password(user.id)
        if not has_password:
            raise UnauthorizedError("Password authentication not available for this account")

        # Verify password via user service
        password_valid = await self._user_service.verify_password(user.id, request.password)
        if not password_valid:
            raise UnauthorizedError("Invalid email or password")

        # Create session
        session = await self._create_session(user.id, ip_address, user_agent)

        return session

    def get_oauth_authorization_url(self, provider: str) -> tuple[str, str]:
        """
        Get OAuth authorization URL for a provider.

        Args:
            provider: OAuth provider name (github)

        Returns:
            Tuple of (authorization_url, state_token)

        Raises:
            NotFoundError: If provider is not registered or not enabled
        """
        oauth_provider = self._providers.get(provider)
        if not oauth_provider:
            raise NotFoundError(resource="OAuth provider", id=provider)

        redirect_uri = f"{self._settings.backend_url}/api/v1/auth/oauth/{provider}/callback"
        state = secrets.token_urlsafe(32)
        authorization_url = oauth_provider.get_authorization_url(
            redirect_uri=redirect_uri, state=state
        )

        return authorization_url, state

    def get_oauth_redirect_uri(self, provider: str) -> str:
        """
        Get OAuth callback redirect URI for a provider.

        Args:
            provider: OAuth provider name (github)

        Returns:
            The redirect URI for OAuth callback
        """
        return f"{self._settings.backend_url}/api/v1/auth/oauth/{provider}/callback"

    def get_frontend_callback_url(self) -> str:
        """
        Get the frontend OAuth callback URL.

        Returns:
            The frontend callback URL for OAuth redirects
        """
        return f"{self._settings.frontend_url}/auth/callback"

    async def oauth_login(
        self,
        provider: str,
        code: str,
        redirect_uri: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
        code_verifier: str | None = None,
    ) -> Session:
        """
        Handle OAuth callback and create/login user.

        Exchanges OAuth code for user info, creates user if new, or logs in existing user.

        Args:
            provider: OAuth provider name (github)
            code: OAuth authorization code
            redirect_uri: OAuth redirect URI (must match authorization request)
            ip_address: Client IP address for session tracking
            user_agent: Client user agent for session tracking
            code_verifier: PKCE code verifier (optional)

        Returns:
            Session model instance with relationship to user

        Raises:
            NotFoundError: If provider is not registered
            UnauthorizedError: If OAuth flow fails
        """
        # Get OAuth provider
        oauth_provider = self._providers.get(provider)
        if not oauth_provider:
            raise NotFoundError(resource="OAuth provider", id=provider)

        # Exchange code for user info
        oauth_user: OAuthUser = await oauth_provider.callback(code, redirect_uri, code_verifier)

        # Find or create account
        account = await self._account_repo.get_by_provider(provider, oauth_user.provider_user_id)

        if account:
            # Existing account - login
            # account.user_id may be asyncpg UUID or Python UUID, convert safely
            user_id = account.user_id if isinstance(account.user_id, UUID) else UUID(str(account.user_id))
            user = await self._user_service.get_by_id(user_id)
            if not user:
                raise NotFoundError(resource="User", id=str(account.user_id))

            # Update OAuth tokens via repository
            await self._account_repo.update_oauth_tokens(
                account=account,
                access_token=oauth_user.token,
                access_token_expires_at=datetime.now(UTC) + timedelta(days=60),
            )

        else:
            # New account - register
            # Try to find existing user by email if provided
            user = None
            if oauth_user.email:
                user = await self._user_service.get_by_email(oauth_user.email)

            if not user:
                # Create new user
                # Generate unique username: prefer provider_username (GitHub login),
                # fall back to display_name transformation, then email prefix
                base_username = (
                    oauth_user.provider_username
                    if oauth_user.provider_username
                    else (
                        oauth_user.display_name.lower().replace(" ", "_")
                        if oauth_user.display_name
                        else oauth_user.email.split("@")[0]
                        if oauth_user.email
                        else f"{provider}_user"
                    )
                )
                username = base_username
                counter = 1
                while await self._user_service.get_by_username(username):
                    username = f"{base_username}{counter}"
                    counter += 1

                # Create user via service
                user = await self._user_service.create_oauth_user(
                    email=oauth_user.email or f"{oauth_user.provider_user_id}@{provider}.oauth",
                    username=username,
                    name=oauth_user.display_name,
                    email_verified=bool(oauth_user.email),  # OAuth emails are typically verified
                    image=oauth_user.avatar_url,
                )

            # Create OAuth account link
            account_data = AccountCreate(
                id=f"{provider}_{oauth_user.provider_user_id}",
                user_id=str(user.id),
                account_id=oauth_user.provider_user_id,
                provider_id=provider,
                access_token=oauth_user.token,
                access_token_expires_at=datetime.now(UTC) + timedelta(days=60),
            )
            await self._account_repo.create(account_data)

        # Create session
        session = await self._create_session(user.id, ip_address, user_agent)

        return session

    async def check_session(self, token: str) -> SessionUserResponse:
        """
        Validate session token and return user info.

        Args:
            token: Session token from Bearer authentication

        Returns:
            SessionUserResponse with user information if session is valid

        Raises:
            UnauthorizedError: If session is invalid or expired
        """
        session = await self._session_repo.get_by_token(token)
        if not session:
            raise UnauthorizedError("Invalid session token")

        # Check if session is expired
        if session.expires_at < datetime.now(UTC):
            # Delete expired session
            await self._session_repo.delete(session.id)
            raise UnauthorizedError("Session expired")

        # Load user
        # session.user_id is already a UUID from PostgreSQL, no need to convert
        user_id = (
            session.user_id if isinstance(session.user_id, UUID) else UUID(str(session.user_id))
        )
        user = await self._user_service.get_by_id(user_id)
        if not user:
            raise UnauthorizedError("User not found")

        return SessionUserResponse.model_validate(user)

    async def logout(self, token: str) -> None:
        """
        Logout user by deleting session.

        Args:
            token: Session token from Bearer authentication

        Raises:
            UnauthorizedError: If session is invalid
        """
        session = await self._session_repo.get_by_token(token)
        if not session:
            raise UnauthorizedError("Invalid session token")

        await self._session_repo.delete(session.id)

    async def device_flow_login(
        self,
        provider: str,
        access_token: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Session:
        """
        Handle device flow login by exchanging a provider access token for a session.

        Used by CLI to authenticate after completing GitHub Device Flow.

        Args:
            provider: OAuth provider name (github)
            access_token: Access token obtained from provider device flow
            ip_address: Client IP address for session tracking
            user_agent: Client user agent for session tracking

        Returns:
            Session model instance with relationship to user

        Raises:
            NotFoundError: If provider is not registered
            UnauthorizedError: If token is invalid or user info fetch fails
        """
        # Get OAuth provider
        oauth_provider = self._providers.get(provider)
        if not oauth_provider:
            raise NotFoundError(resource="OAuth provider", id=provider)

        # Fetch user info using the access token
        oauth_user = await oauth_provider.fetch_user_info(access_token)

        # Find or create account (same logic as oauth_login)
        account = await self._account_repo.get_by_provider(provider, oauth_user.provider_user_id)

        if account:
            # Existing account - login
            # account.user_id may be asyncpg UUID or Python UUID, convert safely
            user_id = account.user_id if isinstance(account.user_id, UUID) else UUID(str(account.user_id))
            user = await self._user_service.get_by_id(user_id)
            if not user:
                raise NotFoundError(resource="User", id=str(account.user_id))

            # Update OAuth tokens via repository
            await self._account_repo.update_oauth_tokens(
                account=account,
                access_token=oauth_user.token,
                access_token_expires_at=datetime.now(UTC) + timedelta(days=60),
            )

        else:
            # New account - register
            # Try to find existing user by email if provided
            user = None
            if oauth_user.email:
                user = await self._user_service.get_by_email(oauth_user.email)

            if not user:
                # Create new user
                # Generate unique username: prefer provider_username (GitHub login),
                # fall back to display_name transformation, then email prefix
                base_username = (
                    oauth_user.provider_username
                    if oauth_user.provider_username
                    else (
                        oauth_user.display_name.lower().replace(" ", "_")
                        if oauth_user.display_name
                        else oauth_user.email.split("@")[0]
                        if oauth_user.email
                        else f"{provider}_user"
                    )
                )
                # Clean username to only allow alphanumeric and underscore
                base_username = "".join(c if c.isalnum() or c == "_" else "" for c in base_username)
                if not base_username:
                    base_username = f"{provider}_user"
                username = base_username
                counter = 1
                while await self._user_service.get_by_username(username):
                    username = f"{base_username}{counter}"
                    counter += 1

                # Create user via service
                user = await self._user_service.create_oauth_user(
                    email=oauth_user.email or f"{oauth_user.provider_user_id}@{provider}.oauth",
                    username=username,
                    name=oauth_user.display_name,
                    email_verified=bool(oauth_user.email),
                    image=oauth_user.avatar_url,
                )

            # Create OAuth account link
            account_data = AccountCreate(
                id=f"{provider}_{oauth_user.provider_user_id}",
                user_id=str(user.id),
                account_id=oauth_user.provider_user_id,
                provider_id=provider,
                access_token=oauth_user.token,
                access_token_expires_at=datetime.now(UTC) + timedelta(days=60),
            )
            await self._account_repo.create(account_data)

        # Create session
        session = await self._create_session(user.id, ip_address, user_agent)

        return session

    async def _create_session(
        self, user_id: UUID, ip_address: str | None = None, user_agent: str | None = None
    ) -> Session:
        """
        Create a new session for user.

        Internal helper method for session creation.

        Args:
            user_id: User ID (UUID)
            ip_address: Client IP address for session tracking
            user_agent: Client user agent for session tracking

        Returns:
            Session model instance
        """
        session_id = self.generate_session_id()
        token = secrets.token_urlsafe(64)
        expires_at = datetime.now(UTC) + timedelta(days=30)

        session_data = SessionCreate(
            id=session_id,
            user_id=str(user_id),  # Convert UUID to string for Session model
            token=token,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        session = await self._session_repo.create(session_data)
        return session
