/**
 * Auth Client
 *
 * Provides authentication utilities and hooks for the frontend.
 * Manages session tokens in localStorage and provides auth state.
 */

import { useGetMeApiV1AuthMeGet } from '@/api/authentication/authentication';

// Session token key in localStorage
const SESSION_TOKEN_KEY = 'session_token';

/**
 * Get session token from localStorage
 */
export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

/**
 * Set session token in localStorage
 */
export function setSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_TOKEN_KEY, token);
}

/**
 * Remove session token from localStorage
 */
export function clearSessionToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

/**
 * Check if user is authenticated (has session token)
 */
export function isAuthenticated(): boolean {
  return getSessionToken() !== null;
}

/**
 * Hook to get current authenticated user
 *
 * Uses the /api/v1/auth/me endpoint to fetch user data.
 * Returns null if not authenticated or if the request fails.
 */
export function useUser() {
  const token = getSessionToken();

  const { data, isLoading, error } = useGetMeApiV1AuthMeGet({
    query: {
      enabled: !!token, // Only run query if token exists
      retry: false as const, // Don't retry on 401
      staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
      queryKey: ['auth', 'me'] as const,
    },
  });

  // Extract user from response - the generated API returns a response object with status and data
  const user = data && 'status' in data && data.status === 200 && 'data' in data ? data.data : null;

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
  };
}

/**
 * Handle logout
 *
 * Calls the logout API endpoint to invalidate the session on the server,
 * then clears the local session token and redirects.
 */
export async function handleLogout(redirectTo: string = '/') {
  // Import logout function dynamically to avoid circular dependencies
  const { logoutApiV1AuthLogoutPost } = await import('@/api/authentication/authentication');

  try {
    // Call logout API to invalidate session on server
    await logoutApiV1AuthLogoutPost();
  } catch (error) {
    // Continue with logout even if API call fails
    console.error('Logout API error:', error);
  } finally {
    // Always clear local token and redirect
    clearSessionToken();

    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }
}

/**
 * Handle login success
 *
 * Stores the session token and redirects to the specified path.
 */
export function handleLoginSuccess(token: string, redirectTo: string = '/dashboard') {
  setSessionToken(token);

  // Redirect to dashboard or intended destination
  if (typeof window !== 'undefined') {
    window.location.href = redirectTo;
  }
}
