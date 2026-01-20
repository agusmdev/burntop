# Contributing to burntop

Thank you for your interest in contributing to burntop! This guide will help you get started with contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Making Changes](#making-changes)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Package-Specific Guidelines](#package-specific-guidelines)
- [Need Help?](#need-help)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+** (use `.nvmrc` for the correct version: `nvm use`)
- **Bun 1.3+** ([installation guide](https://bun.sh))
- **Docker & Docker Compose** (for local database)
- **Git** for version control

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/burntop.git
   cd burntop
   ```

3. **Add upstream remote** to keep your fork in sync:

   ```bash
   git remote add upstream https://github.com/agusmdev/burntop.git
   ```

4. **Install dependencies**:

   ```bash
   bun install
   ```

5. **Start the local database**:

   ```bash
   # Start PostgreSQL container
   docker compose up -d

   # Run database migrations
   cd packages/backend && uv run alembic upgrade head
   ```

6. **Set up environment variables**:

   ```bash
   # Copy example env file for backend
   cp packages/backend/.env.example packages/backend/.env

   # Edit .env with your local configuration
   ```

7. **Start development servers**:

   ```bash
   # Start all packages in dev mode
   bun dev

   # Or run only the frontend
   bun --filter frontend dev

   # Or run only the backend
   cd packages/backend && uv run uvicorn src.app.main:app --reload
   ```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:8000`.

## Development Workflow

### Branch Naming

Use descriptive branch names following this pattern:

- `feature/` - New features (e.g., `feature/add-dark-mode-toggle`)
- `fix/` - Bug fixes (e.g., `fix/leaderboard-pagination`)
- `docs/` - Documentation updates (e.g., `docs/update-readme`)
- `refactor/` - Code refactoring (e.g., `refactor/extract-auth-utils`)
- `test/` - Adding or updating tests (e.g., `test/add-user-api-tests`)

### Keeping Your Fork Updated

Regularly sync your fork with the upstream repository:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

### Making a New Branch

Always create a new branch for your changes:

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

## Making Changes

### Before You Code

1. **Check existing issues** to see if someone is already working on it
2. **Open an issue** to discuss significant changes before implementing them

### Development Best Practices

- **Make focused commits** - Each commit should represent a single logical change
- **Write clear commit messages** - Use present tense (e.g., "Add feature" not "Added feature")
- **Test your changes locally** before pushing
- **Run linting and type checking** before committing
- **Keep commits small** - Easier to review and revert if needed

### Commit Message Format

Follow this format for commit messages:

```
type: Brief description (50 chars or less)

Longer explanation if needed (wrap at 72 characters).
Explain what and why, not how.

Closes #123
```

**Types:**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code formatting (no functional changes)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Build process or tooling changes

**Example:**

```
feat: Add cache efficiency leaderboard

Implement a new leaderboard type that ranks users by their
cache hit rate. This helps highlight users who are making
efficient use of prompt caching.

Closes #456
```

## Code Style Guidelines

We enforce code style through automated tools. Please ensure your code passes all checks before submitting.

### TypeScript

- **Strict mode enabled** - No `any` types unless absolutely necessary
- Use `unknown` over `any` for truly unknown types
- Prefer `interface` for object shapes
- Prefer `type` for unions/intersections
- Use explicit return types on exported functions

### Import Ordering

Order imports with blank lines between groups:

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

| Element             | Convention                     | Example                         |
| ------------------- | ------------------------------ | ------------------------------- |
| Files (components)  | `kebab-case.tsx`               | `stats-card.tsx`                |
| Files (utilities)   | `kebab-case.ts`                | `format-tokens.ts`              |
| React components    | `PascalCase`                   | `StatsCard`                     |
| Functions/variables | `camelCase`                    | `formatTokenCount`              |
| Constants           | `SCREAMING_SNAKE_CASE`         | `MAX_STREAK_DAYS`               |
| Database tables     | `snake_case`                   | `user_achievements`             |
| Database columns    | `camelCase` in code            | `displayName` -> `display_name` |
| Routes/URLs         | `kebab-case`                   | `/leaderboard`                  |
| Query keys          | Array with descriptive strings | `['user', id]`                  |

### Components

- Use shadcn/ui components with Tailwind CSS
- Compose with `cn()` utility for className merging
- Always include loading and error states for data-fetching components
- Include TypeScript props interface for all components

```typescript
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface StatsCardProps {
  className?: string;
  title: string;
  value: number;
}

export function StatsCard({ className, title, value }: StatsCardProps) {
  return (
    <Card className={cn('bg-bg-elevated border-border-default', className)}>
      <h3>{title}</h3>
      <p>{value}</p>
    </Card>
  );
}
```

### Database

- Use SQLAlchemy 2.0 with async sessions for all database queries
- Define models in `packages/backend/src/app/{entity}/models.py`
- Run `cd packages/backend && uv run alembic revision --autogenerate -m "description"` to create migrations
- Run `cd packages/backend && uv run alembic upgrade head` to apply migrations

### Validation

- Use Zod for all external input validation
- Define schemas near the API endpoint or form component

```typescript
import { z } from 'zod';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  websiteUrl: z.string().url().optional(),
  isPublic: z.boolean().optional(),
});
```

### Error Handling

- Use explicit error boundaries for React components
- Create typed error classes for domain errors
- Always handle errors in loaders and mutations

```typescript
class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
```

### Project-Specific Rules

1. **Dark mode only** - No light mode support. Use `--bg-base: #0A0A0A` as base.
2. **Ember accent** - Primary color is orange `--ember-500: #FF6B00`.
3. **Token costs** - Always calculate costs using model-specific pricing.
4. **Privacy first** - Profiles are private by default; respect `isPublic` flag.
5. **Streaks** - A "day" is determined by user's timezone, not UTC.

### Do Not

- Use `any` type without explicit justification comment
- Skip error handling in loaders or mutations
- Commit `.env` files or credentials
- Use `console.log` in production code (use proper logger)
- Create components without TypeScript props interface
- Skip loading/error states in data-fetching components

## Testing

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run a specific test file
bun test path/to/file.test.ts

# Run tests matching a pattern
bun test --filter "test name"
```

### Writing Tests

- Place test files next to the code they test with `.test.ts` or `.test.tsx` extension
- Use descriptive test names that explain what is being tested
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies and API calls

## Submitting Changes

### Pre-Submission Checklist

Before submitting a pull request, ensure:

- [ ] Code follows the style guidelines
- [ ] All tests pass (`bun test`)
- [ ] Linting passes (`bun lint`)
- [ ] Type checking passes (`bun typecheck`)
- [ ] Code is formatted (`bun format`)
- [ ] Documentation is updated if needed
- [ ] Commit messages are clear and descriptive

### Running Pre-Commit Checks

Run all checks locally before pushing:

```bash
# Run linting and auto-fix issues
bun lint:fix

# Format code with Prettier
bun format

# Run type checking
bun typecheck

# Run tests
bun test
```

### Creating a Pull Request

1. **Push your branch** to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a pull request** on GitHub:
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template with:
     - Description of changes
     - Related issue numbers (e.g., "Closes #123")
     - Screenshots for UI changes
     - Testing instructions

3. **Respond to review feedback**:
   - Address reviewer comments
   - Push new commits to the same branch
   - Request re-review when ready

### Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Include tests for new functionality
- Update documentation if needed
- Add screenshots for UI changes
- Reference related issues
- Ensure CI passes before requesting review

## Package-Specific Guidelines

### Frontend (`packages/frontend`)

- Use TanStack Router for file-based routing (routes in `app/routes/`)
- Use TanStack Query for data fetching via Orval-generated hooks
- Define query options as reusable factories
- Use Better Auth for authentication
- Client-side only - no server functions

### Backend (`packages/backend`)

- FastAPI with async SQLAlchemy 2.0
- Follow 3-layer architecture: Router → Service → Repository
- Use Pydantic v2 for request/response schemas
- Use `ruff` for linting and formatting
- Run with `uv run uvicorn src.app.main:app --reload`

### CLI Tool (`packages/cli`)

- **Important:** CLI uses `bun:sqlite` and requires Bun runtime
- Build target must be `bun`, not `node`
- Use shebang `#!/usr/bin/env bun` in entry point
- Test locally with `bun run test:local` or `bun run link`
- Follow Commander.js patterns for CLI commands

## Database Changes

When making database schema changes:

1. **Edit model** in `packages/backend/src/app/{entity}/models.py`

2. **Generate migration**:

   ```bash
   cd packages/backend
   uv run alembic revision --autogenerate -m "description"
   ```

3. **Review generated SQL** in `packages/backend/alembic/versions/` directory

4. **Apply migration** locally:

   ```bash
   uv run alembic upgrade head
   ```

5. **Regenerate frontend API client** (if schema affects API):

   ```bash
   cd packages/frontend && bun run generate:api
   ```

6. **Include migration files** in your commit

## Documentation

### When to Update Documentation

- Adding new features
- Changing existing behavior
- Adding new API endpoints
- Updating environment variables
- Changing database schema
- Adding new CLI commands

### Documentation Files

- `README.md` - Project overview and quick start
- `AGENTS.md` - AI coding agent guidelines
- `API.md` - API endpoint documentation
- `CONTRIBUTING.md` - This file
- Package-specific READMEs in `packages/*/README.md`

## Need Help?

### Resources

- **API Documentation:** See `API.md` for endpoint reference
- **Agent Guidelines:** See `AGENTS.md` for code style details

### Getting Support

If you need help or have questions:

- **Check existing issues** on GitHub
- **Open a new issue** with your question
- **Join GitHub Discussions** for community conversations

### First-Time Contributors

If this is your first contribution:

1. Look for issues tagged with `good first issue` or `help wanted`
2. Comment on the issue to let others know you're working on it
3. Ask questions if anything is unclear
4. Don't hesitate to request help in the pull request

### Reporting Bugs

When reporting bugs, include:

- **Description:** Clear description of the bug
- **Steps to reproduce:** Detailed steps to reproduce the issue
- **Expected behavior:** What you expected to happen
- **Actual behavior:** What actually happened
- **Environment:** OS, Node version, Bun version, browser (if applicable)
- **Screenshots:** If relevant
- **Error messages:** Full error stack trace

### Suggesting Features

When suggesting features:

- **Check existing issues** to avoid duplicates
- **Describe the problem** you're trying to solve
- **Explain your proposed solution** in detail
- **Consider alternatives** you've thought about
- **Check the project roadmap** to see if it's already planned

## License

By contributing to burntop, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to burntop! Your contributions help make AI usage tracking better for everyone.
