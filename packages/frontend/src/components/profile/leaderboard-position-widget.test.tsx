import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  LeaderboardPositionWidget,
  LeaderboardPositionWidgetSkeleton,
} from './leaderboard-position-widget';

// Mock TanStack Router Link
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Mock entry data
const mockEntry = {
  id: 'entry-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  user_id: 'user-1',
  rank: 5,
  username: 'testuser',
  display_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  total_tokens: 1500000,
  total_cost: 45.67,
  current_streak: 7,
  rank_change: 2,
  followers_count: 0,
};

describe('LeaderboardPositionWidget', () => {
  it('shows "Not ranked yet" when entry is null', () => {
    render(<LeaderboardPositionWidget entry={null} />);

    expect(screen.getByText('Not ranked yet')).toBeInTheDocument();
    expect(
      screen.getByText('Sync your usage to appear on the leaderboard')
    ).toBeInTheDocument();
  });

  it('displays rank with # prefix', () => {
    render(<LeaderboardPositionWidget entry={mockEntry} />);

    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  it('displays total users when provided', () => {
    render(<LeaderboardPositionWidget entry={mockEntry} totalUsers={10000} />);

    expect(screen.getByText('of 10.0K')).toBeInTheDocument();
  });

  it('formats large user counts', () => {
    render(<LeaderboardPositionWidget entry={mockEntry} totalUsers={1500000} />);

    expect(screen.getByText('of 1.5M')).toBeInTheDocument();
  });

  it('displays token count', () => {
    render(<LeaderboardPositionWidget entry={mockEntry} />);

    expect(screen.getByText('1.5M tokens')).toBeInTheDocument();
  });

  it('shows positive rank change indicator', () => {
    render(<LeaderboardPositionWidget entry={{ ...mockEntry, rank_change: 3 }} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    // Should have success color class
    const badge = screen.getByText('3').parentElement;
    expect(badge).toHaveClass('text-success');
  });

  it('shows negative rank change indicator', () => {
    render(<LeaderboardPositionWidget entry={{ ...mockEntry, rank_change: -2 }} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    // Should have error color class
    const badge = screen.getByText('2').parentElement;
    expect(badge).toHaveClass('text-error');
  });

  it('shows zero rank change indicator when rank_change is 0', () => {
    render(<LeaderboardPositionWidget entry={{ ...mockEntry, rank_change: 0 }} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('hides rank change when null', () => {
    render(<LeaderboardPositionWidget entry={{ ...mockEntry, rank_change: null }} />);

    // Should not show any rank change indicator
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
  });

  it('links to leaderboard page', () => {
    render(<LeaderboardPositionWidget entry={mockEntry} />);

    const link = screen.getByText('View Leaderboard →').closest('a');
    expect(link).toHaveAttribute('href', '/leaderboard');
  });

  it('displays "Global Leaderboard" label', () => {
    render(<LeaderboardPositionWidget entry={mockEntry} />);

    expect(screen.getByText('Global Leaderboard')).toBeInTheDocument();
  });

  describe('rank styling', () => {
    it('applies gold styling for rank 1', () => {
      const { container } = render(
        <LeaderboardPositionWidget entry={{ ...mockEntry, rank: 1 }} />
      );

      const link = container.querySelector('a');
      expect(link).toHaveClass('text-amber-400');
    });

    it('applies silver styling for rank 2', () => {
      const { container } = render(
        <LeaderboardPositionWidget entry={{ ...mockEntry, rank: 2 }} />
      );

      const link = container.querySelector('a');
      expect(link).toHaveClass('text-gray-300');
    });

    it('applies bronze styling for rank 3', () => {
      const { container } = render(
        <LeaderboardPositionWidget entry={{ ...mockEntry, rank: 3 }} />
      );

      const link = container.querySelector('a');
      expect(link).toHaveClass('text-amber-600');
    });

    it('applies default styling for ranks beyond 3', () => {
      const { container } = render(
        <LeaderboardPositionWidget entry={{ ...mockEntry, rank: 10 }} />
      );

      const link = container.querySelector('a');
      expect(link).toHaveClass('text-text-primary');
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <LeaderboardPositionWidget entry={mockEntry} className="custom-widget" />
    );

    const link = container.querySelector('a');
    expect(link).toHaveClass('custom-widget');
  });

  it('applies custom className to not ranked state', () => {
    const { container } = render(
      <LeaderboardPositionWidget entry={null} className="custom-widget" />
    );

    expect(container.firstChild).toHaveClass('custom-widget');
  });
});

describe('LeaderboardPositionWidgetSkeleton', () => {
  it('renders skeleton elements', () => {
    const { container } = render(<LeaderboardPositionWidgetSkeleton />);

    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    const { container } = render(
      <LeaderboardPositionWidgetSkeleton className="custom-skeleton" />
    );

    expect(container.firstChild).toHaveClass('custom-skeleton');
  });
});
