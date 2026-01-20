import { describe, expect, it } from 'vitest';

import { generateBadge } from './generate-badge';

describe('generateBadge', () => {
  it('generates compact badge with tokens', () => {
    const svg = generateBadge({
      variant: 'compact',
      totalTokens: 1_234_567,
    });

    expect(svg).toContain('tokens');
    expect(svg).toContain('1.2M');
    expect(svg).toContain('svg');
    expect(svg).toContain('xmlns');
  });

  it('generates standard badge with tokens, streak, and level', () => {
    const svg = generateBadge({
      variant: 'standard',
      totalTokens: 500_000,
      currentStreak: 15,
      level: 42,
    });

    expect(svg).toContain('burntop');
    expect(svg).toContain('500.0K tokens');
    expect(svg).toContain('15🔥');
    expect(svg).toContain('Lv42');
  });

  it('generates detailed badge with all stats', () => {
    const svg = generateBadge({
      variant: 'detailed',
      totalTokens: 2_000_000,
      currentStreak: 30,
      level: 75,
      totalCost: 125.5,
      achievements: 25,
    });

    expect(svg).toContain('burntop.dev');
    expect(svg).toContain('2.0M tokens');
    expect(svg).toContain('$125.50');
    expect(svg).toContain('30🔥');
    expect(svg).toContain('Lv75');
    expect(svg).toContain('25★');
  });

  it('generates streak-only badge', () => {
    const svg = generateBadge({
      variant: 'streak',
      currentStreak: 100,
    });

    expect(svg).toContain('streak');
    expect(svg).toContain('100 days');
    expect(svg).toContain('🔥');
  });

  it('generates level-only badge', () => {
    const svg = generateBadge({
      variant: 'level',
      level: 50,
    });

    expect(svg).toContain('level');
    expect(svg).toContain('Lv50');
  });

  it('generates level badge with custom title', () => {
    const svg = generateBadge({
      variant: 'level',
      level: 100,
      levelTitle: 'Legendary',
    });

    expect(svg).toContain('Legendary');
    expect(svg).toContain('Lv100');
  });

  it('generates heatmap badge with activity data', () => {
    const svg = generateBadge({
      variant: 'heatmap',
      dailyData: [100, 200, 150, 300, 250, 180, 220],
    });

    expect(svg).toContain('activity');
    expect(svg).toContain('last 7 days');
    expect(svg).toContain('<rect'); // Should have heatmap cells
  });

  it('handles heatmap with less than 7 days', () => {
    const svg = generateBadge({
      variant: 'heatmap',
      dailyData: [100, 200, 150],
    });

    expect(svg).toContain('activity');
    expect(svg).toContain('svg');
    // Should pad with zeros - count rect elements (7 cells)
    const rectCount = (svg.match(/<rect/g) || []).length;
    expect(rectCount).toBeGreaterThanOrEqual(7); // 7 cells + background rects
  });

  it('supports different styles', () => {
    const flatSvg = generateBadge({
      variant: 'compact',
      totalTokens: 1000,
      style: 'flat',
    });

    const flatSquareSvg = generateBadge({
      variant: 'compact',
      totalTokens: 1000,
      style: 'flat-square',
    });

    expect(flatSvg).toContain('rx="3"'); // Rounded corners
    expect(flatSquareSvg).toContain('rx="0"'); // Square corners
  });

  it('supports different themes', () => {
    const darkSvg = generateBadge({
      variant: 'compact',
      totalTokens: 1000,
      theme: 'dark',
    });

    const lightSvg = generateBadge({
      variant: 'compact',
      totalTokens: 1000,
      theme: 'light',
    });

    expect(darkSvg).toContain('#1A1A1A'); // Dark label background
    expect(darkSvg).toContain('#FAFAFA'); // Dark text
    expect(lightSvg).toContain('#F5F5F5'); // Light label background
    expect(lightSvg).toContain('#0A0A0A'); // Light text
  });

  it('supports custom color override', () => {
    const svg = generateBadge({
      variant: 'compact',
      totalTokens: 1000,
      color: '#FF0000',
    });

    expect(svg).toContain('#FF0000');
  });

  it('formats large numbers correctly', () => {
    const compactBadge = generateBadge({
      variant: 'compact',
      totalTokens: 1_500_000,
    });

    expect(compactBadge).toContain('1.5M');

    const thousandsBadge = generateBadge({
      variant: 'compact',
      totalTokens: 5_500,
    });

    expect(thousandsBadge).toContain('5.5K');

    const smallBadge = generateBadge({
      variant: 'compact',
      totalTokens: 500,
    });

    expect(smallBadge).toContain('500');
  });

  it('formats costs correctly', () => {
    const largeCostBadge = generateBadge({
      variant: 'detailed',
      totalTokens: 1000,
      currentStreak: 1,
      level: 1,
      totalCost: 5_500,
      achievements: 1,
    });

    expect(largeCostBadge).toContain('$5.5K');

    const mediumCostBadge = generateBadge({
      variant: 'detailed',
      totalTokens: 1000,
      currentStreak: 1,
      level: 1,
      totalCost: 25.75,
      achievements: 1,
    });

    expect(mediumCostBadge).toContain('$25.75');

    const smallCostBadge = generateBadge({
      variant: 'detailed',
      totalTokens: 1000,
      currentStreak: 1,
      level: 1,
      totalCost: 0.125,
      achievements: 1,
    });

    expect(smallCostBadge).toContain('$0.125');
  });

  it('escapes XML special characters', () => {
    const svg = generateBadge({
      variant: 'level',
      level: 1,
      levelTitle: 'Level & "Quotes" <Tags>',
    });

    expect(svg).toContain('&amp;');
    expect(svg).toContain('&quot;');
    expect(svg).toContain('&lt;');
    expect(svg).toContain('&gt;');
  });

  it('includes proper accessibility attributes', () => {
    const svg = generateBadge({
      variant: 'compact',
      totalTokens: 1000,
    });

    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label=');
    expect(svg).toContain('<title>');
  });
});
