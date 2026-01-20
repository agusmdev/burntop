/**
 * Streak Milestone Card Template for OG Image Generation
 *
 * Displays a streak milestone celebration card when users hit
 * significant streak milestones (3, 7, 30, 100, 365, 1000 days)
 *
 * Shows:
 * - Streak milestone achieved (e.g., "30 Day Streak!")
 * - Current streak count with fire animation aesthetic
 * - Longest streak record
 * - Motivational message
 * - XP reward earned
 * - User who achieved it
 */

import { BaseCardTemplate, OG_COLORS } from './base-card-template';

/**
 * Predefined streak milestones as defined in full-spec.md Section 3.1
 */
export const STREAK_MILESTONES = [3, 7, 30, 100, 365, 1000] as const;

interface StreakMilestoneCardProps {
  /**
   * User's display name or username who achieved the milestone
   */
  username: string;

  /**
   * Current streak count (should match one of the milestone values)
   */
  currentStreak: number;

  /**
   * User's longest streak ever achieved
   */
  longestStreak: number;

  /**
   * XP reward earned for this milestone
   * @default 10 * currentStreak (as per full-spec.md Section 3.2)
   */
  xpReward?: number;

  /**
   * Custom motivational message
   * @default Auto-generated based on milestone
   */
  message?: string;
}

/**
 * Returns appropriate emoji intensity based on streak length
 */
function getStreakEmoji(streak: number): string {
  if (streak >= 1000) return '🔥🔥🔥🔥';
  if (streak >= 365) return '🔥🔥🔥';
  if (streak >= 100) return '🔥🔥';
  return '🔥';
}

/**
 * Returns color intensity based on streak length
 */
function getStreakColor(streak: number): string {
  if (streak >= 365) return OG_COLORS.ember[500]; // Legendary
  if (streak >= 100) return '#F59E0B'; // Gold
  if (streak >= 30) return '#A855F7'; // Purple
  if (streak >= 7) return '#3B82F6'; // Blue
  return '#22C55E'; // Green
}

/**
 * Returns motivational message based on milestone
 */
function getMotivationalMessage(streak: number, isNewRecord: boolean): string {
  if (streak >= 1000) {
    return isNewRecord
      ? 'Absolutely legendary! You are unstoppable! 🚀'
      : 'Maintaining excellence for over 1000 days!';
  }
  if (streak >= 365) {
    return isNewRecord
      ? 'A full year of dedication! Incredible achievement! 🎉'
      : 'One year strong and counting!';
  }
  if (streak >= 100) {
    return isNewRecord ? 'Triple digits! You are on fire! 💪' : 'Crushing it with 100+ days!';
  }
  if (streak >= 30) {
    return isNewRecord ? 'A whole month of consistency! Keep it going! ⚡' : '30 days strong!';
  }
  if (streak >= 7) {
    return isNewRecord ? 'A full week! Building momentum! 📈' : 'One week and counting!';
  }
  return isNewRecord ? 'Great start! Keep the momentum going! 💫' : 'Building your streak!';
}

/**
 * Formats large numbers with K suffix for display
 */
function formatStreakNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Streak Milestone Card Template Component
 * Renders a celebratory card for streak milestones
 */
export function StreakMilestoneCardTemplate({
  username,
  currentStreak,
  longestStreak,
  xpReward = currentStreak * 10,
  message,
}: StreakMilestoneCardProps) {
  const isNewRecord = currentStreak === longestStreak;
  const streakEmoji = getStreakEmoji(currentStreak);
  const streakColor = getStreakColor(currentStreak);
  const motivationalMessage = message ?? getMotivationalMessage(currentStreak, isNewRecord);

  return (
    <BaseCardTemplate
      title="Streak Milestone!"
      subtitle={`@${username} is on fire`}
      showBranding={true}
      showEmberGlow={true}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: '40px',
        }}
      >
        {/* Main Streak Display with Fire Animation Aesthetic */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          {/* Glow effect */}
          <div
            style={{
              position: 'absolute',
              width: '400px',
              height: '400px',
              background: `radial-gradient(circle, ${streakColor}30 0%, transparent 70%)`,
              filter: 'blur(60px)',
            }}
          />

          {/* Fire emoji with scale based on streak */}
          <div
            style={{
              position: 'relative',
              fontSize: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: 'drop-shadow(0 0 40px rgba(255, 107, 0, 0.4))',
            }}
          >
            {streakEmoji}
          </div>

          {/* Streak count */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '120px',
                fontWeight: 800,
                color: streakColor,
                display: 'flex',
                lineHeight: 1,
                textShadow: `0 0 60px ${streakColor}40`,
              }}
            >
              {formatStreakNumber(currentStreak)}
            </div>
            <div
              style={{
                fontSize: '48px',
                fontWeight: 600,
                color: OG_COLORS.text.secondary,
                display: 'flex',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {currentStreak === 1 ? 'DAY STREAK' : 'DAY STREAK'}
            </div>
          </div>

          {/* New Record Badge (if applicable) */}
          {isNewRecord && currentStreak > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: `${streakColor}20`,
                borderRadius: '24px',
                border: `2px solid ${streakColor}`,
              }}
            >
              <span style={{ fontSize: '24px', display: 'flex' }}>👑</span>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: streakColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                }}
              >
                NEW RECORD
              </span>
            </div>
          )}
        </div>

        {/* Motivational Message */}
        <p
          style={{
            fontSize: '28px',
            fontWeight: 500,
            color: OG_COLORS.text.primary,
            margin: 0,
            textAlign: 'center',
            maxWidth: '700px',
            lineHeight: 1.4,
            display: 'flex',
          }}
        >
          {motivationalMessage}
        </p>

        {/* Stats Row: XP Reward and Longest Streak */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          {/* XP Reward */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px 40px',
              background: OG_COLORS.bg.elevated,
              borderRadius: '16px',
              border: `1px solid ${OG_COLORS.border.default}`,
            }}
          >
            <div
              style={{
                fontSize: '18px',
                color: OG_COLORS.text.tertiary,
                marginBottom: '8px',
                display: 'flex',
              }}
            >
              XP Earned
            </div>
            <div
              style={{
                fontSize: '40px',
                fontWeight: 700,
                color: OG_COLORS.ember[500],
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ display: 'flex' }}>+{xpReward.toLocaleString()}</span>
            </div>
          </div>

          {/* Longest Streak (if different from current) */}
          {longestStreak > currentStreak && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '24px 40px',
                background: OG_COLORS.bg.elevated,
                borderRadius: '16px',
                border: `1px solid ${OG_COLORS.border.default}`,
              }}
            >
              <div
                style={{
                  fontSize: '18px',
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
                  fontWeight: 700,
                  color: OG_COLORS.text.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ display: 'flex', fontSize: '32px' }}>🏆</span>
                <span style={{ display: 'flex' }}>{longestStreak}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseCardTemplate>
  );
}
