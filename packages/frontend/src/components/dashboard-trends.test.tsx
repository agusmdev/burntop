import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardTrends } from './dashboard-trends';

// Mock the dashboard API hook
vi.mock('@/api/dashboard/dashboard', () => ({
  useGetTrendsApiV1DashboardTrendsGet: vi.fn(),
}));

import { useGetTrendsApiV1DashboardTrendsGet } from '@/api/dashboard/dashboard';

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

describe('DashboardTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton when loading', () => {
    vi.mocked(useGetTrendsApiV1DashboardTrendsGet).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useGetTrendsApiV1DashboardTrendsGet>);

    const { container } = render(<DashboardTrends />, { wrapper: createWrapper() });

    // Should show skeleton elements
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error message when API fails', () => {
    vi.mocked(useGetTrendsApiV1DashboardTrendsGet).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API Error'),
    } as ReturnType<typeof useGetTrendsApiV1DashboardTrendsGet>);

    render(<DashboardTrends />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed to load trends data')).toBeInTheDocument();
  });

  it('shows empty state when no trend data', () => {
    vi.mocked(useGetTrendsApiV1DashboardTrendsGet).mockReturnValue({
      data: { status: 200, data: { daily_data: [] } },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetTrendsApiV1DashboardTrendsGet>);

    render(<DashboardTrends />, { wrapper: createWrapper() });

    expect(
      screen.getByText('No usage data available for the past 30 days')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Start using AI tools to see your trends here')
    ).toBeInTheDocument();
  });

  it('renders usage over time chart with data', () => {
    vi.mocked(useGetTrendsApiV1DashboardTrendsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          daily_data: [
            { date: '2024-01-01', tokens: 50000, cost: 1.5, input_tokens: 30000, output_tokens: 20000 },
            { date: '2024-01-02', tokens: 75000, cost: 2.25, input_tokens: 45000, output_tokens: 30000 },
            { date: '2024-01-03', tokens: 100000, cost: 3.0, input_tokens: 60000, output_tokens: 40000 },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetTrendsApiV1DashboardTrendsGet>);

    render(<DashboardTrends />, { wrapper: createWrapper() });

    // Check section heading
    expect(screen.getByText('Usage Over Time')).toBeInTheDocument();
  });

  it('displays summary stats cards', () => {
    vi.mocked(useGetTrendsApiV1DashboardTrendsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          daily_data: [
            { date: '2024-01-01', tokens: 50000, cost: 1.5 },
            { date: '2024-01-02', tokens: 75000, cost: 2.25 },
            { date: '2024-01-03', tokens: 100000, cost: 3.0 },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetTrendsApiV1DashboardTrendsGet>);

    render(<DashboardTrends />, { wrapper: createWrapper() });

    // Summary stat labels
    expect(screen.getByText('30-Day Tokens')).toBeInTheDocument();
    expect(screen.getByText('30-Day Cost')).toBeInTheDocument();
    expect(screen.getByText('Daily Average')).toBeInTheDocument();
    expect(screen.getByText('Active Days')).toBeInTheDocument();
  });

  it('calculates total tokens correctly', () => {
    vi.mocked(useGetTrendsApiV1DashboardTrendsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          daily_data: [
            { date: '2024-01-01', tokens: 500000, cost: 15.0 },
            { date: '2024-01-02', tokens: 500000, cost: 15.0 },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetTrendsApiV1DashboardTrendsGet>);

    render(<DashboardTrends />, { wrapper: createWrapper() });

    // Total should be 1M (500K + 500K)
    expect(screen.getByText('1.0M')).toBeInTheDocument();
  });

  it('calculates total cost correctly', () => {
    vi.mocked(useGetTrendsApiV1DashboardTrendsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          daily_data: [
            { date: '2024-01-01', tokens: 500000, cost: 15.0 },
            { date: '2024-01-02', tokens: 500000, cost: 10.0 },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetTrendsApiV1DashboardTrendsGet>);

    render(<DashboardTrends />, { wrapper: createWrapper() });

    // Total cost should be $25.00
    expect(screen.getByText('$25.00')).toBeInTheDocument();
  });

  it('calculates active days correctly', () => {
    vi.mocked(useGetTrendsApiV1DashboardTrendsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          daily_data: [
            { date: '2024-01-01', tokens: 500000, cost: 15.0 },
            { date: '2024-01-02', tokens: 0, cost: 0 }, // inactive day
            { date: '2024-01-03', tokens: 300000, cost: 9.0 },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetTrendsApiV1DashboardTrendsGet>);

    render(<DashboardTrends />, { wrapper: createWrapper() });

    // Should show 2 active days out of 30
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('/30')).toBeInTheDocument();
  });

  it('calculates daily average correctly', () => {
    vi.mocked(useGetTrendsApiV1DashboardTrendsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          daily_data: [
            { date: '2024-01-01', tokens: 300000, cost: 9.0 },
            { date: '2024-01-02', tokens: 600000, cost: 18.0 },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetTrendsApiV1DashboardTrendsGet>);

    render(<DashboardTrends />, { wrapper: createWrapper() });

    // Average should be 450K (900K / 2)
    expect(screen.getByText('450.0K')).toBeInTheDocument();
  });

  it('requests 30 days of data', () => {
    vi.mocked(useGetTrendsApiV1DashboardTrendsGet).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useGetTrendsApiV1DashboardTrendsGet>);

    render(<DashboardTrends />, { wrapper: createWrapper() });

    // Should be called with days: 30
    expect(useGetTrendsApiV1DashboardTrendsGet).toHaveBeenCalledWith({ days: 30 });
  });
});
