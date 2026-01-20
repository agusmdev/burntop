import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type StatsCardVariant = 'default' | 'ember' | 'success' | 'warning';

export interface StatsCardProps {
  /** The main label for the stat */
  label: string;
  /** The primary value to display */
  value: string | number;
  /** Optional secondary label (e.g., "this month") */
  sublabel?: string;
  /** Optional icon component to display */
  icon?: LucideIcon;
  /** Optional change indicator (e.g., "+12%") */
  change?: string;
  /** Whether the change is positive, negative, or neutral */
  changeType?: 'positive' | 'negative' | 'neutral';
  /** Visual variant of the card */
  variant?: StatsCardVariant;
  /** Additional CSS classes */
  className?: string;
  /** Whether to use monospace font for the value */
  mono?: boolean;
}

const variantStyles: Record<
  StatsCardVariant,
  {
    card: string;
    iconBg: string;
    icon: string;
    value: string;
    glow: string;
    ring: string;
  }
> = {
  default: {
    card: 'bg-gradient-to-br from-bg-elevated via-bg-elevated to-bg-surface/50',
    iconBg: 'bg-text-secondary/10',
    icon: 'text-text-secondary',
    value: 'text-text-primary',
    glow: '',
    ring: 'ring-border-default/50',
  },
  ember: {
    card: 'bg-gradient-to-br from-bg-elevated via-bg-elevated to-ember-500/5',
    iconBg: 'bg-ember-500/15',
    icon: 'text-ember-500',
    value: 'text-ember-400',
    glow: 'shadow-[0_0_30px_rgba(255,107,0,0.15),inset_0_1px_0_rgba(255,107,0,0.1)]',
    ring: 'ring-ember-500/30',
  },
  success: {
    card: 'bg-gradient-to-br from-bg-elevated via-bg-elevated to-success/5',
    iconBg: 'bg-success/15',
    icon: 'text-success',
    value: 'text-success',
    glow: 'shadow-[0_0_30px_rgba(34,197,94,0.1),inset_0_1px_0_rgba(34,197,94,0.1)]',
    ring: 'ring-success/30',
  },
  warning: {
    card: 'bg-gradient-to-br from-bg-elevated via-bg-elevated to-warning/5',
    iconBg: 'bg-warning/15',
    icon: 'text-warning',
    value: 'text-warning',
    glow: 'shadow-[0_0_30px_rgba(234,179,8,0.1),inset_0_1px_0_rgba(234,179,8,0.1)]',
    ring: 'ring-warning/30',
  },
};

const changeStyles = {
  positive: 'text-success bg-success/10',
  negative: 'text-error bg-error/10',
  neutral: 'text-text-secondary bg-text-secondary/10',
};

/**
 * A modern card component for displaying statistics like tokens, cost, or streak count.
 * Features glassmorphism, gradient backgrounds, and subtle glow effects.
 * Used throughout the dashboard and profile pages.
 */
export function StatsCard({
  label,
  value,
  sublabel,
  icon: Icon,
  change,
  changeType = 'neutral',
  variant = 'default',
  className,
  mono = true,
}: StatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        // Base styles
        'relative group rounded-xl p-5 overflow-hidden',
        // Glassmorphism effect
        'backdrop-blur-sm',
        // Border with ring for depth
        'ring-1',
        styles.ring,
        // Gradient background
        styles.card,
        // Glow effect
        styles.glow,
        // Hover transitions
        'transition-all duration-300 ease-out',
        'hover:ring-2 hover:-translate-y-0.5',
        variant === 'ember' && 'hover:shadow-[0_0_40px_rgba(255,107,0,0.2)]',
        variant === 'success' && 'hover:shadow-[0_0_40px_rgba(34,197,94,0.15)]',
        variant === 'warning' && 'hover:shadow-[0_0_40px_rgba(234,179,8,0.15)]',
        className
      )}
    >
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/[0.02] pointer-events-none" />

      {/* Content */}
      <div className="relative">
        {/* Header with label and icon */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            {label}
          </span>
          {Icon && (
            <div
              className={cn(
                'p-2 rounded-lg transition-colors duration-300',
                styles.iconBg,
                'group-hover:scale-110 transition-transform duration-300'
              )}
            >
              <Icon className={cn('size-4', styles.icon)} aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Main value */}
        <div className="flex items-baseline gap-2.5">
          <span
            className={cn(
              'text-3xl sm:text-4xl font-bold tracking-tight leading-none',
              styles.value,
              mono && 'font-mono tabular-nums'
            )}
          >
            {value}
          </span>
          {change && (
            <span
              className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                changeStyles[changeType]
              )}
            >
              {change}
            </span>
          )}
        </div>

        {/* Sublabel */}
        {sublabel && (
          <p className="mt-2 text-xs text-text-tertiary/80 font-medium">{sublabel}</p>
        )}
      </div>

      {/* Corner accent for ember variant */}
      {variant === 'ember' && (
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-ember-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-ember-500/15 transition-colors duration-500" />
      )}
    </div>
  );
}

export interface StatsCardSkeletonProps {
  className?: string;
  variant?: StatsCardVariant;
}

/**
 * Skeleton loader for the StatsCard component.
 * Use this when data is loading to prevent layout shift.
 */
export function StatsCardSkeleton({ className, variant = 'default' }: StatsCardSkeletonProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'relative rounded-xl p-5 overflow-hidden',
        'backdrop-blur-sm',
        'ring-1',
        styles.ring,
        styles.card,
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/[0.02] pointer-events-none" />

      <div className="relative">
        {/* Header skeleton */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="h-3 w-20 animate-pulse rounded bg-bg-subtle/50" />
          <div className={cn('p-2 rounded-lg', styles.iconBg)}>
            <div className="size-4 animate-pulse rounded bg-bg-subtle/30" />
          </div>
        </div>

        {/* Value skeleton */}
        <div className="h-10 w-28 animate-pulse rounded bg-bg-subtle/50" />

        {/* Sublabel skeleton */}
        <div className="mt-2 h-3 w-20 animate-pulse rounded bg-bg-subtle/30" />
      </div>
    </div>
  );
}
