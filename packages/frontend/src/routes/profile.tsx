/**
 * Profile Redirect Page (Protected Route)
 *
 * Redirects authenticated users to their own profile page.
 * This route handles the /profile sidebar link.
 *
 * Uses TanStack Router's beforeLoad with redirect for proper handling
 * and instant navigation without layout shift.
 */

import { createFileRoute, redirect } from '@tanstack/react-router';

import {
  getMeApiV1AuthMeGet,
  getGetMeApiV1AuthMeGetQueryKey,
} from '@/api/authentication/authentication';
import { getSessionToken } from '@/lib/auth/client';
import { queryClient } from '@/router';

export const Route = createFileRoute('/profile')({
  beforeLoad: async () => {
    // Check if user has a session token first (sync check)
    const token = getSessionToken();

    if (!token) {
      // Not authenticated, redirect to login
      throw redirect({
        to: '/login',
        search: { error: undefined, error_description: undefined },
      });
    }

    try {
      // Fetch or get cached user data
      const response = await queryClient.ensureQueryData({
        queryKey: getGetMeApiV1AuthMeGetQueryKey(),
        queryFn: () => getMeApiV1AuthMeGet(),
        staleTime: 1000 * 60 * 5, // 5 minutes
      });

      // Extract username from response
      const user = response?.data;
      const username = user?.username as string | undefined;

      if (username) {
        // Redirect to user's profile page
        throw redirect({
          to: '/p/$username',
          params: { username },
        });
      }

      // Fallback: redirect to dashboard if no username
      throw redirect({
        to: '/dashboard',
      });
    } catch (error) {
      // If it's already a redirect, re-throw it
      if (error instanceof Response || (error && typeof error === 'object' && 'to' in error)) {
        throw error;
      }

      // Auth error - redirect to login
      throw redirect({
        to: '/login',
        search: { error: undefined, error_description: undefined },
      });
    }
  },
  // Component is never rendered because beforeLoad always redirects
  component: () => null,
});
