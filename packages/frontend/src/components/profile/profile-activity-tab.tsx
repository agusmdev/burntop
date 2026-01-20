import { Activity, BarChart3, Calendar, TrendingUp } from 'lucide-react';

import type { DailyTrendData } from '@/api/generated.schemas';
import type { ContributionDay } from '@/components/contribution-heatmap';
import type { ComponentType } from 'react';

import { ContributionHeatmap } from '@/components/contribution-heatmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ProfileActivityTabProps {
  contributionData: ContributionDay[];
  trendsData?: DailyTrendData[];
  className?: string;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function ProfileActivityTab({
  contributionData,
  trendsData,
  className,
}: ProfileActivityTabProps) {
  const totalTokens = contributionData.reduce((sum, d) => sum + d.tokens, 0);
  const activeDays = contributionData.filter((d) => d.tokens > 0).length;
  const avgTokensPerActiveDay = activeDays > 0 ? Math.round(totalTokens / activeDays) : 0;

  const maxTokensDay = contributionData.reduce((max, d) => (d.tokens > max.tokens ? d : max), {
    date: '',
    tokens: 0,
  });

  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={Activity} label="Total Tokens" value={formatNumber(totalTokens)} />
        <SummaryCard icon={Calendar} label="Active Days" value={activeDays.toString()} />
        <SummaryCard
          icon={BarChart3}
          label="Avg per Day"
          value={formatNumber(avgTokensPerActiveDay)}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Best Day"
          value={formatNumber(maxTokensDay.tokens)}
          sublabel={maxTokensDay.date ? formatDate(maxTokensDay.date) : undefined}
        />
      </div>

      <Card className="bg-bg-elevated border-border-default">
        <CardHeader>
          <CardTitle className="text-lg text-text-primary flex items-center gap-2">
            <Activity className="h-5 w-5 text-ember-500" />
            Contribution Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContributionHeatmap data={contributionData} weeks={52} size="md" />
        </CardContent>
      </Card>

      {trendsData && trendsData.length > 0 && (
        <Card className="bg-bg-elevated border-border-default">
          <CardHeader>
            <CardTitle className="text-lg text-text-primary flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-ember-500" />
              Daily Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrendsChart data={trendsData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SummaryCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sublabel?: string;
}

function SummaryCard({ icon: Icon, label, value, sublabel }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-elevated p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-text-tertiary" />
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      <div className="text-2xl font-bold font-mono text-text-primary">{value}</div>
      {sublabel && <div className="text-xs text-text-tertiary mt-1">{sublabel}</div>}
    </div>
  );
}

interface TrendsChartProps {
  data: DailyTrendData[];
}

function TrendsChart({ data }: TrendsChartProps) {
  const maxTokens = Math.max(...data.map((d) => d.tokens), 1);
  const recentData = data.slice(-30);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-1 h-32">
        {recentData.map((day) => {
          const height = (day.tokens / maxTokens) * 100;
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center justify-end group">
              <div
                className={cn(
                  'w-full rounded-t transition-all duration-200',
                  'bg-ember-500/60 group-hover:bg-ember-500',
                  height === 0 && 'bg-bg-surface'
                )}
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${formatDate(day.date)}: ${formatNumber(day.tokens)} tokens`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-text-tertiary">
        <span>{recentData[0] ? formatDate(recentData[0].date) : ''}</span>
        <span>
          {recentData[recentData.length - 1]
            ? formatDate(recentData[recentData.length - 1].date)
            : ''}
        </span>
      </div>
    </div>
  );
}

export function ProfileActivityTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-default bg-bg-elevated p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      <Card className="bg-bg-elevated border-border-default">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>

      <Card className="bg-bg-elevated border-border-default">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
