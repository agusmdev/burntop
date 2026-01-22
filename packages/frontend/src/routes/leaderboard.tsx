import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

import type { LeaderboardEntryResponse } from '@/api/generated.schemas';

import {
  getGetLeaderboardApiV1LeaderboardGetQueryKey,
  useGetLeaderboardApiV1LeaderboardGet,
} from '@/api/leaderboard/leaderboard';
import {
  useFollowUserApiV1UsersUsernameFollowPost,
  useUnfollowUserApiV1UsersUsernameFollowDelete,
} from '@/api/users/users';
import { DashboardLayout } from '@/components/dashboard-layout';
import {
  formatCompactNumber,
  LeaderboardRow,
  LeaderboardRowSkeleton,
} from '@/components/leaderboard-row';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { handleLogout, useUser } from '@/lib/auth/client';
import {
  DEFAULT_OG_IMAGE,
  generateOGMeta,
  generateTwitterCardMeta,
  generateBreadcrumbSchema,
  createJsonLdTag,
  getBaseUrl,
} from '@/lib/seo';

type LeaderboardPeriod = 'all' | 'month' | 'week';

export const Route = createFileRoute('/leaderboard')({
  head: () => {
    const baseUrl = getBaseUrl();
    const leaderboardUrl = `${baseUrl}/leaderboard`;
    const defaultOgImage = `${baseUrl}${DEFAULT_OG_IMAGE}`;

    return {
      meta: [
        {
          title: 'Leaderboard - burntop.dev',
        },
        {
          name: 'description',
          content:
            'See top AI tool users and their stats. Compete for rankings by tokens, costs, and streaks.',
        },
        {
          name: 'keywords',
          content: 'AI leaderboard, developer rankings, Claude, Cursor, ChatGPT usage stats',
        },
        ...generateOGMeta({
          title: 'Leaderboard - burntop.dev',
          description:
            'See top AI tool users and their stats. Compete for rankings by tokens, costs, and streaks.',
          url: leaderboardUrl,
          image: defaultOgImage,
          type: 'website',
        }),
        ...generateTwitterCardMeta({
          title: 'Leaderboard - burntop.dev',
          description:
            'See top AI tool users and their stats. Compete for rankings by tokens, costs, and streaks.',
          image: defaultOgImage,
          card: 'summary_large_image',
        }),
      ],
      links: [
        {
          rel: 'canonical',
          href: leaderboardUrl,
        },
      ],
      scripts: [
        createJsonLdTag(
          generateBreadcrumbSchema([
            { name: 'Home', item: baseUrl },
            { name: 'Leaderboard', item: leaderboardUrl },
          ])
        ),
      ],
    };
  },
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { user } = useUser();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [loadingFollowUsers, setLoadingFollowUsers] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const {
    data: leaderboardResponse,
    isLoading,
    error,
  } = useGetLeaderboardApiV1LeaderboardGet({
    period,
    limit: 50,
  });

  const entries: LeaderboardEntryResponse[] =
    leaderboardResponse?.status === 200 ? leaderboardResponse.data.entries : [];

  const { mutate: followUser } = useFollowUserApiV1UsersUsernameFollowPost();
  const { mutate: unfollowUser } = useUnfollowUserApiV1UsersUsernameFollowDelete();

  const handleFollowToggle = (username: string, currentlyFollowing: boolean) => {
    if (!user) return;

    setLoadingFollowUsers((prev) => new Set(prev).add(username));

    const onSettled = () => {
      setLoadingFollowUsers((prev) => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
      queryClient.invalidateQueries({
        queryKey: getGetLeaderboardApiV1LeaderboardGetQueryKey({ period, limit: 50 }),
      });
    };

    const onSuccess = () => {
      if (currentlyFollowing) {
        toast.success(`Unfollowed @${username}`);
      } else {
        toast.success(`Now following @${username}`);
      }
    };

    const onError = () => {
      if (currentlyFollowing) {
        toast.error(`Failed to unfollow @${username}`);
      } else {
        toast.error(`Failed to follow @${username}`);
      }
    };

    if (currentlyFollowing) {
      unfollowUser({ username }, { onSettled, onSuccess, onError });
    } else {
      followUser({ username }, { onSettled, onSuccess, onError });
    }
  };

  const topNavUser = user
    ? {
        name: (user as { name?: string }).name || 'User',
        username: (user as { username?: string }).username || 'user',
        avatarUrl: (user as { image?: string | null }).image || undefined,
      }
    : undefined;

  const formatCost = (cost: number | null | undefined) => {
    if (cost == null) return '$0.00';
    return `$${cost.toFixed(2)}`;
  };

  return (
    <DashboardLayout user={topNavUser} onSignOut={user ? () => handleLogout('/') : undefined}>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Leaderboard</h1>
            <p className="text-sm sm:text-base text-text-secondary">
              See how you rank against the community
            </p>
          </div>

          {/* Period Tabs */}
          <Tabs value={period} onValueChange={(value) => setPeriod(value as LeaderboardPeriod)}>
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="all">All-time</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Leaderboard Table */}
          <Card className="overflow-hidden border-border-default bg-bg-elevated p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border-default bg-bg-surface/50 hover:bg-bg-surface/50">
                  <TableHead className="w-16 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Rank
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    User
                  </TableHead>
                  {user && (
                    <TableHead className="hidden sm:table-cell text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      Followers
                    </TableHead>
                  )}
                  <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Tokens
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Cost
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Tool
                  </TableHead>
                  <TableHead className="hidden sm:table-cell text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Streak
                  </TableHead>
                  <TableHead className="hidden md:table-cell w-16 text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    <span title="Rank change">+/-</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 10 }).map((_, i) => (
                    <LeaderboardRowSkeleton key={i} showFollowColumns={!!user} />
                  ))}

                {!isLoading &&
                  !error &&
                  entries.map((entry) => {
                    const isCurrentUser = user?.id === entry.user_id;

                    return (
                      <Link
                        key={`${entry.user_id}-${entry.rank}`}
                        to="/p/$username"
                        params={{ username: entry.username }}
                        className="contents"
                      >
                        <LeaderboardRow
                          rank={entry.rank}
                          username={entry.username}
                          displayName={entry.display_name || entry.username}
                          avatarUrl={entry.image || undefined}
                          tokens={formatCompactNumber(entry.total_tokens)}
                          cost={formatCost(entry.total_cost)}
                          preferredTool={entry.preferred_tool ?? null}
                          streak={entry.streak_days ?? 0}
                          rankChange={entry.rank_change}
                          isCurrentUser={isCurrentUser}
                          followersCount={user ? (entry.followers_count ?? 0) : undefined}
                          isFollowing={user ? (entry.is_following ?? false) : undefined}
                          onFollowToggle={user ? handleFollowToggle : undefined}
                          isFollowLoading={loadingFollowUsers.has(entry.username)}
                        />
                      </Link>
                    );
                  })}
              </TableBody>
            </Table>

            {/* Error State */}
            {error && !isLoading && (
              <div className="px-6 py-12 text-center">
                <p className="text-text-secondary mb-2">Failed to load leaderboard</p>
                <p className="text-sm text-text-tertiary">Please try again later</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && entries.length === 0 && (
              <div className="px-6 py-12 text-center">
                <p className="text-text-secondary mb-2">No leaderboard data yet</p>
                <p className="text-sm text-text-tertiary">
                  Be the first to sync your AI usage data!
                </p>
              </div>
            )}

            {/* Footer */}
            {!isLoading && entries.length > 0 && (
              <div className="px-4 py-3 border-t border-border-default bg-bg-surface/50 text-center">
                <p className="text-xs text-text-tertiary">Showing top {entries.length} users</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
