/**
 * Wrapped Card Template for OG Image Generation
 *
 * Displays user's annual wrapped summary in a visually appealing card format
 * optimized for social media sharing (Twitter, LinkedIn, etc.)
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

import { BaseCardTemplate, OG_COLORS } from './base-card-template';

interface WrappedCardProps {
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
 * Wrapped Card Template Component
 * Renders a card with user's annual wrapped summary for OG image sharing
 */
export function WrappedCardTemplate({
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
}: WrappedCardProps) {
  return (
    <BaseCardTemplate
      title={`${year} Wrapped`}
      subtitle={`@${username}'s Year in AI`}
      showBranding={true}
      showEmberGlow={true}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          flex: 1,
        }}
      >
        {/* Row 1: Main Stats - Tokens, Cost, Days Active */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
          }}
        >
          {/* Total Tokens */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              background: OG_COLORS.bg.elevated,
              borderRadius: '12px',
              border: `1px solid ${OG_COLORS.border.default}`,
            }}
          >
            <div
              style={{
                fontSize: '16px',
                color: OG_COLORS.text.secondary,
                marginBottom: '6px',
                display: 'flex',
              }}
            >
              Total Tokens
            </div>
            <div
              style={{
                fontSize: '40px',
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
              padding: '24px',
              background: OG_COLORS.bg.elevated,
              borderRadius: '12px',
              border: `1px solid ${OG_COLORS.border.default}`,
            }}
          >
            <div
              style={{
                fontSize: '16px',
                color: OG_COLORS.text.secondary,
                marginBottom: '6px',
                display: 'flex',
              }}
            >
              Total Cost
            </div>
            <div
              style={{
                fontSize: '40px',
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
              padding: '24px',
              background: OG_COLORS.bg.elevated,
              borderRadius: '12px',
              border: `1px solid ${OG_COLORS.border.default}`,
            }}
          >
            <div
              style={{
                fontSize: '16px',
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
        </div>

        {/* Row 2: Top Model, Top Tool, Streak */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
          }}
        >
          {/* Top Model */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              background: OG_COLORS.bg.surface,
              borderRadius: '12px',
              border: `1px solid ${OG_COLORS.border.default}`,
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: OG_COLORS.text.tertiary,
                marginBottom: '4px',
                display: 'flex',
              }}
            >
              Top Model
            </div>
            <div
              style={{
                fontSize: '20px',
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
              padding: '20px',
              background: OG_COLORS.bg.surface,
              borderRadius: '12px',
              border: `1px solid ${OG_COLORS.border.default}`,
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: OG_COLORS.text.tertiary,
                marginBottom: '4px',
                display: 'flex',
              }}
            >
              Top Tool
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: OG_COLORS.text.primary,
                display: 'flex',
              }}
            >
              {topTool || 'N/A'}
            </div>
          </div>

          {/* Longest Streak */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              background: OG_COLORS.bg.surface,
              borderRadius: '12px',
              border: `1px solid ${OG_COLORS.border.default}`,
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: OG_COLORS.text.tertiary,
                marginBottom: '4px',
                display: 'flex',
              }}
            >
              Longest Streak
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: OG_COLORS.text.primary,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ display: 'flex' }}>🔥</span>
              <span style={{ display: 'flex' }}>{longestStreak} days</span>
            </div>
          </div>
        </div>

        {/* Row 3: Achievements & Cache Efficiency */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
          }}
        >
          {/* Achievements */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              background: OG_COLORS.bg.surface,
              borderRadius: '12px',
              border: `1px solid ${OG_COLORS.border.default}`,
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: OG_COLORS.text.tertiary,
                marginBottom: '4px',
                display: 'flex',
              }}
            >
              Achievements Unlocked
            </div>
            <div
              style={{
                fontSize: '28px',
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
              padding: '20px',
              background: OG_COLORS.bg.surface,
              borderRadius: '12px',
              border: `1px solid ${OG_COLORS.border.default}`,
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: OG_COLORS.text.tertiary,
                marginBottom: '4px',
                display: 'flex',
              }}
            >
              Cache Efficiency
            </div>
            <div
              style={{
                fontSize: '28px',
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
    </BaseCardTemplate>
  );
}
