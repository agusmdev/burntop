/**
 * Tests for Friends Leaderboard Query
 *
 * @vitest-environment node
 * @see friends-leaderboard.ts
 */

import { describe, expect, test } from 'vitest';

import { getFriendsLeaderboard } from './friends-leaderboard';

describe('getFriendsLeaderboard', () => {
  test('returns empty result when user has no friends', async () => {
    // This test requires a database connection and test data
    // For now, we'll test the function signature and basic structure
    const result = await getFriendsLeaderboard({
      currentUserId: 'nonexistent-user',
      period: 'all',
      type: 'global',
      limit: 10,
    });

    expect(result).toHaveProperty('entries');
    expect(result).toHaveProperty('pagination');
    expect(result).toHaveProperty('meta');
    expect(Array.isArray(result.entries)).toBe(true);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.nextCursor).toBe(null);
    expect(result.meta.totalFriends).toBe(0);
  });

  test('respects pagination limit', async () => {
    const result = await getFriendsLeaderboard({
      currentUserId: 'nonexistent-user',
      period: 'month',
      type: 'global',
      limit: 50,
    });

    expect(result.pagination.limit).toBe(50);
  });

  test('uses default values when not specified', async () => {
    const result = await getFriendsLeaderboard({
      currentUserId: 'nonexistent-user',
    });

    expect(result.meta.period).toBe('all');
    expect(result.meta.type).toBe('global');
    expect(result.pagination.limit).toBe(100);
  });
});
