/**
 * Base Card Template for OG Image Generation
 *
 * This component serves as the foundation for all OG image cards.
 * It provides consistent layout, branding, and styling that can be
 * customized for different card types (stats, achievements, weekly recap, etc.)
 *
 * Satori constraints:
 * - Only supports a subset of CSS (flexbox, no grid)
 * - No external stylesheets, all styles must be inline
 * - Limited font support (must load fonts explicitly)
 * - Dimensions: 1200x630px (standard OG image size)
 */

import type React from 'react';

interface BaseCardTemplateProps {
  /**
   * Main content area - this is where card-specific content goes
   */
  children: React.ReactNode;

  /**
   * Optional title displayed at the top of the card
   */
  title?: string;

  /**
   * Optional subtitle or description
   */
  subtitle?: string;

  /**
   * Show burntop.dev branding footer
   * @default true
   */
  showBranding?: boolean;

  /**
   * Custom background gradient colors
   * @default ['#0A0A0A', '#0F0F0F']
   */
  backgroundGradient?: [string, string];

  /**
   * Show decorative ember glow effect
   * @default true
   */
  showEmberGlow?: boolean;

  /**
   * Show subtle noise/grain texture overlay
   * @default false
   */
  showTexture?: boolean;
}

/**
 * Design tokens matching the burntop.dev design system
 */
const COLORS = {
  ember: {
    500: '#FF6B00',
    600: '#EA580C',
    700: '#C2410C',
  },
  bg: {
    base: '#0A0A0A',
    elevated: '#0F0F0F',
    surface: '#141414',
  },
  text: {
    primary: '#FAFAFA',
    secondary: '#A1A1A1',
    tertiary: '#6B6B6B',
  },
  border: {
    default: '#2A2A2A',
    prominent: '#3A3A3A',
  },
} as const;

/**
 * Standard OG image dimensions
 */
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

export function BaseCardTemplate({
  children,
  title,
  subtitle,
  showBranding = true,
  backgroundGradient = [COLORS.bg.base, COLORS.bg.elevated],
  showEmberGlow = true,
  showTexture = false,
}: BaseCardTemplateProps) {
  return (
    <div
      style={{
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(135deg, ${backgroundGradient[0]} 0%, ${backgroundGradient[1]} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Multi-layered decorative glow effects */}
      {showEmberGlow && (
        <>
          {/* Primary ember glow - top right */}
          <div
            style={{
              position: 'absolute',
              top: '-20%',
              right: '-10%',
              width: '600px',
              height: '600px',
              background: `radial-gradient(circle, ${COLORS.ember[500]}12 0%, transparent 60%)`,
              filter: 'blur(80px)',
              pointerEvents: 'none',
            }}
          />
          {/* Secondary glow - bottom left */}
          <div
            style={{
              position: 'absolute',
              bottom: '-15%',
              left: '-5%',
              width: '500px',
              height: '500px',
              background: `radial-gradient(circle, ${COLORS.ember[600]}08 0%, transparent 65%)`,
              filter: 'blur(70px)',
              pointerEvents: 'none',
            }}
          />
          {/* Accent glow - center */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '800px',
              height: '400px',
              background: `radial-gradient(ellipse, ${COLORS.ember[500]}05 0%, transparent 70%)`,
              filter: 'blur(100px)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* Texture overlay (subtle noise) */}
      {showTexture && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.08,
            pointerEvents: 'none',
          }}
        >
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      )}

      {/* Content container with padding */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '60px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header section */}
        {(title || subtitle) && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginBottom: '40px',
            }}
          >
            {title && (
              <h1
                style={{
                  fontSize: '56px',
                  fontWeight: 700,
                  color: COLORS.text.primary,
                  margin: 0,
                  marginBottom: subtitle ? '12px' : 0,
                  lineHeight: 1.2,
                }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: '28px',
                  fontWeight: 400,
                  color: COLORS.text.secondary,
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Main content area */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
          }}
        >
          {children}
        </div>

        {/* Footer branding */}
        {showBranding && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '40px',
              paddingTop: '24px',
              borderTop: `1px solid ${COLORS.border.default}`,
            }}
          >
            {/* Logo and brand name */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {/* Ember flame icon */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  background: COLORS.ember[500],
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                🔥
              </div>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: COLORS.text.primary,
                }}
              >
                burntop.dev
              </span>
            </div>

            {/* Tagline */}
            <span
              style={{
                fontSize: '18px',
                color: COLORS.text.tertiary,
              }}
            >
              Track your AI usage
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Export dimensions for use in API routes
 */
export const OG_IMAGE_DIMENSIONS = {
  width: OG_IMAGE_WIDTH,
  height: OG_IMAGE_HEIGHT,
} as const;

/**
 * Export color palette for use in card variants
 */
export { COLORS as OG_COLORS };
