import { defineNitroConfig } from 'nitro/config';

export default defineNitroConfig({
  compatibilityDate: '2024-01-05',
  preset: 'vercel',
  plugins: ['./server/plugins/sentry.ts'],
  routeRules: {
    // Static assets - cache for 1 year (immutable)
    '/_build/**': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    '/fonts/**': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    '/favicon.ico': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    '/**/*.{png,jpg,jpeg,gif,svg,webp,ico}': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    '/**/*.{woff,woff2,ttf,otf,eot}': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },

    // Service Worker - no cache (always fetch latest)
    '/sw.js': {
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    },

    // Manifest - cache for 1 day
    '/manifest.json': {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    },

    // Robots.txt - cache for 1 day
    '/robots.txt': {
      headers: {
        'Cache-Control': 'public, max-age=86400',
      },
    },

    // Sitemap - cache for 1 hour
    '/sitemap.xml': {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    },

    // API routes - no cache by default (individual routes can override)
    '/api/**': {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },

    // SSE endpoint - no cache
    '/api/sse': {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    },

    // OG images - cache for 1 hour with stale-while-revalidate
    '/api/og/**': {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200',
      },
    },

    // Badges - cache for 15 minutes
    '/api/badge/**': {
      headers: {
        'Cache-Control': 'public, max-age=900, s-maxage=900',
      },
    },

    // Public pages - cache for 5 minutes with stale-while-revalidate
    '/**': {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800',
      },
    },
  },
});
