import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardModels } from './dashboard-models';

// Mock the dashboard API hook
vi.mock('@/api/dashboard/dashboard', () => ({
  useGetModelsBreakdownApiV1DashboardModelsGet: vi.fn(),
}));

import { useGetModelsBreakdownApiV1DashboardModelsGet } from '@/api/dashboard/dashboard';

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

describe('DashboardModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton when loading', () => {
    vi.mocked(useGetModelsBreakdownApiV1DashboardModelsGet).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useGetModelsBreakdownApiV1DashboardModelsGet>);

    const { container } = render(<DashboardModels />, { wrapper: createWrapper() });

    // Should show skeleton elements
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error message when API fails', () => {
    vi.mocked(useGetModelsBreakdownApiV1DashboardModelsGet).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API Error'),
    } as ReturnType<typeof useGetModelsBreakdownApiV1DashboardModelsGet>);

    render(<DashboardModels />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed to load models data')).toBeInTheDocument();
  });

  it('shows empty state when no models data', () => {
    vi.mocked(useGetModelsBreakdownApiV1DashboardModelsGet).mockReturnValue({
      data: { status: 200, data: { models: [] } },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetModelsBreakdownApiV1DashboardModelsGet>);

    render(<DashboardModels />, { wrapper: createWrapper() });

    expect(screen.getByText('No model usage data available')).toBeInTheDocument();
    expect(
      screen.getByText('Start using AI tools to see your model breakdown')
    ).toBeInTheDocument();
  });

  it('renders model distribution chart with data', () => {
    vi.mocked(useGetModelsBreakdownApiV1DashboardModelsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          models: [
            {
              model: 'claude-3-5-sonnet',
              tokens: 600000,
              cost: 20.0,
              percentage: 40.0,
              days_active: 25,
            },
            {
              model: 'gpt-4o',
              tokens: 500000,
              cost: 15.0,
              percentage: 33.3,
              days_active: 20,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetModelsBreakdownApiV1DashboardModelsGet>);

    render(<DashboardModels />, { wrapper: createWrapper() });

    // Check section headings
    expect(screen.getByText('Token Distribution')).toBeInTheDocument();
    expect(screen.getByText('Cost by Model')).toBeInTheDocument();
    expect(screen.getByText('Detailed Breakdown')).toBeInTheDocument();
  });

  it('displays total tokens in chart center', () => {
    vi.mocked(useGetModelsBreakdownApiV1DashboardModelsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          models: [
            {
              model: 'claude-3-5-sonnet',
              tokens: 600000,
              cost: 20.0,
              percentage: 54.5,
              days_active: 25,
            },
            {
              model: 'gpt-4o',
              tokens: 500000,
              cost: 15.0,
              percentage: 45.5,
              days_active: 20,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetModelsBreakdownApiV1DashboardModelsGet>);

    render(<DashboardModels />, { wrapper: createWrapper() });

    // Total tokens should be 1.1M (600K + 500K)
    expect(screen.getByText('1.1M')).toBeInTheDocument();
    expect(screen.getByText('Total Tokens')).toBeInTheDocument();
  });

  it('displays total cost in cost section', () => {
    vi.mocked(useGetModelsBreakdownApiV1DashboardModelsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          models: [
            { model: 'claude-3-5-sonnet', tokens: 600000, cost: 20.0, percentage: 50, days_active: 25 },
            { model: 'gpt-4o', tokens: 500000, cost: 15.0, percentage: 50, days_active: 20 },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetModelsBreakdownApiV1DashboardModelsGet>);

    render(<DashboardModels />, { wrapper: createWrapper() });

    expect(screen.getByText('$35.00')).toBeInTheDocument();
    expect(screen.getByText('total spent')).toBeInTheDocument();
  });

  it('formats model names correctly in legend', () => {
    vi.mocked(useGetModelsBreakdownApiV1DashboardModelsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          models: [
            {
              model: 'claude-3-5-sonnet',
              tokens: 600000,
              cost: 20.0,
              percentage: 100,
              days_active: 25,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetModelsBreakdownApiV1DashboardModelsGet>);

    render(<DashboardModels />, { wrapper: createWrapper() });

    // Check that formatted model names are displayed
    // "claude-3-5-sonnet" should become something like "Claude 3.5 Sonnet"
    expect(screen.getAllByText(/Claude/i).length).toBeGreaterThan(0);
  });

  it('displays table with model details', () => {
    vi.mocked(useGetModelsBreakdownApiV1DashboardModelsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          models: [
            {
              model: 'gpt-4o',
              tokens: 500000,
              cost: 15.0,
              percentage: 100.0,
              days_active: 20,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetModelsBreakdownApiV1DashboardModelsGet>);

    render(<DashboardModels />, { wrapper: createWrapper() });

    // Table headers
    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.getByText('Tokens')).toBeInTheDocument();
    expect(screen.getByText('Cost')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();

    // Table data
    expect(screen.getByText('500,000')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('shows color indicators in table rows', () => {
    vi.mocked(useGetModelsBreakdownApiV1DashboardModelsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          models: [
            { model: 'gpt-4o', tokens: 500000, cost: 15.0, percentage: 50, days_active: 20 },
            { model: 'claude-3-opus', tokens: 500000, cost: 20.0, percentage: 50, days_active: 15 },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetModelsBreakdownApiV1DashboardModelsGet>);

    const { container } = render(<DashboardModels />, { wrapper: createWrapper() });

    // Each model row should have a color indicator (rounded-full div)
    const colorIndicators = container.querySelectorAll('.rounded-full');
    expect(colorIndicators.length).toBeGreaterThan(0);
  });

  it('displays days active column', () => {
    vi.mocked(useGetModelsBreakdownApiV1DashboardModelsGet).mockReturnValue({
      data: {
        status: 200,
        data: {
          models: [
            { model: 'gpt-4o', tokens: 500000, cost: 15.0, percentage: 100, days_active: 25 },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGetModelsBreakdownApiV1DashboardModelsGet>);

    render(<DashboardModels />, { wrapper: createWrapper() });

    // Should show days active
    expect(screen.getByText('25')).toBeInTheDocument();
  });
});
