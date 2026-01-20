/**
 * Tests for Data Validation Utilities
 */

import { describe, expect, it } from 'vitest';

import {
  getSafeCacheEfficiency,
  hasMinimumActivityData,
  safeNumber,
  safeString,
  validateDaysActive,
  validateStatsData,
  validateWeeklyEstimates,
} from './validate-data';

import type { UserStatsResponse } from '@/api/generated.schemas';

// Helper to create a valid stats response
function createValidStatsData(overrides?: Partial<UserStatsResponse>): UserStatsResponse {
  return {
    id: 'test-id',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    username: 'testuser',
    total_tokens: 1000,
    total_cost: 10.5,
    current_streak: 5,
    longest_streak: 10,
    achievements_unlocked: 3,
    unique_days: 15,
    cache_efficiency: 75.5,
    monthly_tokens: 500,
    monthly_badge: 'Gold',
    ...overrides,
  };
}

describe('validateStatsData', () => {
  it('should validate correct stats data', () => {
    const statsData = createValidStatsData();
    const result = validateStatsData(statsData);

    expect(result.isValid).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it('should reject missing username', () => {
    const statsData = createValidStatsData({ username: '' });
    const result = validateStatsData(statsData);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('username');
  });

  it('should reject negative total_tokens', () => {
    const statsData = createValidStatsData({ total_tokens: -100 });
    const result = validateStatsData(statsData);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('total_tokens');
  });

  it('should reject invalid cache_efficiency', () => {
    const statsData = createValidStatsData({ cache_efficiency: 150 });
    const result = validateStatsData(statsData);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Cache efficiency');
  });

  it('should accept null cache_efficiency', () => {
    const statsData = createValidStatsData({ cache_efficiency: null });
    const result = validateStatsData(statsData);

    expect(result.isValid).toBe(true);
  });

  it('should sanitize data by clamping negative values to 0', () => {
    const statsData = createValidStatsData();
    const result = validateStatsData(statsData);

    expect(result.data?.total_tokens).toBeGreaterThanOrEqual(0);
    expect(result.data?.current_streak).toBeGreaterThanOrEqual(0);
  });
});

describe('hasMinimumActivityData', () => {
  it('should return true for users with tokens', () => {
    const statsData = createValidStatsData({ total_tokens: 100, unique_days: 0 });
    expect(hasMinimumActivityData(statsData)).toBe(true);
  });

  it('should return true for users with unique days', () => {
    const statsData = createValidStatsData({ total_tokens: 0, unique_days: 5 });
    expect(hasMinimumActivityData(statsData)).toBe(true);
  });

  it('should return false for users with no activity', () => {
    const statsData = createValidStatsData({ total_tokens: 0, unique_days: 0 });
    expect(hasMinimumActivityData(statsData)).toBe(false);
  });
});

describe('getSafeCacheEfficiency', () => {
  it('should return cache efficiency when valid', () => {
    const statsData = createValidStatsData({ cache_efficiency: 75.5 });
    expect(getSafeCacheEfficiency(statsData)).toBe(75.5);
  });

  it('should return undefined for null cache_efficiency', () => {
    const statsData = createValidStatsData({ cache_efficiency: null });
    expect(getSafeCacheEfficiency(statsData)).toBeUndefined();
  });

  it('should return undefined for out-of-range values', () => {
    const statsData = createValidStatsData({ cache_efficiency: 150 });
    expect(getSafeCacheEfficiency(statsData)).toBeUndefined();
  });
});

describe('validateWeeklyEstimates', () => {
  it('should validate correct weekly estimates', () => {
    const result = validateWeeklyEstimates(100, 500);

    expect(result.isValid).toBe(true);
    expect(result.data?.weeklyTokens).toBe(100);
  });

  it('should reject weekly tokens exceeding monthly', () => {
    const result = validateWeeklyEstimates(600, 500);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('exceed');
  });

  it('should reject negative weekly tokens', () => {
    const result = validateWeeklyEstimates(-10, 500);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('negative');
  });

  it('should round weekly tokens to integer', () => {
    const result = validateWeeklyEstimates(123.7, 500);

    expect(result.isValid).toBe(true);
    expect(result.data?.weeklyTokens).toBe(124);
  });
});

describe('validateDaysActive', () => {
  it('should validate days in valid range', () => {
    const result = validateDaysActive(5);

    expect(result.isValid).toBe(true);
    expect(result.data?.daysActive).toBe(5);
  });

  it('should clamp days to 0-7 range', () => {
    expect(validateDaysActive(10).data?.daysActive).toBe(7);
    expect(validateDaysActive(-2).data?.daysActive).toBe(0);
  });

  it('should reject non-numeric values', () => {
    const result = validateDaysActive(NaN);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('valid number');
  });

  it('should round fractional days', () => {
    const result = validateDaysActive(3.6);

    expect(result.isValid).toBe(true);
    expect(result.data?.daysActive).toBe(4);
  });
});

describe('safeNumber', () => {
  it('should return valid numbers', () => {
    expect(safeNumber(42)).toBe(42);
    expect(safeNumber(0)).toBe(0);
    expect(safeNumber(-10)).toBe(-10);
  });

  it('should return fallback for invalid numbers', () => {
    expect(safeNumber(NaN, 100)).toBe(100);
    expect(safeNumber(Infinity, 100)).toBe(100);
    expect(safeNumber('not a number', 100)).toBe(100);
  });

  it('should use default fallback of 0', () => {
    expect(safeNumber(NaN)).toBe(0);
  });
});

describe('safeString', () => {
  it('should return valid strings', () => {
    expect(safeString('hello')).toBe('hello');
    expect(safeString('test user')).toBe('test user');
  });

  it('should return fallback for invalid strings', () => {
    expect(safeString('', 'fallback')).toBe('fallback');
    expect(safeString('   ', 'fallback')).toBe('fallback');
    expect(safeString(null, 'fallback')).toBe('fallback');
    expect(safeString(undefined, 'fallback')).toBe('fallback');
    expect(safeString(123, 'fallback')).toBe('fallback');
  });

  it('should use default fallback of empty string', () => {
    expect(safeString(null)).toBe('');
  });
});
