import { Bot, Calendar } from 'lucide-react';

import type { ModelUsageData } from '@/api/generated.schemas';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ProfileModelsTabProps {
  models: ModelUsageData[];
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

const modelColors: Record<string, string> = {
  'claude-3-5-sonnet': 'bg-ember-500',
  'claude-3-opus': 'bg-purple-500',
  'claude-3-haiku': 'bg-cyan-500',
  'gpt-4': 'bg-green-500',
  'gpt-4-turbo': 'bg-green-400',
  'gpt-3.5-turbo': 'bg-green-300',
  'gemini-pro': 'bg-blue-500',
  'gemini-ultra': 'bg-blue-600',
};

function getModelColor(model: string): string {
  const normalized = model.toLowerCase();
  for (const [key, color] of Object.entries(modelColors)) {
    if (normalized.includes(key)) return color;
  }
  if (normalized.includes('claude')) return 'bg-ember-500';
  if (normalized.includes('gpt')) return 'bg-green-500';
  if (normalized.includes('gemini')) return 'bg-blue-500';
  return 'bg-gray-500';
}

function getModelDisplayName(model: string): string {
  const parts = model.split('-');
  if (parts.length > 3) {
    return parts.slice(0, 3).join('-');
  }
  return model;
}

export function ProfileModelsTab({ models, className }: ProfileModelsTabProps) {
  if (models.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Bot className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">No models data yet</h3>
        <p className="text-text-secondary">Sync your usage data to see model breakdown</p>
      </div>
    );
  }

  const totalTokens = models.reduce((sum, m) => sum + m.tokens, 0);
  const totalCost = models.reduce((sum, m) => sum + m.cost, 0);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-bg-elevated border-border-default">
            <CardHeader>
              <CardTitle className="text-lg text-text-primary flex items-center gap-2">
                <Bot className="h-5 w-5 text-ember-500" />
                Model Usage Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
              {models.map((model) => (
                <ModelRow key={model.model} model={model} />
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-bg-elevated border-border-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-text-secondary">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-2xl font-bold font-mono text-ember-500">{models.length}</div>
                <div className="text-xs text-text-tertiary">Models Used</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-text-primary">
                  {formatNumber(totalTokens)}
                </div>
                <div className="text-xs text-text-tertiary">Total Tokens</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-text-primary">
                  {formatCost(totalCost)}
                </div>
                <div className="text-xs text-text-tertiary">Total Cost</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-bg-elevated border-border-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-text-secondary">Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart models={models} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface ModelRowProps {
  model: ModelUsageData;
}

function ModelRow({ model }: ModelRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('h-3 w-3 rounded-full', getModelColor(model.model))} />
          <span className="font-medium text-text-primary font-mono text-sm">
            {getModelDisplayName(model.model)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-mono text-text-primary">{formatNumber(model.tokens)}</span>
          <span className="text-text-tertiary w-16 text-right">{model.percentage.toFixed(1)}%</span>
        </div>
      </div>
      <Progress value={model.percentage} className="h-2 bg-bg-surface" />
      <div className="flex items-center gap-4 text-xs text-text-tertiary">
        <span>{formatCost(model.cost)}</span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {model.days_active} days active
        </span>
      </div>
    </div>
  );
}

interface DonutChartProps {
  models: ModelUsageData[];
}

function DonutChart({ models }: DonutChartProps) {
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} className="transform -rotate-90">
        {models.map((model) => {
          const strokeDasharray = (model.percentage / 100) * circumference;
          const strokeDashoffset = -currentOffset;
          currentOffset += strokeDasharray;

          return (
            <circle
              key={model.model}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeDasharray} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              className={cn(getModelColor(model.model).replace('bg-', 'text-'))}
            />
          );
        })}
      </svg>

      <div className="flex flex-wrap justify-center gap-3">
        {models.slice(0, 4).map((model) => (
          <div key={model.model} className="flex items-center gap-1.5 text-xs">
            <div className={cn('h-2 w-2 rounded-full', getModelColor(model.model))} />
            <span className="text-text-secondary font-mono">
              {getModelDisplayName(model.model)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileModelsTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-bg-elevated border-border-default">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-bg-elevated border-border-default">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-bg-elevated border-border-default">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="flex justify-center">
              <Skeleton className="h-40 w-40 rounded-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
