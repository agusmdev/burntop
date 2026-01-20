"""Pytest configuration and fixtures for FastAPI testing.

This module provides test fixtures for:
- Test database setup using Testcontainers (PostgreSQL)
- Async database sessions for test isolation
- HTTP client for API testing with dependency injection
- Sample data fixtures for common test scenarios
"""

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool
from testcontainers.postgres import PostgresContainer

from app.core.models import Base
from app.dependencies import get_db
from app.main import create_app

# Global container and engine references for session-scoped usage
_postgres_container: PostgresContainer | None = None
_test_engine = None
_test_async_session_factory = None


def get_asyncpg_url(container: PostgresContainer) -> str:
    """Convert psycopg2 connection URL to asyncpg URL."""
    # testcontainers returns psycopg2 URL, we need asyncpg
    url = container.get_connection_url()
    return url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")


@pytest.fixture(scope="session")
def postgres_container():
    """
    Provide a PostgreSQL container for the test session.

    Starts a PostgreSQL container using Testcontainers that runs
    for the duration of the test session. The container is automatically
    cleaned up when tests complete.

    Yields:
        PostgresContainer: Running PostgreSQL container instance
    """
    global _postgres_container

    with PostgresContainer(
        image="postgres:16-alpine",
        username="test_user",
        password="test_password",
        dbname="test_db",
    ) as container:
        _postgres_container = container
        yield container


@pytest.fixture(scope="session")
def test_engine(postgres_container):
    """
    Create SQLAlchemy async engine connected to Testcontainers PostgreSQL.

    Args:
        postgres_container: Running PostgreSQL container

    Returns:
        AsyncEngine: SQLAlchemy async engine for test database
    """
    global _test_engine

    database_url = get_asyncpg_url(postgres_container)

    _test_engine = create_async_engine(
        database_url,
        echo=False,
        poolclass=NullPool,  # No connection pooling for tests
    )

    return _test_engine


@pytest.fixture(scope="session")
def test_session_factory(test_engine):
    """
    Create async session factory for tests.

    Args:
        test_engine: SQLAlchemy async engine

    Returns:
        async_sessionmaker: Factory for creating test database sessions
    """
    global _test_async_session_factory

    _test_async_session_factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    return _test_async_session_factory


@pytest.fixture(scope="session", autouse=True)
def setup_test_database(test_engine, test_session_factory):
    """
    Set up the test database schema.

    Creates all tables before tests run and drops them after.
    Runs once per test session for performance.

    This fixture imports all models to ensure they're registered with Base.metadata,
    then creates/drops tables using the async engine.

    Args:
        test_engine: SQLAlchemy async engine (ensures container is started first)
        test_session_factory: Session factory (ensures it's created)
    """
    import asyncio

    # Import all models to ensure they're registered
    from app.activity.models import Activity  # noqa: F401
    from app.auth.models import Account, Session, Verification  # noqa: F401
    from app.benchmark.models import CommunityBenchmark  # noqa: F401
    from app.follow.models import Follow  # noqa: F401
    from app.leaderboard.models import LeaderboardCache  # noqa: F401
    from app.streak.models import Streak  # noqa: F401
    from app.usage_record.models import UsageRecord  # noqa: F401
    from app.user.models import User  # noqa: F401

    # Create event loop for setup
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    # Create all tables
    async def create_tables():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

    loop.run_until_complete(create_tables())

    yield

    # Drop all tables after tests complete
    async def drop_tables():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await test_engine.dispose()

    loop.run_until_complete(drop_tables())
    loop.close()


@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Provide a database session for a single test.

    Each test gets its own session with automatic rollback.
    This ensures test isolation - changes made in one test don't affect others.

    The session is created from the test session factory and rolled back
    after the test completes, even if the test commits transactions.

    Uses nested transactions (savepoints) to ensure all changes are rolled back,
    including explicit commits in test code.

    Args:
        test_engine: SQLAlchemy async engine

    Yields:
        AsyncSession: Database session for the test
    """
    connection = await test_engine.connect()
    transaction = await connection.begin()
    session = AsyncSession(bind=connection, expire_on_commit=False)

    yield session

    # Clean up session and connection aggressively to prevent event loop issues
    try:
        await session.close()
    except Exception:
        pass  # Ignore errors during cleanup

    try:
        await transaction.rollback()
    except Exception:
        pass  # Ignore errors during rollback

    try:
        await connection.close()
    except Exception:
        pass  # Ignore errors during connection close


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Provide an async HTTP client for testing API endpoints.

    Overrides the database dependency to use the test session.
    This ensures all database operations during API tests use the
    test database and benefit from transaction rollback.

    The client is configured with:
    - Test app instance (fresh app, no shared state)
    - Base URL set to http://test
    - Database dependency overridden to use test session

    Args:
        db_session: Test database session (injected by pytest)

    Yields:
        AsyncClient: HTTP client for testing API endpoints
    """
    # Create app instance
    app = create_app()

    # Override the database dependency to use test session
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Create async client with ASGI transport
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    # Clear dependency overrides and ensure session is cleaned up
    app.dependency_overrides.clear()

    # Ensure all pending database operations are completed
    try:
        await db_session.flush()
    except Exception:
        pass  # Ignore errors during cleanup


# Sample data fixtures for common test scenarios


@pytest.fixture
def faker():
    """Provide Faker instance for generating test data."""
    from faker import Faker
    return Faker()


@pytest.fixture
def sample_user_data(faker) -> dict:
    """
    Provide sample data for creating a user.

    Returns:
        dict: User creation data with email, username, password, name
    """
    # Use faker to generate unique emails/usernames to avoid conflicts
    return {
        "email": faker.email(),
        "username": faker.user_name()[:30],
        "password": "testpassword123",
        "name": faker.name(),
    }


@pytest.fixture
def sample_login_data(sample_user_data) -> dict:
    """
    Provide sample data for user login.
    
    This fixture creates login credentials that match the sample_user_data,
    so tests can register a user and then log in with matching credentials.

    Returns:
        dict: Login credentials with email and password matching sample_user_data
    """
    return {
        "email": sample_user_data["email"],
        "password": sample_user_data["password"],
    }


@pytest_asyncio.fixture
async def authenticated_user(
    client: AsyncClient,
    sample_user_data: dict,
) -> dict:
    """
    Create a user and return the registration response.

    This fixture:
    - Registers a new user via POST /api/v1/auth/register
    - Returns the response data including session token

    Args:
        client: HTTP client for API requests
        sample_user_data: User registration data

    Returns:
        dict: User registration response with session token
    """
    response = await client.post("/api/v1/auth/register", json=sample_user_data)
    assert response.status_code == 201
    return response.json()


@pytest_asyncio.fixture
async def auth_headers(authenticated_user: dict) -> dict:
    """
    Provide authorization headers for authenticated requests.

    Args:
        authenticated_user: Authenticated user data with token

    Returns:
        dict: Headers with Bearer token authorization
    """
    token = authenticated_user["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def authenticated_client(
    client: AsyncClient,
    authenticated_user: dict,
) -> tuple[AsyncClient, dict]:
    """
    Provide an authenticated HTTP client and full user data.

    This fixture combines the HTTP client with authentication data,
    automatically setting the Authorization header for all requests.
    
    After registration, it fetches the full user profile via GET /api/v1/auth/me
    to ensure tests have access to all user fields (email, username, etc.).

    Args:
        client: HTTP client for API requests
        authenticated_user: Authenticated user data with session token

    Returns:
        tuple: (AsyncClient with auth headers, user data dict with full profile)
    """
    token = authenticated_user["token"]
    client.headers.update({"Authorization": f"Bearer {token}"})

    # Fetch full user profile via /me endpoint
    me_response = await client.get("/api/v1/auth/me")
    assert me_response.status_code == 200
    user_data = me_response.json()

    # Add token to user data for tests that need it
    user_data["token"] = token

    return client, user_data
