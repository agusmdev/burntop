"""
GitHub OAuth provider implementation.

Implements OAuth 2.0 authorization flow for GitHub authentication.
See: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
"""

from urllib.parse import urlencode

import httpx

from app.auth.schemas import OAuthUser
from app.config import Settings
from app.exceptions import UnauthorizedError


class GitHubOAuth:
    """
    GitHub OAuth provider.

    Handles OAuth 2.0 authorization flow:
    1. Generate authorization URL
    2. Exchange authorization code for access token
    3. Fetch user information from GitHub API
    """

    AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
    TOKEN_URL = "https://github.com/login/oauth/access_token"
    USER_API_URL = "https://api.github.com/user"
    EMAIL_API_URL = "https://api.github.com/user/emails"

    def __init__(self, settings: Settings):
        """
        Initialize GitHub OAuth provider.

        Args:
            settings: Application settings with GitHub OAuth credentials
        """
        self.settings = settings
        self.client_id = settings.github_client_id
        self.client_secret = settings.github_client_secret

    def get_authorization_url(self, redirect_uri: str, state: str | None = None) -> str:
        """
        Generate GitHub OAuth authorization URL.

        Args:
            redirect_uri: Callback URL after authorization
            state: CSRF protection token (optional)

        Returns:
            Authorization URL to redirect user to

        Example:
            >>> provider = GitHubOAuth(settings)
            >>> url = provider.get_authorization_url(
            ...     redirect_uri="https://api.example.com/auth/github/callback",
            ...     state="random_state_token",
            ... )
            >>> # Redirect user to url
        """
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": "user:email",  # Request email scope
        }
        if state:
            params["state"] = state

        return f"{self.AUTHORIZE_URL}?{urlencode(params)}"

    async def callback(
        self, code: str, redirect_uri: str, _code_verifier: str | None = None
    ) -> OAuthUser:
        """
        Handle OAuth callback and fetch user information.

        This method:
        1. Exchanges authorization code for access token
        2. Fetches user information from GitHub API
        3. Returns standardized OAuthUser object

        Args:
            code: Authorization code from GitHub callback
            redirect_uri: Same redirect URI used in authorization
            _code_verifier: PKCE code verifier (not used by GitHub, kept for API consistency)

        Returns:
            OAuthUser with GitHub user information

        Raises:
            UnauthorizedError: If token exchange fails or API requests fail
        """
        # Step 1: Exchange code for access token
        access_token = await self._exchange_code_for_token(code, redirect_uri)

        # Step 2: Fetch user information
        return await self.fetch_user_info(access_token)

    async def _exchange_code_for_token(self, code: str, redirect_uri: str) -> str:
        """
        Exchange authorization code for access token.

        Args:
            code: Authorization code from GitHub
            redirect_uri: Same redirect URI used in authorization

        Returns:
            Access token

        Raises:
            UnauthorizedError: If token exchange fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json"},
            )

            if response.status_code != 200:
                raise UnauthorizedError(message="GitHub OAuth token exchange failed")

            data = response.json()

            if "error" in data:
                raise UnauthorizedError(
                    message=f"GitHub OAuth error: {data.get('error_description', data['error'])}"
                )

            access_token = data.get("access_token")
            if not access_token:
                raise UnauthorizedError(message="GitHub OAuth did not return access token")

            return access_token

    async def fetch_user_info(self, access_token: str) -> OAuthUser:
        """
        Fetch user information from GitHub API.

        Args:
            access_token: GitHub access token

        Returns:
            OAuthUser with GitHub user information

        Raises:
            UnauthorizedError: If API request fails
        """
        async with httpx.AsyncClient() as client:
            # Fetch user profile
            user_response = await client.get(
                self.USER_API_URL,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )

            if user_response.status_code != 200:
                raise UnauthorizedError(message="Failed to fetch GitHub user information")

            user_data = user_response.json()

            # Fetch primary email (user:email scope required)
            email = user_data.get("email")  # May be None if email is private
            if not email:
                email = await self._fetch_primary_email(access_token)

            return OAuthUser(
                token=access_token,
                email=email,
                display_name=user_data.get("name") or user_data["login"],
                avatar_url=user_data.get("avatar_url"),
                provider_user_id=str(user_data["id"]),
                provider_username=user_data["login"],
            )

    async def _fetch_primary_email(self, access_token: str) -> str | None:
        """
        Fetch user's primary email from GitHub API.

        GitHub users can hide their email on their profile.
        This fetches the primary verified email from the emails endpoint.

        Args:
            access_token: GitHub access token

        Returns:
            Primary verified email or None if not available
        """
        async with httpx.AsyncClient() as client:
            email_response = await client.get(
                self.EMAIL_API_URL,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )

            if email_response.status_code != 200:
                return None

            emails = email_response.json()

            # Find primary verified email
            for email_obj in emails:
                if email_obj.get("primary") and email_obj.get("verified"):
                    return email_obj["email"]

            # Fallback to first verified email
            for email_obj in emails:
                if email_obj.get("verified"):
                    return email_obj["email"]

            return None
