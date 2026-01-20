import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import type { UserStatsResponse } from '@/api/generated.schemas';
import type { BadgeStyle, BadgeTheme, BadgeVariant } from '@/lib/badge/generate-badge';

import { generateBadge } from '@/lib/badge/generate-badge';
import { calculateLevel, calculateTotalXp, getLevelTitle } from '@/lib/xp';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000';

const badgeQuerySchema = z.object({
  variant: z
    .enum(['compact', 'standard', 'detailed', 'streak', 'level'])
    .nullable()
    .optional()
    .default('standard'),
  style: z
    .enum(['flat', 'flat-square', 'plastic', 'for-the-badge'])
    .nullable()
    .optional()
    .default('flat'),
  theme: z.enum(['dark', 'light']).nullable().optional().default('dark'),
  color: z.string().nullable().optional(),
});

type SupportedBadgeVariant = Exclude<BadgeVariant, 'heatmap'>;

export const Route = createFileRoute('/api/badge/$username')({
  server: {
    handlers: {
      GET: async ({ params, request }: { params: { username: string }; request: Request }) => {
        const { username } = params;

        try {
          const url = new URL(request.url);
          const queryParams = {
            variant: url.searchParams.get('variant'),
            style: url.searchParams.get('style'),
            theme: url.searchParams.get('theme'),
            color: url.searchParams.get('color'),
          };

          const parsedParams = badgeQuerySchema.safeParse(queryParams);

          if (!parsedParams.success) {
            return new Response(generateErrorBadge('Invalid parameters', 'flat', 'dark'), {
              status: 400,
              headers: createBadgeHeaders(60),
            });
          }

          const { variant, style, theme, color } = parsedParams.data;

          const finalVariant = (variant || 'standard') as SupportedBadgeVariant;
          const finalStyle = (style || 'flat') as BadgeStyle;
          const finalTheme = (theme || 'dark') as BadgeTheme;
          const finalColor = color || undefined;

          const statsResponse = await fetch(
            `${API_BASE_URL}/api/v1/users/${encodeURIComponent(username)}/stats`
          );

          if (!statsResponse.ok) {
            let errorMessage: string;
            let cacheTime = 300;

            if (statsResponse.status === 404) {
              errorMessage = 'User not found';
            } else if (statsResponse.status === 403) {
              errorMessage = 'Private profile';
            } else {
              errorMessage = 'Error loading stats';
              cacheTime = 60;
            }

            return new Response(generateErrorBadge(errorMessage, finalStyle, finalTheme), {
              status: statsResponse.status,
              headers: createBadgeHeaders(cacheTime),
            });
          }

          const stats: UserStatsResponse = await statsResponse.json();

          const xp = calculateTotalXp({
            tokens: { totalTokens: stats.total_tokens },
            streak: { streakDays: stats.current_streak },
          });
          const level = calculateLevel(xp);
          const levelTitle = getLevelTitle(level);

          let badge: string;

          switch (finalVariant) {
            case 'compact':
              badge = generateBadge({
                variant: 'compact',
                totalTokens: stats.total_tokens,
                style: finalStyle,
                theme: finalTheme,
                color: finalColor,
              });
              break;

            case 'standard':
              badge = generateBadge({
                variant: 'standard',
                totalTokens: stats.total_tokens,
                currentStreak: stats.current_streak,
                level,
                style: finalStyle,
                theme: finalTheme,
                color: finalColor,
              });
              break;

            case 'detailed':
              badge = generateBadge({
                variant: 'detailed',
                totalTokens: stats.total_tokens,
                currentStreak: stats.current_streak,
                level,
                totalCost: stats.total_cost,
                achievements: stats.achievements_unlocked,
                style: finalStyle,
                theme: finalTheme,
                color: finalColor,
              });
              break;

            case 'streak':
              badge = generateBadge({
                variant: 'streak',
                currentStreak: stats.current_streak,
                style: finalStyle,
                theme: finalTheme,
                color: finalColor,
              });
              break;

            case 'level':
              badge = generateBadge({
                variant: 'level',
                level,
                levelTitle,
                style: finalStyle,
                theme: finalTheme,
                color: finalColor,
              });
              break;

            default: {
              const _exhaustiveCheck: never = finalVariant;
              throw new Error(`Unknown variant: ${_exhaustiveCheck}`);
            }
          }

          return new Response(badge, {
            status: 200,
            headers: createBadgeHeaders(900),
          });
        } catch (error) {
          console.error('[Badge API] Failed to generate badge:', error);

          return new Response(generateErrorBadge('Error', 'flat', 'dark'), {
            status: 500,
            headers: createBadgeHeaders(60),
          });
        }
      },
    },
  },
});

function createBadgeHeaders(maxAge: number): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'image/svg+xml');
  headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}`);
  headers.set('Access-Control-Allow-Origin', '*');
  return headers;
}

function generateErrorBadge(message: string, style: BadgeStyle, theme: BadgeTheme): string {
  const colors =
    theme === 'dark'
      ? { background: '#0A0A0A', text: '#FAFAFA', labelBg: '#1A1A1A', error: '#EF4444' }
      : { background: '#FFFFFF', text: '#0A0A0A', labelBg: '#F5F5F5', error: '#EF4444' };

  const label = 'burntop';
  const value = message;

  const labelWidth = label.length * 11 * 0.6 + 20;
  const valueWidth = value.length * 11 * 0.6 + 20;
  const totalWidth = labelWidth + valueWidth;
  const height = 20;

  const borderRadius = style === 'flat-square' ? 0 : 3;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="${borderRadius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${colors.labelBg}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${colors.error}"/>
  </g>
  <g fill="${colors.text}" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}
