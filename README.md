# burntop

A gamified AI usage tracking platform for developers. Track your AI tool consumption, compete on leaderboards, earn achievements, and share your stats.

## Overview

burntop helps developers visualize and gamify their AI coding assistant usage across tools like Claude Code, Cursor, Gemini CLI, Aider, and more. Features include:

- **Usage Dashboard** - Track tokens, costs, and usage patterns over time
- **Leaderboards** - Compete globally or with friends
- **Achievements** - Unlock badges for milestones and streaks
- **Shareable Cards** - Generate OG images and embeddable badges
- **CLI Sync** - Automatic usage data collection from local tools

## CLI Installation

Run burntop directly without installing:

```bash
bunx burntop
```

Or install globally:

```bash
bun add -g burntop    # recommended
npm install -g burntop
pnpm add -g burntop
```

**Note:** The CLI requires [Bun](https://bun.sh) runtime.

### Quick Start

```bash
# Authenticate with your account
burntop login

# View your AI usage stats
burntop stats

# Sync your local data to the cloud
burntop sync

# View the leaderboard
burntop leaderboard

# See all available commands
burntop --help
```

### Supported Tools

The CLI automatically detects and parses usage data from:

- **Claude Code** - `~/.claude/projects/**/*.jsonl`
- **Cursor** - SQLite database in Application Support
- **Gemini CLI** - `~/.gemini/tmp/*/chats/session-*.json`
- **Aider** - `~/.aider/`
- **Continue** - `~/.continue/sessions/`

## Project Structure

This is a monorepo using bun workspaces:

```
packages/
  backend/   # FastAPI backend with async SQLAlchemy
  frontend/  # TanStack Start web application
  cli/       # CLI tool for syncing usage data
```

## Prerequisites

- Node.js 20+
- Bun 1.3+
- Docker and Docker Compose (for local database)

## Development Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Database Setup

The application requires PostgreSQL. Use Docker Compose for local development:

```bash
# Start PostgreSQL container
docker compose up -d

# Run database migrations
cd packages/backend && uv run alembic upgrade head
```

**Database configuration:**

- Local connection: `postgresql://burntop:burntop_dev_password@localhost:5432/burntop`
- Container name: `burntop-postgres`
- Environment variables in `packages/backend/.env`

**To stop the database:**

```bash
# Stop container (preserves data)
docker compose down

# Remove container and data (destructive)
docker compose down -v
```

### 3. Start Development Servers

```bash
# Start all packages in dev mode
bun dev

# Or run only the frontend
bun --filter frontend dev

# Or run only the backend
cd packages/backend && uv run uvicorn src.app.main:app --reload
```

## Scripts

| Command         | Description                    |
| --------------- | ------------------------------ |
| `bun dev`       | Start all packages in dev mode |
| `bun build`     | Build all packages             |
| `bun lint`      | Run ESLint                     |
| `bun lint:fix`  | Fix auto-fixable lint issues   |
| `bun format`    | Format with Prettier           |
| `bun typecheck` | Run TypeScript type checking   |
| `bun test`      | Run tests                      |

## Tech Stack

- **Frontend**: TanStack Start, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, async SQLAlchemy 2.0, Pydantic v2
- **Database**: PostgreSQL
- **Auth**: Better Auth with GitHub OAuth
- **CLI**: TypeScript with Commander.js, Bun runtime

## License

MIT
