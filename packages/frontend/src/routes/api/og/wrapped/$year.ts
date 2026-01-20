import { createFileRoute } from '@tanstack/react-router';

/**
 * OG Image for Wrapped (Temporary Stub)
 *
 * TODO: Migrate to fetch data from FastAPI backend
 */

export const Route = createFileRoute('/api/og/wrapped/$year')({
  server: {
    handlers: {
      GET: async () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0A0A0A"/>
  <text x="600" y="315" font-family="Arial" font-size="32" fill="#FAFAFA" text-anchor="middle">
    Wrapped OG Image - Not Implemented
  </text>
</svg>`;

        return new Response(svg, {
          status: 200,
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      },
    },
  },
});
