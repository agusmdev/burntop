import { createFileRoute } from '@tanstack/react-router';

// TODO: Update to fetch public users from FastAPI backend API
// Example: GET /api/v1/users?is_public=true
// Example: GET /api/v1/achievements

/**
 * Sitemap XML Endpoint
 *
 * Generates a sitemap.xml file for search engine indexing.
 * Includes:
 * - Static pages (home, leaderboard, dashboard, etc.)
 * - Dynamic user profiles (public profiles only)
 * - Dynamic achievement pages
 *
 * @see plan.md Phase 18.1 - SEO (Add sitemap.xml generation)
 */

const SITE_URL = process.env.SITE_URL || 'https://burntop.dev';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlEntries = urls
    .map(
      ({ loc, lastmod, changefreq, priority }) => `
  <url>
    <loc>${loc}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    ${changefreq ? `<changefreq>${changefreq}</changefreq>` : ''}
    ${priority !== undefined ? `<priority>${priority.toFixed(1)}</priority>` : ''}
  </url>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const urls: SitemapUrl[] = [];

          // Static pages - highest priority
          const now = new Date().toISOString();

          urls.push(
            {
              loc: `${SITE_URL}/`,
              lastmod: now,
              changefreq: 'daily',
              priority: 1.0,
            },
            {
              loc: `${SITE_URL}/leaderboard`,
              lastmod: now,
              changefreq: 'hourly',
              priority: 0.9,
            },
            {
              loc: `${SITE_URL}/achievements`,
              lastmod: now,
              changefreq: 'weekly',
              priority: 0.8,
            },
            {
              loc: `${SITE_URL}/dashboard`,
              lastmod: now,
              changefreq: 'daily',
              priority: 0.7,
            },
            {
              loc: `${SITE_URL}/badges`,
              lastmod: now,
              changefreq: 'weekly',
              priority: 0.6,
            },
            {
              loc: `${SITE_URL}/wrapped`,
              lastmod: now,
              changefreq: 'monthly',
              priority: 0.6,
            },
            {
              loc: `${SITE_URL}/settings`,
              lastmod: now,
              changefreq: 'weekly',
              priority: 0.5,
            },
            {
              loc: `${SITE_URL}/following`,
              lastmod: now,
              changefreq: 'daily',
              priority: 0.5,
            },
            {
              loc: `${SITE_URL}/followers`,
              lastmod: now,
              changefreq: 'daily',
              priority: 0.5,
            }
          );

          // TODO: Fetch all public user profiles from FastAPI backend
          // const publicUsers = await fetch(`${BACKEND_URL}/api/v1/users?is_public=true`)
          //   .then(res => res.json())
          //
          // // Add user profile pages
          // for (const publicUser of publicUsers) {
          //   if (publicUser.username) {
          //     urls.push({
          //       loc: `${SITE_URL}/${publicUser.username}`,
          //       lastmod: publicUser.updated_at,
          //       changefreq: 'daily',
          //       priority: 0.7,
          //     });
          //
          //     // Add achievement pages for each user
          //     // Note: We include all achievements, but in practice only unlocked ones would be visible
          //     for (const achievement of achievementSeeds) {
          //       urls.push({
          //         loc: `${SITE_URL}/${publicUser.username}/achievement/${achievement.id}`,
          //         lastmod: publicUser.updated_at,
          //         changefreq: 'weekly',
          //         priority: 0.5,
          //       });
          //     }
          //   }
          // }

          const xml = generateSitemapXml(urls);

          return new Response(xml, {
            status: 200,
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
              'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
            },
          });
        } catch (error) {
          console.error('Error generating sitemap:', error);
          return new Response('Internal Server Error', { status: 500 });
        }
      },
    },
  },
});
