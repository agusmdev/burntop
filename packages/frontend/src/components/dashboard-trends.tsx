/**
 * Dashboard Trends Tab Component
 *
 * Displays usage trends including:
 * - Usage over time area chart (30 days)
 * - Beautiful gradient fills and smooth animations
 *
 * @see Plan Phase 4.3 - Dashboard Trends Tab
 */

import { TrendingUp, Calendar, Zap, DollarSign } from 'lucide-react';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { DailyTrendData } from '@/api/generated.schemas';

import { useGetTrendsApiV1DashboardTrendsGet } from '@/api/dashboard/dashboard';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    payload: DailyTrendData;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const date = new Date(label || '');
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-bg-elevated border border-border-default rounded-xl p-4 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-subtle">
        <Calendar className="w-4 h-4 text-text-tertiary" />
        <span className="text-sm font-medium text-text-primary">{formattedDate}</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-ember-500" />
            <span className="text-sm text-text-secondary">Tokens</span>
          </div>
          <span className="text-sm font-mono font-medium text-text-primary">
            {data.tokens.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-sm text-text-secondary">Cost</span>
          </div>
          <span className="text-sm font-mono font-medium text-text-primary">
            {formatCost(data.cost)}
          </span>
        </div>

        {(data.input_tokens ?? 0) > 0 && (
          <div className="pt-2 mt-2 border-t border-border-subtle space-y-1">
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>Input</span>
              <span className="font-mono">{formatTokens(data.input_tokens ?? 0)}</span>
            </div>
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>Output</span>
              <span className="font-mono">{formatTokens(data.output_tokens ?? 0)}</span>
            </div>
            {(data.cache_read_tokens ?? 0) > 0 && (
              <div className="flex justify-between text-xs text-text-tertiary">
                <span>Cache</span>
                <span className="font-mono">{formatTokens(data.cache_read_tokens ?? 0)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardTrends() {
  // Fetch trends data using Orval-generated hook (default 30 days)
  const {
    data: trendsResponse,
    isLoading,
    error,
  } = useGetTrendsApiV1DashboardTrendsGet({
    days: 30,
  });

  // Extract data from response (check status to narrow type)
  const trends =
    trendsResponse && 'status' in trendsResponse && trendsResponse.status === 200
      ? trendsResponse.data
      : null;

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!trends?.daily_data?.length) return null;

    const totalTokens = trends.daily_data.reduce((sum, d) => sum + d.tokens, 0);
    const totalCost = trends.daily_data.reduce((sum, d) => sum + d.cost, 0);
    const avgTokens = Math.round(totalTokens / trends.daily_data.length);
    const maxTokens = Math.max(...trends.daily_data.map((d) => d.tokens));
    const activeDays = trends.daily_data.filter((d) => d.tokens > 0).length;

    return { totalTokens, totalCost, avgTokens, maxTokens, activeDays };
  }, [trends]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error || !trends) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Failed to load trends data</p>
      </div>
    );
  }

  const hasData = trends.daily_data && trends.daily_data.length > 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-bg-elevated border-border-default">
            <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-1">
              30-Day Tokens
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {formatTokens(summaryStats.totalTokens)}
            </div>
          </Card>
          <Card className="p-4 bg-bg-elevated border-border-default">
            <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-1">
              30-Day Cost
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {formatCost(summaryStats.totalCost)}
            </div>
          </Card>
          <Card className="p-4 bg-bg-elevated border-border-default">
            <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-1">
              Daily Average
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {formatTokens(summaryStats.avgTokens)}
            </div>
          </Card>
          <Card className="p-4 bg-bg-elevated border-border-default">
            <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-1">
              Active Days
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {summaryStats.activeDays}
              <span className="text-sm font-normal text-text-tertiary">/30</span>
            </div>
          </Card>
        </div>
      )}

      {/* Usage Over Time Chart */}
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-ember-500" />
          Usage Over Time
        </h2>
        {hasData ? (
          <Card className="p-6 bg-bg-elevated border-border-default overflow-hidden">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart
                data={trends.daily_data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6B00" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#FF6B00" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#FF6B00" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FF8C33" />
                    <stop offset="50%" stopColor="#FF6B00" />
                    <stop offset="100%" stopColor="#CC5600" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatTokens}
                  width={50}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{
                    stroke: 'rgba(255, 107, 0, 0.3)',
                    strokeWidth: 1,
                    strokeDasharray: '4 4',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="url(#strokeGradient)"
                  strokeWidth={2.5}
                  fill="url(#tokenGradient)"
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: '#FF6B00',
                    stroke: '#1a1a1a',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        ) : (
          <Card className="p-12 bg-bg-elevated border-border-default text-center">
            <TrendingUp className="w-12 h-12 text-text-tertiary mx-auto mb-4 opacity-50" />
            <p className="text-text-secondary">No usage data available for the past 30 days</p>
            <p className="text-text-muted text-sm mt-2">
              Start using AI tools to see your trends here
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
