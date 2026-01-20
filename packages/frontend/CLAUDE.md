# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development
bun dev                          # Start dev server on port 3000

# Building
bun run build                    # Production build (outputs to .vercel/output/)

# Testing
npx vitest run                   # Run all tests
npx vitest --watch               # Watch mode
npx vitest run path/to/file.test.ts  # Single file

# Linting & Types
bun lint                         # ESLint
bun lint:fix                     # Auto-fix lint issues
bun typecheck                    # TypeScript check

# Database (requires PostgreSQL via docker compose up -d)
bun run db:generate              # Generate Drizzle migrations
bun run db:migrate               # Run migrations
bun run db:push                  # Push schema (dev only)
bun run db:studio                # Open Drizzle Studio
```

## Architecture Overview

**Tech Stack:** TanStack Start (React 19 + Vite + Nitro) / PostgreSQL + Drizzle ORM / Better Auth / Tailwind CSS 4

### Critical Pattern: Server Functions

**Route files must NEVER import `@/lib/db` directly.** Database operations only run server-side, but TanStack Router may execute loaders on the client during navigation.

```
lib/services/
├── *.api.ts           # Server functions (createServerFn)
├── queries.ts         # Query option factories
├── schemas/           # Zod validation schemas
└── types/             # TypeScript types
```

**Correct Pattern:**

```typescript
// lib/services/users.api.ts
export const getUserProfile = createServerFn({ method: 'GET' })
  .validator(UserSchema)
  .handler(async ({ data }) => {
    return db.instance.select()...  // db import OK here
  });

// routes/$username.tsx - NO db import!
export const Route = createFileRoute('/$username')({
  loader: async ({ params }) => {
    return getUserProfile({ data: { username: params.username } });
  },
});
```

**Exception:** API routes (`routes/api/*.ts`) use `server: { handlers: {} }` pattern and can import db directly.

### Authentication Pattern

- **Server:** Better Auth with Drizzle adapter, supports email/password + OAuth (GitHub)
- **Client:** `useSession()`, `signIn.email()`, `signUp.email()` from `@/lib/auth/client`
- **Protected Routes:** Use `createProtectedRoute()` helper from `@/lib/auth/protected-route`

```typescript
// Protected route with guaranteed user context
export const Route = createFileRoute('/dashboard')({
  ...createProtectedRoute({
    loader: async ({ context }) => {
      // context.user is guaranteed to exist
    },
  }),
});
```

### Database Singleton

```typescript
import { db } from '@/lib/db';
// Usage: db.instance.select()...
```

Lazy-initialized connection pool (max 10 connections, 20s idle timeout).

## Known Issues

### SSR Hydration Issue with `useSession()`

Better Auth's `useSession()` hook has an SSR hydration issue with TanStack Start where `isPending` may never resolve to `false` on the client side. This causes pages that block rendering on `isPending` to hang.

**Workaround Applied:** The login and signup pages render forms immediately instead of showing a loading state while `isPending` is true. Redirect to home happens via `useEffect` when session is detected.

```typescript
// DON'T block on isPending
if (isPending) return <Loading />;  // Can hang forever

// DO render immediately, redirect in effect
useEffect(() => {
  if (session?.user) navigate({ to: '/' });
}, [session]);
return <LoginForm />;
```

**Note:** React form handlers may not fire due to hydration issues. The auth APIs work correctly - use `signIn.email()` and `signUp.email()` programmatically if needed.

### Sign-out Requires JSON Body

The Better Auth sign-out endpoint requires an empty JSON body:

```typescript
await fetch('/api/auth/sign-out', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}), // Required!
});
```

## Code Style

### Imports Order

1. React/framework imports
2. Third-party libraries
3. Internal aliases (`@/`)
4. Relative imports
5. Type imports (`import type`)

### Naming

- Files: `kebab-case.tsx`
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database tables: `snake_case`

### Styling

Dark mode only (no light mode). Primary accent: `--ember-500: #FF6B00`.

```typescript
import { cn } from '@/lib/utils';
<Card className={cn('bg-bg-elevated border-border-default', className)} />
```

## Key Directories

```
src/
├── routes/           # File-based routing (TanStack Router)
│   ├── api/          # Server-only API handlers
│   └── *.tsx         # Page routes
├── components/       # React components + shadcn/ui
├── lib/
│   ├── auth/         # Better Auth config, middleware, client
│   ├── db/           # Drizzle schema and singleton
│   ├── services/     # Server functions and query options
│   └── [feature]/    # Feature-specific logic
└── data/             # Constants, demo data
```

## Environment Variables

Required for development:

- `DATABASE_URL` - PostgreSQL connection
- `BETTER_AUTH_SECRET` - Auth session secret
- `BETTER_AUTH_URL` - Base URL
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` - OAuth

## Do Not

- Import `@/lib/db` in route `.tsx` files
- Use `any` without justification
- Skip loading/error states
- Block render on `useSession().isPending`
- Commit `.env` files
