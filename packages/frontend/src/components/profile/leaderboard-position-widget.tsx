import { Link } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, Crown, Medal, Minus, Trophy } from 'lucide-react';

import type { LeaderboardEntryResponse } from '@/api/generated.schemas';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface LeaderboardPositionWidgetProps {
  entry: LeaderboardEntryResponse | null;
  totalUsers?: number;
  className?: string;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return <Trophy className="h-5 w-5 text-text-tertiary" />;
}

function getRankStyle(rank: number) {
  if (rank === 1) return 'text-amber-400 border-amber-400/30 bg-amber-400/5';
  if (rank === 2) return 'text-gray-300 border-gray-300/30 bg-gray-300/5';
  if (rank === 3) return 'text-amber-600 border-amber-600/30 bg-amber-600/5';
  return 'text-text-primary border-border-default bg-bg-surface/50';
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function LeaderboardPositionWidget({
  entry,
  totalUsers,
  className,
}: LeaderboardPositionWidgetProps) {
  if (!entry) {
    return (
      <div
        className={cn('rounded-xl border border-border-default bg-bg-surface/50 p-4', className)}
      >
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-text-tertiary" />
          <div>
            <p className="text-sm text-text-secondary">Not ranked yet</p>
            <p className="text-xs text-text-tertiary">
              Sync your usage to appear on the leaderboard
            </p>
          </div>
        </div>
      </div>
    );
  }

  const rankChange = entry.rank_change ?? 0;

  return (
    <Link
      to="/leaderboard"
      className={cn(
        'block rounded-xl border p-4 transition-all hover:scale-[1.02] hover:shadow-lg',
        getRankStyle(entry.rank),
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getRankIcon(entry.rank)}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono">#{entry.rank}</span>
              {totalUsers && (
                <span className="text-sm text-text-tertiary">of {formatNumber(totalUsers)}</span>
              )}
            </div>
            <p className="text-xs text-text-secondary">Global Leaderboard</p>
          </div>
        </div>

        {rankChange !== 0 && (
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              rankChange > 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
            )}
          >
            {rankChange > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            <span>{Math.abs(rankChange)}</span>
          </div>
        )}

        {rankChange === 0 && entry.rank_change !== null && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-bg-subtle text-text-tertiary">
            <Minus className="h-3 w-3" />
            <span>0</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
        <span className="text-text-tertiary">{formatNumber(entry.total_tokens)} tokens</span>
        <span className="text-ember-500 font-medium">View Leaderboard →</span>
      </div>
    </Link>
  );
}

export function LeaderboardPositionWidgetSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border-default bg-bg-surface/50 p-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="space-y-1">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <div className="mt-3 pt-3 border-t border-border-subtle flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
