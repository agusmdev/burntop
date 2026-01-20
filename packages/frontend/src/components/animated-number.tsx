import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/** Easing functions for the animation */
type EasingFunction = 'linear' | 'easeOut' | 'easeInOut' | 'easeOutExpo';

/** Easing function implementations */
const easingFunctions: Record<EasingFunction, (t: number) => number> = {
  linear: (t) => t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};

export interface AnimatedNumberProps {
  /** The target value to animate to */
  value: number;
  /** Duration of the animation in milliseconds */
  duration?: number;
  /** Easing function for the animation */
  easing?: EasingFunction;
  /** Number of decimal places to display */
  decimals?: number;
  /** Optional prefix (e.g., "$") */
  prefix?: string;
  /** Optional suffix (e.g., "M" or "%") */
  suffix?: string;
  /** Whether to format with thousand separators */
  formatWithCommas?: boolean;
  /** Whether to use monospace font */
  mono?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * Formats a number with thousand separators.
 */
function formatNumber(value: number, decimals: number, formatWithCommas: boolean): string {
  const fixed = value.toFixed(decimals);
  if (!formatWithCommas) return fixed;

  const [integer, decimal] = fixed.split('.');
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimal ? `${formatted}.${decimal}` : formatted;
}

/**
 * A number component that animates from 0 (or previous value) to the target value.
 * Features a smooth count-up animation with configurable easing and duration.
 *
 * Features:
 * - Smooth count-up animation
 * - Multiple easing functions
 * - Configurable duration
 * - Optional thousand separators
 * - Support for decimals, prefixes, and suffixes
 * - Re-animates when value changes
 */
export function AnimatedNumber({
  value,
  duration = 1000,
  easing = 'easeOutExpo',
  decimals = 0,
  prefix = '',
  suffix = '',
  formatWithCommas = true,
  mono = true,
  className,
  onComplete,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValueRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = previousValueRef.current;
    const startTime = performance.now();
    const easingFn = easingFunctions[easing];

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);

      const currentValue = startValue + (value - startValue) * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        previousValueRef.current = value;
        onComplete?.();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration, easing, onComplete]);

  const formattedValue = formatNumber(displayValue, decimals, formatWithCommas);

  return (
    <span className={cn(mono && 'font-mono', 'tabular-nums', className)}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}

export interface AnimatedNumberSkeletonProps {
  /** Approximate width of the number (in characters) */
  width?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton loader for the AnimatedNumber component.
 * Use this when data is loading to prevent layout shift.
 */
export function AnimatedNumberSkeleton({ width = 6, className }: AnimatedNumberSkeletonProps) {
  return (
    <span
      className={cn('inline-block animate-pulse rounded bg-bg-subtle', className)}
      style={{ width: `${width}ch`, height: '1em' }}
    />
  );
}
