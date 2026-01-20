import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen';

import { ApiError } from '@/api/client';

// Import the generated route tree

// Create a QueryClient instance with improved configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute default
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: true, // Enable for better UX when user returns to tab
      refetchOnReconnect: true, // Refetch when network reconnects
      // Improved retry configuration with smart error handling
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof ApiError) {
          // Don't retry auth errors, not found, or validation errors
          if (error.isAuthError() || error.isNotFoundError() || error.isValidationError()) {
            return false;
          }
          // Retry server errors up to 3 times
          if (error.isRetriable()) {
            return failureCount < 3;
          }
        }
        // Default: retry once for unknown errors
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      // Don't retry mutations by default - they may have side effects
      retry: false,
      onError: (error) => {
        // Log mutation errors for debugging
        if (import.meta.env.DEV) {
          console.error('[Mutation Error]', error);
        }
      },
    },
  },
});

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {
      queryClient,
    },

    scrollRestoration: true,
    // Enable route prefetching on hover/focus for better perceived performance
    defaultPreload: 'intent',
    // Cache prefetched data for 10 seconds
    defaultPreloadStaleTime: 10_000,
  });

  return router;
};
