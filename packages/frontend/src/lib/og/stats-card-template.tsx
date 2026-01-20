/**
 * Stats Card Template for OG Image Generation
 *
 * Displays user's key statistics in a visually appealing card format
 * optimized for social media sharing (Twitter, LinkedIn, etc.)
 *
 * Shows:
 * - Total tokens used
 * - Total cost
 * - Current streak
 * - Level and XP
 * - Top model used
 * - Cache efficiency (if applicable)
 */

import { BaseCardTemplate, OG_COLORS } from './base-card-template';

interface StatsCardProps {
  /**
   * User's display name or username
   */
  username: string;

  /**
   * User's avatar URL (GitHub avatar, etc.)
   * If not provided, initials will be shown
   */
  avatarUrl?: string;

  /**
   * User's display name (shown next to avatar)
   * Falls back to username if not provided
   */
  displayName?: string;

  /**
   * Monthly badge tier (Power User, AI Native, Token Titan)
   * Used to show tier badge and apply special effects
   */
  monthlyBadge?: string;

  /**
   * Total tokens used (sum of input + output + reasoning)
   */
  totalTokens: number;

  /**
   * Total cost in USD
   */
  totalCost: string;

  /**
   * Current streak in days
   */
  currentStreak: number;

  /**
   * Longest streak achieved (optional)
   */
  longestStreak?: number;

  /**
   * User's current level
   */
  level: number;

  /**
   * User's current XP
   */
  xp: number;

  /**
   * Top model used (optional)
   */
  topModel?: string;

  /**
   * Cache efficiency percentage (optional)
   */
  cacheEfficiency?: number;

  /**
   * Total achievements earned (optional)
   */
  totalAchievements?: number;
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
 * Get badge styling based on tier
 */
function getBadgeStyle(badge: string) {
  switch (badge) {
    case 'Token Titan':
      return {
        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        color: '#1A1A1A',
        glow: '#FFD70040',
      };
    case 'AI Native':
      return {
        background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
        color: '#FFFFFF',
        glow: '#60A5FA40',
      };
    case 'Power User':
      return {
        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        color: '#FFFFFF',
        glow: '#F59E0B40',
      };
    default:
      return {
        background: OG_COLORS.bg.surface,
        color: OG_COLORS.text.secondary,
        glow: 'transparent',
      };
  }
}

/**
 * Get user initials from username or display name
 */
function getInitials(username: string, displayName?: string): string {
  const name = displayName || username;
  const parts = name.split(/[\s_-]+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Stats Card Template Component
 * Renders a premium card with user statistics for OG image sharing
 */
export function StatsCardTemplate({
  username,
  avatarUrl,
  displayName,
  monthlyBadge,
  totalTokens,
  totalCost,
  currentStreak,
  longestStreak: _longestStreak,
  level,
  xp: _xp,
  topModel: _topModel,
  cacheEfficiency,
  totalAchievements,
}: StatsCardProps) {
  const badgeStyle = monthlyBadge ? getBadgeStyle(monthlyBadge) : null;
  const isHighTier = monthlyBadge === 'Token Titan' || monthlyBadge === 'AI Native';

  return (
    <BaseCardTemplate showBranding={true} showEmberGlow={true}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          flex: 1,
        }}
      >
        {/* Header: Avatar + Name + Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
            }}
          >
            {/* Avatar glow for high-tier users */}
            {isHighTier && badgeStyle && (
              <div
                style={{
                  position: 'absolute',
                  top: '-4px',
                  left: '-4px',
                  right: '-4px',
                  bottom: '-4px',
                  background: badgeStyle.glow,
                  borderRadius: '50%',
                  filter: 'blur(12px)',
                }}
              />
            )}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: avatarUrl ? 'transparent' : OG_COLORS.bg.surface,
                border: `3px solid ${isHighTier ? OG_COLORS.ember[500] : OG_COLORS.border.prominent}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: avatarUrl ? '0' : '32px',
                fontWeight: 600,
                color: OG_COLORS.text.primary,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={username}
                  width="80"
                  height="80"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                getInitials(username, displayName)
              )}
            </div>
          </div>

          {/* Name and Badge */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '40px',
                fontWeight: 700,
                color: OG_COLORS.text.primary,
                display: 'flex',
                letterSpacing: '-0.02em',
              }}
            >
              {displayName || username}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '20px',
                  color: OG_COLORS.text.tertiary,
                  display: 'flex',
                }}
              >
                @{username}
              </span>
              {monthlyBadge && badgeStyle && (
                <div
                  style={{
                    padding: '6px 14px',
                    background: badgeStyle.background,
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: badgeStyle.color,
                    display: 'flex',
                    letterSpacing: '0.03em',
                  }}
                >
                  {monthlyBadge.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hero Stat: Total Tokens */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '40px',
            background: `linear-gradient(135deg, ${OG_COLORS.bg.elevated} 0%, ${OG_COLORS.bg.surface} 100%)`,
            borderRadius: '20px',
            border: `2px solid ${OG_COLORS.border.prominent}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Diagonal accent */}
          <div
            style={{
              position: 'absolute',
              top: '-50%',
              right: '-10%',
              width: '400px',
              height: '200%',
              background: `linear-gradient(135deg, ${OG_COLORS.ember[500]}08 0%, transparent 100%)`,
              transform: 'rotate(15deg)',
            }}
          />
          <div
            style={{
              fontSize: '24px',
              color: OG_COLORS.text.secondary,
              marginBottom: '12px',
              display: 'flex',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Total Tokens
          </div>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 700,
              color: OG_COLORS.text.primary,
              display: 'flex',
              fontFamily: 'monospace',
              letterSpacing: '-0.03em',
            }}
          >
            {formatNumber(totalTokens)}
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div
          style={{
            display: 'flex',
            gap: '20px',
          }}
        >
          {/* Cost */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              background: OG_COLORS.bg.elevated,
              borderRadius: '16px',
              border: `1px solid ${OG_COLORS.border.default}`,
              boxShadow: `inset 0 1px 0 0 ${OG_COLORS.border.prominent}`,
            }}
          >
            <div
              style={{
                fontSize: '16px',
                color: OG_COLORS.text.tertiary,
                marginBottom: '8px',
                display: 'flex',
                letterSpacing: '0.03em',
              }}
            >
              COST
            </div>
            <div
              style={{
                fontSize: '36px',
                fontWeight: 700,
                color: OG_COLORS.ember[500],
                display: 'flex',
                fontFamily: 'monospace',
              }}
            >
              {formatCost(totalCost)}
            </div>
          </div>

          {/* Streak */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              background: OG_COLORS.bg.elevated,
              borderRadius: '16px',
              border: `1px solid ${OG_COLORS.border.default}`,
              boxShadow: `inset 0 1px 0 0 ${OG_COLORS.border.prominent}`,
            }}
          >
            <div
              style={{
                fontSize: '16px',
                color: OG_COLORS.text.tertiary,
                marginBottom: '8px',
                display: 'flex',
                letterSpacing: '0.03em',
              }}
            >
              STREAK
            </div>
            <div
              style={{
                fontSize: '36px',
                fontWeight: 700,
                color: OG_COLORS.text.primary,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ display: 'flex' }}>🔥</span>
              <span style={{ display: 'flex', fontFamily: 'monospace' }}>{currentStreak}</span>
            </div>
          </div>

          {/* Level */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              background: OG_COLORS.bg.elevated,
              borderRadius: '16px',
              border: `1px solid ${OG_COLORS.border.default}`,
              boxShadow: `inset 0 1px 0 0 ${OG_COLORS.border.prominent}`,
            }}
          >
            <div
              style={{
                fontSize: '16px',
                color: OG_COLORS.text.tertiary,
                marginBottom: '8px',
                display: 'flex',
                letterSpacing: '0.03em',
              }}
            >
              LEVEL
            </div>
            <div
              style={{
                fontSize: '36px',
                fontWeight: 700,
                color: OG_COLORS.text.primary,
                display: 'flex',
                fontFamily: 'monospace',
              }}
            >
              {level}
            </div>
          </div>
        </div>

        {/* Tertiary Stats Row */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
          }}
        >
          {totalAchievements !== undefined && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: OG_COLORS.bg.surface,
                borderRadius: '12px',
                border: `1px solid ${OG_COLORS.border.default}`,
              }}
            >
              <span
                style={{
                  fontSize: '16px',
                  color: OG_COLORS.text.secondary,
                  display: 'flex',
                }}
              >
                Achievements
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '20px', display: 'flex' }}>🏆</span>
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    color: OG_COLORS.text.primary,
                    display: 'flex',
                  }}
                >
                  {totalAchievements}
                </span>
              </div>
            </div>
          )}
          {cacheEfficiency !== undefined && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: OG_COLORS.bg.surface,
                borderRadius: '12px',
                border: `1px solid ${OG_COLORS.border.default}`,
              }}
            >
              <span
                style={{
                  fontSize: '16px',
                  color: OG_COLORS.text.secondary,
                  display: 'flex',
                }}
              >
                Cache Efficiency
              </span>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: OG_COLORS.ember[500],
                  display: 'flex',
                }}
              >
                {cacheEfficiency.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Profile URL */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: OG_COLORS.bg.surface,
            borderRadius: '12px',
            border: `1px solid ${OG_COLORS.border.default}`,
          }}
        >
          <span
            style={{
              fontSize: '18px',
              color: OG_COLORS.text.tertiary,
              display: 'flex',
            }}
          >
            burntop.dev/
          </span>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: OG_COLORS.ember[500],
              display: 'flex',
            }}
          >
            {username}
          </span>
        </div>
      </div>
    </BaseCardTemplate>
  );
}
