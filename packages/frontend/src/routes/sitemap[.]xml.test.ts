import { describe, expect, it } from 'vitest';

/**
 * Sitemap XML Tests
 *
 * Validates the sitemap.xml endpoint generates valid XML with correct structure.
 *
 * @see plan.md Phase 18.1 - SEO (Add sitemap.xml generation)
 */

describe('Sitemap XML Generation', () => {
  it('should generate valid XML structure', async () => {
    const response = await fetch('http://localhost:3000/sitemap.xml');
    const xml = await response.text();

    // Should start with XML declaration
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');

    // Should have urlset element with namespace
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

    // Should end with closing urlset tag
    expect(xml).toContain('</urlset>');
  });

  it('should include static pages', async () => {
    const response = await fetch('http://localhost:3000/sitemap.xml');
    const xml = await response.text();

    // Check for important static pages
    expect(xml).toContain('<loc>https://burntop.dev/</loc>');
    expect(xml).toContain('<loc>https://burntop.dev/leaderboard</loc>');
    expect(xml).toContain('<loc>https://burntop.dev/achievements</loc>');
    expect(xml).toContain('<loc>https://burntop.dev/dashboard</loc>');
  });

  it('should include lastmod, changefreq, and priority', async () => {
    const response = await fetch('http://localhost:3000/sitemap.xml');
    const xml = await response.text();

    // Should have at least one URL with all fields
    expect(xml).toContain('<lastmod>');
    expect(xml).toContain('<changefreq>');
    expect(xml).toContain('<priority>');
  });

  it('should return correct content type', async () => {
    const response = await fetch('http://localhost:3000/sitemap.xml');

    expect(response.headers.get('content-type')).toContain('application/xml');
  });

  it('should include cache headers', async () => {
    const response = await fetch('http://localhost:3000/sitemap.xml');

    const cacheControl = response.headers.get('cache-control');
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('max-age=3600');
  });
});
