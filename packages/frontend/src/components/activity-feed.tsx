/**
 * Activity Feed Component
 *
 * Displays a feed of recent activities from followed users.
 * Shows achievement unlocks, streak milestones, rank changes, and level-ups.
 *
 * @see plan.md Phase 8.3 - Activity Feed
 * @see full-spec.md Section 5.5 - Activity Feed
 */

import { Link } from '@tanstack/react-router';
import { Award, Flame, TrendingUp, Trophy } from 'lucide-react';

import type { ActivityResponse } from '@/api/generated.schemas';

import { useGetFeedApiV1FeedGet } from '@/api/feed/feed';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Format a date to relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}

// Type alias for cleaner code
type Activity = ActivityResponse;

// Mock data for development preview
const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'mock-1',
    user_id: 'mock-user-1',
    type: 'streak_milestone',
    data: { days: 30 },
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    user: {
      id: 'mock-user-1',
      username: 'sarah_dev',
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      image: null,
    },
  },
  {
    id: 'mock-2',
    user_id: 'mock-user-2',
    type: 'rank_change',
    data: { newRank: 5, oldRank: 12 },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    user: {
      id: 'mock-user-2',
      username: 'alex_codes',
      name: 'Alex Rivera',
      email: 'alex@example.com',
      image: null,
    },
  },
  {
    id: 'mock-3',
    user_id: 'mock-user-3',
    type: 'achievement_unlock',
    data: { achievement: 'token_master' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    user: {
      id: 'mock-user-3',
      username: 'jamie_ml',
      name: 'Jamie Park',
      email: 'jamie@example.com',
      image: null,
    },
  },
  {
    id: 'mock-4',
    user_id: 'mock-user-4',
    type: 'level_up',
    data: { level: 15 },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
    user: {
      id: 'mock-user-4',
      username: 'mike_ai',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      image: null,
    },
  },
  {
    id: 'mock-5',
    user_id: 'mock-user-5',
    type: 'streak_milestone',
    data: { days: 7 },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    user: {
      id: 'mock-user-5',
      username: 'emma_tech',
      name: 'Emma Wilson',
      email: 'emma@example.com',
      image: null,
    },
  },
];

function getActivityIcon(type: string): typeof Award {
  switch (type) {
    case 'achievement_unlock':
      return Award;
    case 'streak_milestone':
      return Flame;
    case 'rank_change':
      return Trophy;
    case 'level_up':
      return TrendingUp;
    default:
      return Award;
  }
}

function getActivityText(activity: Activity): string {
  const data = (activity.data as Record<string, unknown>) || {};
  switch (activity.type) {
    case 'achievement_unlock':
      return `unlocked an achievement`;
    case 'streak_milestone':
      return `reached a ${data.days || 0} day streak`;
    case 'rank_change':
      return `moved to #${data.newRank || 0} on the leaderboard`;
    case 'level_up':
      return `leveled up to ${data.level || 0}`;
    default:
      return 'had an activity';
  }
}

interface ActivityItemProps {
  activity: Activity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const Icon = getActivityIcon(activity.type);
  const user = activity.user;

  if (!user) {
    return null; // Skip if user data is missing
  }

  const userName = user.name || 'Anonymous';
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border-default last:border-0">
      {/* User Avatar */}
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.image || undefined} alt={userName} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <Icon className="h-4 w-4 mt-0.5 text-ember-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary">
              <Link
                to="/p/$username"
                params={{ username: user.username }}
                className="font-medium hover:text-ember-500 transition-colors"
              >
                {userName}
              </Link>{' '}
              <span className="text-text-secondary">{getActivityText(activity)}</span>
            </p>

            {/* Timestamp */}
            <p className="text-xs text-text-tertiary mt-1">
              {formatRelativeTime(activity.created_at)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface ActivityFeedProps {
  /** Maximum number of activities to display */
  limit?: number;
  /** Additional CSS classes */
  className?: string;
  /** Show mock data for preview (development only) */
  useMockData?: boolean;
}

/**
 * Activity feed component showing recent activities from followed users.
 * Fetches data from FastAPI backend using React Query hooks.
 */
export function ActivityFeed({ limit = 10, className, useMockData = false }: ActivityFeedProps) {
  // Fetch feed from FastAPI backend
  const { data: feedResponse, isLoading, error } = useGetFeedApiV1FeedGet({ page: 1, size: limit });

  // Extract activities from response, fall back to mock data if enabled and empty
  const apiActivities = feedResponse?.status === 200 ? feedResponse.data.items : [];
  const activities =
    useMockData && apiActivities.length === 0 ? MOCK_ACTIVITIES.slice(0, limit) : apiActivities;

  return (
    <Card className={cn('bg-bg-elevated border-border-default', className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-text-primary">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 py-3">
                <div className="h-10 w-10 rounded-full bg-bg-subtle animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-bg-subtle animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-bg-subtle animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <p className="text-text-secondary text-sm">Failed to load activity feed</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && activities.length === 0 && (
          <div className="text-center py-8">
            <p className="text-text-secondary text-sm">No recent activity</p>
            <p className="text-text-tertiary text-xs mt-1">
              Follow users to see their activities here
            </p>
          </div>
        )}

        {/* Activities List */}
        {!isLoading && !error && activities.length > 0 && (
          <div className="space-y-0">
            {activities.map((activity: ActivityResponse) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
