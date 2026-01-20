import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardInsights } from './dashboard-insights';

// Mock the insights API hook
vi.mock('@/api/insights/insights', () => ({
  useGetUserInsightsApiV1InsightsGet: vi.fn(),
}));

import { useGetUserInsightsApiV1InsightsGet } from '@/api/insights/insights';

// Wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockInsightsData = {
  user_total_tokens: 1500000,
  user_total_cost: 45.67,
  user_current_streak: 7,
  user_cache_efficiency: 25.5,
  user_unique_tools: 4,
  tokens_percentile: 75.0,
  cost_percentile: 80.0,
  streak_percentile: 60.0,
  cache_efficiency_percentile: 55.0,
  tools_percentile: 70.0,
  community_avg_tokens: 1000000,
  community_avg_cost: 30.0,
  community_avg_streak: 5,
  community_avg_cache_efficiency: 20.0,
  community_avg_unique_tools: 3,
  community_total_users: 5000,
  is_above_average_tokens: true,
  is_above_average_streak: true,
  is_above_average_cache_efficiency: true,
};

describe('DashboardInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton when loading', () => {
    vi.mocked(useGetUserInsightsApiV1InsightsGet).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useGetUserInsightsApiV1InsightsGet>);

    const { container } = render(<DashboardInsights />, { wrapper: createWrapper() });

    // Should show skeleton elements
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error message when API fails', () => {
    vi.mocked(useGetUserInsightsApiV1InsightsGet).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API Error'),
    } as ReturnType<typeof useGetUserInsightsApiV1InsightsGet>);

    render(<DashboardInsights />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed to load insights')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    vi.mocked(useGetUserInsightsApiV1InsightsGet).mockReturnValue({
      data: { status: 200, data: null },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetUserInsightsApiV1InsightsGet>);

    render(<DashboardInsights />, { wrapper: createWrapper() });

    expect(screen.getByText('No Insights Available')).toBeInTheDocument();
  });

  it('renders insights with data', () => {
    vi.mocked(useGetUserInsightsApiV1InsightsGet).mockReturnValue({
      data: {
        status: 200,
        data: mockInsightsData,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetUserInsightsApiV1InsightsGet>);

    render(<DashboardInsights />, { wrapper: createWrapper() });

    // Check main heading
    expect(screen.getByText('Your Insights')).toBeInTheDocument();
    expect(screen.getByText(/See how you compare to/)).toBeInTheDocument();
    expect(screen.getByText('5,000')).toBeInTheDocument();
  });

  it('displays percentile ranking cards', () => {
    vi.mocked(useGetUserInsightsApiV1InsightsGet).mockReturnValue({
      data: {
        status: 200,
        data: mockInsightsData,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetUserInsightsApiV1InsightsGet>);

    render(<DashboardInsights />, { wrapper: createWrapper() });

    // Check card labels
    expect(screen.getByText('Total Tokens')).toBeInTheDocument();
    expect(screen.getByText('Estimated Cost')).toBeInTheDocument();
    expect(screen.getByText('Current Streak')).toBeInTheDocument();
    expect(screen.getByText('Cache Efficiency')).toBeInTheDocument();
    expect(screen.getByText('Unique Tools')).toBeInTheDocument();
  });

  it('displays user values in ranking cards', () => {
    vi.mocked(useGetUserInsightsApiV1InsightsGet).mockReturnValue({
      data: {
        status: 200,
        data: mockInsightsData,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetUserInsightsApiV1InsightsGet>);

    render(<DashboardInsights />, { wrapper: createWrapper() });

    // User values should be displayed
    expect(screen.getByText('1,500,000')).toBeInTheDocument(); // tokens
    expect(screen.getByText('$45.67')).toBeInTheDocument(); // cost
    expect(screen.getByText('7')).toBeInTheDocument(); // streak
  });

  it('displays community averages', () => {
    vi.mocked(useGetUserInsightsApiV1InsightsGet).mockReturnValue({
      data: {
        status: 200,
        data: mockInsightsData,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetUserInsightsApiV1InsightsGet>);

    render(<DashboardInsights />, { wrapper: createWrapper() });

    // Community average labels should be present
    const communityAvgLabels = screen.getAllByText('Community Average');
    expect(communityAvgLabels.length).toBeGreaterThan(0);
  });

  it('displays key insights messages', () => {
    vi.mocked(useGetUserInsightsApiV1InsightsGet).mockReturnValue({
      data: {
        status: 200,
        data: mockInsightsData,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetUserInsightsApiV1InsightsGet>);

    render(<DashboardInsights />, { wrapper: createWrapper() });

    // Key insights section
    expect(screen.getByText('Key Insights')).toBeInTheDocument();

    // Check for insight messages based on above_average flags
    expect(
      screen.getByText(/You've used 1,500,000 tokens, which is above the community average!/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your 7 day streak is impressive/i)
    ).toBeInTheDocument();
  });

  it('shows percentile badges', () => {
    vi.mocked(useGetUserInsightsApiV1InsightsGet).mockReturnValue({
      data: {
        status: 200,
        data: mockInsightsData,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetUserInsightsApiV1InsightsGet>);

    render(<DashboardInsights />, { wrapper: createWrapper() });

    // Should show percentile badges like "Top 25%" for 75th percentile
    expect(screen.getByText('Top 25%')).toBeInTheDocument(); // tokens_percentile = 75
    expect(screen.getByText('Top 20%')).toBeInTheDocument(); // cost_percentile = 80
  });

  it('has period selector tabs', () => {
    vi.mocked(useGetUserInsightsApiV1InsightsGet).mockReturnValue({
      data: {
        status: 200,
        data: mockInsightsData,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetUserInsightsApiV1InsightsGet>);

    render(<DashboardInsights />, { wrapper: createWrapper() });

    // Period tabs should be present
    expect(screen.getByText('Week')).toBeInTheDocument();
    expect(screen.getByText('Month')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();
  });

  it('changes period when tab is clicked', () => {
    vi.mocked(useGetUserInsightsApiV1InsightsGet).mockReturnValue({
      data: {
        status: 200,
        data: mockInsightsData,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetUserInsightsApiV1InsightsGet>);

    render(<DashboardInsights />, { wrapper: createWrapper() });

    // Click on Week tab
    fireEvent.click(screen.getByText('Week'));

    // Should call API with week period
    expect(useGetUserInsightsApiV1InsightsGet).toHaveBeenCalledWith({ period: 'week' });
  });

  it('defaults to all-time period', () => {
    vi.mocked(useGetUserInsightsApiV1InsightsGet).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useGetUserInsightsApiV1InsightsGet>);

    render(<DashboardInsights />, { wrapper: createWrapper() });

    // Should be called with 'all' period initially
    expect(useGetUserInsightsApiV1InsightsGet).toHaveBeenCalledWith({ period: 'all' });
  });

  it('shows progress bars for percentiles', () => {
    vi.mocked(useGetUserInsightsApiV1InsightsGet).mockReturnValue({
      data: {
        status: 200,
        data: mockInsightsData,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetUserInsightsApiV1InsightsGet>);

    const { container } = render(<DashboardInsights />, { wrapper: createWrapper() });

    // Progress elements should be present
    const progressBars = container.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('shows "Better than X% of users" text', () => {
    vi.mocked(useGetUserInsightsApiV1InsightsGet).mockReturnValue({
      data: {
        status: 200,
        data: mockInsightsData,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetUserInsightsApiV1InsightsGet>);

    render(<DashboardInsights />, { wrapper: createWrapper() });

    // Should show percentile comparison text
    expect(screen.getByText(/Better than 75% of users/)).toBeInTheDocument();
  });
});
