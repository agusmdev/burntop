/**
 * Protected Route Utilities
 *
 * Provides utilities for creating authenticated routes in TanStack Router.
 * Uses the FastAPI backend for authentication.
 */

import { redirect } from '@tanstack/react-router';

import { getSessionToken } from './client';

/**
 * Create a route that requires authentication.
 * Redirects to /login if the user is not authenticated.
 */
export function createAuthRoute<T extends { beforeLoad?: unknown }>(config: T): T {
  const originalBeforeLoad = config.beforeLoad as
    | ((opts: { location: { href: string } }) => unknown)
    | undefined;

  return {
    ...config,
    beforeLoad: (opts: { location: { href: string } }) => {
      // Check if user has a session token
      const token = getSessionToken();

      if (!token) {
        // Redirect to login with the current location as redirect target
        throw redirect({
          to: '/login',
          search: {
            redirect: opts.location.href,
          } as never,
        });
      }

      // Call original beforeLoad if it exists
      if (originalBeforeLoad) {
        return originalBeforeLoad(opts);
      }
    },
  } as T;
}

/**
 * Create a route that optionally uses authentication.
 * Does not redirect if the user is not authenticated, but provides auth context.
 */
export function createOptionalAuthRoute<T>(config: T): T {
  // For optional auth routes, we don't need to do anything special
  // The useUser() hook will automatically fetch user data if a token exists
  return config;
}
