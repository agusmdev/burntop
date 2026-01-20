/**
 * Dashboard Models Tab Component
 *
 * Displays model usage statistics including:
 * - Token distribution by model (donut chart)
 * - Cost distribution by model (bar chart)
 * - Model usage breakdown table with better styling
 *
 * @see Plan Phase 4.4 - Dashboard Models Tab
 */

import { Brain, Zap, DollarSign, Calendar } from 'lucide-react';
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

import type { DashboardModelsResponse, ModelUsageData } from '@/api/generated.schemas';

import { useGetModelsBreakdownApiV1DashboardModelsGet } from '@/api/dashboard/dashboard';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Color palette for charts (modern gradient colors)
const MODEL_COLORS = [
  { main: '#FF6B00', light: 'rgba(255, 107, 0, 0.15)' }, // ember
  { main: '#3B82F6', light: 'rgba(59, 130, 246, 0.15)' }, // blue
  { main: '#8B5CF6', light: 'rgba(139, 92, 246, 0.15)' }, // purple
  { main: '#10B981', light: 'rgba(16, 185, 129, 0.15)' }, // green
  { main: '#F59E0B', light: 'rgba(245, 158, 11, 0.15)' }, // amber
  { main: '#EC4899', light: 'rgba(236, 72, 153, 0.15)' }, // pink
  { main: '#06B6D4', light: 'rgba(6, 182, 212, 0.15)' }, // cyan
  { main: '#EF4444', light: 'rgba(239, 68, 68, 0.15)' }, // red
];

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

// Format model name for display (e.g., claude-3-5-sonnet -> Claude 3.5 Sonnet)
function formatModelName(model: string): string {
  return model
    .replace(/-(\d+)-(\d+)-/g, ' $1.$2 ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { percentage: number; cost: number };
  }>;
}

function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0];

  return (
    <div className="bg-bg-elevated border border-border-default rounded-xl p-3 shadow-xl">
      <div className="font-medium text-text-primary mb-2">{formatModelName(data.name)}</div>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-secondary">Tokens</span>
          <span className="font-mono text-text-primary">{formatTokens(data.value)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-secondary">Share</span>
          <span className="font-mono text-text-primary">{data.payload.percentage.toFixed(1)}%</span>
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
    payload: { model: string };
  }>;
}

function BarTooltip({ active, payload }: BarTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0];

  return (
    <div className="bg-bg-elevated border border-border-default rounded-xl p-3 shadow-xl">
      <div className="font-medium text-text-primary mb-1">{formatModelName(data.payload.model)}</div>
      <div className="flex items-center gap-2 text-sm">
        <DollarSign className="w-3.5 h-3.5 text-green-500" />
        <span className="font-mono text-text-primary">${formatCost(data.value)}</span>
      </div>
    </div>
  );
}

export function DashboardModels() {
  // Use React Query hook for data fetching with proper caching
  const { data: response, isLoading, error } = useGetModelsBreakdownApiV1DashboardModelsGet();

  // Extract data from response
  const data: DashboardModelsResponse | null = useMemo(() => {
    if (response?.status === 200) {
      return response.data;
    }
    return null;
  }, [response]);

  // Memoize chart data transformations
  const { pieData, costData, totalTokens, totalCost } = useMemo(() => {
    if (!data?.models) {
      return { pieData: [], costData: [], totalTokens: 0, totalCost: 0 };
    }

    const totalTokens = data.models.reduce((sum, m) => sum + m.tokens, 0);
    const totalCost = data.models.reduce((sum, m) => sum + m.cost, 0);

    // Prepare pie chart data
    const pieData = data.models.map((model: ModelUsageData) => ({
      name: model.model,
      value: model.tokens,
      percentage: model.percentage,
      cost: model.cost,
    }));

    // Prepare cost bar chart data (top 6 models)
    const costData = data.models
      .slice(0, 6)
      .map((model: ModelUsageData) => ({
        model: model.model,
        cost: model.cost,
        displayName: formatModelName(model.model).slice(0, 12),
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
        <p className="text-text-secondary">Failed to load models data</p>
      </div>
    );
  }

  const hasData = data.models.length > 0;

  if (!hasData) {
    return (
      <Card className="p-12 bg-bg-elevated border-border-default text-center">
        <Brain className="w-12 h-12 text-text-tertiary mx-auto mb-4 opacity-50" />
        <p className="text-text-secondary">No model usage data available</p>
        <p className="text-text-muted text-sm mt-2">
          Start using AI tools to see your model breakdown
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
            Token Distribution
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
                  {pieData.map((_, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={MODEL_COLORS[index % MODEL_COLORS.length].main}
                    />
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

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {pieData.slice(0, 6).map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: MODEL_COLORS[index % MODEL_COLORS.length].main }}
                />
                <span className="text-text-secondary truncate">{formatModelName(item.name)}</span>
                <span className="text-text-tertiary ml-auto">{item.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Cost Distribution Bar Chart */}
        <Card className="p-6 bg-bg-elevated border-border-default">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Cost by Model
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
                {costData.map((_, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={MODEL_COLORS[index % MODEL_COLORS.length].main}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Model Breakdown Table */}
      <Card className="p-6 bg-bg-elevated border-border-default">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5 text-ember-500" />
          Detailed Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Model
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
              {data.models.map((model: ModelUsageData, index: number) => (
                <tr
                  key={model.model}
                  className="border-b border-border-subtle hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: MODEL_COLORS[index % MODEL_COLORS.length].main,
                        }}
                      />
                      <span className="text-text-primary font-medium">
                        {formatModelName(model.model)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono text-text-primary">
                      {model.tokens.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono text-text-primary">
                      ${formatCost(model.cost)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-bg-base rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${model.percentage}%`,
                            backgroundColor: MODEL_COLORS[index % MODEL_COLORS.length].main,
                          }}
                        />
                      </div>
                      <span className="text-text-secondary text-sm w-12 text-right">
                        {model.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-text-secondary">{model.days_active}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
