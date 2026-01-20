import { Calendar, Wrench } from 'lucide-react';

import type { ToolUsageData } from '@/api/generated.schemas';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ProfileToolsTabProps {
  tools: ToolUsageData[];
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

const toolColors: Record<string, string> = {
  'claude-code': 'bg-ember-500',
  cursor: 'bg-blue-500',
  'gemini-cli': 'bg-purple-500',
  aider: 'bg-green-500',
  continue: 'bg-cyan-500',
  copilot: 'bg-gray-400',
};

function getToolColor(source: string): string {
  const normalized = source.toLowerCase().replace(/[^a-z]/g, '-');
  return toolColors[normalized] || 'bg-ember-500';
}

function getToolDisplayName(source: string): string {
  const names: Record<string, string> = {
    'claude-code': 'Claude Code',
    cursor: 'Cursor',
    'gemini-cli': 'Gemini CLI',
    aider: 'Aider',
    continue: 'Continue',
    copilot: 'GitHub Copilot',
  };
  return names[source.toLowerCase()] || source;
}

export function ProfileToolsTab({ tools, className }: ProfileToolsTabProps) {
  if (tools.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Wrench className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">No tools data yet</h3>
        <p className="text-text-secondary">Sync your usage data to see tool breakdown</p>
      </div>
    );
  }

  const totalTokens = tools.reduce((sum, t) => sum + t.tokens, 0);
  const totalCost = tools.reduce((sum, t) => sum + t.cost, 0);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-bg-elevated border-border-default">
            <CardHeader>
              <CardTitle className="text-lg text-text-primary flex items-center gap-2">
                <Wrench className="h-5 w-5 text-ember-500" />
                Tool Usage Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tools.map((tool) => (
                <ToolRow key={tool.source} tool={tool} />
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
                <div className="text-2xl font-bold font-mono text-ember-500">{tools.length}</div>
                <div className="text-xs text-text-tertiary">Tools Used</div>
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
              <DonutChart tools={tools} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface ToolRowProps {
  tool: ToolUsageData;
}

function ToolRow({ tool }: ToolRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('h-3 w-3 rounded-full', getToolColor(tool.source))} />
          <span className="font-medium text-text-primary">{getToolDisplayName(tool.source)}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-mono text-text-primary">{formatNumber(tool.tokens)}</span>
          <span className="text-text-tertiary w-16 text-right">{tool.percentage.toFixed(1)}%</span>
        </div>
      </div>
      <Progress value={tool.percentage} className="h-2 bg-bg-surface" />
      <div className="flex items-center gap-4 text-xs text-text-tertiary">
        <span>{formatCost(tool.cost)}</span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {tool.days_active} days active
        </span>
      </div>
    </div>
  );
}

interface DonutChartProps {
  tools: ToolUsageData[];
}

function DonutChart({ tools }: DonutChartProps) {
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} className="transform -rotate-90">
        {tools.map((tool) => {
          const strokeDasharray = (tool.percentage / 100) * circumference;
          const strokeDashoffset = -currentOffset;
          currentOffset += strokeDasharray;

          return (
            <circle
              key={tool.source}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeDasharray} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              className={cn(getToolColor(tool.source).replace('bg-', 'text-'))}
            />
          );
        })}
      </svg>

      <div className="flex flex-wrap justify-center gap-3">
        {tools.slice(0, 4).map((tool) => (
          <div key={tool.source} className="flex items-center gap-1.5 text-xs">
            <div className={cn('h-2 w-2 rounded-full', getToolColor(tool.source))} />
            <span className="text-text-secondary">{getToolDisplayName(tool.source)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileToolsTabSkeleton() {
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
                    <Skeleton className="h-5 w-32" />
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
