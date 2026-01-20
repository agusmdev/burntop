/**
 * Dashboard Tools Tab Component
 *
 * Displays tool usage statistics including:
 * - Token distribution by tool/source (donut chart)
 * - Cost distribution by tool (bar chart)
 * - Tool usage breakdown table with icons
 *
 * @see Plan Phase 4.5 - Dashboard Tools Tab
 */

import { Wrench, Zap, DollarSign, Calendar } from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { DashboardToolsResponse, ToolUsageData } from '@/api/generated.schemas';

import { useGetToolsBreakdownApiV1DashboardToolsGet } from '@/api/dashboard/dashboard';
import { ToolIcon, getToolConfig, getToolColor, formatToolName } from '@/components/tool-icon';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function formatCost(cost: number | string): string {
  const num = typeof cost === 'string' ? parseFloat(cost) : cost;
  return num.toFixed(2);
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { percentage: number; source: string };
  }>;
}

function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0];
  const config = getToolConfig(data.payload.source);
  const Icon = config.icon;

  return (
    <div className="bg-bg-elevated border border-border-default rounded-xl p-3 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: config.bgColor }}
        >
          <span style={{ color: config.color }}>
            <Icon className="w-4 h-4" />
          </span>
        </div>
        <span className="font-medium text-text-primary">{config.name}</span>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-secondary">Tokens</span>
          <span className="font-mono text-text-primary">{formatTokens(data.value)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-secondary">Share</span>
          <span className="font-mono text-text-primary">
            {data.payload.percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    payload: { source: string };
  }>;
}

function BarTooltip({ active, payload }: BarTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0];
  const config = getToolConfig(data.payload.source);
  const Icon = config.icon;

  return (
    <div className="bg-bg-elevated border border-border-default rounded-xl p-3 shadow-xl">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center"
          style={{ backgroundColor: config.bgColor }}
        >
          <span style={{ color: config.color }}>
            <Icon className="w-3 h-3" />
          </span>
        </div>
        <span className="font-medium text-text-primary">{config.name}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <DollarSign className="w-3.5 h-3.5 text-green-500" />
        <span className="font-mono text-text-primary">${formatCost(data.value)}</span>
      </div>
    </div>
  );
}

export function DashboardTools() {
  // Use React Query hook for data fetching with proper caching
  const { data: response, isLoading, error } = useGetToolsBreakdownApiV1DashboardToolsGet();

  // Extract data from response
  const data: DashboardToolsResponse | null = useMemo(() => {
    if (response?.status === 200) {
      return response.data;
    }
    return null;
  }, [response]);

  // Memoize chart data transformations
  const { pieData, costData, totalTokens, totalCost } = useMemo(() => {
    if (!data?.tools) {
      return { pieData: [], costData: [], totalTokens: 0, totalCost: 0 };
    }

    const totalTokens = data.tools.reduce((sum, t) => sum + t.tokens, 0);
    const totalCost = data.tools.reduce((sum, t) => sum + t.cost, 0);

    // Prepare pie chart data
    const pieData = data.tools.map((tool: ToolUsageData) => ({
      name: formatToolName(tool.source),
      source: tool.source,
      value: tool.tokens,
      percentage: tool.percentage,
    }));

    // Prepare cost bar chart data
    const costData = data.tools.slice(0, 6).map((tool: ToolUsageData) => ({
      source: tool.source,
      name: formatToolName(tool.source),
      cost: tool.cost,
      displayName: formatToolName(tool.source).slice(0, 12),
    }));

    return { pieData, costData, totalTokens, totalCost };
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Failed to load tools data</p>
      </div>
    );
  }

  const hasData = data.tools.length > 0;

  if (!hasData) {
    return (
      <Card className="p-12 bg-bg-elevated border-border-default text-center">
        <Wrench className="w-12 h-12 text-text-tertiary mx-auto mb-4 opacity-50" />
        <p className="text-text-secondary">No tool usage data available</p>
        <p className="text-text-muted text-sm mt-2">
          Start using AI tools to see your tool breakdown
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Distribution Donut Chart */}
        <Card className="p-6 bg-bg-elevated border-border-default">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-ember-500" />
            Token Distribution by Tool
          </h3>
          <div className="relative">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((item, index: number) => (
                    <Cell key={`cell-${index}`} fill={getToolColor(item.source)} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center stats */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">
                  {formatTokens(totalTokens)}
                </div>
                <div className="text-xs text-text-tertiary uppercase tracking-wider">
                  Total Tokens
                </div>
              </div>
            </div>
          </div>

          {/* Legend with Tool Icons */}
          <div className="mt-4 space-y-2">
            {pieData.slice(0, 5).map((item) => {
              const config = getToolConfig(item.source);
              const Icon = config.icon;
              return (
                <div key={item.source} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: config.bgColor }}
                  >
                    <span style={{ color: config.color }}>
                      <Icon className="w-4 h-4" />
                    </span>
                  </div>
                  <span className="text-text-secondary text-sm flex-1 truncate">{config.name}</span>
                  <span className="text-text-tertiary text-sm font-mono">
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Cost Distribution Bar Chart */}
        <Card className="p-6 bg-bg-elevated border-border-default">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Cost by Tool
          </h3>
          <div className="mb-2">
            <span className="text-2xl font-bold text-text-primary">${formatCost(totalCost)}</span>
            <span className="text-sm text-text-tertiary ml-2">total spent</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={costData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                horizontal={true}
                vertical={false}
              />
              <XAxis
                type="number"
                stroke="#666"
                tick={{ fill: '#888', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                stroke="#666"
                tick={{ fill: '#888', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="cost" radius={[0, 6, 6, 0]} barSize={24}>
                {costData.map((item, index) => (
                  <Cell key={`bar-${index}`} fill={getToolColor(item.source)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tool Breakdown Table */}
      <Card className="p-6 bg-bg-elevated border-border-default">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-ember-500" />
          Detailed Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Tool
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Tokens
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Cost
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Share
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  <Calendar className="w-3.5 h-3.5 inline" /> Days
                </th>
              </tr>
            </thead>
            <tbody>
              {data.tools.map((tool: ToolUsageData) => {
                const config = getToolConfig(tool.source);
                return (
                  <tr
                    key={tool.source}
                    className="border-b border-border-subtle hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <ToolIcon source={tool.source} size="sm" showLabel />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono text-text-primary">
                        {tool.tokens.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono text-text-primary">
                        ${formatCost(tool.cost)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-bg-base rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${tool.percentage}%`,
                              backgroundColor: config.color,
                            }}
                          />
                        </div>
                        <span className="text-text-secondary text-sm w-12 text-right">
                          {tool.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-text-secondary">{tool.days_active}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
