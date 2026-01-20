# AGENTS.md

Agent-specific guidance for working with this codebase.

## Known Issues

### SSR Hydration Issue with `useSession()`

Better Auth's `useSession()` hook has an SSR hydration issue with TanStack Start where `isPending` may never resolve to `false` on the client side. This causes pages that block rendering on `isPending` to hang indefinitely.

**Symptoms:**

- Pages show loading spinner forever
- `isPending` remains `true` after hydration
- React form handlers don't fire (forms submit as native HTML)
- URL gets `?` appended on form submit instead of React handler executing

**Root Cause:**
TanStack Start performs SSR, but Better Auth's React client doesn't properly hydrate the session state. The mismatch between server and client state causes React hydration to fail silently.

**Workaround Applied:**
The login and signup pages render forms immediately instead of showing a loading state while `isPending` is true. Redirect to home happens via `useEffect` when session is detected.

```typescript
// DON'T block on isPending - can hang forever
if (isPending) return <Loading />;

// DO render immediately, redirect in effect
useEffect(() => {
  if (session?.user) navigate({ to: '/' });
}, [session]);
return <LoginForm />;
```

**Note:** React form handlers may not fire due to hydration issues. The auth APIs work correctly - use `signIn.email()` and `signUp.email()` programmatically if needed.

### Sign-out Requires JSON Body

The Better Auth sign-out endpoint requires an empty JSON body to work correctly:

```typescript
// This fails with 500 error
await fetch('/api/auth/sign-out', { method: 'POST' });

// This works
await fetch('/api/auth/sign-out', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}), // Required!
});
```

## Critical Patterns

### Server Functions Pattern

**Route files must NEVER import `@/lib/db` directly.** Database operations only run server-side, but TanStack Router may execute loaders on the client during navigation.

```typescript
// lib/services/users.api.ts - OK to import db
export const getUserProfile = createServerFn({ method: 'GET' })
  .validator(UserSchema)
  .handler(async ({ data }) => {
    return db.instance.select()...
  });

// routes/$username.tsx - NO db import!
export const Route = createFileRoute('/$username')({
  loader: async ({ params }) => {
    return getUserProfile({ data: { username: params.username } });
  },
});
```

### Authentication Pattern

- **Server:** Better Auth with Drizzle adapter, supports email/password + OAuth (GitHub)
- **Client:** `useSession()`, `signIn.email()`, `signUp.email()` from `@/lib/auth/client`
- **Protected Routes:** Use `createProtectedRoute()` helper from `@/lib/auth/protected-route`

## Testing Authentication

When testing auth flows end-to-end:

1. **API calls work correctly** - Use direct API calls if UI handlers fail:
   - `POST /api/auth/sign-up/email` - Create account
   - `POST /api/auth/sign-in/email` - Login
   - `GET /api/auth/get-session` - Check session
   - `POST /api/auth/sign-out` - Logout (requires `{}` body)

2. **UI may have hydration issues** - Forms might not submit through React handlers due to SSR hydration mismatch

3. **Session persistence works** - Cookies are set correctly, sessions persist across page loads
