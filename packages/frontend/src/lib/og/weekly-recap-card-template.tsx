/**
 * Weekly Recap Card Template for OG Image Generation
 *
 * Displays a weekly summary of user's AI usage stats in a visually appealing
 * card format optimized for social media sharing.
 *
 * Shows:
 * - Total tokens used this week
 * - Total cost for the week
 * - Days active this week
 * - Week-over-week growth percentage
 * - Top model used this week
 * - Most productive day
 * - Week date range
 */

import { BaseCardTemplate, OG_COLORS } from './base-card-template';

interface WeeklyRecapCardProps {
  /**
   * User's display name or username
   */
  username: string;

  /**
   * Total tokens used this week
   */
  weeklyTokens: number;

  /**
   * Total cost for the week in USD
   */
  weeklyCost: string;

  /**
   * Number of days active this week (0-7)
   */
  daysActive: number;

  /**
   * Week-over-week growth percentage (positive or negative)
   * @example 12.5 for +12.5% growth, -5.2 for -5.2% decline
   */
  weekOverWeekGrowth: number;

  /**
   * Top model used this week (optional)
   */
  topModel?: string;

  /**
   * Most productive day of the week (optional)
   * @example "Monday", "Tuesday", etc.
   */
  mostProductiveDay?: string;

  /**
   * Week start date
   */
  weekStart: Date;

  /**
   * Week end date
   */
  weekEnd: Date;

  /**
   * Total achievements earned this week (optional)
   */
  achievementsEarned?: number;
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
 * Formats date range for the week
 * @example formatWeekRange(startDate, endDate) => "Jan 5 - Jan 11, 2026"
 */
function formatWeekRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();
  const year = end.getFullYear();

  // Same month
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }

  // Different months
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Formats growth percentage with sign and color
 */
function formatGrowth(growth: number): { text: string; color: string; sign: string } {
  const isPositive = growth >= 0;
  return {
    text: `${Math.abs(growth).toFixed(1)}%`,
    color: isPositive ? '#22C55E' : '#EF4444',
    sign: isPositive ? '↑' : '↓',
  };
}

/**
 * Weekly Recap Card Template Component
 * Renders a card with weekly summary statistics for OG image sharing
 */
export function WeeklyRecapCardTemplate({
  username,
  weeklyTokens,
  weeklyCost,
  daysActive,
  weekOverWeekGrowth,
  topModel,
  mostProductiveDay,
  weekStart,
  weekEnd,
  achievementsEarned,
}: WeeklyRecapCardProps) {
  const growthStyle = formatGrowth(weekOverWeekGrowth);

  return (
    <BaseCardTemplate
      title={`@${username}'s Week in AI`}
      subtitle={formatWeekRange(weekStart, weekEnd)}
      showBranding={true}
      showEmberGlow={true}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          flex: 1,
        }}
      >
        {/* Row 1: Tokens and Cost */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
          }}
        >
          {/* Weekly Tokens Card */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '32px',
              background: OG_COLORS.bg.elevated,
              borderRadius: '16px',
              border: `1px solid ${OG_COLORS.border.default}`,
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
              Tokens This Week
            </div>
            <div
              style={{
                fontSize: '56px',
                fontWeight: 700,
                color: OG_COLORS.text.primary,
                display: 'flex',
                alignItems: 'baseline',
                gap: '12px',
              }}
            >
              <span style={{ display: 'flex' }}>{formatNumber(weeklyTokens)}</span>
              {/* Week-over-week growth indicator */}
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: growthStyle.color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ display: 'flex' }}>{growthStyle.sign}</span>
                <span style={{ display: 'flex' }}>{growthStyle.text}</span>
              </span>
            </div>
          </div>

          {/* Weekly Cost Card */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '32px',
              background: OG_COLORS.bg.elevated,
              borderRadius: '16px',
              border: `1px solid ${OG_COLORS.border.default}`,
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
                fontSize: '56px',
                fontWeight: 700,
                color: OG_COLORS.ember[500],
                display: 'flex',
              }}
            >
              {formatCost(weeklyCost)}
            </div>
          </div>
        </div>

        {/* Row 2: Days Active and Achievements */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
          }}
        >
          {/* Days Active Card */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '32px',
              background: OG_COLORS.bg.elevated,
              borderRadius: '16px',
              border: `1px solid ${OG_COLORS.border.default}`,
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
              Days Active
            </div>
            <div
              style={{
                fontSize: '56px',
                fontWeight: 700,
                color: OG_COLORS.text.primary,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <span style={{ display: 'flex' }}>{daysActive}</span>
              <span
                style={{
                  fontSize: '28px',
                  color: OG_COLORS.text.secondary,
                  display: 'flex',
                }}
              >
                / 7
              </span>
            </div>
            {/* Progress bar for days active */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '8px',
                background: OG_COLORS.bg.surface,
                borderRadius: '4px',
                marginTop: '16px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(daysActive / 7) * 100}%`,
                  background: OG_COLORS.ember[500],
                  borderRadius: '4px',
                  display: 'flex',
                }}
              />
            </div>
          </div>

          {/* Achievements Earned Card */}
          {achievementsEarned !== undefined && achievementsEarned > 0 && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '32px',
                background: OG_COLORS.bg.elevated,
                borderRadius: '16px',
                border: `1px solid ${OG_COLORS.border.default}`,
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
                Achievements Earned
              </div>
              <div
                style={{
                  fontSize: '56px',
                  fontWeight: 700,
                  color: OG_COLORS.text.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <span style={{ display: 'flex' }}>🏆</span>
                <span style={{ display: 'flex' }}>{achievementsEarned}</span>
              </div>
            </div>
          )}

          {/* If no achievements, show a placeholder card */}
          {(achievementsEarned === undefined || achievementsEarned === 0) && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '32px',
                background: OG_COLORS.bg.elevated,
                borderRadius: '16px',
                border: `1px solid ${OG_COLORS.border.default}`,
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
                Consistency
              </div>
              <div
                style={{
                  fontSize: '56px',
                  fontWeight: 700,
                  color: OG_COLORS.text.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <span style={{ display: 'flex' }}>
                  {daysActive === 7 ? '🔥' : daysActive >= 5 ? '💪' : '📈'}
                </span>
                <span
                  style={{
                    fontSize: '28px',
                    color: OG_COLORS.text.secondary,
                    display: 'flex',
                  }}
                >
                  {daysActive === 7 ? 'Perfect!' : daysActive >= 5 ? 'Strong' : 'Growing'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Row 3: Top Model and Most Productive Day (optional) */}
        {(topModel || mostProductiveDay) && (
          <div
            style={{
              display: 'flex',
              gap: '24px',
            }}
          >
            {/* Top Model */}
            {topModel && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px',
                  background: OG_COLORS.bg.surface,
                  borderRadius: '12px',
                  border: `1px solid ${OG_COLORS.border.default}`,
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
                  {topModel}
                </div>
              </div>
            )}

            {/* Most Productive Day */}
            {mostProductiveDay && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px',
                  background: OG_COLORS.bg.surface,
                  borderRadius: '12px',
                  border: `1px solid ${OG_COLORS.border.default}`,
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
                  Most Productive Day
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 600,
                    color: OG_COLORS.ember[500],
                    display: 'flex',
                  }}
                >
                  {mostProductiveDay}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseCardTemplate>
  );
}
