import { cn } from '@/lib/utils';

interface LeaderboardIllustrationProps {
  className?: string;
}

export function LeaderboardIllustration({ className }: LeaderboardIllustrationProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-auto', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rowHighlight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#FF6B00" stopOpacity="0.02" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0" />
          <stop offset="100%" stopColor="#0a0a0a" stopOpacity="1" />
        </linearGradient>
      </defs>

      <rect
        x="20"
        y="20"
        width="360"
        height="260"
        rx="12"
        fill="#0a0a0a"
        stroke="#2a2a2a"
        strokeWidth="1"
      />

      <g transform="translate(0, 55)">
        <text x="45" y="0" fill="#71717a" fontSize="11" fontWeight="500" textAnchor="middle">
          #
        </text>
        <text x="115" y="0" fill="#71717a" fontSize="11" fontWeight="500">
          User
        </text>
        <text x="280" y="0" fill="#71717a" fontSize="11" fontWeight="500" textAnchor="end">
          Tokens
        </text>
        <text x="360" y="0" fill="#71717a" fontSize="11" fontWeight="500" textAnchor="end">
          Cost
        </text>
      </g>

      <line x1="20" y1="68" x2="380" y2="68" stroke="#2a2a2a" strokeWidth="1" />

      <g transform="translate(0, 90)">
        <rect x="21" y="-21" width="358" height="42" fill="url(#rowHighlight)" />
        <line x1="21" y1="-21" x2="24" y2="21" stroke="#FF6B00" strokeWidth="2" />

        <text x="45" y="5" fill="#FFD700" fontSize="13" fontWeight="700" textAnchor="middle">
          1
        </text>

        <circle
          cx="85"
          cy="0"
          r="14"
          fill="#141414"
          stroke="#FFD700"
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />
        <text x="85" y="4" fill="#FFD700" fontSize="10" fontWeight="600" textAnchor="middle">
          AK
        </text>

        <text x="115" y="5" fill="#fafafa" fontSize="13" fontWeight="600">
          Alex K.
        </text>

        <text
          x="280"
          y="5"
          fill="#a1a1aa"
          fontSize="13"
          fontFamily="monospace"
          textAnchor="end"
          letterSpacing="-0.5"
        >
          145.2k
        </text>
        <text
          x="360"
          y="5"
          fill="#FF6B00"
          fontSize="13"
          fontFamily="monospace"
          fontWeight="700"
          textAnchor="end"
          letterSpacing="-0.5"
        >
          $4.20
        </text>
      </g>

      <line x1="20" y1="112" x2="380" y2="112" stroke="#2a2a2a" strokeWidth="1" opacity="0.5" />

      <g transform="translate(0, 132)">
        <text x="45" y="5" fill="#E8E8E8" fontSize="13" fontWeight="700" textAnchor="middle">
          2
        </text>

        <circle cx="85" cy="0" r="14" fill="#141414" stroke="#2a2a2a" strokeWidth="1" />
        <text x="85" y="4" fill="#a1a1aa" fontSize="10" fontWeight="500" textAnchor="middle">
          JD
        </text>

        <text x="115" y="5" fill="#e4e4e7" fontSize="13" fontWeight="500">
          Jordan D.
        </text>

        <text
          x="280"
          y="5"
          fill="#71717a"
          fontSize="13"
          fontFamily="monospace"
          textAnchor="end"
          letterSpacing="-0.5"
        >
          98.4k
        </text>
        <text
          x="360"
          y="5"
          fill="#FF8533"
          fontSize="13"
          fontFamily="monospace"
          fontWeight="500"
          textAnchor="end"
          letterSpacing="-0.5"
        >
          $2.95
        </text>
      </g>

      <line x1="20" y1="154" x2="380" y2="154" stroke="#2a2a2a" strokeWidth="1" opacity="0.5" />

      <g transform="translate(0, 174)">
        <text x="45" y="5" fill="#CD7F32" fontSize="13" fontWeight="700" textAnchor="middle">
          3
        </text>

        <circle cx="85" cy="0" r="14" fill="#141414" stroke="#2a2a2a" strokeWidth="1" />
        <text x="85" y="4" fill="#a1a1aa" fontSize="10" fontWeight="500" textAnchor="middle">
          MK
        </text>

        <text x="115" y="5" fill="#e4e4e7" fontSize="13" fontWeight="500">
          Maria K.
        </text>

        <text
          x="280"
          y="5"
          fill="#71717a"
          fontSize="13"
          fontFamily="monospace"
          textAnchor="end"
          letterSpacing="-0.5"
        >
          87.1k
        </text>
        <text
          x="360"
          y="5"
          fill="#FF8533"
          fontSize="13"
          fontFamily="monospace"
          fontWeight="500"
          textAnchor="end"
          letterSpacing="-0.5"
        >
          $2.61
        </text>
      </g>

      <line x1="20" y1="196" x2="380" y2="196" stroke="#2a2a2a" strokeWidth="1" opacity="0.5" />

      <g transform="translate(0, 216)">
        <text x="45" y="5" fill="#71717a" fontSize="13" fontWeight="600" textAnchor="middle">
          4
        </text>

        <circle cx="85" cy="0" r="14" fill="#141414" stroke="#2a2a2a" strokeWidth="1" />
        <text x="85" y="4" fill="#52525b" fontSize="10" fontWeight="500" textAnchor="middle">
          SR
        </text>

        <text x="115" y="5" fill="#d4d4d8" fontSize="13" fontWeight="400">
          Sam R.
        </text>

        <text
          x="280"
          y="5"
          fill="#71717a"
          fontSize="13"
          fontFamily="monospace"
          textAnchor="end"
          letterSpacing="-0.5"
        >
          65.3k
        </text>
        <text
          x="360"
          y="5"
          fill="#a1a1aa"
          fontSize="13"
          fontFamily="monospace"
          fontWeight="500"
          textAnchor="end"
          letterSpacing="-0.5"
        >
          $1.95
        </text>
      </g>

      <line x1="20" y1="238" x2="380" y2="238" stroke="#2a2a2a" strokeWidth="1" opacity="0.5" />

      <g transform="translate(0, 258)">
        <text x="45" y="5" fill="#71717a" fontSize="13" fontWeight="600" textAnchor="middle">
          5
        </text>

        <circle cx="85" cy="0" r="14" fill="#141414" stroke="#2a2a2a" strokeWidth="1" />
        <text x="85" y="4" fill="#52525b" fontSize="10" fontWeight="500" textAnchor="middle">
          PL
        </text>

        <text x="115" y="5" fill="#d4d4d8" fontSize="13" fontWeight="400">
          Paul L.
        </text>

        <text
          x="280"
          y="5"
          fill="#71717a"
          fontSize="13"
          fontFamily="monospace"
          textAnchor="end"
          letterSpacing="-0.5"
        >
          42.8k
        </text>
        <text
          x="360"
          y="5"
          fill="#a1a1aa"
          fontSize="13"
          fontFamily="monospace"
          fontWeight="500"
          textAnchor="end"
          letterSpacing="-0.5"
        >
          $1.28
        </text>
      </g>

      <rect x="21" y="270" width="358" height="10" fill="url(#bottomFade)" opacity="0.5" />
    </svg>
  );
}
