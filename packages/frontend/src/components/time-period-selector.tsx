/**
 * Time Period Selector Component
 *
 * Segmented control for selecting time periods: Weekly, Monthly, or All Time.
 * Used for filtering dashboard metrics by time range.
 */

import { cn } from '@/lib/utils';

export type TimePeriod = 'week' | 'month' | 'all';

interface TimePeriodOption {
  value: TimePeriod;
  label: string;
  days: number | null; // null represents "all time"
}

const TIME_PERIODS: TimePeriodOption[] = [
  { value: 'week', label: 'Weekly', days: 7 },
  { value: 'month', label: 'Monthly', days: 30 },
  { value: 'all', label: 'All Time', days: null },
];

interface TimePeriodSelectorProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
  className?: string;
}

export function TimePeriodSelector({ value, onChange, className }: TimePeriodSelectorProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg bg-bg-elevated p-1 ring-1 ring-border-default',
        className
      )}
      role="group"
      aria-label="Select time period"
    >
      {TIME_PERIODS.map((period) => (
        <button
          key={period.value}
          type="button"
          onClick={() => onChange(period.value)}
          className={cn(
            'relative rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2',
            value === period.value
              ? 'bg-ember-500 text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-muted'
          )}
          aria-pressed={value === period.value}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Get the number of days for a given time period.
 *
 * @param period - The time period to convert
 * @returns The number of days, or null for "all time"
 */
export function getDaysFromPeriod(period: TimePeriod): number | null {
  const option = TIME_PERIODS.find((p) => p.value === period);
  return option?.days ?? null;
}
