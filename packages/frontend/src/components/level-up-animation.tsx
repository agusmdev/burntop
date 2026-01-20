/**
 * Level-Up Animation Component
 *
 * Displays a celebratory animation when a user levels up.
 * Features particle effects, scale animation, and glow.
 *
 * @see Plan Phase 7.4 - Level UI
 */

import { TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

export interface LevelUpAnimationProps {
  /** The new level reached */
  level: number;
  /** Level title (e.g., "Apprentice", "Developer") */
  title: string;
  /** Whether the animation is currently showing */
  isVisible: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Duration of the animation in milliseconds */
  duration?: number;
}

/**
 * A celebratory animation displayed when a user levels up.
 *
 * Features:
 * - Particle burst effect
 * - Scale and glow animation
 * - Auto-dismisses after duration
 * - Ember-themed colors
 * - Smooth fade-in/fade-out transitions
 */
export function LevelUpAnimation({
  level,
  title,
  isVisible,
  onComplete,
  duration = 3000,
}: LevelUpAnimationProps) {
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; delay: number }>
  >([]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setIsAnimating(false);
      return;
    }

    // Start animation
    setIsAnimating(true);

    // Generate particles with random positions and delays
    // All random values computed here in useEffect to avoid hydration mismatch
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100 - 50, // -50 to 50
      y: Math.random() * 100 - 50, // -50 to 50
      delay: Math.random() * 0.2, // Animation delay in seconds
    }));
    setParticles(newParticles);

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      setIsAnimating(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [isVisible, duration, onComplete]);

  if (!isVisible && !isAnimating) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm transition-opacity duration-500',
        isAnimating ? 'opacity-100' : 'opacity-0'
      )}
      aria-live="assertive"
      role="alert"
    >
      {/* Main animation container */}
      <div
        className={cn(
          'relative flex flex-col items-center gap-4 transition-all duration-700',
          isAnimating ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        )}
      >
        {/* Particles */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute h-2 w-2 rounded-full bg-ember-500 animate-particle-burst"
            style={
              {
                '--particle-x': `${particle.x}vw`,
                '--particle-y': `${particle.y}vh`,
                animationDelay: `${particle.delay}s`,
              } as unknown as CSSProperties
            }
          />
        ))}

        {/* Icon with glow effect */}
        <div className="relative">
          <div className="absolute inset-0 animate-pulse-glow rounded-full bg-ember-500/30 blur-2xl" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-ember-500 to-ember-600 shadow-[0_0_60px_rgba(255,107,0,0.6)]">
            <TrendingUp className="h-12 w-12 text-white animate-bounce-in" strokeWidth={2.5} />
          </div>
        </div>

        {/* Level up text */}
        <div className="text-center space-y-2 animate-slide-up">
          <h2 className="text-5xl font-bold text-ember-500 drop-shadow-[0_0_20px_rgba(255,107,0,0.8)]">
            Level {level}!
          </h2>
          <p className="text-2xl font-semibold text-text-primary">{title}</p>
          <p className="text-sm text-text-secondary">You've leveled up!</p>
        </div>
      </div>

      <style>{`
        @keyframes particle-burst {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--particle-x), var(--particle-y)) scale(0);
            opacity: 0;
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.5;
          }
        }

        @keyframes bounce-in {
          0% {
            transform: scale(0) rotate(-180deg);
          }
          50% {
            transform: scale(1.2) rotate(10deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes slide-up {
          0% {
            transform: translateY(20px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-particle-burst {
          animation: particle-burst 1s ease-out forwards;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-bounce-in {
          animation: bounce-in 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out 0.3s backwards;
        }
      `}</style>
    </div>
  );
}
