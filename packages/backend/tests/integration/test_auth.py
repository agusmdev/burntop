"""Integration tests for authentication endpoints.

Tests cover:
- POST /api/v1/auth/register - User registration
- POST /api/v1/auth/login - User authentication
- POST /api/v1/auth/logout - Session invalidation
- GET /api/v1/auth/me - Current user information
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestRegister:
    """Test cases for POST /api/v1/auth/register endpoint."""

    async def test_register_success(
        self,
        client: AsyncClient,
        sample_user_data: dict,
    ):
        """Test successful user registration."""
        response = await client.post("/api/v1/auth/register", json=sample_user_data)

        assert response.status_code == 201
        data = response.json()

        # Verify session response structure
        assert "id" in data
        assert "token" in data
        assert "expires_at" in data
        assert "created_at" in data

        # Verify session ID format (s_<64 chars>)
        assert data["id"].startswith("s_")
        assert len(data["id"]) == 66  # s_ + 64 chars

        # Verify token is present and is a string
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0

    async def test_register_duplicate_email(
        self,
        client: AsyncClient,
        sample_user_data: dict,
    ):
        """Test registration with duplicate email returns 409 Conflict."""
        # Register first user
        response1 = await client.post("/api/v1/auth/register", json=sample_user_data)
        assert response1.status_code == 201

        # Attempt to register with same email
        response2 = await client.post("/api/v1/auth/register", json=sample_user_data)
        assert response2.status_code == 409

        # Verify error response structure
        data = response2.json()
        assert "detail" in data
        assert "email" in data["detail"].lower()

    async def test_register_duplicate_username(
        self,
        client: AsyncClient,
        sample_user_data: dict,
    ):
        """Test registration with duplicate username returns 409 Conflict."""
        # Register first user
        response1 = await client.post("/api/v1/auth/register", json=sample_user_data)
        assert response1.status_code == 201

        # Attempt to register with same username but different email
        duplicate_username_data = {
            **sample_user_data,
            "email": "different@example.com",
        }
        response2 = await client.post(
            "/api/v1/auth/register", json=duplicate_username_data
        )
        assert response2.status_code == 409

        # Verify error response structure
        data = response2.json()
        assert "detail" in data
        assert "username" in data["detail"].lower()

    async def test_register_invalid_email(
        self,
        client: AsyncClient,
        sample_user_data: dict,
    ):
        """Test registration with invalid email format returns 422 Validation Error."""
        invalid_data = {**sample_user_data, "email": "not-an-email"}
        response = await client.post("/api/v1/auth/register", json=invalid_data)

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    async def test_register_short_password(
        self,
        client: AsyncClient,
        sample_user_data: dict,
    ):
        """Test registration with password < 8 chars returns 422 Validation Error."""
        invalid_data = {**sample_user_data, "password": "short"}
        response = await client.post("/api/v1/auth/register", json=invalid_data)

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    async def test_register_invalid_username(
        self,
        client: AsyncClient,
        sample_user_data: dict,
    ):
        """Test registration with invalid username pattern returns 422."""
        # Username with spaces
        invalid_data = {**sample_user_data, "username": "test user"}
        response = await client.post("/api/v1/auth/register", json=invalid_data)
        assert response.status_code == 422

        # Username with special characters
        invalid_data = {**sample_user_data, "username": "test@user"}
        response = await client.post("/api/v1/auth/register", json=invalid_data)
        assert response.status_code == 422

    async def test_register_missing_required_fields(
        self,
        client: AsyncClient,
    ):
        """Test registration with missing required fields returns 422."""
        # Missing email
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "testuser",
                "password": "testpassword123",
            },
        )
        assert response.status_code == 422

        # Missing username
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "testpassword123",
            },
        )
        assert response.status_code == 422

        # Missing password
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "username": "testuser",
            },
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestLogin:
    """Test cases for POST /api/v1/auth/login endpoint."""

    async def test_login_success(
        self,
        client: AsyncClient,
        sample_user_data: dict,
        sample_login_data: dict,
    ):
        """Test successful user login."""
        # Register user first
        await client.post("/api/v1/auth/register", json=sample_user_data)

        # Login with correct credentials
        response = await client.post("/api/v1/auth/login", json=sample_login_data)

        assert response.status_code == 200
        data = response.json()

        # Verify session response structure
        assert "id" in data
        assert "token" in data
        assert "user_id" in data
        assert "expires_at" in data

        # Verify session ID format
        assert data["id"].startswith("s_")
        assert len(data["id"]) == 66

    async def test_login_invalid_password(
        self,
        client: AsyncClient,
        sample_user_data: dict,
    ):
        """Test login with incorrect password returns 401 Unauthorized."""
        # Register user first
        await client.post("/api/v1/auth/register", json=sample_user_data)

        # Attempt login with wrong password
        invalid_login = {
            "email": sample_user_data["email"],
            "password": "wrongpassword",
        }
        response = await client.post("/api/v1/auth/login", json=invalid_login)

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    async def test_login_nonexistent_user(
        self,
        client: AsyncClient,
    ):
        """Test login with non-existent email returns 401 Unauthorized."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "somepassword123",
        }
        response = await client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    async def test_login_invalid_email_format(
        self,
        client: AsyncClient,
    ):
        """Test login with invalid email format returns 422 Validation Error."""
        invalid_login = {
            "email": "not-an-email",
            "password": "testpassword123",
        }
        response = await client.post("/api/v1/auth/login", json=invalid_login)

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    async def test_login_missing_credentials(
        self,
        client: AsyncClient,
    ):
        """Test login with missing credentials returns 422 Validation Error."""
        # Missing password
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com"},
        )
        assert response.status_code == 422

        # Missing email
        response = await client.post(
            "/api/v1/auth/login",
            json={"password": "testpassword123"},
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestLogout:
    """Test cases for POST /api/v1/auth/logout endpoint."""

    async def test_logout_success(
        self,
        client: AsyncClient,
        authenticated_user: dict,
    ):
        """Test successful logout."""
        token = authenticated_user["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Logout
        response = await client.post("/api/v1/auth/logout", headers=headers)
        assert response.status_code == 204

        # Verify token no longer works
        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401

    async def test_logout_without_token(
        self,
        client: AsyncClient,
    ):
        """Test logout without authentication returns 401 Unauthorized."""
        response = await client.post("/api/v1/auth/logout")
        assert response.status_code == 401

    async def test_logout_invalid_token(
        self,
        client: AsyncClient,
    ):
        """Test logout with invalid token returns 401 Unauthorized."""
        headers = {"Authorization": "Bearer invalid_token_12345"}
        response = await client.post("/api/v1/auth/logout", headers=headers)
        assert response.status_code == 401


@pytest.mark.asyncio
class TestGetMe:
    """Test cases for GET /api/v1/auth/me endpoint."""

    async def test_get_me_success(
        self,
        client: AsyncClient,
        authenticated_user: dict,
        sample_user_data: dict,
    ):
        """Test retrieving current user information."""
        token = authenticated_user["token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200

        data = response.json()

        # Verify user data structure
        assert data["email"] == sample_user_data["email"]
        assert data["username"] == sample_user_data["username"]
        assert data["name"] == sample_user_data["name"]
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
        assert "is_public" in data

        # Verify password is not exposed
        assert "password" not in data
        assert "password_hash" not in data

    async def test_get_me_without_token(
        self,
        client: AsyncClient,
    ):
        """Test /me without authentication returns 401 Unauthorized."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    async def test_get_me_invalid_token(
        self,
        client: AsyncClient,
    ):
        """Test /me with invalid token returns 401 Unauthorized."""
        headers = {"Authorization": "Bearer invalid_token_12345"}
        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401

    async def test_get_me_expired_session(
        self,
        client: AsyncClient,
        authenticated_user: dict,
    ):
        """Test /me after logout returns 401 Unauthorized."""
        token = authenticated_user["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Logout to invalidate session
        await client.post("/api/v1/auth/logout", headers=headers)

        # Attempt to access /me with invalidated token
        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401


@pytest.mark.asyncio
class TestAuthFlow:
    """Integration tests for complete authentication flows."""

    async def test_register_login_logout_flow(
        self,
        client: AsyncClient,
        sample_user_data: dict,
        sample_login_data: dict,
    ):
        """Test complete auth flow: register -> login -> access protected route -> logout."""
        # 1. Register
        register_response = await client.post(
            "/api/v1/auth/register", json=sample_user_data
        )
        assert register_response.status_code == 201
        register_token = register_response.json()["token"]

        # 2. Access /me with registration token
        headers = {"Authorization": f"Bearer {register_token}"}
        me_response = await client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200
        assert me_response.json()["email"] == sample_user_data["email"]

        # 3. Logout
        logout_response = await client.post("/api/v1/auth/logout", headers=headers)
        assert logout_response.status_code == 204

        # 4. Verify token is invalidated
        me_response = await client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 401

        # 5. Login with credentials
        login_response = await client.post("/api/v1/auth/login", json=sample_login_data)
        assert login_response.status_code == 200
        login_token = login_response.json()["token"]

        # 6. Access /me with new login token
        headers = {"Authorization": f"Bearer {login_token}"}
        me_response = await client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200
        assert me_response.json()["email"] == sample_user_data["email"]

    async def test_multiple_sessions(
        self,
        client: AsyncClient,
        sample_user_data: dict,
        sample_login_data: dict,
    ):
        """Test user can have multiple active sessions."""
        # Register user
        await client.post("/api/v1/auth/register", json=sample_user_data)

        # Login twice to create two sessions
        login1 = await client.post("/api/v1/auth/login", json=sample_login_data)
        assert login1.status_code == 200
        token1 = login1.json()["token"]

        login2 = await client.post("/api/v1/auth/login", json=sample_login_data)
        assert login2.status_code == 200
        token2 = login2.json()["token"]

        # Both tokens should be different
        assert token1 != token2

        # Both tokens should work
        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}

        response1 = await client.get("/api/v1/auth/me", headers=headers1)
        assert response1.status_code == 200

        response2 = await client.get("/api/v1/auth/me", headers=headers2)
        assert response2.status_code == 200

        # Logout from first session
        await client.post("/api/v1/auth/logout", headers=headers1)

        # First token should be invalid
        response1 = await client.get("/api/v1/auth/me", headers=headers1)
        assert response1.status_code == 401

        # Second token should still work
        response2 = await client.get("/api/v1/auth/me", headers=headers2)
        assert response2.status_code == 200
