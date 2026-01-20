import { useMutation } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { toPng } from 'html-to-image';
import { ArrowLeft, DollarSign, Download, Flame, Star, TrendingUp } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';

import type { ComparisonResponse } from '@/api/generated.schemas';

import { useCompareUsersApiV1UsersUsernameCompareOtherUsernameGet } from '@/api/users/users';
import { MonthlyBadge } from '@/components/monthly-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// TypeScript interfaces for comparison data
interface TokensData {
  total: number;
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
  reasoning: number;
}

interface CostData {
  total: string;
}

interface StreakData {
  current: number;
  longest: number;
}

interface TopModelItem {
  model: string;
  total_cost: string;
}

interface TopSourceItem {
  source: string;
  total_cost: string;
}

interface UserComparisonData {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  monthly_tokens: number;
  monthly_badge: string | null;
  tokens: TokensData;
  cost: CostData;
  streak: StreakData;
  top_models: TopModelItem[];
  top_sources: TopSourceItem[];
}

export const Route = createFileRoute('/compare/$userA/$userB')({
  component: ComparisonPage,
  notFoundComponent: () => {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Comparison Not Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary mb-4">
              One or both users could not be found or have private profiles.
            </p>
            <Button asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  },
});

function ComparisonPage() {
  const { userA, userB } = Route.useParams();
  const cardRef = useRef<HTMLDivElement>(null);

  // Fetch comparison data using Orval-generated hook
  const { data, isLoading, error } = useCompareUsersApiV1UsersUsernameCompareOtherUsernameGet(
    userA,
    userB
  );

  // Mutation for downloading comparison card as image
  const downloadCardMutation = useMutation({
    mutationFn: async ({
      cardElement,
      userAUsername,
      userBUsername,
    }: {
      cardElement: HTMLDivElement;
      userAUsername: string;
      userBUsername: string;
    }) => {
      const dataUrl = await toPng(cardElement, {
        quality: 0.95,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `burntop-comparison-${userAUsername}-vs-${userBUsername}.png`;
      link.href = dataUrl;
      link.click();
    },
    onError: () => {
      toast.error('Failed to download comparison card');
    },
  });

  // Handle download comparison card as image
  const handleDownloadCard = () => {
    if (!cardRef.current || !data) return;

    const comparisonResponse = data.data as ComparisonResponse;
    const userAData = comparisonResponse.user_a as unknown as UserComparisonData;
    const userBData = comparisonResponse.user_b as unknown as UserComparisonData;

    downloadCardMutation.mutate({
      cardElement: cardRef.current,
      userAUsername: userAData.username,
      userBUsername: userBData.username,
    });
  };

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  // Format cost for display
  const formatCost = (cost: string): string => {
    const num = parseFloat(cost);
    return `$${num.toFixed(2)}`;
  };

  // Get initials for avatar fallback
  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Determine winner for a metric
  const getWinner = (valueA: number, valueB: number): 'A' | 'B' | 'tie' => {
    if (valueA > valueB) return 'A';
    if (valueB > valueA) return 'B';
    return 'tie';
  };

  // Show loading state with skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Back button skeleton */}
          <div className="mb-6 flex items-center justify-between">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-36" />
          </div>

          {/* Header skeleton */}
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>

          {/* User cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {[0, 1].map((i) => (
              <Card key={i} className="bg-bg-elevated border-border-default">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center gap-4">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div className="text-center">
                      <Skeleton className="h-8 w-32 mb-2 mx-auto" />
                      <Skeleton className="h-4 w-24 mx-auto" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stats comparison skeleton */}
          <div className="space-y-4 mb-8">
            {[0, 1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-bg-elevated border-border-default">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="text-center md:text-right">
                      <Skeleton className="h-9 w-24 ml-auto mb-1" />
                    </div>
                    <div className="text-center">
                      <Skeleton className="h-5 w-5 mx-auto mb-2" />
                      <Skeleton className="h-4 w-24 mx-auto" />
                    </div>
                    <div className="text-center md:text-left">
                      <Skeleton className="h-9 w-24 mb-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Top models/tools skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="bg-bg-elevated border-border-default">
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[0, 1, 2].map((j) => (
                      <Skeleton key={j} className="h-10 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state or extract data
  if (error || !data || !('data' in data)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Comparison Not Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary mb-4">
              One or both users could not be found or have private profiles.
            </p>
            <Button asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const comparisonData = data.data as ComparisonResponse;
  const userAData = comparisonData.user_a as unknown as UserComparisonData;
  const userBData = comparisonData.user_b as unknown as UserComparisonData;

  // Comparison data
  const comparisons = [
    {
      label: 'Total Tokens',
      icon: Star,
      valueA: userAData.tokens.total,
      valueB: userBData.tokens.total,
      formatFn: formatNumber,
    },
    {
      label: 'Estimated Cost',
      icon: DollarSign,
      valueA: parseFloat(userAData.cost.total),
      valueB: parseFloat(userBData.cost.total),
      formatFn: formatCost,
    },
    {
      label: 'Current Streak',
      icon: Flame,
      valueA: userAData.streak.current,
      valueB: userBData.streak.current,
      formatFn: (n: number) => n.toString(),
    },
    {
      label: 'Longest Streak',
      icon: Flame,
      valueA: userAData.streak.longest,
      valueB: userBData.streak.longest,
      formatFn: (n: number) => n.toString(),
    },
    {
      label: 'Monthly Tokens',
      icon: TrendingUp,
      valueA: userAData.monthly_tokens,
      valueB: userBData.monthly_tokens,
      formatFn: formatNumber,
    },
  ];

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back button */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link to="/leaderboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Leaderboard
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadCard}
            disabled={downloadCardMutation.isPending}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {downloadCardMutation.isPending ? 'Generating...' : 'Download Card'}
          </Button>
        </div>

        {/* Comparison Card - This will be captured for download */}
        <div ref={cardRef} className="bg-bg-base p-8 rounded-lg">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-text-primary mb-2">User Comparison</h1>
            <p className="text-text-secondary">
              See how {userAData.name || userAData.username} and{' '}
              {userBData.name || userBData.username} stack up
            </p>
          </div>

          {/* User cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* User A Card */}
            <Card className="bg-bg-elevated border-border-default">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      src={userAData.image || undefined}
                      alt={userAData.name || 'User A'}
                    />
                    <AvatarFallback className="text-xl bg-bg-surface text-text-primary">
                      {getInitials(userAData.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-text-primary">
                      {userAData.name || userAData.username}
                    </h2>
                    <p className="text-text-secondary">@{userAData.username}</p>
                  </div>
                  <MonthlyBadge monthlyTokens={userAData.monthly_tokens} size="md" showName />
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/p/$username" params={{ username: userAData.username }}>
                      View Profile
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* User B Card */}
            <Card className="bg-bg-elevated border-border-default">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      src={userBData.image || undefined}
                      alt={userBData.name || 'User B'}
                    />
                    <AvatarFallback className="text-xl bg-bg-surface text-text-primary">
                      {getInitials(userBData.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-text-primary">
                      {userBData.name || userBData.username}
                    </h2>
                    <p className="text-text-secondary">@{userBData.username}</p>
                  </div>
                  <MonthlyBadge monthlyTokens={userBData.monthly_tokens} size="md" showName />
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/p/$username" params={{ username: userBData.username }}>
                      View Profile
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats comparison */}
          <div className="space-y-4 mb-8">
            {comparisons.map((comparison) => {
              const winner = getWinner(comparison.valueA, comparison.valueB);
              const Icon = comparison.icon;

              return (
                <Card key={comparison.label} className="bg-bg-elevated border-border-default">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      {/* User A stat */}
                      <div className="text-center md:text-right">
                        <div
                          className={`text-3xl font-bold font-mono mb-1 ${
                            winner === 'A' ? 'text-ember-500' : 'text-text-primary'
                          }`}
                        >
                          {comparison.formatFn(comparison.valueA as never)}
                        </div>
                        {winner === 'A' && (
                          <Badge variant="default" className="bg-ember-500">
                            Winner
                          </Badge>
                        )}
                      </div>

                      {/* Label */}
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Icon className="h-5 w-5 text-text-secondary" />
                        </div>
                        <p className="text-sm font-medium text-text-secondary">
                          {comparison.label}
                        </p>
                      </div>

                      {/* User B stat */}
                      <div className="text-center md:text-left">
                        <div
                          className={`text-3xl font-bold font-mono mb-1 ${
                            winner === 'B' ? 'text-ember-500' : 'text-text-primary'
                          }`}
                        >
                          {comparison.formatFn(comparison.valueB as never)}
                        </div>
                        {winner === 'B' && (
                          <Badge variant="default" className="bg-ember-500">
                            Winner
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Top models comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* User A top models */}
            <Card className="bg-bg-elevated border-border-default">
              <CardHeader>
                <CardTitle className="text-text-primary">
                  {userAData.name || userAData.username}'s Top Models
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userAData.top_models.length > 0 ? (
                  <div className="space-y-2">
                    {userAData.top_models.map((model: TopModelItem, index: number) => (
                      <div
                        key={model.model}
                        className="flex items-center justify-between p-2 bg-bg-surface rounded border border-border-subtle"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            #{index + 1}
                          </Badge>
                          <span className="text-sm text-text-primary">{model.model}</span>
                        </div>
                        <span className="text-sm font-mono text-ember-500">
                          {formatCost(model.total_cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-tertiary text-sm text-center py-4">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* User B top models */}
            <Card className="bg-bg-elevated border-border-default">
              <CardHeader>
                <CardTitle className="text-text-primary">
                  {userBData.name || userBData.username}'s Top Models
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userBData.top_models.length > 0 ? (
                  <div className="space-y-2">
                    {userBData.top_models.map((model: TopModelItem, index: number) => (
                      <div
                        key={model.model}
                        className="flex items-center justify-between p-2 bg-bg-surface rounded border border-border-subtle"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            #{index + 1}
                          </Badge>
                          <span className="text-sm text-text-primary">{model.model}</span>
                        </div>
                        <span className="text-sm font-mono text-ember-500">
                          {formatCost(model.total_cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-tertiary text-sm text-center py-4">No data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top tools comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User A top tools */}
            <Card className="bg-bg-elevated border-border-default">
              <CardHeader>
                <CardTitle className="text-text-primary">
                  {userAData.name || userAData.username}'s Top Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userAData.top_sources.length > 0 ? (
                  <div className="space-y-2">
                    {userAData.top_sources.map((source: TopSourceItem, index: number) => (
                      <div
                        key={source.source}
                        className="flex items-center justify-between p-2 bg-bg-surface rounded border border-border-subtle"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            #{index + 1}
                          </Badge>
                          <span className="text-sm text-text-primary capitalize">
                            {source.source}
                          </span>
                        </div>
                        <span className="text-sm font-mono text-ember-500">
                          {formatCost(source.total_cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-tertiary text-sm text-center py-4">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* User B top tools */}
            <Card className="bg-bg-elevated border-border-default">
              <CardHeader>
                <CardTitle className="text-text-primary">
                  {userBData.name || userBData.username}'s Top Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userBData.top_sources.length > 0 ? (
                  <div className="space-y-2">
                    {userBData.top_sources.map((source: TopSourceItem, index: number) => (
                      <div
                        key={source.source}
                        className="flex items-center justify-between p-2 bg-bg-surface rounded border border-border-subtle"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            #{index + 1}
                          </Badge>
                          <span className="text-sm text-text-primary capitalize">
                            {source.source}
                          </span>
                        </div>
                        <span className="text-sm font-mono text-ember-500">
                          {formatCost(source.total_cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-tertiary text-sm text-center py-4">No data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        {/* End of comparison card */}
      </div>
    </div>
  );
}
