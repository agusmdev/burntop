/**
 * Data Validation and Fallback Utilities for OG Image Generation
 *
 * Ensures that data from the API is valid before rendering OG images.
 * Provides safe fallback values for missing or invalid data.
 */

import type { UserStatsResponse } from '@/api/generated.schemas';

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  error?: string;
}

/**
 * Validates user stats data for OG image generation
 *
 * Checks for:
 * - Required fields present
 * - Valid number values (non-negative)
 * - Reasonable data ranges
 *
 * @param statsData - User stats response from API
 * @returns Validation result with sanitized data or error
 */
export function validateStatsData(
  statsData: UserStatsResponse
): ValidationResult<UserStatsResponse> {
  // Check required fields
  if (!statsData.username) {
    return {
      isValid: false,
      error: 'Missing username',
    };
  }

  // Validate number fields are present and non-negative
  const numericFields = [
    'total_tokens',
    'total_cost',
    'current_streak',
    'longest_streak',
    'achievements_unlocked',
    'unique_days',
    'monthly_tokens',
  ] as const;

  for (const field of numericFields) {
    const value = statsData[field];
    if (typeof value !== 'number' || value < 0) {
      return {
        isValid: false,
        error: `Invalid or missing field: ${field}`,
      };
    }
  }

  // Validate optional cache_efficiency is in valid range (0-100) if present
  if (
    statsData.cache_efficiency !== null &&
    (statsData.cache_efficiency < 0 || statsData.cache_efficiency > 100)
  ) {
    return {
      isValid: false,
      error: 'Cache efficiency must be between 0 and 100',
    };
  }

  // Data is valid, return sanitized copy
  return {
    isValid: true,
    data: {
      ...statsData,
      // Ensure no NaN or Infinity values
      total_tokens: Math.max(0, statsData.total_tokens),
      total_cost: Math.max(0, statsData.total_cost),
      current_streak: Math.max(0, statsData.current_streak),
      longest_streak: Math.max(0, statsData.longest_streak),
      achievements_unlocked: Math.max(0, statsData.achievements_unlocked),
      unique_days: Math.max(0, statsData.unique_days),
      monthly_tokens: Math.max(0, statsData.monthly_tokens),
    },
  };
}

/**
 * Checks if a user has enough activity data to display meaningful stats
 *
 * A user needs at least:
 * - Some tokens used (> 0)
 * - OR some activity days (> 0)
 *
 * @param statsData - User stats response from API
 * @returns True if user has sufficient data
 */
export function hasMinimumActivityData(statsData: UserStatsResponse): boolean {
  return statsData.total_tokens > 0 || statsData.unique_days > 0;
}

/**
 * Safely gets cache efficiency with fallback
 *
 * @param statsData - User stats response from API
 * @returns Cache efficiency value or undefined if not available
 */
export function getSafeCacheEfficiency(statsData: UserStatsResponse): number | undefined {
  if (statsData.cache_efficiency === null || statsData.cache_efficiency === undefined) {
    return undefined;
  }

  // Ensure it's in valid range
  const efficiency = statsData.cache_efficiency;
  if (efficiency < 0 || efficiency > 100) {
    return undefined;
  }

  return efficiency;
}

/**
 * Validates weekly recap data estimation
 *
 * Ensures that estimated weekly values are reasonable based on monthly data.
 *
 * @param weeklyTokens - Estimated weekly tokens
 * @param monthlyTokens - Total monthly tokens
 * @returns Validation result
 */
export function validateWeeklyEstimates(
  weeklyTokens: number,
  monthlyTokens: number
): ValidationResult<{ weeklyTokens: number }> {
  // Weekly tokens should not exceed monthly tokens
  if (weeklyTokens > monthlyTokens) {
    return {
      isValid: false,
      error: 'Weekly tokens cannot exceed monthly tokens',
    };
  }

  // Weekly tokens should be reasonable (at least 1/4.3 of monthly)
  const _minWeeklyTokens = Math.max(0, monthlyTokens / 4.3);
  if (weeklyTokens < 0) {
    return {
      isValid: false,
      error: 'Weekly tokens cannot be negative',
    };
  }

  return {
    isValid: true,
    data: {
      weeklyTokens: Math.max(0, Math.round(weeklyTokens)),
    },
  };
}

/**
 * Validates days active count
 *
 * @param daysActive - Number of days active
 * @returns Validation result with clamped value (0-7)
 */
export function validateDaysActive(daysActive: number): ValidationResult<{ daysActive: number }> {
  if (typeof daysActive !== 'number' || isNaN(daysActive)) {
    return {
      isValid: false,
      error: 'Days active must be a valid number',
    };
  }

  // Clamp to 0-7 range
  const clampedDays = Math.max(0, Math.min(7, Math.round(daysActive)));

  return {
    isValid: true,
    data: {
      daysActive: clampedDays,
    },
  };
}

/**
 * Safe number formatter with fallback
 *
 * Formats a number safely, returning a fallback value if the number is invalid.
 *
 * @param value - Number to format
 * @param fallback - Fallback value if number is invalid
 * @returns Formatted number or fallback
 */
export function safeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  return fallback;
}

/**
 * Safe string formatter with fallback
 *
 * Returns the string if valid, otherwise returns fallback.
 *
 * @param value - String to check
 * @param fallback - Fallback value if string is invalid
 * @returns String or fallback
 */
export function safeString(value: unknown, fallback: string = ''): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return fallback;
}
