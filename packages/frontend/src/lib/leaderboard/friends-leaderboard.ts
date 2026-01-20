/**
 * Friends Leaderboard Query Functions
 *
 * STUB FILE: This file was created as a stub during migration.
 * The actual implementation should query the friends leaderboard from the backend.
 *
 * TODO: Implement actual friends leaderboard when the backend supports it
 */

export interface FriendsLeaderboardOptions {
  currentUserId: string;
  period?: 'all' | 'month' | 'week';
  type?: 'global' | 'diverse' | 'efficient' | 'streak' | 'rising' | 'reasoning';
  limit?: number;
  cursor?: string | null;
}

export interface FriendsLeaderboardEntry {
  user_id: string;
  username: string;
  display_name?: string | null;
  image?: string | null;
  rank: number;
  score: number;
  total_tokens?: number | null;
  total_cost?: number | null;
  streak_days?: number | null;
}

export interface FriendsLeaderboardPagination {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface FriendsLeaderboardMeta {
  period: string;
  type: string;
  totalFriends: number;
}

export interface FriendsLeaderboardResult {
  entries: FriendsLeaderboardEntry[];
  pagination: FriendsLeaderboardPagination;
  meta: FriendsLeaderboardMeta;
}

/**
 * Get friends leaderboard entries
 *
 * STUB: Returns empty results. The backend friends leaderboard
 * endpoint requires authentication and returns an empty response
 * until properly implemented.
 *
 * @param options Leaderboard query options
 * @returns Promise with leaderboard results
 */
export async function getFriendsLeaderboard(
  options: FriendsLeaderboardOptions
): Promise<FriendsLeaderboardResult> {
  const { period = 'all', type = 'global', limit = 100 } = options;

  // STUB: Return empty results
  // In a real implementation, this would call the backend API
  return {
    entries: [],
    pagination: {
      limit,
      hasMore: false,
      nextCursor: null,
    },
    meta: {
      period,
      type,
      totalFriends: 0,
    },
  };
}
