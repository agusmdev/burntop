# Burntop Backend - FastAPI

FastAPI backend for the Burntop gamified AI usage tracking platform. Built with async SQLAlchemy 2.0, PostgreSQL, and Python 3.12.

## Architecture

This backend follows a strict **3-layer architecture** pattern:

1. **Router Layer** (`router.py`) - HTTP request/response handling, validation, authentication
2. **Service Layer** (`service.py`) - Business logic, orchestration across repositories
3. **Repository Layer** (`repository.py`) - Database queries and persistence

```
┌─────────────────┐
│  FastAPI Router │  HTTP Layer (validation, auth, status codes)
└────────┬────────┘
         │
┌────────▼────────┐
│  Service Layer  │  Business Logic (orchestration, domain exceptions)
└────────┬────────┘
         │
┌────────▼────────┐
│ Repository Layer│  Data Access (SQLAlchemy queries)
└────────┬────────┘
         │
┌────────▼────────┐
│   PostgreSQL    │  Database
└─────────────────┘
```

## Project Structure

```
packages/backend/
├── src/app/
│   ├── achievement/          # Achievement and gamification
│   │   ├── models.py        # Achievement, UserAchievement SQLAlchemy models
│   │   ├── repository.py    # Data access layer
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   ├── service.py       # Business logic (unlock, tier progression)
│   │   ├── engine.py        # Achievement checking engine
│   │   └── router.py        # API endpoints
│   │
│   ├── activity/            # Activity feed
│   ├── auth/                # Authentication and sessions
│   │   ├── oauth/          # OAuth providers (GitHub)
│   │   ├── models.py       # Session, Account, Verification models
│   │   ├── service.py      # Auth logic (login, register, OAuth)
│   │   └── router.py       # /auth/* endpoints
│   │
│   ├── benchmark/           # Community benchmarks
│   ├── dashboard/           # Dashboard aggregations
│   ├── follow/              # User follows (social)
│   ├── health/              # Health check endpoint
│   ├── leaderboard/         # Leaderboard rankings
│   ├── notification/        # User notifications
│   ├── referral/            # Referral tracking
│   ├── streak/              # Streak tracking
│   ├── usage_record/        # Usage sync from CLI
│   │   ├── pricing.py      # Model pricing engine
│   │   └── service.py      # Sync logic (dedup, cost calc)
│   │
│   ├── user/                # User profiles
│   │
│   ├── api/v1/              # API router aggregation
│   │   └── router.py       # Combines all entity routers
│   │
│   ├── common/              # Shared implementations
│   │   └── postgres_repository.py  # Base PostgreSQL repository
│   │
│   ├── core/                # Core abstractions
│   │   ├── models.py       # Base model, UUIDMixin, TimestampMixin, SoftDeleteMixin
│   │   ├── repository.py   # AbstractRepository interface
│   │   ├── schemas.py      # Base Pydantic schemas
│   │   └── service.py      # BaseService
│   │
│   ├── middleware/          # Middleware
│   │   ├── correlation_id.py
│   │   ├── cors.py
│   │   └── rate_limit.py
│   │
│   ├── schemas/             # Shared schemas
│   │   └── error.py        # Error response schemas
│   │
│   ├── tasks/               # Background tasks (APScheduler)
│   │   ├── leaderboard.py  # Hourly leaderboard cache update
│   │   ├── benchmarks.py   # Community benchmark calculation
│   │   ├── streak_risk.py  # Streak risk notifications
│   │   └── weekly_summary.py
│   │
│   ├── config.py            # Pydantic settings (DATABASE_URL, secrets)
│   ├── database.py          # Async SQLAlchemy engine and session
│   ├── dependencies.py      # Shared dependencies (get_db)
│   ├── exceptions.py        # Custom exceptions (NotFoundError, ConflictError, etc.)
│   ├── exception_handlers.py # Global exception handlers
│   ├── logging.py           # Structured logging with correlation IDs
│   └── main.py              # FastAPI app factory
│
├── alembic/                 # Database migrations
│   ├── versions/           # Migration scripts
│   └── env.py              # Alembic async configuration
│
├── tests/                   # Test suite (pytest-asyncio)
│   ├── unit/               # Unit tests (pricing, streak logic, achievements)
│   ├── integration/        # Integration tests (API endpoints)
│   ├── factories/          # Test data factories (factory-boy)
│   └── conftest.py         # Test fixtures and configuration
│
├── .env.example             # Environment variables template
├── alembic.ini              # Alembic configuration
├── pyproject.toml           # Python dependencies (uv)
├── ruff.toml                # Linting and formatting configuration
└── uv.lock                  # Dependency lock file
```

## Setup

### Prerequisites

- Python 3.12+
- PostgreSQL 14+
- [uv](https://github.com/astral-sh/uv) - Python package manager
- Docker (optional, for local PostgreSQL)

### 1. Clone Repository

```bash
git clone <repository-url>
cd burntop/packages/backend
```

### 2. Install Dependencies

This project uses `uv` for dependency management:

```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync
```

### 3. Database Setup

#### Option A: Docker (Recommended for Development)

Start PostgreSQL container from project root:

```bash
cd ../..  # Navigate to project root
docker compose up -d
```

This creates a PostgreSQL database with:

- Host: `localhost:5432`
- Database: `burntop`
- Username: `burntop`
- Password: `burntop_dev_password`

#### Option B: Local PostgreSQL

Install PostgreSQL and create a database:

```bash
createdb burntop
```

### 4. Configure Environment

Copy the example environment file and update values:

```bash
cp .env.example .env
```

Edit `.env` and set:

```bash
# Required
DATABASE_URL=postgresql+asyncpg://burntop:burntop_dev_password@localhost:5432/burntop
SECRET_KEY=<generate-random-32+-character-string>

# Optional (for OAuth)
GITHUB_CLIENT_ID=<your-github-oauth-app-client-id>
GITHUB_CLIENT_SECRET=<your-github-oauth-app-secret>
```

Generate a secure SECRET_KEY:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 5. Run Migrations

Apply database schema using Alembic:

```bash
uv run alembic upgrade head
```

Verify tables were created:

```bash
psql -h localhost -U burntop -d burntop -c "\dt"
```

## Development

### Running the Server

Start the FastAPI development server:

```bash
uv run uvicorn src.app.main:app --reload
```

The API will be available at:

- API: http://localhost:8000
- OpenAPI Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Development Commands

```bash
# Start dev server with auto-reload
uv run uvicorn src.app.main:app --reload

# Start dev server on specific host/port
uv run uvicorn src.app.main:app --host 0.0.0.0 --port 8080 --reload

# Run linter
uv run ruff check src/

# Auto-fix linting issues
uv run ruff check src/ --fix

# Format code
uv run ruff format src/

# Type check (optional)
uv run mypy src/
```

### Database Migrations

```bash
# Generate new migration (auto-detect model changes)
uv run alembic revision --autogenerate -m "description of changes"

# Apply migrations
uv run alembic upgrade head

# Rollback one migration
uv run alembic downgrade -1

# View current migration
uv run alembic current

# View migration history
uv run alembic history
```

## Testing

### Running Tests

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov

# Run specific test file
uv run pytest tests/unit/test_pricing.py

# Run integration tests only
uv run pytest tests/integration/

# Run unit tests only
uv run pytest tests/unit/

# Verbose output
uv run pytest -v

# Show print statements
uv run pytest -s
```

### Test Coverage

Current test coverage: **75.5%** (176/233 tests passing)

Generate HTML coverage report:

```bash
uv run pytest --cov --cov-report=html
open htmlcov/index.html
```

### Test Structure

```
tests/
├── conftest.py              # Shared fixtures (test DB, async session, client)
├── unit/
│   ├── test_pricing.py      # Pricing engine tests
│   ├── test_streak_logic.py # Streak calculation tests
│   └── test_achievement_engine.py
├── integration/
│   ├── test_auth.py         # Auth endpoints (/register, /login, /logout, /me)
│   ├── test_users.py        # User endpoints
│   ├── test_sync.py         # Sync endpoint
│   ├── test_dashboard.py    # Dashboard endpoints
│   └── test_leaderboard.py  # Leaderboard endpoints
└── factories/               # Test data factories using factory-boy
```

## API Endpoints

All API endpoints are prefixed with `/api/v1`:

### Authentication (`/api/v1/auth`)

- `POST /register` - Register new user with email/password
- `POST /login` - Login with email/password (returns session token)
- `POST /logout` - Logout (invalidate session)
- `GET /me` - Get current authenticated user
- `GET /oauth/{provider}` - Initiate OAuth flow (GitHub)
- `GET /oauth/{provider}/callback` - OAuth callback handler

### Users (`/api/v1/users`)

- `GET /{username}` - Get user profile (public or full based on auth)
- `PATCH /me` - Update own profile
- `GET /{username}/stats` - Get user statistics
- `GET /{username}/level` - Get user level and XP
- `POST /{username}/follow` - Follow user
- `DELETE /{username}/follow` - Unfollow user
- `GET /{username}/followers` - Get followers list
- `GET /{username}/following` - Get following list

### Sync (`/api/v1/sync`)

- `POST /sync` - Sync usage records from CLI client

### Dashboard (`/api/v1/dashboard`)

- `GET /overview` - Dashboard overview statistics
- `GET /trends` - Usage trends over time
- `GET /tools` - Tool usage breakdown
- `GET /models` - Model usage breakdown

### Leaderboard (`/api/v1/leaderboard`)

- `GET /` - Get leaderboard rankings (supports filters)

### Other Endpoints

- Achievements: `/api/v1/achievements`
- Notifications: `/api/v1/notifications`
- Feed: `/api/v1/feed`
- Insights: `/api/v1/insights`
- Referrals: `/api/v1/referrals`
- Health: `/api/v1/health`

## Authentication

The API uses **session-based authentication** with Bearer tokens:

1. User registers (`POST /auth/register`) or logs in (`POST /auth/login`)
2. Server returns session token in response
3. Client stores token (localStorage, secure cookie, etc.)
4. Client sends token in Authorization header: `Authorization: Bearer <session_token>`
5. Server validates token via `get_current_user` dependency
6. Sessions expire after 30 days

### Example Authentication Flow

```bash
# Register new user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "username": "johndoe",
    "name": "John Doe"
  }'

# Response: { "token": "s_abc123...", "expires_at": "..." }

# Use token for authenticated requests
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer s_abc123..."
```

## Code Style

### Python Style Guide

- **Python version**: 3.12+
- **Linter/Formatter**: Ruff (configured in `ruff.toml`)
- **Type hints**: Required for all function signatures
- **Async**: All database operations use async/await
- **Imports**: stdlib → third-party → local (auto-sorted by ruff)

### Naming Conventions

| Element             | Convention             | Example                      |
| ------------------- | ---------------------- | ---------------------------- |
| Files               | `snake_case.py`        | `user_service.py`            |
| Classes             | `PascalCase`           | `UserService`                |
| Functions/Variables | `snake_case`           | `get_user_by_id`             |
| Constants           | `SCREAMING_SNAKE_CASE` | `MAX_SESSIONS`               |
| Database tables     | `snake_case` (plural)  | `users`, `usage_records`     |
| Database columns    | `snake_case`           | `display_name`, `created_at` |

### SQLAlchemy 2.0 Patterns

```python
from sqlalchemy.orm import Mapped, mapped_column
from app.core import Base, UUIDMixin, TimestampMixin

class User(UUIDMixin, TimestampMixin, Base):
    """User model with profile and gamification fields."""

    username: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    level: Mapped[int] = mapped_column(Integer, default=1)
```

### Repository Pattern

```python
class UserRepository(PostgresRepository[User, UserCreate, UserUpdate]):
    """User repository with custom query methods."""

    async def get_by_username(self, username: str) -> User | None:
        """Get user by username."""
        return await self.get_by_field("username", username)
```

### Service Pattern

```python
class UserService(BaseService[User, UserCreate, UserUpdate]):
    """User service with business logic."""

    async def get_by_username_or_raise(self, username: str) -> User:
        """Get user or raise NotFoundError."""
        user = await self.repository.get_by_username(username)
        if not user:
            raise NotFoundError(resource="User", id=username)
        return user
```

### Router Pattern

```python
@router.get("/{username}", response_model=UserResponse)
async def get_user_profile(
    username: str,
    service: Annotated[UserService, Depends(get_user_service)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)],
) -> UserResponse:
    """Get user profile by username."""
    user = await service.get_by_username_or_raise(username)
    return UserResponse.model_validate(user)
```

## Background Tasks

Background tasks run via APScheduler:

- **Leaderboard cache update** - Hourly (compute rankings for all leaderboard types)
- **Community benchmarks** - Hourly (calculate avg tokens, cost, streak, etc.)
- **Streak risk notifications** - Hourly (notify users at risk of losing streak)
- **Weekly summary** - Monday 9 AM (send weekly usage summary to users)

Background tasks are started/stopped via app lifespan:

```python
# src/app/main.py
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    start_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()
```

## Common Issues

### Database Connection Errors

**Problem**: `asyncpg.exceptions.InvalidCatalogNameError: database "burntop" does not exist`

**Solution**: Create the database first:

```bash
# If using Docker
docker compose up -d

# If using local PostgreSQL
createdb burntop
```

### Alembic Migration Conflicts

**Problem**: Alembic detects changes but migration fails with "relation already exists"

**Solution**: Reset database and regenerate migrations:

```bash
# Drop and recreate database
dropdb burntop
createdb burntop

# Delete migration files
rm alembic/versions/*.py

# Regenerate initial migration
uv run alembic revision --autogenerate -m "initial"
uv run alembic upgrade head
```

### Import Errors

**Problem**: `ModuleNotFoundError: No module named 'app'`

**Solution**: Always run commands with `uv run`:

```bash
# Wrong
python -m pytest

# Correct
uv run pytest
```

### Test Database Issues

**Problem**: Tests fail with database connection errors

**Solution**: Ensure test database exists and is configured in `.env`:

```bash
# Create test database
createdb burntop_test

# Set in .env
TEST_DATABASE_URL=postgresql+asyncpg://burntop:burntop_dev_password@localhost:5432/burntop_test
```

## Deployment

### Environment Variables

Required environment variables for production:

```bash
# Application
APP_NAME=Burntop API
DEBUG=false
SECRET_KEY=<strong-random-secret-32+-chars>

# Database
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/burntop
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20

# Logging
LOG_LEVEL=INFO
LOG_JSON_FORMAT=true

# Frontend
FRONTEND_URL=https://burntop.dev

# CORS
CORS_ORIGINS=["https://burntop.dev"]

# OAuth (optional)
GITHUB_CLIENT_ID=<production-github-oauth-client-id>
GITHUB_CLIENT_SECRET=<production-github-oauth-secret>
```

### Production Deployment Notes

1. **Use production ASGI server**: Gunicorn with Uvicorn workers

   ```bash
   gunicorn src.app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

2. **Run migrations before deployment**:

   ```bash
   uv run alembic upgrade head
   ```

3. **Set DEBUG=false** to disable detailed error messages

4. **Use strong SECRET_KEY** (32+ characters, random)

5. **Configure connection pooling** for database (pool_size, max_overflow)

6. **Enable JSON logging** (LOG_JSON_FORMAT=true) for structured logs

7. **Set up monitoring** for `/api/v1/health` endpoint

8. **Configure CORS** to only allow production frontend domain

## Contributing

When adding new entities:

1. Create model in `src/app/{entity}/models.py`
2. Generate migration: `uv run alembic revision --autogenerate -m "add {entity}"`
3. Apply migration: `uv run alembic upgrade head`
4. Create Pydantic schemas in `src/app/{entity}/schemas.py`
5. Create repository in `src/app/{entity}/repository.py`
6. Create service in `src/app/{entity}/service.py`
7. Create router in `src/app/{entity}/router.py`
8. Register router in `src/app/api/v1/router.py`
9. Write tests in `tests/unit/` and `tests/integration/`
10. Regenerate frontend API client: `cd ../frontend && bun run generate:api`

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/en/20/)
- [Pydantic v2 Documentation](https://docs.pydantic.dev/latest/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [Ruff Linter Documentation](https://docs.astral.sh/ruff/)

## License

See LICENSE file in project root.
