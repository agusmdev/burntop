import { Flame } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Display size variants for the streak counter */
export type StreakCounterSize = 'sm' | 'md' | 'lg' | 'xl';

/** Size styles for the streak counter */
const sizeStyles: Record<
  StreakCounterSize,
  { container: string; icon: string; value: string; label: string }
> = {
  sm: {
    container: 'gap-1',
    icon: 'h-4 w-4',
    value: 'text-lg',
    label: 'text-[10px]',
  },
  md: {
    container: 'gap-1.5',
    icon: 'h-5 w-5',
    value: 'text-2xl',
    label: 'text-xs',
  },
  lg: {
    container: 'gap-2',
    icon: 'h-7 w-7',
    value: 'text-4xl',
    label: 'text-sm',
  },
  xl: {
    container: 'gap-3',
    icon: 'h-10 w-10',
    value: 'text-6xl',
    label: 'text-base',
  },
};

/** Intensity levels based on streak length */
type StreakIntensity = 'cold' | 'warm' | 'hot' | 'blazing' | 'inferno';

/** Get intensity level based on streak days */
function getIntensity(days: number): StreakIntensity {
  if (days === 0) return 'cold';
  if (days < 7) return 'warm';
  if (days < 30) return 'hot';
  if (days < 100) return 'blazing';
  return 'inferno';
}

/** Intensity-based styling */
const intensityStyles: Record<
  StreakIntensity,
  { flame: string; value: string; glow: string; animate: boolean }
> = {
  cold: {
    flame: 'text-text-tertiary',
    value: 'text-text-tertiary',
    glow: '',
    animate: false,
  },
  warm: {
    flame: 'text-ember-400',
    value: 'text-text-primary',
    glow: '',
    animate: false,
  },
  hot: {
    flame: 'text-ember-500',
    value: 'text-ember-500',
    glow: 'drop-shadow-[0_0_8px_rgba(255,107,0,0.4)]',
    animate: true,
  },
  blazing: {
    flame: 'text-ember-400',
    value: 'text-ember-400',
    glow: 'drop-shadow-[0_0_12px_rgba(255,107,0,0.5)]',
    animate: true,
  },
  inferno: {
    flame: 'text-ember-300',
    value: 'text-ember-300',
    glow: 'drop-shadow-[0_0_16px_rgba(255,107,0,0.6)]',
    animate: true,
  },
};

export interface StreakCounterProps {
  /** Number of consecutive days */
  days: number;
  /** Optional label to display below the counter */
  label?: string;
  /** Display size of the counter */
  size?: StreakCounterSize;
  /** Whether to show the fire animation (auto-enabled for streaks >= 7 days) */
  animated?: boolean;
  /** Whether to show the glow effect */
  showGlow?: boolean;
  /** Orientation of the component */
  orientation?: 'horizontal' | 'vertical';
  /** Additional CSS classes */
  className?: string;
}

/**
 * A streak counter component with fire animation.
 * Displays the current streak count with a flame icon that animates
 * based on streak intensity.
 *
 * Features:
 * - Dynamic intensity based on streak length (cold → inferno)
 * - Fire animation for streaks >= 7 days
 * - Glow effect for hot streaks
 * - Multiple size variants
 * - Horizontal and vertical orientations
 */
export function StreakCounter({
  days,
  label = 'day streak',
  size = 'md',
  animated,
  showGlow = true,
  orientation = 'horizontal',
  className,
}: StreakCounterProps) {
  const styles = sizeStyles[size];
  const intensity = getIntensity(days);
  const intensityStyle = intensityStyles[intensity];

  // Auto-enable animation for hot+ streaks unless explicitly disabled
  const shouldAnimate = animated ?? intensityStyle.animate;

  // Pluralize label
  const displayLabel = days === 1 ? label.replace('streak', 'streak') : label;

  return (
    <div
      className={cn(
        'flex items-center',
        orientation === 'vertical' && 'flex-col',
        styles.container,
        className
      )}
      aria-label={`${days} ${displayLabel}`}
    >
      {/* Fire icon */}
      <div className={cn('relative', showGlow && intensityStyle.glow)}>
        <Flame
          className={cn(
            styles.icon,
            intensityStyle.flame,
            shouldAnimate && 'streak-fire',
            // Add transition for smooth color changes
            'transition-colors duration-300'
          )}
          aria-hidden="true"
          fill={intensity !== 'cold' ? 'currentColor' : 'none'}
        />
        {/* Secondary flame for inferno intensity */}
        {intensity === 'inferno' && (
          <Flame
            className={cn(
              styles.icon,
              'absolute inset-0 text-ember-200 opacity-50',
              shouldAnimate && 'streak-fire',
              // Offset animation timing for layered effect
              'animation-delay-75'
            )}
            aria-hidden="true"
            fill="currentColor"
          />
        )}
      </div>

      {/* Counter value and label */}
      <div
        className={cn(
          'flex items-baseline',
          orientation === 'vertical' && 'flex-col items-center',
          orientation === 'horizontal' && 'gap-1'
        )}
      >
        <span
          className={cn(
            'font-mono font-bold tracking-tight transition-colors duration-300',
            styles.value,
            intensityStyle.value
          )}
        >
          {days}
        </span>
        {label && <span className={cn('text-text-secondary', styles.label)}>{displayLabel}</span>}
      </div>
    </div>
  );
}

export interface StreakCounterSkeletonProps {
  size?: StreakCounterSize;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * Skeleton loader for the StreakCounter component.
 * Use this when streak data is loading to prevent layout shift.
 */
export function StreakCounterSkeleton({
  size = 'md',
  orientation = 'horizontal',
  className,
}: StreakCounterSkeletonProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        'flex items-center animate-pulse',
        orientation === 'vertical' && 'flex-col',
        styles.container,
        className
      )}
    >
      <div className={cn('rounded bg-bg-subtle', styles.icon)} />
      <div
        className={cn(
          'flex items-baseline',
          orientation === 'vertical' && 'flex-col items-center',
          orientation === 'horizontal' && 'gap-1'
        )}
      >
        <div className={cn('h-6 w-8 rounded bg-bg-subtle', size === 'lg' && 'h-10 w-12')} />
        <div className="h-3 w-16 rounded bg-bg-subtle" />
      </div>
    </div>
  );
}

/**
 * Compact variant of StreakCounter for use in tight spaces like leaderboard rows.
 * Shows only the flame icon and number.
 */
export function StreakCounterCompact({ days, className }: { days: number; className?: string }) {
  const intensity = getIntensity(days);
  const intensityStyle = intensityStyles[intensity];
  const shouldAnimate = intensityStyle.animate;

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={`${days} day streak`}
    >
      <Flame
        className={cn(
          'h-3.5 w-3.5',
          intensityStyle.flame,
          shouldAnimate && 'streak-fire',
          'transition-colors duration-300'
        )}
        aria-hidden="true"
        fill={intensity !== 'cold' ? 'currentColor' : 'none'}
      />
      <span
        className={cn(
          'text-sm font-mono font-semibold',
          intensityStyle.value,
          'transition-colors duration-300'
        )}
      >
        {days}
      </span>
    </div>
  );
}
