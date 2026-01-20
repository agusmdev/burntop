import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  BADGE_TIERS,
  formatTokens,
  getBadgeTier,
  getNextTier,
  MonthlyBadge,
  MonthlyBadgeCompact,
  MonthlyBadgeSkeleton,
} from './monthly-badge';

import { TooltipProvider } from '@/components/ui/tooltip';

// Wrapper to provide tooltip context
const renderWithTooltip = (ui: React.ReactNode) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

describe('formatTokens', () => {
  it('formats small numbers with locale string', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(999)).toBe('999');
  });

  it('formats thousands with K suffix', () => {
    expect(formatTokens(1000)).toBe('1.0K');
    expect(formatTokens(1500)).toBe('1.5K');
    expect(formatTokens(999999)).toBe('1000.0K');
  });

  it('formats millions with M suffix', () => {
    expect(formatTokens(1000000)).toBe('1.0M');
    expect(formatTokens(10000000)).toBe('10.0M');
    expect(formatTokens(100000000)).toBe('100.0M');
    expect(formatTokens(999999999)).toBe('1000.0M');
  });

  it('formats billions with B suffix', () => {
    expect(formatTokens(1000000000)).toBe('1.0B');
    expect(formatTokens(5000000000)).toBe('5.0B');
  });
});

describe('getBadgeTier', () => {
  it('returns "None" tier for tokens under 10M', () => {
    expect(getBadgeTier(0).name).toBe('None');
    expect(getBadgeTier(5000000).name).toBe('None');
    expect(getBadgeTier(9999999).name).toBe('None');
  });

  it('returns "Power User" tier for 10M-100M tokens', () => {
    expect(getBadgeTier(10000000).name).toBe('Power User');
    expect(getBadgeTier(50000000).name).toBe('Power User');
    expect(getBadgeTier(99999999).name).toBe('Power User');
  });

  it('returns "AI Native" tier for 100M-1B tokens', () => {
    expect(getBadgeTier(100000000).name).toBe('AI Native');
    expect(getBadgeTier(500000000).name).toBe('AI Native');
    expect(getBadgeTier(999999999).name).toBe('AI Native');
  });

  it('returns "Token Titan" tier for 1B+ tokens', () => {
    expect(getBadgeTier(1000000000).name).toBe('Token Titan');
    expect(getBadgeTier(5000000000).name).toBe('Token Titan');
  });
});

describe('getNextTier', () => {
  it('returns next tier for "None"', () => {
    const currentTier = getBadgeTier(5000000);
    const nextTier = getNextTier(currentTier);
    expect(nextTier?.name).toBe('Power User');
  });

  it('returns next tier for "Power User"', () => {
    const currentTier = getBadgeTier(50000000);
    const nextTier = getNextTier(currentTier);
    expect(nextTier?.name).toBe('AI Native');
  });

  it('returns next tier for "AI Native"', () => {
    const currentTier = getBadgeTier(500000000);
    const nextTier = getNextTier(currentTier);
    expect(nextTier?.name).toBe('Token Titan');
  });

  it('returns null for "Token Titan"', () => {
    const currentTier = getBadgeTier(5000000000);
    const nextTier = getNextTier(currentTier);
    expect(nextTier).toBeNull();
  });
});

describe('BADGE_TIERS', () => {
  it('has correct number of tiers', () => {
    expect(BADGE_TIERS).toHaveLength(4);
  });

  it('has correct tier order', () => {
    expect(BADGE_TIERS[0].name).toBe('None');
    expect(BADGE_TIERS[1].name).toBe('Power User');
    expect(BADGE_TIERS[2].name).toBe('AI Native');
    expect(BADGE_TIERS[3].name).toBe('Token Titan');
  });

  it('has ascending minTokens', () => {
    for (let i = 1; i < BADGE_TIERS.length; i++) {
      expect(BADGE_TIERS[i].minTokens).toBeGreaterThan(BADGE_TIERS[i - 1].minTokens);
    }
  });
});

describe('MonthlyBadge', () => {
  it('renders token count', () => {
    renderWithTooltip(<MonthlyBadge monthlyTokens={5000000} />);

    // Progress text shows current / next threshold
    expect(screen.getByText(/5\.0M/)).toBeInTheDocument();
  });

  it('shows progress toward next tier', () => {
    renderWithTooltip(<MonthlyBadge monthlyTokens={5000000} showProgress />);

    // Should show progress like "5.0M / 10.0M"
    expect(screen.getByText('5.0M / 10.0M')).toBeInTheDocument();
  });

  it('shows only token count for Token Titan', () => {
    renderWithTooltip(<MonthlyBadge monthlyTokens={2000000000} />);

    // Token Titan should just show the count, no progress
    expect(screen.getByText('2.0B')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    renderWithTooltip(<MonthlyBadge monthlyTokens={50000000} />);

    const badge = screen.getByRole('generic', { hidden: true }).closest('span[aria-label]');
    expect(badge).toHaveAttribute('aria-label', 'Power User - 50.0M tokens');
  });

  it('shows "No Badge" in aria-label for None tier', () => {
    renderWithTooltip(<MonthlyBadge monthlyTokens={5000000} />);

    const badge = screen.getByLabelText(/No Badge/);
    expect(badge).toBeInTheDocument();
  });

  describe('size variants', () => {
    it('applies small size styles', () => {
      const { container } = renderWithTooltip(<MonthlyBadge monthlyTokens={5000000} size="sm" />);

      const badge = container.querySelector('.text-xs');
      expect(badge).toBeInTheDocument();
    });

    it('applies medium size styles (default)', () => {
      const { container } = renderWithTooltip(<MonthlyBadge monthlyTokens={5000000} size="md" />);

      const badge = container.querySelector('.text-sm');
      expect(badge).toBeInTheDocument();
    });

    it('applies large size styles', () => {
      const { container } = renderWithTooltip(<MonthlyBadge monthlyTokens={5000000} size="lg" />);

      const badge = container.querySelector('.text-base');
      expect(badge).toBeInTheDocument();
    });
  });

  it('shows tier name when showName is true', () => {
    renderWithTooltip(<MonthlyBadge monthlyTokens={50000000} showName />);

    expect(screen.getByText('Power User')).toBeInTheDocument();
  });

  it('does not show tier name for None tier even with showName', () => {
    renderWithTooltip(<MonthlyBadge monthlyTokens={5000000} showName />);

    expect(screen.queryByText('None')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    renderWithTooltip(<MonthlyBadge monthlyTokens={50000000} onClick={handleClick} />);

    const badge = screen.getByRole('button');
    fireEvent.click(badge);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('has button role when onClick provided', () => {
    renderWithTooltip(<MonthlyBadge monthlyTokens={50000000} onClick={() => {}} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('supports keyboard navigation', () => {
    const handleClick = vi.fn();
    renderWithTooltip(<MonthlyBadge monthlyTokens={50000000} onClick={handleClick} />);

    const badge = screen.getByRole('button');
    fireEvent.keyDown(badge, { key: 'Enter' });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies glow animation for AI Native tier', () => {
    const { container } = renderWithTooltip(<MonthlyBadge monthlyTokens={500000000} animated />);

    const badge = container.querySelector('.monthly-badge-glow');
    expect(badge).toBeInTheDocument();
  });

  it('applies glow animation for Token Titan tier', () => {
    const { container } = renderWithTooltip(<MonthlyBadge monthlyTokens={2000000000} animated />);

    const badge = container.querySelector('.monthly-badge-glow');
    expect(badge).toBeInTheDocument();
  });

  it('no glow animation when animated is false', () => {
    const { container } = renderWithTooltip(
      <MonthlyBadge monthlyTokens={500000000} animated={false} />
    );

    const badge = container.querySelector('.monthly-badge-glow');
    expect(badge).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = renderWithTooltip(
      <MonthlyBadge monthlyTokens={50000000} className="custom-badge" />
    );

    const badge = container.querySelector('.custom-badge');
    expect(badge).toBeInTheDocument();
  });

  describe('tier styling', () => {
    it('applies None tier styling', () => {
      const { container } = renderWithTooltip(<MonthlyBadge monthlyTokens={5000000} />);

      const badge = container.querySelector('.bg-bg-surface');
      expect(badge).toBeInTheDocument();
    });

    it('applies Power User tier styling', () => {
      const { container } = renderWithTooltip(<MonthlyBadge monthlyTokens={50000000} />);

      const badge = container.querySelector('.border-ember-600');
      expect(badge).toBeInTheDocument();
    });
  });
});

describe('MonthlyBadgeSkeleton', () => {
  it('renders skeleton with animation', () => {
    const { container } = render(<MonthlyBadgeSkeleton />);

    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('applies size styles', () => {
    const { container } = render(<MonthlyBadgeSkeleton size="lg" />);

    // Large size should have larger placeholder
    const valuePlaceholder = container.querySelector('.w-20');
    expect(valuePlaceholder).toBeInTheDocument();
  });

  it('shows name placeholder when showName is true', () => {
    const { container } = render(<MonthlyBadgeSkeleton showName />);

    // Should have additional skeleton for name
    const namePlaceholder = container.querySelector('.w-12');
    expect(namePlaceholder).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<MonthlyBadgeSkeleton className="custom-skeleton" />);

    expect(container.firstChild).toHaveClass('custom-skeleton');
  });
});

describe('MonthlyBadgeCompact', () => {
  it('renders compact token count', () => {
    render(<MonthlyBadgeCompact monthlyTokens={5000000} />);

    expect(screen.getByText('5.0M')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    const { container } = render(<MonthlyBadgeCompact monthlyTokens={5000000} />);

    expect(container.firstChild).toHaveAttribute('aria-label', '5.0M tokens');
  });

  it('applies tier color styling', () => {
    const { container } = render(<MonthlyBadgeCompact monthlyTokens={50000000} />);

    // Power User tier should have ember color
    const value = container.querySelector('.text-ember-500');
    expect(value).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MonthlyBadgeCompact monthlyTokens={5000000} className="custom-compact" />
    );

    expect(container.firstChild).toHaveClass('custom-compact');
  });
});
