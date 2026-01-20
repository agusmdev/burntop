/**
 * Test Utilities
 *
 * Provides mocks and wrappers for testing React components that depend on:
 * - TanStack Router
 * - TanStack Query
 * - Authentication context
 * - API calls
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

import type { ReactElement, ReactNode } from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Create a test query client with disabled retries and cache
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Mock user type for testing
 */
export interface MockUser {
  id: string;
  username: string;
  name?: string;
  email?: string;
  image?: string;
}

/**
 * Default mock user for authenticated tests
 */
export const mockUser: MockUser = {
  id: 'test-user-id',
  username: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  image: 'https://example.com/avatar.jpg',
};

/**
 * Mock auth state for useUser hook
 */
export const mockUseUser = {
  authenticated: () => ({
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
    error: null,
  }),
  loading: () => ({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  }),
  unauthenticated: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,
  }),
};

/**
 * Create mocks for the auth client module
 */
export function createAuthMocks(
  state: 'authenticated' | 'loading' | 'unauthenticated' = 'unauthenticated'
) {
  return {
    useUser: vi.fn(() => mockUseUser[state]()),
    getSessionToken: vi.fn(() => (state === 'authenticated' ? 'mock-token' : null)),
    setSessionToken: vi.fn(),
    clearSessionToken: vi.fn(),
    isAuthenticated: vi.fn(() => state === 'authenticated'),
    handleLogout: vi.fn(),
    handleLoginSuccess: vi.fn(),
  };
}

/**
 * All-in-one wrapper for tests that provides:
 * - QueryClientProvider
 * - TooltipProvider (for shadcn/ui Tooltip components)
 */
interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

function AllProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient ?? createTestQueryClient();
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}

/**
 * Custom render function that wraps components with all providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithProviders(ui: ReactElement, options: CustomRenderOptions = {}) {
  const { queryClient, ...renderOptions } = options;

  return rtlRender(ui, {
    wrapper: ({ children }) => <AllProviders queryClient={queryClient}>{children}</AllProviders>,
    ...renderOptions,
  });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { renderWithProviders as render };

/**
 * Mock TanStack Router Link component for tests
 */
export const MockLink = ({
  children,
  to,
  ...props
}: {
  children: ReactNode;
  to: string;
  [key: string]: unknown;
}) => (
  <a href={to} {...props}>
    {children}
  </a>
);

/**
 * Wait for all promises to resolve (useful for async state updates)
 */
export async function waitForPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a mock API response wrapper
 */
export function createMockApiResponse<T>(data: T, status: number = 200) {
  return {
    status,
    data,
    statusText: 'OK',
    headers: {},
    config: {},
  };
}

/**
 * Create mock dashboard data
 */
export function createMockDashboardOverview() {
  return {
    total_tokens: 1500000,
    total_cost: 45.67,
    days_active: 30,
    current_streak: 7,
    longest_streak: 14,
    monthly_tokens: 500000,
    weekly_tokens: 125000,
    level: 5,
    xp: 4500,
    next_level_xp: 5000,
  };
}

/**
 * Create mock tool usage data
 */
export function createMockToolsData() {
  return {
    tools: [
      { source: 'cursor', tokens: 800000, cost: 25.0, percentage: 53.3, days_active: 25 },
      { source: 'claude-code', tokens: 500000, cost: 15.0, percentage: 33.3, days_active: 20 },
      { source: 'chatgpt', tokens: 200000, cost: 5.67, percentage: 13.4, days_active: 10 },
    ],
  };
}

/**
 * Create mock model usage data
 */
export function createMockModelsData() {
  return {
    models: [
      { model: 'claude-3-5-sonnet', tokens: 600000, cost: 20.0, percentage: 40.0, days_active: 25 },
      { model: 'gpt-4o', tokens: 500000, cost: 15.0, percentage: 33.3, days_active: 20 },
      { model: 'claude-3-opus', tokens: 400000, cost: 10.67, percentage: 26.7, days_active: 15 },
    ],
  };
}

/**
 * Create mock leaderboard data
 */
export function createMockLeaderboardData() {
  return {
    users: [
      {
        rank: 1,
        username: 'topuser',
        display_name: 'Top User',
        avatar_url: 'https://example.com/top.jpg',
        tokens: 5000000,
        cost: 150.0,
        streak: 30,
      },
      {
        rank: 2,
        username: 'seconduser',
        display_name: 'Second User',
        avatar_url: null,
        tokens: 3000000,
        cost: 90.0,
        streak: 14,
      },
      {
        rank: 3,
        username: 'testuser',
        display_name: 'Test User',
        avatar_url: 'https://example.com/test.jpg',
        tokens: 1500000,
        cost: 45.0,
        streak: 7,
      },
    ],
  };
}

/**
 * Create mock user profile data
 */
export function createMockUserProfile(overrides?: Partial<MockUser>) {
  return {
    id: 'user-123',
    username: 'testuser',
    display_name: 'Test User',
    bio: 'A test user bio',
    avatar_url: 'https://example.com/avatar.jpg',
    is_public: true,
    total_tokens: 1500000,
    total_cost: 45.67,
    current_streak: 7,
    longest_streak: 14,
    level: 5,
    joined_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}
