/**
 * Server-side dashboard data fetcher (Temporary Stub)
 *
 * TODO: Replace with calls to FastAPI backend:
 * - GET /api/v1/dashboard/overview
 * - GET /api/v1/dashboard/trends
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import type { ContributionDay } from '@/components/contribution-heatmap';

/**
 * Zod schema for getDashboardData input validation
 */
const GetDashboardDataSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

export interface DashboardData {
  tokens: {
    allTime: number;
    thisMonth: number;
    thisWeek: number;
  };
  cost: {
    allTime: string;
    thisMonth: string;
    thisWeek: string;
  };
  streak: {
    current: number;
    longest: number;
    lastActiveDate: string | null;
  };
  user: {
    level: number;
    xp: number;
  };
  contributions: ContributionDay[];
}

/**
 * Server function to fetch all dashboard data.
 *
 * TODO: Implement by calling FastAPI backend endpoints
 */
export const getDashboardData = createServerFn({ method: 'GET' })
  .inputValidator(GetDashboardDataSchema)
  .handler(async (): Promise<DashboardData> => {
    // Temporary stub - return empty data
    console.warn('[getDashboardData] Returning stub data - TODO: implement FastAPI backend calls');

    return {
      tokens: {
        allTime: 0,
        thisMonth: 0,
        thisWeek: 0,
      },
      cost: {
        allTime: '0',
        thisMonth: '0',
        thisWeek: '0',
      },
      streak: {
        current: 0,
        longest: 0,
        lastActiveDate: null,
      },
      user: {
        level: 1,
        xp: 0,
      },
      contributions: [],
    };
  });
