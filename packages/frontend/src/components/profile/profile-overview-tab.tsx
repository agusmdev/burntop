import {
  Activity,
  Calendar,
  DollarSign,
  Flame,
  Percent,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react';

import {
  LeaderboardPositionWidget,
  LeaderboardPositionWidgetSkeleton,
} from './leaderboard-position-widget';

import type {
  InsightsResponse,
  LeaderboardEntryResponse,
  UserStatsResponse,
} from '@/api/generated.schemas';
import type { ContributionDay } from '@/components/contribution-heatmap';

import { ContributionHeatmap } from '@/components/contribution-heatmap';
import { StatsCard, StatsCardSkeleton } from '@/components/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ProfileOverviewTabProps {
  stats: UserStatsResponse;
  insights?: InsightsResponse | null;
  leaderboardEntry?: LeaderboardEntryResponse | null;
  totalLeaderboardUsers?: number;
  contributionData: ContributionDay[];
  className?: string;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

function formatPercentile(percentile: number | null | undefined): string {
  if (percentile === null || percentile === undefined) return 'N/A';
  return `Top ${(100 - percentile).toFixed(0)}%`;
}

export function ProfileOverviewTab({
  stats,
  insights,
  leaderboardEntry,
  totalLeaderboardUsers,
  contributionData,
  className,
}: ProfileOverviewTabProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          label="Total Tokens"
          value={formatNumber(stats.total_tokens)}
          icon={Star}
          variant="ember"
          mono
          className="stagger-enter"
        />
        <StatsCard
          label="Total Cost"
          value={formatCost(stats.total_cost)}
          icon={DollarSign}
          variant="default"
          mono
          className="stagger-enter"
        />
        <StatsCard
          label="Current Streak"
          value={stats.current_streak}
          sublabel="days"
          icon={Flame}
          variant={stats.current_streak >= 7 ? 'ember' : 'default'}
          mono
          className="stagger-enter"
        />
        <StatsCard
          label="Longest Streak"
          value={stats.longest_streak}
          sublabel="days"
          icon={TrendingUp}
          variant="default"
          mono
          className="stagger-enter"
        />
        <StatsCard
          label="Active Days"
          value={stats.unique_days}
          sublabel="total"
          icon={Calendar}
          variant="default"
          mono
          className="stagger-enter"
        />
        <StatsCard
          label="Cache Efficiency"
          value={stats.cache_efficiency !== null ? `${stats.cache_efficiency.toFixed(1)}%` : 'N/A'}
          icon={Zap}
          variant={stats.cache_efficiency && stats.cache_efficiency >= 50 ? 'success' : 'default'}
          mono
          className="stagger-enter"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-bg-elevated border-border-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-text-primary flex items-center gap-2">
                <Activity className="size-4 sm:size-5 shrink-0 text-ember-500" />
                Contribution Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContributionHeatmap data={contributionData} weeks={26} size="md" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <LeaderboardPositionWidget
            entry={leaderboardEntry ?? null}
            totalUsers={totalLeaderboardUsers}
          />

          {insights && (
            <Card className="bg-bg-elevated border-border-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-text-primary flex items-center gap-2">
                  <Percent className="size-4 sm:size-5 shrink-0 text-ember-500" />
                  Community Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PercentileBar
                  label="Token Usage"
                  percentile={insights.tokens_percentile}
                  isAboveAverage={insights.is_above_average_tokens}
                />
                <PercentileBar
                  label="Streak"
                  percentile={insights.streak_percentile}
                  isAboveAverage={insights.is_above_average_streak}
                />
                <PercentileBar
                  label="Cache Efficiency"
                  percentile={insights.cache_efficiency_percentile}
                  isAboveAverage={insights.is_above_average_cache_efficiency}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface PercentileBarProps {
  label: string;
  percentile: number | null | undefined;
  isAboveAverage: boolean;
}

function PercentileBar({ label, percentile, isAboveAverage }: PercentileBarProps) {
  const value = percentile ?? 0;
  const displayValue = 100 - value;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className={cn('font-medium', isAboveAverage ? 'text-success' : 'text-text-tertiary')}>
          {formatPercentile(percentile)}
        </span>
      </div>
      <Progress value={displayValue} className="h-1.5 bg-bg-surface" />
    </div>
  );
}

export function ProfileOverviewTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-bg-elevated border-border-default">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <LeaderboardPositionWidgetSkeleton />
          <Card className="bg-bg-elevated border-border-default">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-1.5 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
