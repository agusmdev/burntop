import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardTools } from './dashboard-tools';

// Mock the dashboard API hook
vi.mock('@/api/dashboard/dashboard', () => ({
  useGetToolsBreakdownApiV1DashboardToolsGet: vi.fn(),
}));

import { useGetToolsBreakdownApiV1DashboardToolsGet } from '@/api/dashboard/dashboard';

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

describe('DashboardTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton when loading', () => {
    vi.mocked(useGetToolsBreakdownApiV1DashboardToolsGet).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useGetToolsBreakdownApiV1DashboardToolsGet>);

    const { container } = render(<DashboardTools />, { wrapper: createWrapper() });

    // Should show skeleton elements
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error message when API fails', () => {
    vi.mocked(useGetToolsBreakdownApiV1DashboardToolsGet).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API Error'),
    } as ReturnType<typeof useGetToolsBreakdownApiV1DashboardToolsGet>);

    render(<DashboardTools />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed to load tools data')).toBeInTheDocument();
  });

  it('shows empty state when no tools data', () => {
    vi.mocked(useGetToolsBreakdownApiV1DashboardToolsGet).mockReturnValue({
      data: { status: 200, data: { tools: [] } },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetToolsBreakdownApiV1DashboardToolsGet>);

    render(<DashboardTools />, { wrapper: createWrapper() });

    expect(screen.getByText('No tool usage data available')).toBeInTheDocument();
    expect(
      screen.getByText('Start using AI tools to see your tool breakdown')
    ).toBeInTheDocument();
  });

  it('renders tool distribution chart with data', () => {
    vi.mocked(useGetToolsBreakdownApiV1DashboardToolsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          tools: [
            { source: 'cursor', tokens: 800000, cost: 25.0, percentage: 53.3, days_active: 25 },
            { source: 'claude-code', tokens: 500000, cost: 15.0, percentage: 33.3, days_active: 20 },
            { source: 'chatgpt', tokens: 200000, cost: 5.67, percentage: 13.4, days_active: 10 },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetToolsBreakdownApiV1DashboardToolsGet>);

    render(<DashboardTools />, { wrapper: createWrapper() });

    // Check section headings
    expect(screen.getByText('Token Distribution by Tool')).toBeInTheDocument();
    expect(screen.getByText('Cost by Tool')).toBeInTheDocument();
    expect(screen.getByText('Detailed Breakdown')).toBeInTheDocument();
  });

  it('displays total tokens in chart center', () => {
    vi.mocked(useGetToolsBreakdownApiV1DashboardToolsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          tools: [
            { source: 'cursor', tokens: 800000, cost: 25.0, percentage: 53.3, days_active: 25 },
            { source: 'claude-code', tokens: 500000, cost: 15.0, percentage: 33.3, days_active: 20 },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetToolsBreakdownApiV1DashboardToolsGet>);

    render(<DashboardTools />, { wrapper: createWrapper() });

    // Total tokens should be 1.3M (800K + 500K)
    expect(screen.getByText('1.3M')).toBeInTheDocument();
    expect(screen.getByText('Total Tokens')).toBeInTheDocument();
  });

  it('displays total cost in cost section', () => {
    vi.mocked(useGetToolsBreakdownApiV1DashboardToolsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          tools: [
            { source: 'cursor', tokens: 800000, cost: 25.0, percentage: 50, days_active: 25 },
            { source: 'claude-code', tokens: 800000, cost: 25.0, percentage: 50, days_active: 20 },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetToolsBreakdownApiV1DashboardToolsGet>);

    render(<DashboardTools />, { wrapper: createWrapper() });

    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('total spent')).toBeInTheDocument();
  });

  it('shows tool icons with correct names in legend', () => {
    vi.mocked(useGetToolsBreakdownApiV1DashboardToolsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          tools: [
            { source: 'cursor', tokens: 800000, cost: 25.0, percentage: 53.3, days_active: 25 },
            { source: 'claude-code', tokens: 500000, cost: 15.0, percentage: 33.3, days_active: 20 },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetToolsBreakdownApiV1DashboardToolsGet>);

    render(<DashboardTools />, { wrapper: createWrapper() });

    // Check that tool names are displayed (in legend and table)
    expect(screen.getAllByText('Cursor').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Claude Code').length).toBeGreaterThan(0);
  });

  it('displays table with tool details', () => {
    vi.mocked(useGetToolsBreakdownApiV1DashboardToolsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          tools: [
            { source: 'cursor', tokens: 800000, cost: 25.0, percentage: 53.3, days_active: 25 },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetToolsBreakdownApiV1DashboardToolsGet>);

    render(<DashboardTools />, { wrapper: createWrapper() });

    // Table headers
    expect(screen.getByText('Tool')).toBeInTheDocument();
    expect(screen.getByText('Tokens')).toBeInTheDocument();
    expect(screen.getByText('Cost')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();

    // Table data
    expect(screen.getByText('800,000')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByText('53.3%')).toBeInTheDocument();
  });
});
