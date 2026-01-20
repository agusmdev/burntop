/**
 * Profile Signup CTA Component
 *
 * Call-to-action card encouraging non-authenticated visitors to sign up.
 * Displays after profile content with feature highlights.
 */

import { Link } from '@tanstack/react-router';
import { Flame, TrendingUp, Trophy, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ProfileSignupCTAProps {
  /** Username of the profile being viewed */
  username: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Signup CTA card for public profile pages.
 *
 * Encourages visitors to sign up by highlighting key features
 * and personalizing the message with the profile username.
 */
export function ProfileSignupCTA({ username, className }: ProfileSignupCTAProps) {
  return (
    <Card
      className={cn(
        'p-8 md:p-10 text-center bg-gradient-to-br from-ember-500/10 via-bg-elevated to-ember-600/5 border-ember-500/20',
        className
      )}
    >
      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-ember-500 to-ember-600 shadow-lg shadow-ember-500/30">
          <Flame className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Heading */}
      <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-3">
        Track Your AI Journey
      </h2>

      {/* Description */}
      <p className="text-text-secondary text-base md:text-lg mb-6 max-w-xl mx-auto">
        Join {username} and thousands of developers tracking their AI usage, earning achievements,
        and climbing the leaderboards.
      </p>

      {/* Feature Badges */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-bg-surface/80 border border-border-subtle">
          <Zap className="w-4 h-4 text-ember-500" />
          <span className="text-sm font-medium text-text-primary">Track tokens & costs</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-bg-surface/80 border border-border-subtle">
          <Trophy className="w-4 h-4 text-ember-500" />
          <span className="text-sm font-medium text-text-primary">Earn achievements</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-bg-surface/80 border border-border-subtle">
          <TrendingUp className="w-4 h-4 text-ember-500" />
          <span className="text-sm font-medium text-text-primary">Climb leaderboards</span>
        </div>
      </div>

      {/* CTA Button */}
      <Button asChild variant="ember" size="lg" className="min-w-[200px]">
        <Link to="/login" search={{ error: undefined, error_description: undefined }}>
          Get Started Free
        </Link>
      </Button>
    </Card>
  );
}
