import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';

import type {
  GetUserProfileApiV1UsersUsernameGet200,
  UserStatsResponse,
  DailyTrendData,
  ToolUsageData,
  ModelUsageData,
  LeaderboardEntryResponse,
  InsightsResponse,
} from '@/api/generated.schemas';
import type {
  getUserFollowersApiV1UsersUsernameFollowersGetResponse,
  getUserFollowingApiV1UsersUsernameFollowingGetResponse,
} from '@/api/users/users';
import type { ContributionDay } from '@/components/contribution-heatmap';
import type { ProfileTabValue } from '@/components/profile';

import { useGetTrendsApiV1DashboardTrendsGet } from '@/api/dashboard/dashboard';
import { useGetUserInsightsApiV1InsightsGet } from '@/api/insights/insights';
import { useGetLeaderboardApiV1LeaderboardGet } from '@/api/leaderboard/leaderboard';
import {
  getGetUserProfileApiV1UsersUsernameGetQueryKey,
  getGetUserStatsApiV1UsersUsernameStatsGetQueryKey,
  getGetUserFollowersApiV1UsersUsernameFollowersGetQueryKey,
  getGetUserFollowingApiV1UsersUsernameFollowingGetQueryKey,
  getGetUserFollowStatsApiV1UsersUsernameFollowStatsGetQueryKey,
  useGetUserProfileApiV1UsersUsernameGet,
  useGetUserStatsApiV1UsersUsernameStatsGet,
  useGetUserFollowersApiV1UsersUsernameFollowersGet,
  useGetUserFollowingApiV1UsersUsernameFollowingGet,
  useGetUserFollowStatsApiV1UsersUsernameFollowStatsGet,
  useFollowUserApiV1UsersUsernameFollowPost,
  useUnfollowUserApiV1UsersUsernameFollowDelete,
  useGetUserToolsApiV1UsersUsernameToolsGet,
  useGetUserModelsApiV1UsersUsernameModelsGet,
  useGetUserTrendsApiV1UsersUsernameTrendsGet,
} from '@/api/users/users';
import { DashboardLayout, DashboardLayoutSkeleton } from '@/components/dashboard-layout';
import {
  ProfileHero,
  ProfileHeroSkeleton,
  PublicProfileHero,
  ProfileSignupCTA,
  ProfileTabs,
  ProfileTabContent,
  ProfileOverviewTab,
  ProfileOverviewTabSkeleton,
  ProfileActivityTab,
  ProfileProjectsTab,
  ProfileToolsTab,
  ProfileModelsTab,
} from '@/components/profile';
import { PublicProfileCTABanner } from '@/components/public-profile-cta-banner';
import { PublicProfileLayout } from '@/components/public-profile-layout';
import { ShareModal } from '@/components/share-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { handleLogout, useUser } from '@/lib/auth/client';

export const Route = createFileRoute('/p/$username')({
  component: UserProfilePage,
  head: ({ params }) => {
    const { username } = params;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://burntop.dev';
    const profileUrl = `${baseUrl}/p/${username}`;
    const ogImageUrl = `${baseUrl}/api/og/${username}/stats`;

    return {
      meta: [
        {
          title: `${username} - burntop.dev`,
        },
        {
          name: 'description',
          content: `Check out ${username}'s AI usage stats, streak, and achievements on burntop.dev - gamified AI usage tracking.`,
        },
        // OpenGraph tags for social media
        {
          property: 'og:type',
          content: 'profile',
        },
        {
          property: 'og:title',
          content: `${username} on burntop.dev`,
        },
        {
          property: 'og:description',
          content: `Check out ${username}'s AI usage stats, streak, and achievements on burntop.dev`,
        },
        {
          property: 'og:url',
          content: profileUrl,
        },
        {
          property: 'og:image',
          content: ogImageUrl,
        },
        {
          property: 'og:image:width',
          content: '1200',
        },
        {
          property: 'og:image:height',
          content: '630',
        },
        {
          property: 'og:site_name',
          content: 'burntop.dev',
        },
        // Twitter Card tags
        {
          name: 'twitter:card',
          content: 'summary_large_image',
        },
        {
          name: 'twitter:title',
          content: `${username} on burntop.dev`,
        },
        {
          name: 'twitter:description',
          content: `Check out ${username}'s AI usage stats, streak, and achievements`,
        },
        {
          name: 'twitter:image',
          content: ogImageUrl,
        },
      ],
    };
  },
  notFoundComponent: () => {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>User Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary mb-4">The user you're looking for doesn't exist.</p>
            <Button asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  },
});

function UserProfilePage() {
  const params = useParams({ from: '/p/$username' });
  const username = params.username;
  const { user: currentUser, isLoading: userLoading } = useUser();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ProfileTabValue>('overview');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const {
    data: profileResponse,
    isLoading: profileLoading,
    error: profileError,
  } = useGetUserProfileApiV1UsersUsernameGet(username);

  const { data: statsResponse, isLoading: statsLoading } =
    useGetUserStatsApiV1UsersUsernameStatsGet(username);

  const { data: followersResponse } = useGetUserFollowersApiV1UsersUsernameFollowersGet(username);

  // Fetch follow stats (follower/following counts + relationship status)
  const { data: followStatsResponse } =
    useGetUserFollowStatsApiV1UsersUsernameFollowStatsGet(username);

  const currentUserTyped = currentUser as { username?: string; email?: string; id?: string } | null;
  const currentUsername =
    currentUserTyped?.username || currentUserTyped?.email?.split('@')[0] || '';
  const isOwnProfileCheck = currentUsername === username && !!currentUser;

  const { data: currentUserFollowingResponse } = useGetUserFollowingApiV1UsersUsernameFollowingGet(
    currentUsername || '__disabled__'
  );

  const { data: leaderboardResponse } = useGetLeaderboardApiV1LeaderboardGet({ limit: 100 });

  const { data: insightsResponse } = useGetUserInsightsApiV1InsightsGet(
    isOwnProfileCheck ? { period: 'all' } : undefined
  );

  // Fetch user trends from public endpoint (works for any user)
  const { data: userTrendsResponse } = useGetUserTrendsApiV1UsersUsernameTrendsGet(username, {
    days: 365,
  });

  // Also fetch dashboard trends for own profile (has additional data like daily trends chart)
  const { data: trendsResponse } = useGetTrendsApiV1DashboardTrendsGet(
    isOwnProfileCheck ? { days: 365 } : undefined
  );

  // Fetch tools and models from public user endpoints
  const { data: toolsResponse } = useGetUserToolsApiV1UsersUsernameToolsGet(username);

  const { data: modelsResponse } = useGetUserModelsApiV1UsersUsernameModelsGet(username);

  const followersQueryKey = getGetUserFollowersApiV1UsersUsernameFollowersGetQueryKey(username);
  const followStatsQueryKey =
    getGetUserFollowStatsApiV1UsersUsernameFollowStatsGetQueryKey(username);
  const currentUserFollowingQueryKey =
    getGetUserFollowingApiV1UsersUsernameFollowingGetQueryKey(currentUsername);

  const profile: GetUserProfileApiV1UsersUsernameGet200 | undefined = useMemo(() => {
    if (profileResponse?.status === 200) {
      return profileResponse.data;
    }
    return undefined;
  }, [profileResponse]);

  const stats: UserStatsResponse | undefined = useMemo(() => {
    if (statsResponse?.status === 200) {
      return statsResponse.data;
    }
    return undefined;
  }, [statsResponse]);

  const followers = useMemo(() => {
    if (followersResponse?.status === 200) {
      return followersResponse.data.items || [];
    }
    return [];
  }, [followersResponse]);

  const followerCount = useMemo(() => {
    if (followStatsResponse?.status === 200) {
      return followStatsResponse.data.followers_count;
    }
    return 0;
  }, [followStatsResponse]);

  const followingCount = useMemo(() => {
    if (followStatsResponse?.status === 200) {
      return followStatsResponse.data.following_count;
    }
    return 0;
  }, [followStatsResponse]);

  const isFollowing = useMemo(() => {
    if (!currentUser || !profile?.id) return false;
    if (followStatsResponse?.status === 200 && followStatsResponse.data.is_following != null) {
      return followStatsResponse.data.is_following;
    }
    // Fallback to old logic if follow-stats doesn't have relationship info
    if (currentUserFollowingResponse?.status !== 200) return false;
    const followingList = currentUserFollowingResponse.data.items || [];
    return followingList.some((user) => user.id === profile.id);
  }, [currentUser, profile?.id, followStatsResponse, currentUserFollowingResponse]);

  const followsYou = useMemo(() => {
    if (!currentUser) return false;
    if (followStatsResponse?.status === 200 && followStatsResponse.data.follows_me != null) {
      return followStatsResponse.data.follows_me;
    }
    // Fallback to old logic if follow-stats doesn't have relationship info
    const currentUserId = currentUserTyped?.id;
    if (!currentUserId) return false;
    if (followersResponse?.status !== 200) return false;
    const followersList = followersResponse.data.items || [];
    return followersList.some((user) => user.id === currentUserId);
  }, [currentUser, currentUserTyped?.id, followStatsResponse, followersResponse]);

  const leaderboardEntry: LeaderboardEntryResponse | null = useMemo(() => {
    if (leaderboardResponse?.status !== 200) return null;
    return leaderboardResponse.data.entries.find((e) => e.username === username) || null;
  }, [leaderboardResponse, username]);

  const totalLeaderboardUsers = useMemo(() => {
    if (leaderboardResponse?.status !== 200) return undefined;
    return leaderboardResponse.data.pagination.total;
  }, [leaderboardResponse]);

  const insights: InsightsResponse | null = useMemo(() => {
    if (insightsResponse?.status !== 200) return null;
    return insightsResponse.data;
  }, [insightsResponse]);

  // Public user trends data (works for any profile)
  const userTrendsData: DailyTrendData[] = useMemo(() => {
    if (userTrendsResponse?.status !== 200) return [];
    return userTrendsResponse.data.daily_data;
  }, [userTrendsResponse]);

  // Dashboard trends data (for own profile only, may have additional data)
  const dashboardTrendsData: DailyTrendData[] = useMemo(() => {
    if (trendsResponse?.status !== 200) return [];
    return trendsResponse.data.daily_data;
  }, [trendsResponse]);

  // Use public user trends as primary, dashboard trends as fallback for own profile
  const trendsData = userTrendsData.length > 0 ? userTrendsData : dashboardTrendsData;

  const toolsData: ToolUsageData[] = useMemo(() => {
    if (toolsResponse?.status !== 200) return [];
    return toolsResponse.data.tools;
  }, [toolsResponse]);

  const modelsData: ModelUsageData[] = useMemo(() => {
    if (modelsResponse?.status !== 200) return [];
    return modelsResponse.data.models;
  }, [modelsResponse]);

  const contributionData = useMemo((): ContributionDay[] => {
    // Use actual user trends data from the public endpoint
    return userTrendsData.map((d) => ({
      date: d.date,
      tokens: d.tokens,
      sessions: undefined,
    }));
  }, [userTrendsData]);

  const followMutation = useFollowUserApiV1UsersUsernameFollowPost({
    mutation: {
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: followersQueryKey });
        await queryClient.cancelQueries({ queryKey: currentUserFollowingQueryKey });

        const previousFollowers = queryClient.getQueryData(followersQueryKey);
        const previousFollowing = queryClient.getQueryData(currentUserFollowingQueryKey);

        queryClient.setQueryData(
          followersQueryKey,
          (old: getUserFollowersApiV1UsersUsernameFollowersGetResponse | undefined) => {
            if (!old || old.status !== 200) return old;
            return {
              ...old,
              data: {
                ...old.data,
                total: (old.data.total || 0) + 1,
              },
            };
          }
        );

        if (profile) {
          queryClient.setQueryData(
            currentUserFollowingQueryKey,
            (old: getUserFollowingApiV1UsersUsernameFollowingGetResponse | undefined) => {
              if (!old || old.status !== 200) return old;
              const newItem = {
                id: profile.id,
                username: profile.username,
                name: profile.name,
                image: profile.image,
                bio: null,
                location: null,
                region: null,
                website_url: null,
                is_public: true,
                created_at: profile.created_at,
                updated_at: profile.updated_at,
              };
              return {
                ...old,
                data: {
                  ...old.data,
                  items: [...(old.data.items || []), newItem],
                  total: (old.data.total || 0) + 1,
                },
              };
            }
          );
        }

        return { previousFollowers, previousFollowing };
      },
      onError: (_err, _variables, context) => {
        if (context?.previousFollowers) {
          queryClient.setQueryData(followersQueryKey, context.previousFollowers);
        }
        if (context?.previousFollowing) {
          queryClient.setQueryData(currentUserFollowingQueryKey, context.previousFollowing);
        }
        toast.error('Failed to follow user');
      },
      onSuccess: () => {
        toast.success('Followed successfully');
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: followersQueryKey });
        queryClient.invalidateQueries({ queryKey: followStatsQueryKey });
        queryClient.invalidateQueries({ queryKey: currentUserFollowingQueryKey });
        queryClient.invalidateQueries({
          queryKey: getGetUserProfileApiV1UsersUsernameGetQueryKey(username),
        });
        queryClient.invalidateQueries({
          queryKey: getGetUserStatsApiV1UsersUsernameStatsGetQueryKey(username),
        });
        queryClient.invalidateQueries({ queryKey: ['/api/v1/leaderboard'] });
        queryClient.invalidateQueries({ queryKey: ['/api/v1/feed'] });
      },
    },
  });

  const unfollowMutation = useUnfollowUserApiV1UsersUsernameFollowDelete({
    mutation: {
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: followersQueryKey });
        await queryClient.cancelQueries({ queryKey: currentUserFollowingQueryKey });

        const previousFollowers = queryClient.getQueryData(followersQueryKey);
        const previousFollowing = queryClient.getQueryData(currentUserFollowingQueryKey);

        queryClient.setQueryData(
          followersQueryKey,
          (old: getUserFollowersApiV1UsersUsernameFollowersGetResponse | undefined) => {
            if (!old || old.status !== 200) return old;
            return {
              ...old,
              data: {
                ...old.data,
                total: Math.max((old.data.total || 1) - 1, 0),
              },
            };
          }
        );

        if (profile) {
          queryClient.setQueryData(
            currentUserFollowingQueryKey,
            (old: getUserFollowingApiV1UsersUsernameFollowingGetResponse | undefined) => {
              if (!old || old.status !== 200 || !old.data.items) return old;
              return {
                ...old,
                data: {
                  ...old.data,
                  items: old.data.items.filter((u) => u.id !== profile.id),
                  total: Math.max((old.data.total || 1) - 1, 0),
                },
              };
            }
          );
        }

        return { previousFollowers, previousFollowing };
      },
      onError: (_err, _variables, context) => {
        if (context?.previousFollowers) {
          queryClient.setQueryData(followersQueryKey, context.previousFollowers);
        }
        if (context?.previousFollowing) {
          queryClient.setQueryData(currentUserFollowingQueryKey, context.previousFollowing);
        }
        toast.error('Failed to unfollow user');
      },
      onSuccess: () => {
        toast.success('Unfollowed successfully');
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: followersQueryKey });
        queryClient.invalidateQueries({ queryKey: followStatsQueryKey });
        queryClient.invalidateQueries({ queryKey: currentUserFollowingQueryKey });
        queryClient.invalidateQueries({
          queryKey: getGetUserProfileApiV1UsersUsernameGetQueryKey(username),
        });
        queryClient.invalidateQueries({
          queryKey: getGetUserStatsApiV1UsersUsernameStatsGetQueryKey(username),
        });
        queryClient.invalidateQueries({ queryKey: ['/api/v1/leaderboard'] });
        queryClient.invalidateQueries({ queryKey: ['/api/v1/feed'] });
      },
    },
  });

  const handleFollowToggle = () => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    if (isFollowing) {
      unfollowMutation.mutate({ username });
    } else {
      followMutation.mutate({ username });
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/p/${username}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Profile link copied! Paste anywhere to share.');
      // Optionally open modal after copy for preview/download
      setIsShareModalOpen(true);
    } catch {
      toast.error('Failed to copy link');
      // Still open modal as fallback
      setIsShareModalOpen(true);
    }
  };

  const isOwnProfile = currentUser?.id === profile?.id;

  // Prepare user data for TopNav
  const topNavUser = currentUser
    ? {
        name: (currentUser as { name?: string }).name || currentUser.email,
        username: currentUserTyped?.username || currentUser.email.split('@')[0],
        avatarUrl: (currentUser as { image?: string }).image || undefined,
      }
    : undefined;

  if (userLoading || profileLoading || statsLoading) {
    return (
      <DashboardLayoutSkeleton>
        <div className="px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <ProfileHeroSkeleton />
            <div className="mt-8">
              <ProfileOverviewTabSkeleton />
            </div>
          </div>
        </div>
      </DashboardLayoutSkeleton>
    );
  }

  if (profileError || !profile || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary mb-4">Unable to load this profile.</p>
            <Button asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PUBLIC VIEW: Not logged in
  if (!currentUser) {
    return (
      <PublicProfileLayout username={username}>
        <div className="px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <PublicProfileHero
              profile={profile}
              stats={stats}
              followers={followers}
              followerCount={followerCount}
              followingCount={followingCount}
              onShare={handleShare}
            />

            <div className="mt-8">
              <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab}>
                <ProfileTabContent value="overview">
                  <ProfileOverviewTab
                    stats={stats}
                    insights={null}
                    leaderboardEntry={leaderboardEntry}
                    totalLeaderboardUsers={totalLeaderboardUsers}
                    contributionData={contributionData}
                  />
                </ProfileTabContent>

                <ProfileTabContent value="activity">
                  <ProfileActivityTab contributionData={contributionData} />
                </ProfileTabContent>

                <ProfileTabContent value="projects">
                  <ProfileProjectsTab username={username} isOwnProfile={false} />
                </ProfileTabContent>

                <ProfileTabContent value="tools">
                  {toolsData.length > 0 ? (
                    <ProfileToolsTab tools={toolsData} />
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-text-secondary">No usage data available yet</p>
                    </div>
                  )}
                </ProfileTabContent>

                <ProfileTabContent value="models">
                  {modelsData.length > 0 ? (
                    <ProfileModelsTab models={modelsData} />
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-text-secondary">No usage data available yet</p>
                    </div>
                  )}
                </ProfileTabContent>
              </ProfileTabs>
            </div>

            <div className="mt-12">
              <ProfileSignupCTA username={username} />
            </div>
          </div>
        </div>

        <PublicProfileCTABanner username={username} />

        {origin && (
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            title="Share Profile"
            description="Preview how your profile appears when shared"
            imageUrl={`${origin}/api/og/${profile.username}/stats`}
            shareUrl={`${origin}/p/${profile.username}`}
          />
        )}
      </PublicProfileLayout>
    );
  }

  // AUTHENTICATED VIEW: Logged in (existing layout)
  return (
    <DashboardLayout user={topNavUser} onSignOut={() => handleLogout('/')}>
      <div className="px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <ProfileHero
            profile={profile}
            stats={stats}
            followers={followers}
            followerCount={followerCount}
            followingCount={followingCount}
            isOwnProfile={isOwnProfile}
            isFollowing={isFollowing}
            followsYou={followsYou}
            isFollowPending={followMutation.isPending || unfollowMutation.isPending}
            onFollowToggle={handleFollowToggle}
            onShare={handleShare}
          />

          <div className="mt-8">
            <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab}>
              <ProfileTabContent value="overview">
                <ProfileOverviewTab
                  stats={stats}
                  insights={insights}
                  leaderboardEntry={leaderboardEntry}
                  totalLeaderboardUsers={totalLeaderboardUsers}
                  contributionData={contributionData}
                />
              </ProfileTabContent>

              <ProfileTabContent value="activity">
                {isOwnProfile ? (
                  <ProfileActivityTab contributionData={contributionData} trendsData={trendsData} />
                ) : (
                  <ProfileActivityTab contributionData={contributionData} />
                )}
              </ProfileTabContent>

              <ProfileTabContent value="projects">
                <ProfileProjectsTab username={username} isOwnProfile={isOwnProfile} />
              </ProfileTabContent>

              <ProfileTabContent value="tools">
                {toolsData.length > 0 ? (
                  <ProfileToolsTab tools={toolsData} />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-text-secondary">
                      {isOwnProfile
                        ? 'Sync your usage data to see tool breakdown'
                        : 'No usage data available yet'}
                    </p>
                  </div>
                )}
              </ProfileTabContent>

              <ProfileTabContent value="models">
                {modelsData.length > 0 ? (
                  <ProfileModelsTab models={modelsData} />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-text-secondary">
                      {isOwnProfile
                        ? 'Sync your usage data to see model breakdown'
                        : 'No usage data available yet'}
                    </p>
                  </div>
                )}
              </ProfileTabContent>
            </ProfileTabs>
          </div>
        </div>
      </div>

      {origin && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title="Share Profile"
          description="Preview how your profile appears when shared"
          imageUrl={`${origin}/api/og/${profile.username}/stats`}
          shareUrl={`${origin}/p/${profile.username}`}
        />
      )}
    </DashboardLayout>
  );
}
