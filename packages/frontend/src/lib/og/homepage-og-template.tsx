/**
 * Homepage OG Image Template
 *
 * Static OG image for burntop.dev homepage.
 * Showcases the brand, value proposition, and key features.
 *
 * Dimensions: 1200x630px (standard OG image size)
 */

/**
 * Design tokens matching the burntop.dev design system
 */
const COLORS = {
  ember: {
    400: '#FF8533',
    500: '#FF6B00',
    600: '#EA580C',
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
  },
} as const;

/**
 * Homepage OG Image Template
 *
 * Features:
 * - Large brand name with flame icon
 * - Tagline/value proposition
 * - Key feature highlights
 * - Clean, dark design matching the site
 */
export function HomepageOGTemplate() {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(135deg, ${COLORS.bg.base} 0%, ${COLORS.bg.elevated} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative glow effects */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '700px',
          height: '700px',
          background: `radial-gradient(circle, ${COLORS.ember[500]}15 0%, transparent 60%)`,
          filter: 'blur(80px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          left: '-5%',
          width: '600px',
          height: '600px',
          background: `radial-gradient(circle, ${COLORS.ember[600]}10 0%, transparent 65%)`,
          filter: 'blur(70px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '30%',
          width: '900px',
          height: '500px',
          background: `radial-gradient(ellipse, ${COLORS.ember[500]}08 0%, transparent 70%)`,
          filter: 'blur(100px)',
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '60px 70px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo and brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '50px',
          }}
        >
          {/* Flame icon box */}
          <div
            style={{
              width: '72px',
              height: '72px',
              background: `linear-gradient(135deg, ${COLORS.ember[500]} 0%, ${COLORS.ember[600]} 100%)`,
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              boxShadow: `0 0 40px ${COLORS.ember[500]}50`,
            }}
          >
            🔥
          </div>
          <span
            style={{
              fontSize: '56px',
              fontWeight: 700,
              color: COLORS.text.primary,
              letterSpacing: '-1px',
            }}
          >
            burntop.dev
          </span>
        </div>

        {/* Main headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '50px',
          }}
        >
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 700,
              color: COLORS.text.primary,
              margin: 0,
              lineHeight: 1.1,
              letterSpacing: '-2px',
            }}
          >
            Track Your AI Usage.
          </h1>
          <h2
            style={{
              fontSize: '72px',
              fontWeight: 700,
              background: `linear-gradient(90deg, ${COLORS.ember[400]} 0%, ${COLORS.ember[500]} 50%, ${COLORS.ember[600]} 100%)`,
              backgroundClip: 'text',
              color: 'transparent',
              margin: 0,
              lineHeight: 1.1,
              letterSpacing: '-2px',
            }}
          >
            Share Your Progress.
          </h2>
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 24px',
              background: COLORS.bg.surface,
              border: `1px solid ${COLORS.border.default}`,
              borderRadius: '50px',
            }}
          >
            <span style={{ fontSize: '22px' }}>⚡</span>
            <span style={{ fontSize: '20px', color: COLORS.text.secondary, fontWeight: 500 }}>
              Claude, Cursor, ChatGPT & more
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 24px',
              background: COLORS.bg.surface,
              border: `1px solid ${COLORS.border.default}`,
              borderRadius: '50px',
            }}
          >
            <span style={{ fontSize: '22px' }}>🏆</span>
            <span style={{ fontSize: '20px', color: COLORS.text.secondary, fontWeight: 500 }}>
              Leaderboards & Achievements
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 24px',
              background: COLORS.bg.surface,
              border: `1px solid ${COLORS.border.default}`,
              borderRadius: '50px',
            }}
          >
            <span style={{ fontSize: '22px' }}>📊</span>
            <span style={{ fontSize: '20px', color: COLORS.text.secondary, fontWeight: 500 }}>
              Analytics & Insights
            </span>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '24px',
            borderTop: `1px solid ${COLORS.border.default}`,
          }}
        >
          <span style={{ fontSize: '22px', color: COLORS.text.tertiary }}>Free & Open Source</span>
          <span style={{ fontSize: '22px', color: COLORS.text.tertiary }}>bunx burntop sync</span>
        </div>
      </div>
    </div>
  );
}
