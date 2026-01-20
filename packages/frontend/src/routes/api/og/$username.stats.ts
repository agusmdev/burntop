import { createFileRoute } from '@tanstack/react-router';

import type { UserStatsResponse, UserResponse } from '@/api/generated.schemas';

import {
  StatsCardTemplate,
  ErrorCardTemplate,
  renderCardToPng,
  createImageHeaders,
  validateStatsData,
  hasMinimumActivityData,
  getSafeCacheEfficiency,
} from '@/lib/og';
import { calculateLevel, calculateTotalXp } from '@/lib/xp';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000';

/**
 * OG Image for User Stats
 *
 * Generates a PNG image with user statistics for social media sharing.
 */
export const Route = createFileRoute('/api/og/$username/stats')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { username } = params;

        try {
          // Fetch user profile and stats in parallel
          const [profileResponse, statsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/api/v1/users/${username}`),
            fetch(`${API_BASE_URL}/api/v1/users/${username}/stats`),
          ]);

          // Handle HTTP errors with appropriate error cards
          // Prioritize stats response errors since they're more specific
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
                'X-Error-Type':
                  statsResponse.status === 404
                    ? 'not_found'
                    : statsResponse.status === 403
                      ? 'private'
                      : 'server_error',
              },
            });
          }

          // Parse response data
          const statsData: UserStatsResponse = await statsResponse.json();

          // Parse profile data if available (fallback to stats-only if profile fetch fails)
          let profileData: UserResponse | null = null;
          if (profileResponse.ok) {
            try {
              profileData = await profileResponse.json();
            } catch (error) {
              console.warn(
                `[OG] Failed to parse profile data for ${username}, continuing with stats only:`,
                error
              );
            }
          } else {
            console.warn(
              `[OG] Failed to fetch profile for ${username} (status ${profileResponse.status}), continuing with stats only`
            );
          }

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

          // Calculate level and XP from total tokens and streak
          const xp = calculateTotalXp({
            tokens: { totalTokens: validatedStats.total_tokens },
            streak: { streakDays: validatedStats.current_streak },
          });
          const level = calculateLevel(xp);

          // Get cache efficiency with safe fallback
          const cacheEfficiency = getSafeCacheEfficiency(validatedStats);

          // Extract profile data for enhanced OG image
          const avatarUrl = profileData?.image ?? undefined;
          const displayName = profileData?.name ?? undefined;
          const monthlyBadge =
            profileData?.monthly_badge ?? validatedStats.monthly_badge ?? undefined;

          // Generate OG image using StatsCardTemplate with profile enhancements
          const card = StatsCardTemplate({
            username: validatedStats.username,
            avatarUrl,
            displayName,
            monthlyBadge,
            totalTokens: validatedStats.total_tokens,
            totalCost: validatedStats.total_cost.toString(),
            currentStreak: validatedStats.current_streak,
            longestStreak: validatedStats.longest_streak,
            level,
            xp,
            topModel: undefined, // Not available in public context
            cacheEfficiency,
            totalAchievements: validatedStats.achievements_unlocked,
          });

          // Render card to PNG
          const pngBuffer = await renderCardToPng(card);

          // Return PNG with cache headers
          return new Response(pngBuffer, {
            status: 200,
            headers: createImageHeaders(3600), // Cache for 1 hour
          });
        } catch (error) {
          console.error('[OG] Error generating stats image:', error);

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
    Failed to generate stats image
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
