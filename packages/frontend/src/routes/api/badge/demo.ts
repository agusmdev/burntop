/**
 * Demo Badge Endpoint
 *
 * Generates sample badges for documentation and preview purposes.
 * Uses mock data instead of querying a real user.
 *
 * @see Plan Phase 12.3 - Badge Documentation
 */

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import type { BadgeStyle, BadgeTheme } from '@/lib/badge/generate-badge';

import { generateBadge } from '@/lib/badge/generate-badge';

/**
 * Query parameter schema for demo badge endpoint
 */
const demoBadgeQuerySchema = z.object({
  variant: z
    .enum(['compact', 'standard', 'detailed', 'streak', 'level', 'heatmap'])
    .nullable()
    .optional()
    .default('standard'),
  style: z
    .enum(['flat', 'flat-square', 'plastic', 'for-the-badge'])
    .nullable()
    .optional()
    .default('flat'),
  theme: z.enum(['dark', 'light']).nullable().optional().default('dark'),
  color: z.string().nullable().optional(), // Custom hex color
});

/**
 * Mock data for demo badges
 */
const DEMO_DATA = {
  totalTokens: 1250000,
  currentStreak: 7,
  level: 12,
  totalCost: 42.5,
  achievements: 8,
  dailyData: [1200, 3400, 2800, 4100, 2300, 3900, 2600], // Last 7 days
};

export const Route = createFileRoute('/api/badge/demo')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          // Parse query parameters
          const url = new URL(request.url);
          const queryParams = {
            variant: url.searchParams.get('variant'),
            style: url.searchParams.get('style'),
            theme: url.searchParams.get('theme'),
            color: url.searchParams.get('color'),
          };

          const parsedParams = demoBadgeQuerySchema.parse(queryParams);
          const { variant, style, theme, color } = parsedParams;

          // Extract non-null values
          const finalStyle = (style || 'flat') as BadgeStyle;
          const finalTheme = (theme || 'dark') as BadgeTheme;
          const finalColor = color || undefined;

          // Generate badge based on variant
          let badge: string;

          switch (variant) {
            case 'compact':
              badge = generateBadge({
                variant: 'compact',
                totalTokens: DEMO_DATA.totalTokens,
                style: finalStyle,
                theme: finalTheme,
                color: finalColor,
              });
              break;

            case 'standard':
              badge = generateBadge({
                variant: 'standard',
                totalTokens: DEMO_DATA.totalTokens,
                currentStreak: DEMO_DATA.currentStreak,
                level: DEMO_DATA.level,
                style: finalStyle,
                theme: finalTheme,
                color: finalColor,
              });
              break;

            case 'detailed':
              badge = generateBadge({
                variant: 'detailed',
                totalTokens: DEMO_DATA.totalTokens,
                currentStreak: DEMO_DATA.currentStreak,
                level: DEMO_DATA.level,
                totalCost: DEMO_DATA.totalCost,
                achievements: DEMO_DATA.achievements,
                style: finalStyle,
                theme: finalTheme,
                color: finalColor,
              });
              break;

            case 'streak':
              badge = generateBadge({
                variant: 'streak',
                currentStreak: DEMO_DATA.currentStreak,
                style: finalStyle,
                theme: finalTheme,
                color: finalColor,
              });
              break;

            case 'level':
              badge = generateBadge({
                variant: 'level',
                level: DEMO_DATA.level,
                style: finalStyle,
                theme: finalTheme,
                color: finalColor,
              });
              break;

            case 'heatmap':
              badge = generateBadge({
                variant: 'heatmap',
                dailyData: DEMO_DATA.dailyData,
                style: finalStyle,
                theme: finalTheme,
                color: finalColor,
              });
              break;

            default:
              throw new Error(`Unknown variant: ${variant}`);
          }

          // Return SVG badge with appropriate headers
          return new Response(badge, {
            status: 200,
            headers: createBadgeHeaders(),
          });
        } catch (error) {
          console.error('[Demo Badge] Failed to generate badge:', error);

          // Return error badge
          return new Response(generateErrorBadge('Error', 'flat', 'dark'), {
            status: 500,
            headers: createBadgeHeaders(),
          });
        }
      },
    },
  },
});

/**
 * Create headers for SVG badge response
 */
function createBadgeHeaders(): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'image/svg+xml');
  headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour (demo data doesn't change)
  headers.set('Access-Control-Allow-Origin', '*');
  return headers;
}

/**
 * Generate an error badge
 */
function generateErrorBadge(message: string, style: BadgeStyle, theme: BadgeTheme): string {
  const colors =
    theme === 'dark'
      ? { background: '#0A0A0A', text: '#FAFAFA', labelBg: '#1A1A1A', error: '#EF4444' }
      : { background: '#FFFFFF', text: '#0A0A0A', labelBg: '#F5F5F5', error: '#EF4444' };

  const label = 'demo';
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
