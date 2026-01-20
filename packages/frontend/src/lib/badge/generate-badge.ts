/**
 * SVG Badge Generator
 *
 * Generates embeddable SVG badges for GitHub READMEs, websites, etc.
 * Inspired by shields.io but customized for burntop.dev
 */

/**
 * Badge style variants
 */
export type BadgeStyle = 'flat' | 'flat-square' | 'plastic' | 'for-the-badge';

/**
 * Badge theme (color scheme)
 */
export type BadgeTheme = 'dark' | 'light';

/**
 * Badge variant types
 */
export type BadgeVariant = 'compact' | 'standard' | 'detailed' | 'streak' | 'level' | 'heatmap';

/**
 * Base badge options
 */
interface BaseBadgeOptions {
  style?: BadgeStyle;
  theme?: BadgeTheme;
  color?: string; // Custom color override
}

/**
 * Compact badge options (tokens only)
 */
export interface CompactBadgeOptions extends BaseBadgeOptions {
  variant: 'compact';
  totalTokens: number;
}

/**
 * Standard badge options (tokens + streak + level)
 */
export interface StandardBadgeOptions extends BaseBadgeOptions {
  variant: 'standard';
  totalTokens: number;
  currentStreak: number;
  level: number;
}

/**
 * Detailed badge options (all stats)
 */
export interface DetailedBadgeOptions extends BaseBadgeOptions {
  variant: 'detailed';
  totalTokens: number;
  currentStreak: number;
  level: number;
  totalCost: number;
  achievements: number;
}

/**
 * Streak-only badge options
 */
export interface StreakBadgeOptions extends BaseBadgeOptions {
  variant: 'streak';
  currentStreak: number;
}

/**
 * Level-only badge options
 */
export interface LevelBadgeOptions extends BaseBadgeOptions {
  variant: 'level';
  level: number;
  levelTitle?: string;
}

/**
 * Heatmap badge options (contribution graph)
 */
export interface HeatmapBadgeOptions extends BaseBadgeOptions {
  variant: 'heatmap';
  dailyData: number[]; // Last 7 days of token counts
}

/**
 * All badge options union type
 */
export type BadgeOptions =
  | CompactBadgeOptions
  | StandardBadgeOptions
  | DetailedBadgeOptions
  | StreakBadgeOptions
  | LevelBadgeOptions
  | HeatmapBadgeOptions;

/**
 * Color schemes for badge themes
 */
const COLORS = {
  dark: {
    background: '#0A0A0A',
    text: '#FAFAFA',
    labelBg: '#1A1A1A',
    ember: '#FF6B00',
    border: '#2A2A2A',
    muted: '#999999',
  },
  light: {
    background: '#FFFFFF',
    text: '#0A0A0A',
    labelBg: '#F5F5F5',
    ember: '#FF6B00',
    border: '#E5E5E5',
    muted: '#666666',
  },
};

/**
 * Format large numbers with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Format cost in dollars
 */
function formatCost(cost: number): string {
  if (cost >= 1000) {
    return `$${(cost / 1000).toFixed(1)}K`;
  }
  if (cost >= 1) {
    return `$${cost.toFixed(2)}`;
  }
  return `$${cost.toFixed(3)}`;
}

/**
 * Escape text for SVG
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Calculate text width (approximate)
 * Based on average character width for monospace font
 */
function calculateTextWidth(text: string, fontSize: number = 11): number {
  // Approximate character width: 0.6 * fontSize for monospace
  return text.length * fontSize * 0.6;
}

/**
 * Generate compact badge (tokens only)
 */
function generateCompactBadge(options: CompactBadgeOptions): string {
  const { totalTokens, style = 'flat', theme = 'dark', color } = options;
  const colors = COLORS[theme];
  const accentColor = color || colors.ember;

  const label = 'tokens';
  const value = formatNumber(totalTokens);

  const labelWidth = calculateTextWidth(label) + 20;
  const valueWidth = calculateTextWidth(value) + 20;
  const totalWidth = labelWidth + valueWidth;
  const height = 20;

  const borderRadius = style === 'flat-square' ? 0 : 3;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="${borderRadius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${colors.labelBg}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${accentColor}"/>
    ${style === 'plastic' ? '<rect width="' + totalWidth + '" height="' + height + '" fill="url(#s)"/>' : ''}
  </g>
  <g fill="${colors.text}" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelWidth / 2}" y="14">${escapeXml(label)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(value)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${escapeXml(value)}</text>
  </g>
</svg>`;
}

/**
 * Generate standard badge (tokens + streak + level)
 */
function generateStandardBadge(options: StandardBadgeOptions): string {
  const { totalTokens, currentStreak, level, style = 'flat', theme = 'dark', color } = options;
  const colors = COLORS[theme];
  const accentColor = color || colors.ember;

  const label = 'burntop';
  const value = `${formatNumber(totalTokens)} tokens | ${currentStreak}🔥 | Lv${level}`;

  const labelWidth = calculateTextWidth(label) + 20;
  const valueWidth = calculateTextWidth(value, 11) + 25;
  const totalWidth = labelWidth + valueWidth;
  const height = 20;

  const borderRadius = style === 'flat-square' ? 0 : 3;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="${borderRadius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${colors.labelBg}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${accentColor}"/>
    ${style === 'plastic' ? '<rect width="' + totalWidth + '" height="' + height + '" fill="url(#s)"/>' : ''}
  </g>
  <g fill="${colors.text}" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelWidth / 2}" y="14">${escapeXml(label)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(value)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${escapeXml(value)}</text>
  </g>
</svg>`;
}

/**
 * Generate detailed badge (all stats)
 */
function generateDetailedBadge(options: DetailedBadgeOptions): string {
  const {
    totalTokens,
    currentStreak,
    level,
    totalCost,
    achievements,
    style = 'flat',
    theme = 'dark',
    color,
  } = options;
  const colors = COLORS[theme];
  const accentColor = color || colors.ember;

  const label = 'burntop.dev';
  const value = `${formatNumber(totalTokens)} tokens | ${formatCost(totalCost)} | ${currentStreak}🔥 | Lv${level} | ${achievements}★`;

  const labelWidth = calculateTextWidth(label) + 20;
  const valueWidth = calculateTextWidth(value, 11) + 30;
  const totalWidth = labelWidth + valueWidth;
  const height = 20;

  const borderRadius = style === 'flat-square' ? 0 : 3;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="${borderRadius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${colors.labelBg}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${accentColor}"/>
    ${style === 'plastic' ? '<rect width="' + totalWidth + '" height="' + height + '" fill="url(#s)"/>' : ''}
  </g>
  <g fill="${colors.text}" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelWidth / 2}" y="14">${escapeXml(label)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(value)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${escapeXml(value)}</text>
  </g>
</svg>`;
}

/**
 * Generate streak-only badge
 */
function generateStreakBadge(options: StreakBadgeOptions): string {
  const { currentStreak, style = 'flat', theme = 'dark', color } = options;
  const colors = COLORS[theme];
  const accentColor = color || colors.ember;

  const label = 'streak';
  const value = `${currentStreak} days 🔥`;

  const labelWidth = calculateTextWidth(label) + 20;
  const valueWidth = calculateTextWidth(value) + 25;
  const totalWidth = labelWidth + valueWidth;
  const height = 20;

  const borderRadius = style === 'flat-square' ? 0 : 3;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="${borderRadius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${colors.labelBg}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${accentColor}"/>
    ${style === 'plastic' ? '<rect width="' + totalWidth + '" height="' + height + '" fill="url(#s)"/>' : ''}
  </g>
  <g fill="${colors.text}" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelWidth / 2}" y="14">${escapeXml(label)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(value)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${escapeXml(value)}</text>
  </g>
</svg>`;
}

/**
 * Generate level-only badge
 */
function generateLevelBadge(options: LevelBadgeOptions): string {
  const { level, levelTitle, style = 'flat', theme = 'dark', color } = options;
  const colors = COLORS[theme];
  const accentColor = color || colors.ember;

  const label = levelTitle || 'level';
  const value = `Lv${level}`;

  const labelWidth = calculateTextWidth(label) + 20;
  const valueWidth = calculateTextWidth(value) + 20;
  const totalWidth = labelWidth + valueWidth;
  const height = 20;

  const borderRadius = style === 'flat-square' ? 0 : 3;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="${borderRadius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${colors.labelBg}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${accentColor}"/>
    ${style === 'plastic' ? '<rect width="' + totalWidth + '" height="' + height + '" fill="url(#s)"/>' : ''}
  </g>
  <g fill="${colors.text}" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelWidth / 2}" y="14">${escapeXml(label)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(value)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${escapeXml(value)}</text>
  </g>
</svg>`;
}

/**
 * Generate heatmap badge (contribution graph)
 */
function generateHeatmapBadge(options: HeatmapBadgeOptions): string {
  const { dailyData, style = 'flat', theme = 'dark', color } = options;
  const colors = COLORS[theme];
  const accentColor = color || colors.ember;

  // Ensure we have exactly 7 days
  const data = dailyData.slice(0, 7);
  while (data.length < 7) {
    data.push(0);
  }

  const label = 'activity';
  const labelWidth = calculateTextWidth(label) + 20;
  const cellSize = 12;
  const cellGap = 2;
  const heatmapWidth = 7 * (cellSize + cellGap) - cellGap + 10; // 7 cells + padding
  const totalWidth = labelWidth + heatmapWidth;
  const height = 20;

  const borderRadius = style === 'flat-square' ? 0 : 3;

  // Normalize data to 0-4 scale
  const max = Math.max(...data, 1);
  const normalizedData = data.map((val) => Math.floor((val / max) * 4));

  // Color intensity levels
  const intensityColors = [
    colors.border, // 0: no activity
    `${accentColor}40`, // 1: low
    `${accentColor}80`, // 2: medium-low
    `${accentColor}C0`, // 3: medium-high
    accentColor, // 4: high
  ];

  // Generate heatmap cells
  const cells = normalizedData
    .map((intensity, i) => {
      const x = labelWidth + 5 + i * (cellSize + cellGap);
      const y = (height - cellSize) / 2;
      const fillColor = intensityColors[intensity];
      return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${fillColor}"/>`;
    })
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: last 7 days">
  <title>${label}: last 7 days</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="${borderRadius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${colors.labelBg}"/>
    <rect x="${labelWidth}" width="${heatmapWidth}" height="${height}" fill="${colors.background}"/>
    ${style === 'plastic' ? '<rect width="' + totalWidth + '" height="' + height + '" fill="url(#s)"/>' : ''}
  </g>
  <g fill="${colors.text}" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelWidth / 2}" y="14">${escapeXml(label)}</text>
  </g>
  <g>
    ${cells}
  </g>
</svg>`;
}

/**
 * Main badge generator function
 * Routes to appropriate generator based on variant
 */
export function generateBadge(options: BadgeOptions): string {
  switch (options.variant) {
    case 'compact':
      return generateCompactBadge(options);
    case 'standard':
      return generateStandardBadge(options);
    case 'detailed':
      return generateDetailedBadge(options);
    case 'streak':
      return generateStreakBadge(options);
    case 'level':
      return generateLevelBadge(options);
    case 'heatmap':
      return generateHeatmapBadge(options);
    default:
      throw new Error(`Unknown badge variant: ${(options as BadgeOptions).variant}`);
  }
}
