/**
 * Public Profile CTA Banner Component
 *
 * Sticky bottom banner encouraging non-authenticated visitors to sign up.
 * Shows personalized message with the profile username.
 */

import { Link } from '@tanstack/react-router';
import { ChevronRight, Flame } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PublicProfileCTABannerProps {
  /** Username of the profile being viewed */
  username: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Sticky CTA banner for public profile pages.
 *
 * Displays at bottom of viewport with backdrop blur effect.
 * Encourages visitors to sign up by referencing the profile they're viewing.
 */
export function PublicProfileCTABanner({ username, className }: PublicProfileCTABannerProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-40 bg-bg-elevated/95 backdrop-blur-lg border-t border-border-subtle',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left side: Message with Flame icon */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-ember-500 to-ember-600 shrink-0">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-base font-semibold text-text-primary">
                Track your AI usage like {username}
              </p>
              <p className="text-sm text-text-secondary">
                Join thousands of developers tracking their AI journey
              </p>
            </div>
          </div>

          {/* Right side: CTA button */}
          <Button asChild variant="ember" size="lg" className="shrink-0 gap-2">
            <Link to="/login" search={{ error: undefined, error_description: undefined }}>
              Get Started Free
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
