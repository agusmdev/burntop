import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { StatsCard, StatsCardSkeleton } from './stats-card';

describe('StatsCard', () => {
  it('renders label and value', () => {
    render(<StatsCard label="Total Tokens" value="1,234,567" />);

    expect(screen.getByText('Total Tokens')).toBeInTheDocument();
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('renders sublabel when provided', () => {
    render(<StatsCard label="Total Tokens" value="1M" sublabel="this month" />);

    expect(screen.getByText('this month')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<StatsCard label="Activity" value="42" icon={Activity} />);

    // Icon should be aria-hidden
    const icon = document.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  it('renders change indicator when provided', () => {
    render(<StatsCard label="Tokens" value="1000" change="+12%" changeType="positive" />);

    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('applies positive change styling', () => {
    render(<StatsCard label="Tokens" value="1000" change="+12%" changeType="positive" />);

    const changeElement = screen.getByText('+12%');
    expect(changeElement).toHaveClass('text-success');
  });

  it('applies negative change styling', () => {
    render(<StatsCard label="Tokens" value="1000" change="-5%" changeType="negative" />);

    const changeElement = screen.getByText('-5%');
    expect(changeElement).toHaveClass('text-error');
  });

  it('applies neutral change styling by default', () => {
    render(<StatsCard label="Tokens" value="1000" change="0%" />);

    const changeElement = screen.getByText('0%');
    expect(changeElement).toHaveClass('text-text-secondary');
  });

  it('applies default variant styling', () => {
    const { container } = render(<StatsCard label="Test" value="100" />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('ring-border-default/50');
  });

  it('applies ember variant styling', () => {
    const { container } = render(<StatsCard label="Test" value="100" variant="ember" />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('ring-ember-500/30');
  });

  it('applies success variant styling', () => {
    const { container } = render(<StatsCard label="Test" value="100" variant="success" />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('ring-success/30');
  });

  it('applies warning variant styling', () => {
    const { container } = render(<StatsCard label="Test" value="100" variant="warning" />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('ring-warning/30');
  });

  it('uses monospace font for value by default', () => {
    render(<StatsCard label="Test" value="12345" />);

    const value = screen.getByText('12345');
    expect(value).toHaveClass('font-mono');
  });

  it('can disable monospace font', () => {
    render(<StatsCard label="Test" value="Normal" mono={false} />);

    const value = screen.getByText('Normal');
    expect(value).not.toHaveClass('font-mono');
  });

  it('applies custom className', () => {
    const { container } = render(<StatsCard label="Test" value="100" className="custom-class" />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('custom-class');
  });

  it('accepts numeric value', () => {
    render(<StatsCard label="Count" value={42} />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders ember corner accent for ember variant', () => {
    const { container } = render(<StatsCard label="Test" value="100" variant="ember" />);

    // Check for the corner accent div
    const accentElements = container.querySelectorAll('.bg-ember-500\\/10');
    expect(accentElements.length).toBeGreaterThan(0);
  });
});

describe('StatsCardSkeleton', () => {
  it('renders skeleton elements', () => {
    const { container } = render(<StatsCardSkeleton />);

    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    const { container } = render(<StatsCardSkeleton className="custom-skeleton" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('custom-skeleton');
  });

  it('applies variant styling', () => {
    const { container } = render(<StatsCardSkeleton variant="ember" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('ring-ember-500/30');
  });

  it('renders default variant by default', () => {
    const { container } = render(<StatsCardSkeleton />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('ring-border-default/50');
  });
});
