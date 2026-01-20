import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StreakCounter, StreakCounterCompact, StreakCounterSkeleton } from './streak-counter';

describe('StreakCounter', () => {
  it('renders the days count', () => {
    render(<StreakCounter days={7} />);

    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders default label', () => {
    render(<StreakCounter days={5} />);

    expect(screen.getByText('day streak')).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(<StreakCounter days={3} label="consecutive days" />);

    expect(screen.getByText('consecutive days')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    const { container } = render(<StreakCounter days={10} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute('aria-label', '10 day streak');
  });

  describe('size variants', () => {
    it('applies small size styles', () => {
      render(<StreakCounter days={5} size="sm" />);

      const value = screen.getByText('5');
      expect(value).toHaveClass('text-lg');
    });

    it('applies medium size styles (default)', () => {
      render(<StreakCounter days={5} size="md" />);

      const value = screen.getByText('5');
      expect(value).toHaveClass('text-2xl');
    });

    it('applies large size styles', () => {
      render(<StreakCounter days={5} size="lg" />);

      const value = screen.getByText('5');
      expect(value).toHaveClass('text-4xl');
    });

    it('applies extra large size styles', () => {
      render(<StreakCounter days={5} size="xl" />);

      const value = screen.getByText('5');
      expect(value).toHaveClass('text-6xl');
    });
  });

  describe('intensity levels based on streak length', () => {
    it('shows cold styling for 0 days', () => {
      render(<StreakCounter days={0} />);

      const value = screen.getByText('0');
      expect(value).toHaveClass('text-text-tertiary');
    });

    it('shows warm styling for 1-6 days', () => {
      render(<StreakCounter days={5} />);

      const value = screen.getByText('5');
      expect(value).toHaveClass('text-text-primary');
    });

    it('shows hot styling for 7-29 days', () => {
      render(<StreakCounter days={15} />);

      const value = screen.getByText('15');
      expect(value).toHaveClass('text-ember-500');
    });

    it('shows blazing styling for 30-99 days', () => {
      render(<StreakCounter days={50} />);

      const value = screen.getByText('50');
      expect(value).toHaveClass('text-ember-400');
    });

    it('shows inferno styling for 100+ days', () => {
      render(<StreakCounter days={150} />);

      const value = screen.getByText('150');
      expect(value).toHaveClass('text-ember-300');
    });
  });

  describe('orientation', () => {
    it('applies horizontal orientation by default', () => {
      const { container } = render(<StreakCounter days={7} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).not.toHaveClass('flex-col');
    });

    it('applies vertical orientation', () => {
      const { container } = render(<StreakCounter days={7} orientation="vertical" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex-col');
    });
  });

  it('applies custom className', () => {
    const { container } = render(<StreakCounter days={7} className="custom-class" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('renders flame icon', () => {
    const { container } = render(<StreakCounter days={7} />);

    // The Flame icon from lucide-react should be rendered
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('adds animation class for hot+ streaks', () => {
    const { container } = render(<StreakCounter days={10} />);

    // Hot streaks (7+ days) should have animation class
    const flameIcon = container.querySelector('.streak-fire');
    expect(flameIcon).toBeInTheDocument();
  });

  it('no animation class for cold/warm streaks', () => {
    const { container } = render(<StreakCounter days={3} />);

    // Warm streaks (< 7 days) should not have animation class
    const flameIcon = container.querySelector('.streak-fire');
    expect(flameIcon).toBeNull();
  });

  it('can explicitly disable animation', () => {
    const { container } = render(<StreakCounter days={50} animated={false} />);

    const flameIcon = container.querySelector('.streak-fire');
    expect(flameIcon).toBeNull();
  });

  it('can explicitly enable animation', () => {
    const { container } = render(<StreakCounter days={3} animated={true} />);

    const flameIcon = container.querySelector('.streak-fire');
    expect(flameIcon).toBeInTheDocument();
  });

  it('shows secondary flame for inferno intensity', () => {
    const { container } = render(<StreakCounter days={150} />);

    // Inferno intensity should have two flame icons
    const flames = container.querySelectorAll('svg');
    expect(flames.length).toBe(2);
  });

  it('can hide glow effect', () => {
    const { container } = render(<StreakCounter days={50} showGlow={false} />);

    // Without glow, there should be no drop-shadow class
    const glowElement = container.querySelector('[class*="drop-shadow"]');
    expect(glowElement).toBeNull();
  });
});

describe('StreakCounterSkeleton', () => {
  it('renders skeleton with animation', () => {
    const { container } = render(<StreakCounterSkeleton />);

    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('applies size styles', () => {
    const { container } = render(<StreakCounterSkeleton size="lg" />);

    // Large size should have larger placeholder
    const valuePlaceholder = container.querySelector('.h-10');
    expect(valuePlaceholder).toBeInTheDocument();
  });

  it('applies orientation', () => {
    const { container } = render(<StreakCounterSkeleton orientation="vertical" />);

    expect(container.firstChild).toHaveClass('flex-col');
  });

  it('applies custom className', () => {
    const { container } = render(<StreakCounterSkeleton className="custom-skeleton" />);

    expect(container.firstChild).toHaveClass('custom-skeleton');
  });
});

describe('StreakCounterCompact', () => {
  it('renders compact streak counter', () => {
    render(<StreakCounterCompact days={7} />);

    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    const { container } = render(<StreakCounterCompact days={7} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute('aria-label', '7 day streak');
  });

  it('applies intensity styling', () => {
    render(<StreakCounterCompact days={50} />);

    const value = screen.getByText('50');
    expect(value).toHaveClass('text-ember-400');
  });

  it('applies custom className', () => {
    const { container } = render(<StreakCounterCompact days={7} className="custom-compact" />);

    expect(container.firstChild).toHaveClass('custom-compact');
  });

  it('renders flame icon', () => {
    const { container } = render(<StreakCounterCompact days={7} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
