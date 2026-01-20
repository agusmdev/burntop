import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { formatCompactNumber, LeaderboardRow, LeaderboardRowSkeleton } from './leaderboard-row';

// Wrap table elements in a proper table structure for testing
function renderInTable(children: React.ReactNode) {
  return render(
    <table>
      <tbody>{children}</tbody>
    </table>
  );
}

describe('formatCompactNumber', () => {
  it('formats numbers less than 1000 as-is', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(500)).toBe('500');
    expect(formatCompactNumber(999)).toBe('999');
  });

  it('formats thousands with K suffix', () => {
    expect(formatCompactNumber(1000)).toBe('1K');
    expect(formatCompactNumber(1500)).toBe('1.5K');
    expect(formatCompactNumber(10000)).toBe('10K');
    expect(formatCompactNumber(999999)).toBe('1000K');
  });

  it('formats millions with M suffix', () => {
    expect(formatCompactNumber(1000000)).toBe('1M');
    expect(formatCompactNumber(1500000)).toBe('1.5M');
    expect(formatCompactNumber(10000000)).toBe('10M');
    expect(formatCompactNumber(999999999)).toBe('1000M');
  });

  it('formats billions with B suffix', () => {
    expect(formatCompactNumber(1000000000)).toBe('1B');
    expect(formatCompactNumber(1500000000)).toBe('1.5B');
    expect(formatCompactNumber(10000000000)).toBe('10B');
  });

  it('removes trailing .0', () => {
    expect(formatCompactNumber(1000)).toBe('1K');
    expect(formatCompactNumber(2000)).toBe('2K');
    expect(formatCompactNumber(1000000)).toBe('1M');
  });
});

describe('LeaderboardRow', () => {
  const defaultProps = {
    rank: 1,
    username: 'testuser',
    tokens: '1.5M',
    cost: '$45.00',
    streak: 0,
    preferredTool: null,
    rankChange: null,
  };

  it('renders rank with # prefix', () => {
    renderInTable(<LeaderboardRow {...defaultProps} />);

    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('renders username', () => {
    renderInTable(<LeaderboardRow {...defaultProps} />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('renders display name when provided', () => {
    renderInTable(<LeaderboardRow {...defaultProps} displayName="Test User" />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.queryByText('testuser')).not.toBeInTheDocument();
  });

  it('renders tokens', () => {
    renderInTable(<LeaderboardRow {...defaultProps} />);

    expect(screen.getByText('1.5M')).toBeInTheDocument();
  });

  it('renders cost', () => {
    renderInTable(<LeaderboardRow {...defaultProps} />);

    expect(screen.getByText('$45.00')).toBeInTheDocument();
  });

  it('renders avatar image when provided', () => {
    renderInTable(<LeaderboardRow {...defaultProps} avatarUrl="https://example.com/avatar.jpg" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(img).toHaveAttribute('alt', "testuser's avatar");
  });

  it('renders avatar fallback with initials', () => {
    renderInTable(<LeaderboardRow {...defaultProps} displayName="John Doe" />);

    // Avatar fallback should show initials
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders initials from username when no display name', () => {
    renderInTable(<LeaderboardRow {...defaultProps} username="john" />);

    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('handles hyphenated names for initials', () => {
    renderInTable(<LeaderboardRow {...defaultProps} displayName="John-Paul Smith" />);

    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('handles underscore names for initials', () => {
    renderInTable(<LeaderboardRow {...defaultProps} displayName="john_smith" />);

    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  describe('streak display', () => {
    it('shows streak when greater than 0', () => {
      renderInTable(<LeaderboardRow {...defaultProps} streak={7} />);

      expect(screen.getByText('7d')).toBeInTheDocument();
    });

    it('shows em-dash when streak is 0', () => {
      renderInTable(<LeaderboardRow {...defaultProps} streak={0} />);

      // Streak cell now always renders, shows em-dash when 0
      const cells = screen.getAllByText('—');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe('rank change indicator', () => {
    it('shows up arrow for positive rank change', () => {
      renderInTable(<LeaderboardRow {...defaultProps} rankChange={3} />);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByLabelText('Up 3 positions')).toBeInTheDocument();
    });

    it('shows down arrow for negative rank change', () => {
      renderInTable(<LeaderboardRow {...defaultProps} rankChange={-2} />);

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByLabelText('Down 2 positions')).toBeInTheDocument();
    });

    it('shows dash for no rank change', () => {
      renderInTable(<LeaderboardRow {...defaultProps} rankChange={0} />);

      expect(screen.getByLabelText('No rank change')).toBeInTheDocument();
    });

    it('uses singular form for 1 position change', () => {
      renderInTable(<LeaderboardRow {...defaultProps} rankChange={1} />);

      expect(screen.getByLabelText('Up 1 position')).toBeInTheDocument();
    });

    it('shows em-dash when rank change is null', () => {
      renderInTable(<LeaderboardRow {...defaultProps} rankChange={null} />);

      // Cell always renders, shows em-dash when null
      const cells = screen.getAllByText('—');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe('current user highlighting', () => {
    it('applies highlight styles when isCurrentUser', () => {
      renderInTable(<LeaderboardRow {...defaultProps} isCurrentUser />);

      const row = screen.getByRole('row');
      expect(row).toHaveClass('bg-ember-500/5');
      expect(row).toHaveClass('border-l-ember-500');
    });

    it('does not apply highlight when not current user', () => {
      renderInTable(<LeaderboardRow {...defaultProps} />);

      const row = screen.getByRole('row');
      expect(row).not.toHaveClass('bg-ember-500/5');
    });
  });

  describe('top 3 rank styling', () => {
    it('applies amber color to rank 1', () => {
      renderInTable(<LeaderboardRow {...defaultProps} rank={1} />);

      const rankElement = screen.getByText('#1');
      expect(rankElement).toHaveClass('text-amber-400');
    });

    it('applies slate color to rank 2', () => {
      renderInTable(<LeaderboardRow {...defaultProps} rank={2} />);

      const rankElement = screen.getByText('#2');
      expect(rankElement).toHaveClass('text-slate-300');
    });

    it('applies amber color to rank 3', () => {
      renderInTable(<LeaderboardRow {...defaultProps} rank={3} />);

      const rankElement = screen.getByText('#3');
      expect(rankElement).toHaveClass('text-amber-600');
    });

    it('applies tertiary color to ranks beyond 3', () => {
      renderInTable(<LeaderboardRow {...defaultProps} rank={4} />);

      const rankElement = screen.getByText('#4');
      expect(rankElement).toHaveClass('text-text-tertiary');
    });
  });

  it('applies custom className', () => {
    renderInTable(<LeaderboardRow {...defaultProps} className="custom-row" />);

    const row = screen.getByRole('row');
    expect(row).toHaveClass('custom-row');
  });
});

describe('LeaderboardRowSkeleton', () => {
  it('renders skeleton elements', () => {
    const { container } = renderInTable(<LeaderboardRowSkeleton />);

    const skeletonElements = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('shows follow columns when showFollowColumns is true', () => {
    const { container } = renderInTable(<LeaderboardRowSkeleton showFollowColumns />);

    // Should have additional skeleton elements for followers and follow button
    const skeletonElements = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletonElements.length).toBeGreaterThan(5);
  });

  it('applies custom className', () => {
    renderInTable(<LeaderboardRowSkeleton className="custom-skeleton" />);

    const row = screen.getByRole('row');
    expect(row).toHaveClass('custom-skeleton');
  });
});
