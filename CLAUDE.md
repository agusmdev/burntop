# AGENTS.md - burntop.dev

> Guidelines for AI coding agents working in this repository.

## Project Overview

Gamified AI usage tracking platform. Monorepo with bun (frontend/CLI) and uv (backend) workspaces:

- `packages/backend` - FastAPI backend with async SQLAlchemy 2.0
- `packages/frontend` - TanStack Start web application (client-side only, no server functions)
- `packages/cli` - CLI tool for syncing usage data to FastAPI backend

## Build & Development Commands

```bash
# Install dependencies
bun install

# Development
bun dev                      # Start all packages in dev mode
bun --filter web dev         # Start web app only
bun --filter cli dev         # Start CLI in watch mode

# Building
bun run build                # Build all packages
bun --filter web build       # Build web app only

# Linting & Formatting
bun lint                     # Run ESLint across all packages
bun lint:fix                 # Fix auto-fixable lint issues
bun format                   # Format with Prettier
bun typecheck                # Run TypeScript type checking

# Testing - Frontend
cd packages/frontend && npx vitest run       # Run frontend tests
cd packages/frontend && npx vitest --watch   # Watch mode
cd packages/frontend && npx vitest run path/to/file.test.ts  # Run single test file

# Testing - Backend
cd packages/backend && uv run pytest                  # Run all backend tests
cd packages/backend && uv run pytest tests/unit/      # Run unit tests only
cd packages/backend && uv run pytest tests/integration/ # Run integration tests only
cd packages/backend && uv run pytest --cov            # Run with coverage
cd packages/backend && uv run pytest -v               # Verbose output

# Database (in packages/backend)
cd packages/backend && uv run alembic revision --autogenerate -m "description"  # Generate migration
cd packages/backend && uv run alembic upgrade head    # Run migrations
cd packages/backend && uv run alembic downgrade -1    # Rollback one migration
cd packages/backend && uv run alembic current         # Show current migration
cd packages/backend && uv run alembic history         # Show migration history

# Backend Development
cd packages/backend && uv run uvicorn src.app.main:app --reload  # Start FastAPI dev server
cd packages/backend && uv run ruff check src/                    # Lint backend code
cd packages/backend && uv run ruff format src/                   # Format backend code

# CLI Development (in packages/cli)
bun run test:local              # Build and run CLI directly
bun run link                    # Link CLI globally for testing
bun run unlink                  # Unlink global CLI
```

## Local Database Setup

**IMPORTANT:** The FastAPI backend requires PostgreSQL for development. Use Docker Compose for local setup:

```bash
# Start PostgreSQL container (first time setup)
docker compose up -d

# Run Alembic migrations to create tables (from packages/backend)
cd packages/backend && uv run alembic upgrade head

# Stop database when done
docker compose down

# Remove database data (destructive)
docker compose down -v
```

**Database Configuration:**

- Local connection: `postgresql://burntop:burntop_dev_password@localhost:5432/burntop`
- Container name: `burntop-postgres`
- Configured in `docker-compose.yml` at project root
- Environment variables in `packages/backend/.env`

**Note:** Do not commit `packages/backend/.env` file - it contains local development credentials.

## CLI Package Notes

**Important:** The CLI package (`packages/cli`) uses `bun:sqlite` for parsing Cursor's SQLite database. This means:

- Build target must be `bun`, not `node`
- The CLI requires bun runtime to execute (cannot run with Node.js alone)
- Use `#!/usr/bin/env bun` shebang in the entry point
- For local testing, use `bun run test:local` or `bun run link`

**API Integration:**

- CLI syncs usage data to FastAPI backend at `/api/v1/sync`
- Set `BURNTOP_API_URL` environment variable for custom API URL (default: `https://burntop.dev`)
- For local development: `BURNTOP_API_URL=http://localhost:8000 burntop sync`
- CLI sends Bearer token via `Authorization: Bearer <session_token>` header

## CDN Caching Configuration

**TanStack Start + Nitro:** The web app uses Nitro as the server runtime. CDN caching is configured via `packages/frontend/nitro.config.ts`:

```typescript
import { defineNitroConfig } from 'nitro/config';

export default defineNitroConfig({
  routeRules: {
    // Static assets (images, fonts, build files): 1 year immutable cache
    '/favicon.ico': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },

    // Service worker: no cache (always fetch latest)
    '/sw.js': { headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } },

    // API routes: configurable per endpoint
    '/api/badge/**': { headers: { 'Cache-Control': 'public, max-age=900' } },
  },
});
```

**Cache Strategy:**

- Static assets: 1 year immutable (images, fonts, JS/CSS bundles)
- Service worker: no cache (always fresh)
- OG images: 1 hour with stale-while-revalidate
- Badges: 15 minutes
- Public pages: 5 minutes with stale-while-revalidate

## Uptime Monitoring

The web application includes a health check endpoint for uptime monitoring services:

**Endpoint:** `GET /api/health`

**Response format:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-05T12:34:56.789Z",
  "checks": {
    "database": "ok"
  }
}
```

**HTTP Status Codes:**

- `200 OK` - Service is healthy (all checks passed)
- `503 Service Unavailable` - Service is unhealthy (one or more checks failed)

**Monitoring Service Configuration:**

- **UptimeRobot:** Monitor GET /api/health, expect 200 status code
- **BetterUptime:** Monitor GET /api/health, expect `{"status":"ok"}` in response body
- **Pingdom:** Monitor GET /api/health, expect 200 status code
- **Custom monitoring:** Parse JSON response and check `status` field equals `"ok"`

**Cache headers:** The health endpoint sets `Cache-Control: no-cache, no-store, must-revalidate` to ensure monitoring services always get fresh results.

## Vercel Deployment

**Build Configuration:** The web application is configured for Vercel deployment using TanStack Start + Nitro.

**Critical Files:**

- `vercel.json` - Vercel project configuration at repository root
- `packages/frontend/nitro.config.ts` - Must include `preset: 'vercel'`

**Build Output:**

- Building with `bun run build` in `packages/frontend` generates `.vercel/output/` directory
- Output structure:
  - `.vercel/output/config.json` - Vercel routing and caching rules
  - `.vercel/output/functions/` - Serverless functions
  - `.vercel/output/static/` - Static assets
- The build command is: `cd packages/frontend && bun run build`
- The output directory is: `packages/frontend/.vercel/output`

**Deployment Steps:**

1. Ensure `nitro.config.ts` has `preset: 'vercel'`
2. Build locally to verify: `cd packages/frontend && bun run build`
3. Check that `.vercel/output/` directory is created
4. Deploy via Vercel CLI: `vercel deploy --prebuilt` (or push to GitHub for automatic deployment)

**Environment Variables Required:**

- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Auth session secret (32+ chars)
- `BETTER_AUTH_URL` - Base URL (e.g., `https://burntop.dev`)
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET` - OAuth credentials
- (Optional) `SENTRY_DSN`, `VITE_PLAUSIBLE_DOMAIN`

**Preview Deployments:**

GitHub Actions workflow (`.github/workflows/preview.yml`) automates preview deployments for PRs:

- Requires GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- Automatically comments on PRs with preview URL and verification checklist
- Creates GitHub deployment tracking for each preview
- Cleans up preview deployments when PRs are closed

To set up:

1. Run `vercel link` in project root to create `.vercel/project.json`
2. Add the three secrets to GitHub repository settings (Settings → Secrets and variables → Actions)
3. Get `VERCEL_TOKEN` from Vercel Dashboard → Settings → Tokens

See `DEPLOYMENT.md` for complete deployment guide.

## UI Changes Verification

**IMPORTANT:** When making UI changes, use the **Playwriter MCP** to verify changes visually:

- Take screenshots to confirm visual appearance
- Check responsive behavior across viewports
- Verify component states (hover, focus, loading, error)
- Test dark mode styling (dark mode only - no light mode)

## Code Style Guidelines

### Python (Backend)

- Python 3.12+ with async/await patterns
- Use type hints for all function signatures
- Follow FastAPI 3-layer architecture (Router → Service → Repository)
- Use `ruff` for linting and formatting (configured in `packages/backend/ruff.toml`)
- Use SQLAlchemy 2.0 modern syntax with `Mapped[]` type annotations
- All database operations must be async using `AsyncSession`
- Use Pydantic v2 for request/response schemas
- Use Python 3.12 type parameters for generic classes: `class Foo[T]: ...`
- Import order: stdlib → third-party → local (ruff enforces this)
- Docstrings for all public classes and methods
- Use `Decimal` for financial calculations (not float)
- Use `datetime.UTC` instead of `timezone.utc` (Python 3.11+)

### TypeScript

- Strict mode enabled - no `any` types unless absolutely necessary
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use explicit return types on exported functions
- Prefer `unknown` over `any` for truly unknown types

### Imports

Order imports in this sequence, separated by blank lines:

1. React/framework imports
2. Third-party libraries
3. Internal aliases (`@/`)
4. Relative imports
5. Type imports (use `import type` when importing only types)

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { db } from '@/lib/db';
import { StatsCard } from './stats-card';
import type { User } from '@/types';
```

### Naming Conventions

| Element                     | Convention                     | Example                         |
| --------------------------- | ------------------------------ | ------------------------------- |
| Files (components)          | `kebab-case.tsx`               | `stats-card.tsx`                |
| Files (utilities)           | `kebab-case.ts`                | `format-tokens.ts`              |
| React components            | `PascalCase`                   | `StatsCard`                     |
| Functions/variables         | `camelCase`                    | `formatTokenCount`              |
| Constants                   | `SCREAMING_SNAKE_CASE`         | `MAX_STREAK_DAYS`               |
| Database tables             | `snake_case`                   | `user_achievements`             |
| Database columns (backend)  | `snake_case`                   | `display_name`                  |
| Database columns (frontend) | `camelCase` in code            | `displayName` -> `display_name` |
| Routes/URLs                 | `kebab-case`                   | `/leaderboard`                  |
| Query keys                  | Array with descriptive strings | `['user', id]`                  |

### TanStack Router - File-Based Routes

Routes live in `packages/frontend/app/routes/`:

```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard')({
  loader: async ({ context }) => {
    return context.queryClient.ensureQueryData(dashboardQueryOptions());
  },
  component: DashboardPage,
});
```

### TanStack Query - Data Fetching (Frontend)

Frontend uses Orval-generated React Query hooks from FastAPI OpenAPI schema:

```typescript
import { useGetUserProfileApiV1UsersUsernameGet } from '@/api/users';

// Generated hook from FastAPI endpoint GET /api/v1/users/{username}
const { data, isLoading } = useGetUserProfileApiV1UsersUsernameGet({
  username: 'johndoe',
});
```

### SQLAlchemy - Database (Backend)

Schema definitions in `packages/backend/src/app/{entity}/models.py`:

```python
from sqlalchemy.orm import Mapped, mapped_column
from app.core import Base, UUIDMixin, TimestampMixin

class User(UUIDMixin, TimestampMixin, Base):
    """User model with profile and gamification fields."""

    username: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    level: Mapped[int] = mapped_column(Integer, default=1)
```

### FastAPI - API Endpoints (Backend)

Router pattern in `packages/backend/src/app/{entity}/router.py`:

```python
from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.user import UserService, UserResponse

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/{username}", response_model=UserResponse)
async def get_user_profile(
    username: str,
    service: Annotated[UserService, Depends(get_user_service)],
) -> UserResponse:
    """Get user profile by username."""
    user = await service.get_by_username_or_raise(username)
    return UserResponse.model_validate(user)
```

### Components & Styling

Use shadcn/ui components with Tailwind. Compose with `cn()`:

```typescript
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export function StatsCard({ className }: { className?: string }) {
  return <Card className={cn('bg-bg-elevated border-border-default', className)} />;
}
```

### Error Handling

Use explicit error boundaries and typed errors:

```typescript
class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
```

### Validation with Zod

Validate all external input:

```typescript
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
});
```

## Project-Specific Rules

1. **Dark mode only** - No light mode support. Use `--bg-base: #0A0A0A` as base.
2. **Ember accent** - Primary color is orange `--ember-500: #FF6B00`.
3. **Token costs** - Always calculate costs using model-specific pricing.
4. **Privacy first** - Profiles are private by default; respect `isPublic` flag.
5. **Streaks** - A "day" is determined by user's timezone, not UTC.

## Common Patterns

### Image Optimization

All images should use optimization attributes for better performance:

```typescript
import { OptimizedImage } from '@/components/optimized-image';

// For critical above-the-fold images
<OptimizedImage
  src="/hero.png"
  alt="Hero"
  width={800}
  height={600}
  priority
/>

// For below-the-fold images (lazy loaded by default)
<OptimizedImage
  src="/feature.png"
  alt="Feature"
  width={400}
  height={300}
/>
```

**Avatar images** use Radix UI's Avatar component which automatically includes lazy loading:

- All avatars have `loading="lazy"` and `decoding="async"` attributes
- Avatar images always include fallbacks with user initials

### Loading States

```typescript
function Dashboard() {
  const { data, isLoading } = useQuery(dashboardQueryOptions());
  if (isLoading) return <DashboardSkeleton />;
  return <DashboardContent data={data} />;
}
```

### FastAPI Backend Integration

**CRITICAL:** The frontend is now a client-side application only. All database operations are handled by the FastAPI backend at `http://localhost:8000` (dev) or `https://burntop.dev` (production).

**Frontend API Client Configuration:**

```typescript
// src/api/client.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const token = localStorage.getItem('session_token');

  return axios({
    ...config,
    baseURL: API_BASE_URL,
    headers: {
      ...config.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  }).then(({ data }) => data);
};
```

**Orval Code Generation:**

The frontend uses Orval to auto-generate TypeScript types and React Query hooks from the FastAPI OpenAPI schema:

```bash
# In packages/frontend
# 1. Start FastAPI backend first
cd ../backend && uv run uvicorn src.app.main:app --reload

# 2. Generate API client (in separate terminal)
cd packages/frontend && bun run generate:api

# This generates:
# - src/api/types.ts (TypeScript types from OpenAPI schema)
# - src/api/*.ts (React Query hooks for each API endpoint)
```

**Using Generated Hooks:**

```typescript
// Example: User profile page
import { useGetUserProfileApiV1UsersUsernameGet } from '@/api/users';

function UserProfile({ username }: { username: string }) {
  const { data, isLoading, error } = useGetUserProfileApiV1UsersUsernameGet({
    username,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data.display_name}</div>;
}
```

**Authentication:**

```typescript
// Login returns session token from FastAPI
import { useLoginApiV1AuthLoginPost } from '@/api/auth';

const { mutate: login } = useLoginApiV1AuthLoginPost();

login(
  { data: { email: 'user@example.com', password: 'password123' } },
  {
    onSuccess: (data) => {
      // Store token for subsequent API requests
      localStorage.setItem('session_token', data.token);
      // Token is automatically included in all requests via customInstance
    },
  }
);
```

**Backend API Endpoints:**

All API endpoints are prefixed with `/api/v1`:

- **Authentication:** `/api/v1/auth/*`
  - `POST /auth/register` - Register new user
  - `POST /auth/login` - Login with email/password
  - `POST /auth/logout` - Logout (invalidate session)
  - `GET /auth/me` - Get current user
  - `GET /auth/oauth/{provider}` - Initiate OAuth flow
  - `GET /auth/oauth/{provider}/callback` - Handle OAuth callback

- **Users:** `/api/v1/users/*`
  - `GET /users/{username}` - Get user profile
  - `PATCH /users/me` - Update own profile
  - `GET /users/{username}/stats` - Get user statistics
  - `POST /users/{username}/follow` - Follow user
  - `DELETE /users/{username}/follow` - Unfollow user

- **Sync:** `/api/v1/sync`
  - `POST /sync` - Sync usage records from CLI

- **Dashboard:** `/api/v1/dashboard/*`
  - `GET /dashboard/overview` - Get dashboard overview
  - `GET /dashboard/trends` - Get usage trends
  - `GET /dashboard/tools` - Get tool breakdown
  - `GET /dashboard/models` - Get model breakdown

- **Leaderboard:** `/api/v1/leaderboard`
  - `GET /leaderboard` - Get leaderboard rankings (supports filters)

- **Other Endpoints:**
  - Achievements, Notifications, Feed, Insights, Referrals

**Backend 3-Layer Architecture:**

```
packages/backend/src/app/{entity}/
├── models.py       # SQLAlchemy ORM models
├── schemas.py      # Pydantic request/response schemas
├── repository.py   # Database access layer
├── service.py      # Business logic layer
├── router.py       # FastAPI route handlers
└── dependencies.py # Dependency injection functions
```

**When Adding New API Endpoints:**

1. Create/update model in `packages/backend/src/app/{entity}/models.py`
2. Generate Alembic migration: `cd packages/backend && uv run alembic revision --autogenerate -m "description"`
3. Apply migration: `uv run alembic upgrade head`
4. Create Pydantic schemas in `schemas.py`
5. Create repository methods in `repository.py`
6. Create service methods in `service.py`
7. Create FastAPI endpoints in `router.py`
8. Register router in `packages/backend/src/app/api/v1/router.py`
9. Restart FastAPI server and regenerate frontend client: `bun run generate:api`

## FastAPI Backend - 3-Layer Architecture

The backend follows a strict 3-layer architecture pattern:

**Layer 1: Router (HTTP Layer)**

- Location: `packages/backend/src/app/{entity}/router.py`
- Responsibility: HTTP request/response handling, validation, authentication
- Uses FastAPI decorators (`@router.get`, `@router.post`, etc.)
- Injects dependencies (service, current user) using `Depends()`
- Returns Pydantic response models
- Handles HTTP status codes (200, 201, 404, 401, 403, etc.)

**Layer 2: Service (Business Logic Layer)**

- Location: `packages/backend/src/app/{entity}/service.py`
- Responsibility: Business logic, validation, orchestration across repositories
- Extends `BaseService[Model, CreateSchema, UpdateSchema]`
- Raises domain exceptions (`NotFoundError`, `ConflictError`, `ForbiddenError`)
- Coordinates multiple repositories for complex operations
- Contains no HTTP-specific logic (status codes, headers)

**Layer 3: Repository (Data Access Layer)**

- Location: `packages/backend/src/app/{entity}/repository.py`
- Responsibility: Database queries and persistence
- Extends `PostgresRepository[Model, CreateSchema, UpdateSchema]`
- Uses async SQLAlchemy 2.0 for all database operations
- Contains no business logic - only data access
- Returns SQLAlchemy model instances (not Pydantic schemas)

**Dependencies:**

- Location: `packages/backend/src/app/{entity}/dependencies.py`
- Provides dependency injection functions for FastAPI
- Creates repository and service instances with proper lifecycle

**Example Flow:**

```python
# 1. Router (HTTP Layer)
@router.get("/{username}", response_model=UserResponse)
async def get_user_profile(
    username: str,
    service: Annotated[UserService, Depends(get_user_service)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)],
) -> UserResponse:
    """Get user profile by username."""
    user = await service.get_by_username_or_raise(username)  # Call service
    return UserResponse.model_validate(user)  # Convert to Pydantic schema

# 2. Service (Business Logic Layer)
class UserService(BaseService[User, UserCreate, UserUpdate]):
    async def get_by_username_or_raise(self, username: str) -> User:
        """Get user or raise NotFoundError."""
        user = await self.repository.get_by_username(username)  # Call repository
        if not user:
            raise NotFoundError(resource="User", id=username)  # Business logic
        return user

# 3. Repository (Data Access Layer)
class UserRepository(PostgresRepository[User, UserCreate, UserUpdate]):
    async def get_by_username(self, username: str) -> User | None:
        """Get user by username."""
        return await self.get_by_field("username", username)  # Database query
```

## Do Not

- Use `any` type without explicit justification comment (TypeScript/Python)
- Skip error handling in loaders, mutations, or async functions
- Commit `.env` files or credentials
- Use `console.log` in production code (use proper logger)
- Create components without TypeScript props interface
- Skip loading/error states in data-fetching components
- Make UI changes without verifying with Playwriter MCP
- Import database directly in frontend code - use FastAPI backend via Orval-generated hooks
- Mix layers in FastAPI backend - routers call services, services call repositories
- Use `float` for financial calculations - use `Decimal` instead
- Create TanStack Start server functions - backend is FastAPI only
