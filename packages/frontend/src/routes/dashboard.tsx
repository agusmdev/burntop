/**
 * Dashboard Page (Protected Route with Data Loading)
 *
 * Fetches and displays user dashboard data including tokens, cost, streak, and level.
 * Uses server-side loader for data fetching with auth middleware.
 *
 * @see Plan Phase 4.2 - Dashboard Overview Tab
 */

import { createFileRoute } from '@tanstack/react-router';
import {
  BarChart3,
  Brain,
  Database,
  DollarSign,
  Lightbulb,
  TrendingUp,
  Wrench,
  Zap,
} from 'lucide-react';

import type { UserResponse } from '@/api/generated.schemas';

import { useGetOverviewApiV1DashboardOverviewGet } from '@/api/dashboard/dashboard';
import { DashboardInsights } from '@/components/dashboard-insights';
import { DashboardLayout } from '@/components/dashboard-layout';
import { DashboardModels } from '@/components/dashboard-models';
import { DashboardTools } from '@/components/dashboard-tools';
import { DashboardTrends } from '@/components/dashboard-trends';
import { StatsCard } from '@/components/stats-card';
import { StreakCounter } from '@/components/streak-counter';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { handleLogout, useUser } from '@/lib/auth/client';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
  head: () => ({
    meta: [
      {
        title: 'Dashboard - burntop.dev',
      },
      {
        name: 'description',
        content:
          'View your AI usage stats, track tokens, monitor costs, and see your activity heatmap. Analyze trends across Claude, ChatGPT, and other AI tools.',
      },
    ],
  }),
});

function DashboardPage() {
  const { user: rawUser, isLoading: userLoading } = useUser();
  const user = rawUser as UserResponse | null;

  const { data: overviewResponse, isLoading: overviewLoading } =
    useGetOverviewApiV1DashboardOverviewGet();

  const overview = overviewResponse?.data;

  // Show loading skeleton while fetching
  if (userLoading || overviewLoading || !user || !overview) {
    return (
      <DashboardLayout user={undefined} onSignOut={() => handleLogout('/')}>
        <div className="px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-10 w-64 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Prepare user data for TopNav
  const topNavUser = {
    name: (user.name as string) || user.email,
    username: user.username || user.email.split('@')[0],
    avatarUrl: (user.image as string | undefined) || undefined,
  };

  // Format currency
  const formatCost = (cost: string) => {
    const num = parseFloat(cost);
    return `$${num.toFixed(2)}`;
  };

  // Format large numbers with K/M/B suffix
  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000_000) {
      return `${(tokens / 1_000_000_000).toFixed(1)}B`;
    }
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`;
    }
    if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  return (
    <DashboardLayout user={topNavUser} onSignOut={() => handleLogout('/')}>
      <div className="px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">Dashboard</h1>
            <p className="text-text-secondary">
              Welcome back,{' '}
              <span className="text-ember-500">{user.name || user.email.split('@')[0]}</span>!
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
            <StatsCard
              label="Total Tokens"
              value={formatTokens(overview.total_tokens)}
              sublabel="All time usage"
              icon={Zap}
              variant="ember"
            />

            <StatsCard
              label="Estimated Cost"
              value={formatCost(overview.total_cost.toString())}
              sublabel="Total spent"
              icon={DollarSign}
              variant="default"
              mono={false}
            />

            <div className="relative group rounded-xl p-5 overflow-hidden backdrop-blur-sm ring-1 ring-ember-500/30 bg-gradient-to-br from-bg-elevated via-bg-elevated to-ember-500/5 shadow-[0_0_30px_rgba(255,107,0,0.15),inset_0_1px_0_rgba(255,107,0,0.1)] transition-all duration-300 ease-out hover:ring-2 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(255,107,0,0.2)]">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/[0.02] pointer-events-none" />
              {/* Corner accent */}
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-ember-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-ember-500/15 transition-colors duration-500" />
              <div className="relative">
                <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                  Current Streak
                </span>
                <div className="mt-3">
                  <StreakCounter days={overview.current_streak} size="lg" orientation="vertical" />
                </div>
                <p className="mt-2 text-xs text-text-tertiary/80 font-medium">
                  Longest: {overview.longest_streak} days
                </p>
              </div>
            </div>

            <StatsCard
              label="Monthly Tokens"
              value={formatTokens(overview.monthly_tokens)}
              sublabel={overview.monthly_badge || 'No badge yet'}
              icon={TrendingUp}
              variant="default"
            />

            <StatsCard
              label="Cache Efficiency"
              value={`${overview.cache_efficiency.toFixed(1)}%`}
              sublabel="Avg cache hit rate"
              icon={Database}
              variant="default"
            />
          </div>

          {/* Tabs for different dashboard views */}
          <Tabs defaultValue="trends" className="w-full">
            <TabsList>
              <TabsTrigger value="trends">
                <BarChart3 className="h-4 w-4" />
                Trends
              </TabsTrigger>
              <TabsTrigger value="models">
                <Brain className="h-4 w-4" />
                Models
              </TabsTrigger>
              <TabsTrigger value="tools">
                <Wrench className="h-4 w-4" />
                Tools
              </TabsTrigger>
              <TabsTrigger value="insights">
                <Lightbulb className="h-4 w-4" />
                Insights
              </TabsTrigger>
            </TabsList>

            {/* Trends Tab */}
            <TabsContent value="trends">
              <DashboardTrends />
            </TabsContent>

            {/* Models Tab */}
            <TabsContent value="models">
              <DashboardModels />
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent value="tools">
              <DashboardTools />
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights">
              <DashboardInsights />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
