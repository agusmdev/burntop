/**
 * Wrapped Story Template for Social Media Stories
 *
 * Displays user's annual wrapped summary in a vertical 9:16 format
 * optimized for Instagram/Facebook Stories, Twitter/X stories, etc.
 *
 * Dimensions: 1080x1920 (9:16 aspect ratio)
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

interface WrappedStoryProps {
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
 * Story format dimensions (9:16)
 */
export const STORY_IMAGE_DIMENSIONS = {
  width: 1080,
  height: 1920,
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
 * Wrapped Story Template Component
 * Renders a vertical story-format card with user's annual wrapped summary
 */
export function WrappedStoryTemplate({
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
}: WrappedStoryProps) {
  return (
    <div
      style={{
        width: STORY_IMAGE_DIMENSIONS.width,
        height: STORY_IMAGE_DIMENSIONS.height,
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${OG_COLORS.bg.base} 0%, ${OG_COLORS.bg.elevated} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative ember glow effect - top */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-20%',
          width: '600px',
          height: '600px',
          background: `radial-gradient(circle, ${OG_COLORS.ember[500]}20 0%, transparent 70%)`,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Decorative ember glow effect - bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-20%',
          width: '600px',
          height: '600px',
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
          padding: '80px 60px',
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
            gap: '16px',
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: '80px',
              height: '80px',
              background: OG_COLORS.ember[500],
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
            }}
          >
            🔥
          </div>

          {/* Year title */}
          <div
            style={{
              fontSize: '72px',
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
              fontSize: '36px',
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
            gap: '24px',
            marginTop: '60px',
            marginBottom: '60px',
          }}
        >
          {/* Total Tokens - Hero stat */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '48px',
              background: OG_COLORS.bg.elevated,
              borderRadius: '24px',
              border: `2px solid ${OG_COLORS.ember[500]}`,
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '28px',
                color: OG_COLORS.text.secondary,
                marginBottom: '12px',
                display: 'flex',
              }}
            >
              Total Tokens
            </div>
            <div
              style={{
                fontSize: '80px',
                fontWeight: 700,
                color: OG_COLORS.ember[500],
                display: 'flex',
              }}
            >
              {formatNumber(totalTokens)}
            </div>
          </div>

          {/* Secondary Stats Row 1 */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
            }}
          >
            {/* Total Cost */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '32px',
                background: OG_COLORS.bg.elevated,
                borderRadius: '20px',
                border: `1px solid ${OG_COLORS.border.default}`,
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '22px',
                  color: OG_COLORS.text.secondary,
                  marginBottom: '8px',
                  display: 'flex',
                }}
              >
                Total Cost
              </div>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  color: OG_COLORS.ember[500],
                  display: 'flex',
                }}
              >
                {formatCost(totalCost)}
              </div>
            </div>

            {/* Days Active */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '32px',
                background: OG_COLORS.bg.elevated,
                borderRadius: '20px',
                border: `1px solid ${OG_COLORS.border.default}`,
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '22px',
                  color: OG_COLORS.text.secondary,
                  marginBottom: '8px',
                  display: 'flex',
                }}
              >
                Days Active
              </div>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  color: OG_COLORS.text.primary,
                  display: 'flex',
                }}
              >
                {daysActive}
              </div>
            </div>
          </div>

          {/* Top Model */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '36px',
              background: OG_COLORS.bg.surface,
              borderRadius: '20px',
              border: `1px solid ${OG_COLORS.border.default}`,
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                color: OG_COLORS.text.tertiary,
                marginBottom: '8px',
                display: 'flex',
              }}
            >
              Top Model
            </div>
            <div
              style={{
                fontSize: '36px',
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
              display: 'flex',
              flexDirection: 'column',
              padding: '36px',
              background: OG_COLORS.bg.surface,
              borderRadius: '20px',
              border: `1px solid ${OG_COLORS.border.default}`,
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                color: OG_COLORS.text.tertiary,
                marginBottom: '8px',
                display: 'flex',
              }}
            >
              Top Tool
            </div>
            <div
              style={{
                fontSize: '36px',
                fontWeight: 600,
                color: OG_COLORS.text.primary,
                display: 'flex',
              }}
            >
              {topTool || 'N/A'}
            </div>
          </div>

          {/* Bottom Stats Row */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
            }}
          >
            {/* Longest Streak */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '32px',
                background: OG_COLORS.bg.surface,
                borderRadius: '20px',
                border: `1px solid ${OG_COLORS.border.default}`,
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  color: OG_COLORS.text.tertiary,
                  marginBottom: '8px',
                  display: 'flex',
                }}
              >
                Longest Streak
              </div>
              <div
                style={{
                  fontSize: '40px',
                  fontWeight: 600,
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

            {/* Achievements */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '32px',
                background: OG_COLORS.bg.surface,
                borderRadius: '20px',
                border: `1px solid ${OG_COLORS.border.default}`,
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  color: OG_COLORS.text.tertiary,
                  marginBottom: '8px',
                  display: 'flex',
                }}
              >
                Achievements
              </div>
              <div
                style={{
                  fontSize: '40px',
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
          </div>

          {/* Cache Efficiency */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '36px',
              background: OG_COLORS.bg.surface,
              borderRadius: '20px',
              border: `1px solid ${OG_COLORS.border.default}`,
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                color: OG_COLORS.text.tertiary,
                marginBottom: '8px',
                display: 'flex',
              }}
            >
              Cache Efficiency
            </div>
            <div
              style={{
                fontSize: '48px',
                fontWeight: 600,
                color: OG_COLORS.ember[500],
                display: 'flex',
              }}
            >
              {cacheEfficiency.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Footer branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            paddingTop: '40px',
            borderTop: `1px solid ${OG_COLORS.border.default}`,
          }}
        >
          <span
            style={{
              fontSize: '32px',
              fontWeight: 600,
              color: OG_COLORS.text.primary,
            }}
          >
            burntop.dev
          </span>
          <span
            style={{
              fontSize: '28px',
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
