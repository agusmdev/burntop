/**
 * Wrapped Square Template for Social Media Posts
 *
 * Displays user's annual wrapped summary in a square 1:1 format
 * optimized for Instagram posts, Twitter/X posts, LinkedIn, etc.
 *
 * Dimensions: 1080x1080 (1:1 aspect ratio)
 *
 * Shows:
 * - Year and branding
 * - Total tokens and cost
 * - Days active
 * - Top model and tool
 * - Longest streak
 * - Achievements count
 * - Cache efficiency
 */

import { OG_COLORS } from './base-card-template';

interface WrappedSquareProps {
  /**
   * User's display name or username
   */
  username: string;

  /**
   * Year of the wrapped data
   */
  year: number;

  /**
   * Total tokens used
   */
  totalTokens: number;

  /**
   * Total cost in USD
   */
  totalCost: string;

  /**
   * Days active in the year
   */
  daysActive: number;

  /**
   * Top model used
   */
  topModel: string | null;

  /**
   * Top tool used
   */
  topTool: string | null;

  /**
   * Longest streak in days
   */
  longestStreak: number;

  /**
   * Total achievements earned
   */
  totalAchievements: number;

  /**
   * Cache efficiency percentage
   */
  cacheEfficiency: number;
}

/**
 * Square format dimensions (1:1)
 */
export const SQUARE_IMAGE_DIMENSIONS = {
  width: 1080,
  height: 1080,
} as const;

/**
 * Formats large numbers with K/M/B suffix
 * @example formatNumber(1500) => "1.5K"
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Formats cost to always show 2 decimal places
 * @example formatCost("12.5") => "$12.50"
 */
function formatCost(cost: string): string {
  const num = parseFloat(cost);
  if (isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
}

/**
 * Wrapped Square Template Component
 * Renders a square-format card with user's annual wrapped summary
 */
export function WrappedSquareTemplate({
  username,
  year,
  totalTokens,
  totalCost,
  daysActive,
  topModel,
  topTool,
  longestStreak,
  totalAchievements,
  cacheEfficiency,
}: WrappedSquareProps) {
  return (
    <div
      style={{
        width: SQUARE_IMAGE_DIMENSIONS.width,
        height: SQUARE_IMAGE_DIMENSIONS.height,
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(135deg, ${OG_COLORS.bg.base} 0%, ${OG_COLORS.bg.elevated} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative ember glow effect - top right */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          right: '-15%',
          width: '500px',
          height: '500px',
          background: `radial-gradient(circle, ${OG_COLORS.ember[500]}20 0%, transparent 70%)`,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Decorative ember glow effect - bottom left */}
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          left: '-15%',
          width: '500px',
          height: '500px',
          background: `radial-gradient(circle, ${OG_COLORS.ember[500]}15 0%, transparent 70%)`,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Content container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '50px',
          position: 'relative',
          zIndex: 1,
          justifyContent: 'space-between',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '12px',
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: '60px',
              height: '60px',
              background: OG_COLORS.ember[500],
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
            }}
          >
            🔥
          </div>

          {/* Year title */}
          <div
            style={{
              fontSize: '56px',
              fontWeight: 700,
              color: OG_COLORS.text.primary,
              display: 'flex',
            }}
          >
            {year} Wrapped
          </div>

          {/* Username */}
          <div
            style={{
              fontSize: '28px',
              fontWeight: 400,
              color: OG_COLORS.text.secondary,
              display: 'flex',
            }}
          >
            @{username}
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            marginTop: '30px',
            marginBottom: '30px',
          }}
        >
          {/* Main Stats Row - Tokens and Cost */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
            }}
          >
            {/* Total Tokens */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '32px',
                background: OG_COLORS.bg.elevated,
                borderRadius: '20px',
                border: `2px solid ${OG_COLORS.ember[500]}`,
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  color: OG_COLORS.text.secondary,
                  marginBottom: '8px',
                  display: 'flex',
                }}
              >
                Total Tokens
              </div>
              <div
                style={{
                  fontSize: '52px',
                  fontWeight: 700,
                  color: OG_COLORS.ember[500],
                  display: 'flex',
                }}
              >
                {formatNumber(totalTokens)}
              </div>
            </div>

            {/* Total Cost */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '32px',
                background: OG_COLORS.bg.elevated,
                borderRadius: '20px',
                border: `2px solid ${OG_COLORS.ember[500]}`,
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  color: OG_COLORS.text.secondary,
                  marginBottom: '8px',
                  display: 'flex',
                }}
              >
                Total Cost
              </div>
              <div
                style={{
                  fontSize: '52px',
                  fontWeight: 700,
                  color: OG_COLORS.ember[500],
                  display: 'flex',
                }}
              >
                {formatCost(totalCost)}
              </div>
            </div>
          </div>

          {/* Secondary Stats Row - Days Active and Streak */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
            }}
          >
            {/* Days Active */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
                background: OG_COLORS.bg.surface,
                borderRadius: '16px',
                border: `1px solid ${OG_COLORS.border.default}`,
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  color: OG_COLORS.text.secondary,
                  marginBottom: '6px',
                  display: 'flex',
                }}
              >
                Days Active
              </div>
              <div
                style={{
                  fontSize: '40px',
                  fontWeight: 700,
                  color: OG_COLORS.text.primary,
                  display: 'flex',
                }}
              >
                {daysActive}
              </div>
            </div>

            {/* Longest Streak */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
                background: OG_COLORS.bg.surface,
                borderRadius: '16px',
                border: `1px solid ${OG_COLORS.border.default}`,
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  color: OG_COLORS.text.secondary,
                  marginBottom: '6px',
                  display: 'flex',
                }}
              >
                Longest Streak
              </div>
              <div
                style={{
                  fontSize: '40px',
                  fontWeight: 700,
                  color: OG_COLORS.text.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ display: 'flex' }}>🔥</span>
                <span style={{ display: 'flex' }}>{longestStreak}</span>
              </div>
            </div>
          </div>

          {/* Top Model and Top Tool Row */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
            }}
          >
            {/* Top Model */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
                background: OG_COLORS.bg.surface,
                borderRadius: '16px',
                border: `1px solid ${OG_COLORS.border.default}`,
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '16px',
                  color: OG_COLORS.text.tertiary,
                  marginBottom: '6px',
                  display: 'flex',
                }}
              >
                Top Model
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: OG_COLORS.text.primary,
                  display: 'flex',
                }}
              >
                {topModel || 'N/A'}
              </div>
            </div>

            {/* Top Tool */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
                background: OG_COLORS.bg.surface,
                borderRadius: '16px',
                border: `1px solid ${OG_COLORS.border.default}`,
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '16px',
                  color: OG_COLORS.text.tertiary,
                  marginBottom: '6px',
                  display: 'flex',
                }}
              >
                Top Tool
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: OG_COLORS.text.primary,
                  display: 'flex',
                }}
              >
                {topTool || 'N/A'}
              </div>
            </div>
          </div>

          {/* Bottom Row - Achievements and Cache Efficiency */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
            }}
          >
            {/* Achievements */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
                background: OG_COLORS.bg.surface,
                borderRadius: '16px',
                border: `1px solid ${OG_COLORS.border.default}`,
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '16px',
                  color: OG_COLORS.text.tertiary,
                  marginBottom: '6px',
                  display: 'flex',
                }}
              >
                Achievements
              </div>
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 600,
                  color: OG_COLORS.text.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ display: 'flex' }}>🏆</span>
                <span style={{ display: 'flex' }}>{totalAchievements}</span>
              </div>
            </div>

            {/* Cache Efficiency */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
                background: OG_COLORS.bg.surface,
                borderRadius: '16px',
                border: `1px solid ${OG_COLORS.border.default}`,
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '16px',
                  color: OG_COLORS.text.tertiary,
                  marginBottom: '6px',
                  display: 'flex',
                }}
              >
                Cache Efficiency
              </div>
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 600,
                  color: OG_COLORS.ember[500],
                  display: 'flex',
                }}
              >
                {cacheEfficiency.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Footer branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            paddingTop: '30px',
            borderTop: `1px solid ${OG_COLORS.border.default}`,
          }}
        >
          <span
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: OG_COLORS.text.primary,
            }}
          >
            burntop.dev
          </span>
          <span
            style={{
              fontSize: '20px',
              color: OG_COLORS.text.tertiary,
            }}
          >
            Track your AI usage
          </span>
        </div>
      </div>
    </div>
  );
}
