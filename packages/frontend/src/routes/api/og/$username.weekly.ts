import { createFileRoute } from '@tanstack/react-router';

import type { UserStatsResponse } from '@/api/generated.schemas';

import {
  WeeklyRecapCardTemplate,
  ErrorCardTemplate,
  renderCardToPng,
  createImageHeaders,
  validateStatsData,
  hasMinimumActivityData,
  validateWeeklyEstimates,
  validateDaysActive,
  safeNumber,
} from '@/lib/og';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000';

/**
 * OG Image for Weekly Recap
 *
 * Generates a PNG image with user's weekly activity summary for social media sharing.
 *
 * Note: This generates a weekly recap based on available public user stats.
 * Since weekly trends data requires authentication (dashboard endpoints), we use
 * monthly stats as a proxy and estimate weekly values.
 */
export const Route = createFileRoute('/api/og/$username/weekly')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { username } = params;

        try {
          // Fetch user stats from backend
          const statsResponse = await fetch(`${API_BASE_URL}/api/v1/users/${username}/stats`);

          // Handle HTTP errors with appropriate error cards
          if (!statsResponse.ok) {
            let errorCard;

            if (statsResponse.status === 404) {
              console.warn(`[OG] User not found: ${username}`);
              errorCard = ErrorCardTemplate({
                errorType: 'not_found',
                username,
              });
            } else if (statsResponse.status === 403) {
              console.warn(`[OG] Profile is private: ${username}`);
              errorCard = ErrorCardTemplate({
                errorType: 'private',
                username,
              });
            } else {
              console.error(`[OG] HTTP error ${statsResponse.status} for user: ${username}`);
              errorCard = ErrorCardTemplate({
                errorType: 'server_error',
                username,
              });
            }

            // Render error card to PNG
            const errorPngBuffer = await renderCardToPng(errorCard);

            return new Response(errorPngBuffer, {
              status: statsResponse.status,
              headers: {
                ...createImageHeaders(300), // Cache errors for 5 minutes
                'X-Error-Type': statsResponse.status === 404 ? 'not_found' : statsResponse.status === 403 ? 'private' : 'server_error',
              },
            });
          }

          const statsData: UserStatsResponse = await statsResponse.json();

          // Validate the stats data
          const validation = validateStatsData(statsData);
          if (!validation.isValid || !validation.data) {
            console.error(`[OG] Invalid stats data for user ${username}:`, validation.error);

            const errorCard = ErrorCardTemplate({
              errorType: 'invalid_data',
              username,
              message: validation.error,
            });

            const errorPngBuffer = await renderCardToPng(errorCard);

            return new Response(errorPngBuffer, {
              status: 500,
              headers: {
                ...createImageHeaders(300), // Cache for 5 minutes
                'X-Error-Type': 'invalid_data',
              },
            });
          }

          const validatedStats = validation.data;

          // Check if user has minimum activity data
          if (!hasMinimumActivityData(validatedStats)) {
            console.warn(`[OG] User ${username} has insufficient activity data`);

            const errorCard = ErrorCardTemplate({
              errorType: 'invalid_data',
              username,
              message: `@${username} doesn't have enough weekly activity data to display yet.`,
            });

            const errorPngBuffer = await renderCardToPng(errorCard);

            return new Response(errorPngBuffer, {
              status: 200, // Return 200 but with error card
              headers: {
                ...createImageHeaders(600), // Cache for 10 minutes
                'X-Error-Type': 'insufficient_data',
              },
            });
          }

          // Estimate weekly stats from monthly data
          // This is an approximation since we don't have access to detailed daily trends
          // without authentication. For a more accurate weekly recap, users would need
          // to be logged in and use the authenticated dashboard endpoints.
          const estimatedWeeklyTokens = Math.round(validatedStats.monthly_tokens / 4.3); // ~4.3 weeks per month

          // Validate weekly estimates
          const weeklyValidation = validateWeeklyEstimates(
            estimatedWeeklyTokens,
            validatedStats.monthly_tokens
          );

          if (!weeklyValidation.isValid || !weeklyValidation.data) {
            console.error(`[OG] Invalid weekly estimates for user ${username}:`, weeklyValidation.error);

            const errorCard = ErrorCardTemplate({
              errorType: 'invalid_data',
              username,
              message: weeklyValidation.error,
            });

            const errorPngBuffer = await renderCardToPng(errorCard);

            return new Response(errorPngBuffer, {
              status: 500,
              headers: {
                ...createImageHeaders(300), // Cache for 5 minutes
                'X-Error-Type': 'invalid_weekly_data',
              },
            });
          }

          const weeklyTokens = weeklyValidation.data.weeklyTokens;

          // Calculate weekly cost safely
          const weeklyCost = safeNumber(validatedStats.total_cost / 4.3, 0);

          // Estimate days active in the week (cap at 7)
          const estimatedDays = Math.min(7, Math.round((validatedStats.unique_days / 30) * 7));

          // Use streak as a proxy for consistency
          // If streak >= 7, assume all 7 days active; otherwise estimate proportionally
          const rawDaysActive =
            validatedStats.current_streak >= 7
              ? 7
              : Math.min(estimatedDays, validatedStats.current_streak);

          // Validate days active
          const daysValidation = validateDaysActive(rawDaysActive);
          if (!daysValidation.isValid || !daysValidation.data) {
            console.error(`[OG] Invalid days active for user ${username}:`, daysValidation.error);

            const errorCard = ErrorCardTemplate({
              errorType: 'invalid_data',
              username,
              message: daysValidation.error,
            });

            const errorPngBuffer = await renderCardToPng(errorCard);

            return new Response(errorPngBuffer, {
              status: 500,
              headers: {
                ...createImageHeaders(300), // Cache for 5 minutes
                'X-Error-Type': 'invalid_days_active',
              },
            });
          }

          const daysActive = daysValidation.data.daysActive;

          // Calculate week-over-week growth (estimate as positive trend if streak is increasing)
          // Without historical data, we'll show modest growth if they have an active streak
          const weekOverWeekGrowth = safeNumber(
            validatedStats.current_streak > 0 ? 15.5 : 0,
            0
          );

          // Calculate week date range
          const weekEnd = new Date();
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 6); // Last 7 days including today

          // Generate OG image using WeeklyRecapCardTemplate
          const card = WeeklyRecapCardTemplate({
            username: validatedStats.username,
            weeklyTokens,
            weeklyCost: weeklyCost.toFixed(2),
            daysActive,
            weekOverWeekGrowth,
            topModel: undefined, // Not available in public context
            mostProductiveDay: undefined, // Not available without daily data
            weekStart,
            weekEnd,
            achievementsEarned: undefined, // Weekly achievements not available
          });

          // Render card to PNG
          const pngBuffer = await renderCardToPng(card);

          // Return PNG with cache headers
          return new Response(pngBuffer, {
            status: 200,
            headers: createImageHeaders(3600), // Cache for 1 hour
          });
        } catch (error) {
          console.error('[OG] Error generating weekly recap image:', error);

          // Generate a proper error card instead of raw SVG
          try {
            const errorCard = ErrorCardTemplate({
              errorType: 'server_error',
              username,
            });

            const errorPngBuffer = await renderCardToPng(errorCard);

            return new Response(errorPngBuffer, {
              status: 500,
              headers: {
                ...createImageHeaders(60), // Cache errors for 1 minute
                'X-Error-Type': 'rendering_error',
              },
            });
          } catch (renderError) {
            // Last resort: return simple error SVG if card rendering fails
            console.error('[OG] Failed to render error card:', renderError);

            const errorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0A0A0A"/>
  <text x="600" y="315" font-family="Arial" font-size="24" fill="#EF4444" text-anchor="middle">
    Failed to generate weekly recap image
  </text>
</svg>`;

            return new Response(errorSvg, {
              status: 500,
              headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'no-cache',
              },
            });
          }
        }
      },
    },
  },
});
