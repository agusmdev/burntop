import * as React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** Represents a single day's usage data */
export interface ContributionDay {
  /** Date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Number of tokens used on this day */
  tokens: number;
  /** Optional number of sessions/requests */
  sessions?: number;
}

export type ContributionHeatmapSize = 'sm' | 'md' | 'lg';

export interface ContributionHeatmapProps {
  /** Array of daily contribution data */
  data: ContributionDay[];
  /** Number of weeks to display (default: 52) */
  weeks?: number;
  /** Size variant (default: 'md') */
  size?: ContributionHeatmapSize;
  /** Show day labels on the left (default: true) */
  showDayLabels?: boolean;
  /** Show month labels on top (default: true) */
  showMonthLabels?: boolean;
  /** Callback when a day is clicked */
  onDayClick?: (day: ContributionDay | null, date: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/** Size styles for cells and gaps */
const sizeStyles: Record<ContributionHeatmapSize, { cell: string; gap: string; text: string }> = {
  sm: {
    cell: 'w-2 h-2',
    gap: 'gap-0.5',
    text: 'text-[9px]',
  },
  md: {
    cell: 'w-2.5 h-2.5',
    gap: 'gap-1',
    text: 'text-[10px]',
  },
  lg: {
    cell: 'w-3 h-3',
    gap: 'gap-1',
    text: 'text-xs',
  },
};

/** Day abbreviations */
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Month abbreviations */
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Get the heat level (0-5) based on token count and thresholds
 */
function getHeatLevel(tokens: number, max: number): number {
  if (tokens === 0) return 0;
  if (max === 0) return 0;

  const ratio = tokens / max;
  if (ratio >= 0.8) return 5;
  if (ratio >= 0.6) return 4;
  if (ratio >= 0.4) return 3;
  if (ratio >= 0.2) return 2;
  return 1;
}

/**
 * Format a date for display in tooltip
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format token count for display
 */
function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Generate an array of dates for the heatmap grid
 */
function generateDateGrid(
  weeks: number,
  endDate: Date = new Date()
): { date: string; dayOfWeek: number }[][] {
  const grid: { date: string; dayOfWeek: number }[][] = [];

  // Start from Sunday of the week containing endDate, then go back (weeks - 1) more weeks
  const end = new Date(endDate);
  const endDayOfWeek = end.getDay();
  const startDate = new Date(end);
  startDate.setDate(startDate.getDate() - endDayOfWeek - (weeks - 1) * 7);

  let currentDate = new Date(startDate);

  for (let week = 0; week < weeks; week++) {
    const weekColumn: { date: string; dayOfWeek: number }[] = [];

    for (let day = 0; day < 7; day++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      weekColumn.push({
        date: dateStr,
        dayOfWeek: currentDate.getDay(),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    grid.push(weekColumn);
  }

  return grid;
}

/**
 * Get month labels with their positions for the header
 */
function getMonthLabels(
  grid: { date: string; dayOfWeek: number }[][]
): { month: string; weekIndex: number }[] {
  const labels: { month: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  grid.forEach((week, weekIndex) => {
    // Check the first day of each week for month changes
    const firstDayDate = new Date(week[0].date + 'T00:00:00');
    const month = firstDayDate.getMonth();

    if (month !== lastMonth) {
      labels.push({
        month: MONTH_LABELS[month],
        weekIndex,
      });
      lastMonth = month;
    }
  });

  return labels;
}

/**
 * A GitHub-style contribution heatmap component showing daily usage patterns.
 * Displays a grid of cells colored by activity intensity, with tooltips showing details.
 *
 * Features:
 * - Configurable time range (default: 52 weeks / 1 year)
 * - Multiple size variants
 * - Day and month labels
 * - Tooltips with detailed information
 * - Click handler for drill-down
 */
export function ContributionHeatmap({
  data,
  weeks = 52,
  size = 'md',
  showDayLabels = true,
  showMonthLabels = true,
  onDayClick,
  className,
}: ContributionHeatmapProps) {
  const styles = sizeStyles[size];

  // Create a map for quick lookup of contribution data by date
  const dataMap = React.useMemo(() => {
    const map = new Map<string, ContributionDay>();
    data.forEach((day) => {
      map.set(day.date, day);
    });
    return map;
  }, [data]);

  // Calculate max tokens for heat level normalization
  const maxTokens = React.useMemo(() => {
    if (data.length === 0) return 0;
    return Math.max(...data.map((d) => d.tokens));
  }, [data]);

  // Generate the date grid
  const dateGrid = React.useMemo(() => generateDateGrid(weeks), [weeks]);

  // Get month labels for the header
  const monthLabels = React.useMemo(() => getMonthLabels(dateGrid), [dateGrid]);

  // Calculate total stats for the legend
  const totalTokens = React.useMemo(() => data.reduce((sum, d) => sum + d.tokens, 0), [data]);

  const activeDays = React.useMemo(() => data.filter((d) => d.tokens > 0).length, [data]);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Month labels header */}
      {showMonthLabels && (
        <div className={cn('flex', showDayLabels && 'ml-8')}>
          <div className={cn('relative h-4 flex-1', styles.gap)}>
            {monthLabels.map(({ month, weekIndex }) => (
              <span
                key={`${month}-${weekIndex}`}
                className={cn('absolute text-text-tertiary', styles.text)}
                style={{
                  left: `${(weekIndex / weeks) * 100}%`,
                }}
              >
                {month}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap grid */}
      <div className="flex">
        {/* Day labels */}
        {showDayLabels && (
          <div className={cn('flex flex-col justify-around pr-2', styles.gap)}>
            {DAY_LABELS.filter((_, i) => i % 2 === 1).map((label) => (
              <span key={label} className={cn('text-text-tertiary leading-none', styles.text)}>
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Grid of cells */}
        <div className={cn('flex', styles.gap)}>
          {dateGrid.map((week, weekIndex) => (
            <div key={weekIndex} className={cn('flex flex-col', styles.gap)}>
              {week.map(({ date }) => {
                const dayData = dataMap.get(date);
                const tokens = dayData?.tokens ?? 0;
                const heatLevel = getHeatLevel(tokens, maxTokens);
                const today = new Date().toISOString().split('T')[0];
                const isToday = date === today;
                const isFuture = date > today;

                return (
                  <Tooltip key={date}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onDayClick?.(dayData ?? null, date)}
                        disabled={!onDayClick || isFuture}
                        aria-label={`${formatDate(date)}: ${formatTokens(tokens)} tokens`}
                        className={cn(
                          'rounded-sm transition-all duration-150',
                          styles.cell,
                          `heat-${heatLevel}`,
                          isToday && 'ring-1 ring-ember-500 ring-offset-1 ring-offset-bg-base',
                          isFuture && 'opacity-30',
                          onDayClick &&
                            !isFuture &&
                            'cursor-pointer hover:scale-125 hover:ring-1 hover:ring-border-prominent',
                          !onDayClick && 'cursor-default'
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-center">
                      <p className="font-medium">{formatDate(date)}</p>
                      {isFuture ? (
                        <p className="text-text-tertiary">Future date</p>
                      ) : tokens > 0 ? (
                        <>
                          <p className="text-ember-500 font-mono">{formatTokens(tokens)} tokens</p>
                          {dayData?.sessions && (
                            <p className="text-text-secondary">{dayData.sessions} sessions</p>
                          )}
                        </>
                      ) : (
                        <p className="text-text-tertiary">No activity</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend and stats */}
      <div className={cn('flex items-center justify-between mt-3', showDayLabels && 'ml-8')}>
        <div className={cn('flex items-center gap-1 text-text-tertiary', styles.text)}>
          <span>Less</span>
          {[0, 1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn('rounded-sm', styles.cell, `heat-${level}`)}
              aria-hidden="true"
            />
          ))}
          <span>More</span>
        </div>

        <div className={cn('flex gap-3 text-text-secondary', styles.text)}>
          <span>
            <span className="text-text-primary font-mono">{formatTokens(totalTokens)}</span> tokens
          </span>
          <span>
            <span className="text-text-primary font-mono">{activeDays}</span> active days
          </span>
        </div>
      </div>
    </div>
  );
}

export interface ContributionHeatmapSkeletonProps {
  weeks?: number;
  size?: ContributionHeatmapSize;
  className?: string;
}

/**
 * Skeleton loader for the ContributionHeatmap component.
 * Use this when data is loading to prevent layout shift.
 */
export function ContributionHeatmapSkeleton({
  weeks = 52,
  size = 'md',
  className,
}: ContributionHeatmapSkeletonProps) {
  const styles = sizeStyles[size];

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Month labels skeleton */}
      <div className="ml-8 h-4 mb-1">
        <div className="flex gap-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-3 w-6 animate-pulse rounded bg-bg-subtle" />
          ))}
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="flex">
        <div className={cn('flex flex-col justify-around pr-2', styles.gap)}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-2 w-6 animate-pulse rounded bg-bg-subtle" />
          ))}
        </div>

        <div className={cn('flex', styles.gap)}>
          {Array.from({ length: weeks }).map((_, weekIndex) => (
            <div key={weekIndex} className={cn('flex flex-col', styles.gap)}>
              {Array.from({ length: 7 }).map((_, dayIndex) => (
                <div
                  key={dayIndex}
                  className={cn('rounded-sm animate-pulse bg-bg-subtle', styles.cell)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend skeleton */}
      <div className="flex items-center justify-between mt-3 ml-8">
        <div className="h-3 w-32 animate-pulse rounded bg-bg-subtle" />
        <div className="h-3 w-40 animate-pulse rounded bg-bg-subtle" />
      </div>
    </div>
  );
}
