/**
 * Dashboard Insights Tab Component
 *
 * Displays personalized insights comparing user metrics to community benchmarks:
 * - Percentile rankings across key metrics
 * - Comparative analysis
 *
 * @see Plan Phase 17.3 - Insights UI
 */

import { Database, Flame, Lightbulb, TrendingUp, Wrench, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { InsightsResponse } from '@/api/generated.schemas';

import { useGetUserInsightsApiV1InsightsGet } from '@/api/insights/insights';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Period = 'all' | 'month' | 'week';

function PercentileBadge({ percentile }: { percentile: number | null | undefined }) {
  if (percentile == null) {
    return (
      <Badge variant="outline" className="ml-2">
        N/A
      </Badge>
    );
  }

  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  let label = 'Average';

  if (percentile >= 90) {
    variant = 'default';
    label = `Top ${Math.round(100 - percentile)}%`;
  } else if (percentile >= 75) {
    variant = 'secondary';
    label = `Top ${Math.round(100 - percentile)}%`;
  } else if (percentile >= 50) {
    label = `Top ${Math.round(100 - percentile)}%`;
  }

  return (
    <Badge variant={variant} className="ml-2">
      {label}
    </Badge>
  );
}

function PercentileCard({
  icon: Icon,
  label,
  percentile,
  userValue,
  communityAvg,
  format = 'number',
}: {
  icon: typeof Zap;
  label: string;
  percentile: number | null | undefined;
  userValue: number | null | undefined;
  communityAvg: number | null | undefined;
  format?: 'number' | 'cost' | 'percentage';
}) {
  const formatValue = (val: number | null | undefined): string => {
    if (val == null) return 'N/A';
    if (format === 'cost') {
      return `$${val.toFixed(2)}`;
    }
    if (format === 'percentage') {
      return `${val.toFixed(1)}%`;
    }
    return val.toLocaleString();
  };

  return (
    <Card className="p-6 bg-bg-elevated border-border-default">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-ember-500/10 text-ember-500">
            <Icon className="size-4 sm:size-5 shrink-0" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-secondary">{label}</h3>
            <p className="text-2xl font-bold text-text-primary mt-1">{formatValue(userValue)}</p>
          </div>
        </div>
        <PercentileBadge percentile={percentile} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-tertiary">Community Average</span>
          <span className="text-text-secondary font-medium">{formatValue(communityAvg)}</span>
        </div>
        <Progress value={percentile ?? 0} className="h-2" />
        {percentile != null && (
          <p className="text-xs text-text-tertiary text-right">
            Better than {percentile.toFixed(0)}% of users
          </p>
        )}
      </div>
    </Card>
  );
}

function InsightMessage({
  icon: Icon,
  message,
  isPositive,
}: {
  icon: typeof Zap;
  message: string;
  isPositive: boolean;
}) {
  return (
    <Card className="p-4 bg-bg-elevated border-border-default hover:border-ember-500/30 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg ${
            isPositive ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
          }`}
        >
          <Icon className="size-4 sm:size-5 shrink-0" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-text-primary">{message}</p>
        </div>
      </div>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-6 bg-bg-elevated border-border-default">
            <Skeleton className="h-16 w-full mb-4" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-2 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="p-8 bg-bg-elevated border-border-default text-center">
      <Lightbulb className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-text-primary mb-2">No Insights Available</h3>
      <p className="text-text-secondary max-w-md mx-auto">
        Community benchmarks are being calculated. Sync more usage data and check back soon to see
        how you compare to other users!
      </p>
    </Card>
  );
}

export function DashboardInsights() {
  const [period, setPeriod] = useState<Period>('all');

  // Use React Query hook with proper configuration
  const { data: response, isLoading, error } = useGetUserInsightsApiV1InsightsGet({ period });

  // Extract data from response using useMemo
  const data: InsightsResponse | null = useMemo(() => {
    if (response?.status === 200) {
      return response.data;
    }
    return null;
  }, [response]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Card className="p-8 bg-bg-elevated border-border-default text-center">
        <p className="text-text-secondary">Failed to load insights</p>
      </Card>
    );
  }

  if (!data) {
    return <EmptyState />;
  }

  // Generate insight messages based on the data
  const insights = [
    {
      icon: Zap,
      message: data.is_above_average_tokens
        ? `You've used ${data.user_total_tokens.toLocaleString()} tokens, which is above the community average!`
        : `You've used ${data.user_total_tokens.toLocaleString()} tokens. Keep coding to move up the ranks!`,
      isPositive: data.is_above_average_tokens,
    },
    {
      icon: Flame,
      message: data.is_above_average_streak
        ? `Your ${data.user_current_streak} day streak is impressive - you're beating most users!`
        : `Your current streak is ${data.user_current_streak} days. Build consistency to improve!`,
      isPositive: data.is_above_average_streak,
    },
    {
      icon: Database,
      message: data.is_above_average_cache_efficiency
        ? `Great cache efficiency at ${Number(data.user_cache_efficiency ?? 0).toFixed(1)}%! You're optimizing well.`
        : `Your cache efficiency is ${Number(data.user_cache_efficiency ?? 0).toFixed(1)}%. There's room to improve!`,
      isPositive: data.is_above_average_cache_efficiency,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Your Insights</h2>
          <p className="text-sm text-text-secondary mt-1">
            See how you compare to {data.community_total_users.toLocaleString()} other users
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Percentile Rankings */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Your Rankings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <PercentileCard
            icon={Zap}
            label="Total Tokens"
            percentile={data.tokens_percentile}
            userValue={data.user_total_tokens}
            communityAvg={Number(data.community_avg_tokens)}
            format="number"
          />
          <PercentileCard
            icon={TrendingUp}
            label="Estimated Cost"
            percentile={data.cost_percentile}
            userValue={data.user_total_cost}
            communityAvg={Number(data.community_avg_cost)}
            format="cost"
          />
          <PercentileCard
            icon={Flame}
            label="Current Streak"
            percentile={data.streak_percentile}
            userValue={data.user_current_streak}
            communityAvg={Number(data.community_avg_streak)}
            format="number"
          />
          <PercentileCard
            icon={Database}
            label="Cache Efficiency"
            percentile={data.cache_efficiency_percentile}
            userValue={Number(data.user_cache_efficiency)}
            communityAvg={Number(data.community_avg_cache_efficiency)}
            format="percentage"
          />
          <PercentileCard
            icon={Wrench}
            label="Unique Tools"
            percentile={data.tools_percentile}
            userValue={data.user_unique_tools}
            communityAvg={Number(data.community_avg_unique_tools)}
            format="number"
          />
        </div>
      </div>

      {/* Insights */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <InsightMessage
              key={index}
              icon={insight.icon}
              message={insight.message}
              isPositive={insight.isPositive}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
