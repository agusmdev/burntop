import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnimatedNumber, AnimatedNumberSkeleton } from './animated-number';

describe('AnimatedNumber', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the target value after animation completes', async () => {
    const onComplete = vi.fn();
    render(<AnimatedNumber value={1000} duration={100} onComplete={onComplete} />);

    // Fast-forward through animation
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Should display the final formatted value
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalled();
  });

  it('formats with prefix and suffix', async () => {
    render(<AnimatedNumber value={50} duration={100} prefix="$" suffix="M" />);

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // The component renders prefix, value, and suffix as children of the span
    const element = screen.getByText(/\$.*50.*M/);
    expect(element).toBeInTheDocument();
  });

  it('displays decimal places correctly', async () => {
    render(<AnimatedNumber value={99.99} duration={100} decimals={2} />);

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('99.99')).toBeInTheDocument();
  });

  it('can disable comma formatting', async () => {
    render(<AnimatedNumber value={1000000} duration={100} formatWithCommas={false} />);

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('1000000')).toBeInTheDocument();
  });

  it('applies custom className', async () => {
    render(<AnimatedNumber value={100} className="custom-class" duration={100} />);

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    const element = screen.getByText('100');
    expect(element).toHaveClass('custom-class');
  });

  it('uses monospace font by default', async () => {
    render(<AnimatedNumber value={100} duration={100} />);

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    const element = screen.getByText('100');
    expect(element).toHaveClass('font-mono');
  });

  it('can disable monospace font', async () => {
    render(<AnimatedNumber value={100} mono={false} duration={100} />);

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    const element = screen.getByText('100');
    expect(element).not.toHaveClass('font-mono');
  });
});

describe('AnimatedNumberSkeleton', () => {
  it('renders a skeleton element', () => {
    render(<AnimatedNumberSkeleton />);

    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('applies custom width', () => {
    render(<AnimatedNumberSkeleton width={10} />);

    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toHaveStyle({ width: '10ch' });
  });

  it('applies custom className', () => {
    render(<AnimatedNumberSkeleton className="custom-skeleton" />);

    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toHaveClass('custom-skeleton');
  });
});
