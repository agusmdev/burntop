# burntop Web Application

> The gamified AI usage tracking dashboard and social platform

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19 + Vite + Nitro)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Data Fetching:** [TanStack Query](https://tanstack.com/query) + Orval-generated hooks
- **Routing:** [TanStack Router](https://tanstack.com/router) (file-based)
- **Authentication:** OAuth via FastAPI backend
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.3+
- FastAPI backend running (see `packages/backend`)

### Development

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env.local
   ```

   Configure the following:
   - `VITE_API_URL` - FastAPI backend URL (default: `http://localhost:8000`)

3. **Start the dev server:**

   ```bash
   bun dev
   ```

   The app will be available at `http://localhost:3000`.

## Scripts

```bash
bun dev              # Start development server
bun build            # Build for production
bun lint             # Run ESLint
bun lint:fix         # Fix lint issues
bun typecheck        # TypeScript type checking
bun generate:api     # Generate API client from FastAPI OpenAPI schema
npx vitest run       # Run tests
npx vitest --watch   # Run tests in watch mode
```

## Project Structure

```
src/
├── api/              # Orval-generated API hooks and types
├── components/
│   ├── ui/           # shadcn/ui components
│   └── [feature]/    # Feature-specific components
├── lib/
│   ├── auth/         # Authentication utilities
│   └── utils.ts      # Shared utilities
├── routes/           # File-based routing (TanStack Router)
│   ├── api/          # API routes (OG images, badges, etc.)
│   └── *.tsx         # Page routes
└── styles/           # Global styles and Tailwind config
```

## API Integration

The frontend uses [Orval](https://orval.dev/) to generate TypeScript types and React Query hooks from the FastAPI OpenAPI schema.

### Regenerating API Client

When the backend API changes, regenerate the client:

```bash
# Make sure FastAPI backend is running first
cd ../backend && uv run uvicorn src.app.main:app --reload

# Then generate the API client
cd ../frontend && bun generate:api
```

### Using Generated Hooks

```typescript
import { useGetUserProfileApiV1UsersUsernameGet } from '@/api/users';

function UserProfile({ username }: { username: string }) {
  const { data, isLoading } = useGetUserProfileApiV1UsersUsernameGet({
    username,
  });

  if (isLoading) return <Skeleton />;
  return <ProfileCard user={data} />;
}
```

## Styling Guidelines

- **Dark mode only** - No light mode support
- **Primary color:** Orange (`--ember-500: #FF6B00`)
- **Use `cn()` helper** for conditional class merging

```typescript
import { cn } from '@/lib/utils';

<div className={cn('bg-bg-elevated', isActive && 'border-ember-500')} />
```

## Testing

```bash
# Run all tests
npx vitest run

# Watch mode
npx vitest --watch

# Single file
npx vitest run src/components/stats-card.test.tsx
```

## Deployment

The app is configured for Vercel deployment. Build output is generated in `.vercel/output/`.

```bash
# Build for production
bun build

# The output is ready for Vercel deployment
```

## Learn More

- [TanStack Router Docs](https://tanstack.com/router)
- [TanStack Query Docs](https://tanstack.com/query)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Orval Documentation](https://orval.dev/)
