import { cn } from '@/lib/utils';

interface FeaturesIllustrationProps {
  className?: string;
}

export function DashboardIllustration({ className }: FeaturesIllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-auto', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dashEmber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B00" />
          <stop offset="100%" stopColor="#FF8A00" />
        </linearGradient>
      </defs>

      <rect x="10" y="10" width="180" height="140" rx="12" fill="#141414" stroke="#2a2a2a" />

      <rect x="10" y="10" width="180" height="32" rx="12" fill="#1a1a1a" />
      <rect x="10" y="30" width="180" height="12" fill="#1a1a1a" />
      <circle cx="28" cy="26" r="4" fill="#ef4444" />
      <circle cx="42" cy="26" r="4" fill="#eab308" />
      <circle cx="56" cy="26" r="4" fill="#22c55e" />

      <rect x="22" y="54" width="50" height="36" rx="6" fill="#1a1a1a" />
      <rect x="22" y="62" width="30" height="4" rx="2" fill="#3a3a3a" />
      <rect x="22" y="74" width="40" height="8" rx="2" fill="url(#dashEmber)" opacity="0.8" />

      <rect x="80" y="54" width="50" height="36" rx="6" fill="#1a1a1a" />
      <rect x="80" y="62" width="30" height="4" rx="2" fill="#3a3a3a" />
      <rect x="80" y="74" width="35" height="8" rx="2" fill="#22c55e" opacity="0.8" />

      <rect x="138" y="54" width="50" height="36" rx="6" fill="#1a1a1a" />
      <rect x="138" y="62" width="30" height="4" rx="2" fill="#3a3a3a" />
      <rect x="138" y="74" width="38" height="8" rx="2" fill="#3b82f6" opacity="0.8" />

      <rect x="22" y="100" width="166" height="40" rx="6" fill="#1a1a1a" />
      <path
        d="M32 130 Q50 125, 65 120 T100 115 T135 105 T178 100"
        stroke="url(#dashEmber)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M32 130 Q50 125, 65 120 T100 115 T135 105 T178 100 V130 H32 Z"
        fill="url(#dashEmber)"
        opacity="0.15"
      />
    </svg>
  );
}

export function TrophyIllustration({ className }: FeaturesIllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-auto', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="leaderboardEmber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B00" />
          <stop offset="100%" stopColor="#FF8A00" />
        </linearGradient>
        <linearGradient id="leaderboardGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFA500" />
        </linearGradient>
      </defs>

      <rect x="25" y="15" width="150" height="130" rx="12" fill="#141414" stroke="#2a2a2a" />

      <rect x="25" y="15" width="150" height="30" rx="12" fill="#1a1a1a" />
      <rect x="25" y="35" width="150" height="10" fill="#1a1a1a" />
      <circle cx="40" cy="30" r="3" fill="#3a3a3a" />
      <rect x="50" y="27" width="40" height="6" rx="2" fill="#3a3a3a" />

      <rect
        x="35"
        y="55"
        width="130"
        height="24"
        rx="4"
        fill="#1a1a1a"
        stroke="#2a2a2a"
        strokeOpacity="0.5"
      />
      <text x="48" y="72" fontSize="12" fontWeight="bold" fill="#FFD700" textAnchor="middle">
        1
      </text>
      <circle cx="68" cy="67" r="7" fill="#2a2a2a" stroke="#FFD700" strokeWidth="1" />
      <rect x="85" y="64" width="65" height="6" rx="2" fill="url(#leaderboardGold)" />

      <rect x="35" y="85" width="130" height="24" rx="4" fill="#1a1a1a" />
      <text x="48" y="102" fontSize="12" fontWeight="bold" fill="#C0C0C0" textAnchor="middle">
        2
      </text>
      <circle cx="68" cy="97" r="7" fill="#2a2a2a" />
      <rect x="85" y="94" width="50" height="6" rx="2" fill="#3a3a3a" />

      <rect x="35" y="115" width="130" height="24" rx="4" fill="#1a1a1a" />
      <text x="48" y="132" fontSize="12" fontWeight="bold" fill="#CD7F32" textAnchor="middle">
        3
      </text>
      <circle cx="68" cy="127" r="7" fill="#2a2a2a" />
      <rect x="85" y="124" width="40" height="6" rx="2" fill="#3a3a3a" />
    </svg>
  );
}

export function AchievementIllustration({ className }: FeaturesIllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-auto', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="achieveEmber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B00" />
          <stop offset="100%" stopColor="#FF8A00" />
        </linearGradient>
        <radialGradient id="achieveGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FF6B00" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="80" rx="60" ry="50" fill="url(#achieveGlow)" />

      <circle cx="100" cy="75" r="45" fill="#141414" stroke="url(#achieveEmber)" strokeWidth="4" />
      <circle cx="100" cy="75" r="35" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="2" />

      <path
        d="M100 45 L107 65 L128 68 L113 81 L117 102 L100 92 L83 102 L87 81 L72 68 L93 65 Z"
        fill="url(#achieveEmber)"
      />

      <path d="M70 110 L85 130 L85 145 L70 135 Z" fill="#FF6B00" />
      <path d="M130 110 L115 130 L115 145 L130 135 Z" fill="#FF8A00" />

      <circle cx="40" cy="45" r="15" fill="#141414" stroke="#22c55e" strokeWidth="2" />
      <text x="40" y="50" textAnchor="middle" fill="#22c55e" fontSize="14">
        ✓
      </text>

      <circle cx="160" cy="50" r="12" fill="#141414" stroke="#3b82f6" strokeWidth="2" />
      <text x="160" y="55" textAnchor="middle" fill="#3b82f6" fontSize="11">
        ★
      </text>

      <circle cx="155" cy="115" r="10" fill="#141414" stroke="#eab308" strokeWidth="2" />
      <text x="155" y="119" textAnchor="middle" fill="#eab308" fontSize="10">
        🔥
      </text>
    </svg>
  );
}

export function AnalyticsIllustration({ className }: FeaturesIllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-auto', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="analyticsEmber" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FF8A00" />
        </linearGradient>
      </defs>

      <rect x="15" y="15" width="170" height="130" rx="12" fill="#141414" stroke="#2a2a2a" />

      <rect
        x="35"
        y="100"
        width="20"
        height="30"
        rx="3"
        fill="url(#analyticsEmber)"
        opacity="0.5"
      />
      <rect
        x="65"
        y="80"
        width="20"
        height="50"
        rx="3"
        fill="url(#analyticsEmber)"
        opacity="0.65"
      />
      <rect x="95" y="55" width="20" height="75" rx="3" fill="url(#analyticsEmber)" opacity="0.8" />
      <rect x="125" y="35" width="20" height="95" rx="3" fill="url(#analyticsEmber)" />
      <rect
        x="155"
        y="60"
        width="20"
        height="70"
        rx="3"
        fill="url(#analyticsEmber)"
        opacity="0.75"
      />

      <path
        d="M45 95 L75 75 L105 50 L135 30 L165 55"
        stroke="#FF6B00"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <circle cx="45" cy="95" r="4" fill="#FF6B00" />
      <circle cx="75" cy="75" r="4" fill="#FF6B00" />
      <circle cx="105" cy="50" r="4" fill="#FF6B00" />
      <circle cx="135" cy="30" r="5" fill="#FF6B00" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="165" cy="55" r="4" fill="#FF6B00" />
    </svg>
  );
}

export function ShareIllustration({ className }: FeaturesIllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-auto', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="shareEmber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B00" />
          <stop offset="100%" stopColor="#FF8A00" />
        </linearGradient>
      </defs>

      <rect x="25" y="25" width="150" height="110" rx="10" fill="#141414" stroke="#2a2a2a" />

      <circle cx="55" cy="55" r="18" fill="#1a1a1a" stroke="url(#shareEmber)" strokeWidth="2" />
      <text x="55" y="60" textAnchor="middle" fill="#fafafa" fontSize="12">
        JD
      </text>

      <rect x="82" y="45" width="70" height="8" rx="2" fill="#3a3a3a" />
      <rect x="82" y="58" width="50" height="6" rx="2" fill="#2a2a2a" />

      <rect x="40" y="85" width="40" height="30" rx="4" fill="#1a1a1a" />
      <rect x="45" y="92" width="30" height="4" rx="1" fill="#3a3a3a" />
      <rect x="45" y="102" width="25" height="6" rx="1" fill="url(#shareEmber)" />

      <rect x="90" y="85" width="40" height="30" rx="4" fill="#1a1a1a" />
      <rect x="95" y="92" width="30" height="4" rx="1" fill="#3a3a3a" />
      <rect x="95" y="102" width="20" height="6" rx="1" fill="#22c55e" />

      <circle cx="180" cy="40" r="12" fill="#1a1a1a" stroke="url(#shareEmber)" strokeWidth="2" />
      <circle cx="185" cy="100" r="10" fill="#1a1a1a" stroke="#3b82f6" strokeWidth="2" />
      <circle cx="15" cy="80" r="10" fill="#1a1a1a" stroke="#22c55e" strokeWidth="2" />

      <line
        x1="172"
        y1="48"
        x2="150"
        y2="65"
        stroke="url(#shareEmber)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <line
        x1="178"
        y1="92"
        x2="155"
        y2="85"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeDasharray="4 4"
        opacity="0.6"
      />
      <line
        x1="25"
        y="80"
        x2="45"
        y2="80"
        stroke="#22c55e"
        strokeWidth="2"
        strokeDasharray="4 4"
        opacity="0.6"
      />
    </svg>
  );
}

export function WrappedIllustration({ className }: FeaturesIllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-auto', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wrappedEmber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B00" />
          <stop offset="100%" stopColor="#FF8A00" />
        </linearGradient>
        <radialGradient id="wrappedGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FF6B00" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="80" rx="80" ry="60" fill="url(#wrappedGlow)" />

      <rect
        x="35"
        y="25"
        width="130"
        height="110"
        rx="12"
        fill="#141414"
        stroke="url(#wrappedEmber)"
        strokeWidth="2"
      />

      <rect x="35" y="25" width="130" height="30" rx="12" fill="url(#wrappedEmber)" />
      <rect x="35" y="43" width="130" height="12" fill="url(#wrappedEmber)" />
      <text x="100" y="46" textAnchor="middle" fill="#0a0a0a" fontSize="14" fontWeight="700">
        2025 Wrapped
      </text>

      <rect x="50" y="68" width="45" height="25" rx="4" fill="#1a1a1a" />
      <text x="72" y="85" textAnchor="middle" fill="#FF6B00" fontSize="12" fontWeight="600">
        1.2B
      </text>

      <rect x="105" y="68" width="45" height="25" rx="4" fill="#1a1a1a" />
      <text x="127" y="85" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="600">
        365d
      </text>

      <rect x="50" y="100" width="100" height="25" rx="4" fill="#1a1a1a" />
      <text x="100" y="117" textAnchor="middle" fill="#fafafa" fontSize="11" fontWeight="600">
        Your Year in AI
      </text>

      <rect
        x="20"
        y="40"
        width="6"
        height="6"
        rx="1"
        fill="#FF6B00"
        opacity="0.8"
        transform="rotate(20 23 43)"
      />
      <rect
        x="175"
        y="35"
        width="5"
        height="5"
        rx="1"
        fill="#22c55e"
        opacity="0.7"
        transform="rotate(-15 177 37)"
      />
      <rect
        x="25"
        y="120"
        width="4"
        height="4"
        rx="1"
        fill="#3b82f6"
        opacity="0.6"
        transform="rotate(35 27 122)"
      />
      <rect
        x="170"
        y="110"
        width="5"
        height="5"
        rx="1"
        fill="#FF8A00"
        opacity="0.8"
        transform="rotate(-25 172 112)"
      />

      <circle cx="15" cy="60" r="2" fill="#FFD700" opacity="0.6" />
      <circle cx="185" cy="75" r="2.5" fill="#FF6B00" opacity="0.7" />
    </svg>
  );
}
