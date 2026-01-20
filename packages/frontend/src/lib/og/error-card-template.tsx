/**
 * Error Card Template for OG Image Generation
 *
 * Displays user-friendly error messages when OG image generation fails
 * or when user data is unavailable.
 *
 * Use cases:
 * - User not found (404)
 * - Profile is private (403)
 * - Server error (500)
 * - Data validation failures
 */

import { BaseCardTemplate, OG_COLORS } from './base-card-template';

export type ErrorCardType = 'not_found' | 'private' | 'server_error' | 'invalid_data';

interface ErrorCardProps {
  /**
   * Type of error to display
   */
  errorType: ErrorCardType;

  /**
   * Username that was requested (optional)
   */
  username?: string;

  /**
   * Custom error message (optional, overrides default)
   */
  message?: string;
}

/**
 * Get error details based on error type
 */
function getErrorDetails(
  errorType: ErrorCardType,
  username?: string
): { title: string; message: string; emoji: string } {
  switch (errorType) {
    case 'not_found':
      return {
        title: 'User Not Found',
        message: username
          ? `The user @${username} doesn't exist or hasn't set up their profile yet.`
          : "This user doesn't exist or hasn't set up their profile yet.",
        emoji: '🔍',
      };
    case 'private':
      return {
        title: 'Private Profile',
        message: username
          ? `@${username}'s profile is private and cannot be shared publicly.`
          : 'This profile is private and cannot be shared publicly.',
        emoji: '🔒',
      };
    case 'server_error':
      return {
        title: 'Something Went Wrong',
        message: 'Unable to generate stats image. Please try again later.',
        emoji: '⚠️',
      };
    case 'invalid_data':
      return {
        title: 'No Data Available',
        message: username
          ? `@${username} doesn't have enough activity data to display stats yet.`
          : "Not enough activity data to display stats yet.",
        emoji: '📊',
      };
    default:
      return {
        title: 'Error',
        message: 'An unexpected error occurred.',
        emoji: '❌',
      };
  }
}

/**
 * Error Card Template Component
 * Renders a visually appealing error state for OG images
 */
export function ErrorCardTemplate({ errorType, username, message }: ErrorCardProps) {
  const details = getErrorDetails(errorType, username);
  const displayMessage = message || details.message;

  return (
    <BaseCardTemplate
      title="burntop.dev"
      subtitle="Track your AI usage"
      showBranding={true}
      showEmberGlow={false}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          textAlign: 'center',
        }}
      >
        {/* Error Icon */}
        <div
          style={{
            fontSize: '120px',
            marginBottom: '32px',
            display: 'flex',
          }}
        >
          {details.emoji}
        </div>

        {/* Error Title */}
        <div
          style={{
            fontSize: '48px',
            fontWeight: 700,
            color: OG_COLORS.text.primary,
            marginBottom: '24px',
            display: 'flex',
          }}
        >
          {details.title}
        </div>

        {/* Error Message */}
        <div
          style={{
            fontSize: '28px',
            fontWeight: 400,
            color: OG_COLORS.text.secondary,
            maxWidth: '800px',
            lineHeight: 1.5,
            display: 'flex',
            flexDirection: 'column',
            textAlign: 'center',
          }}
        >
          {displayMessage}
        </div>

        {/* Call to action */}
        <div
          style={{
            marginTop: '48px',
            padding: '20px 40px',
            background: OG_COLORS.bg.elevated,
            borderRadius: '12px',
            border: `1px solid ${OG_COLORS.border.default}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: OG_COLORS.ember[500],
              display: 'flex',
            }}
          >
            Visit burntop.dev to get started
          </span>
        </div>
      </div>
    </BaseCardTemplate>
  );
}
