/**
 * Followers List Page (Protected Route)
 *
 * Displays a list of users who follow the current user.
 * Uses client-side React Query for data fetching.
 *
 * @see Plan Phase 8.2 - Create followers list page
 */

import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { AlertCircle, RotateCcw, Users } from 'lucide-react';

import {
  getGetUserFollowersApiV1UsersUsernameFollowersGetQueryKey,
  useGetUserFollowersApiV1UsersUsernameFollowersGet,
} from '@/api/users/users';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/lib/auth/client';

export const Route = createFileRoute('/followers')({
  component: FollowersPage,
});

// Skeleton component for loading state
function FollowersSkeleton() {
  return (
    <div className="min-h-screen bg-bg-base">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header skeleton */}
        <div className="mb-8">
          <Card className="bg-bg-elevated border-border-default">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-9 w-32" />
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* List skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="bg-bg-elevated border-border-default">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function FollowersPage() {
  const { user } = useUser();

  // Derive username from authenticated user
  const userTyped = user as { username?: string; email?: string } | null;
  const username = userTyped?.username || '';

  // Fetch followers using Orval-generated React Query hook
  // Only fetch when user is authenticated and has a valid username
  const queryUsername = username || 'placeholder'; // Provide placeholder to satisfy type; query is disabled when no user
  const { data, isLoading, error, refetch } = useGetUserFollowersApiV1UsersUsernameFollowersGet(
    queryUsername,
    undefined,
    {
      query: {
        queryKey: getGetUserFollowersApiV1UsersUsernameFollowersGetQueryKey(queryUsername),
        enabled: !!user && !!username,
      },
    }
  );

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" search={{ error: undefined, error_description: undefined }} />;
  }

  if (isLoading) {
    return <FollowersSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Card className="bg-bg-elevated border-border-default p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-1">
                Failed to load followers
              </h3>
              <p className="text-sm text-text-secondary">Something went wrong. Please try again.</p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Extract paginated data - response has shape { data: PageUserPublicResponse, status: 200 }
  const pageData = data.status === 200 ? data.data : undefined;
  const followers = pageData?.items || [];
  const count = pageData?.total || 0;

  // Get initials for avatar fallback
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <Card className="bg-bg-elevated border-border-default">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-ember-500" />
                <div className="flex-1">
                  <CardTitle className="text-text-primary">Your Followers</CardTitle>
                  <p className="text-sm text-text-secondary mt-1">
                    {count === 0
                      ? 'No followers yet'
                      : `${count} ${count === 1 ? 'person follows' : 'people follow'} you`}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link
                    to="/p/$username"
                    params={{
                      username,
                    }}
                  >
                    Back to Profile
                  </Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Followers List */}
        {followers.length === 0 ? (
          <Card className="bg-bg-elevated border-border-default">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <Users className="h-12 w-12 text-text-tertiary" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-text-primary mb-2">No followers yet</h3>
                  <p className="text-text-secondary max-w-sm">
                    Share your profile and achievements to grow your follower base!
                  </p>
                </div>
                <Button asChild variant="default" className="mt-4">
                  <Link to="/leaderboard">Explore Leaderboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {followers.map((follower) => (
              <Card key={follower.id} className="bg-bg-elevated border-border-default">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <Link
                      to="/p/$username"
                      params={{
                        username: follower.username,
                      }}
                    >
                      <Avatar className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity">
                        <AvatarImage
                          src={follower.image || undefined}
                          alt={follower.name || undefined}
                        />
                        <AvatarFallback className="bg-bg-surface text-text-primary">
                          {getInitials(follower.name)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to="/p/$username"
                        params={{
                          username: follower.username,
                        }}
                        className="hover:underline hover:text-ember-500 transition-colors"
                      >
                        <h3 className="text-text-primary font-semibold truncate">
                          {follower.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-text-secondary">@{follower.username}</p>
                      {follower.bio && (
                        <p className="text-sm text-text-secondary mt-1 line-clamp-1">
                          {follower.bio}
                        </p>
                      )}
                    </div>

                    {/* View Profile Button */}
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to="/p/$username"
                        params={{
                          username: follower.username,
                        }}
                      >
                        View Profile
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
