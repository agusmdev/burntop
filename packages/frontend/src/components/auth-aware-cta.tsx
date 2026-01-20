/**
 * Auth-Aware CTA Component
 *
 * Call-to-action buttons that adapt to authentication state.
 * - Shows "Get Started Free" for unauthenticated users (links to /login)
 * - Shows "Go to Dashboard" for authenticated users (links to /dashboard)
 * - Uses skeleton loader during auth check to prevent layout shift
 */

import { Link } from '@tanstack/react-router';
import { ChevronRight, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/lib/auth/client';
import { cn } from '@/lib/utils';

export interface AuthAwareCTAProps {
  /** Button size variant */
  size?: 'default' | 'sm' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Auth-aware primary CTA button for hero sections.
 *
 * Automatically detects authentication state and shows:
 * - "Get Started Free" → /login for guests
 * - "Go to Dashboard" → /dashboard for authenticated users
 * - Skeleton during loading to prevent layout shift
 *
 * Always includes a secondary "View Leaderboard" button.
 */
export function AuthAwareCTA({ size = 'xl', className }: AuthAwareCTAProps) {
  const { user, isLoading } = useUser();

  return (
    <div className={cn('flex flex-col sm:flex-row gap-4 items-center', className)}>
      {isLoading ? (
        // Loading skeleton - same size as button to prevent layout shift
        <Skeleton className="h-12 w-[220px] rounded-md" />
      ) : user ? (
        // Authenticated: Show "Go to Dashboard"
        <Button asChild variant="ember" size={size}>
          <Link to="/dashboard">
            Go to Dashboard
            <ChevronRight className="w-5 h-5" />
          </Link>
        </Button>
      ) : (
        // Unauthenticated: Show "Get Started Free"
        <Button asChild variant="ember" size={size}>
          <Link to="/login" search={{ error: undefined, error_description: undefined }}>
            Get Started Free
            <ChevronRight className="w-5 h-5" />
          </Link>
        </Button>
      )}

      {/* Secondary CTA - always visible */}
      {!isLoading && (
        <Button asChild variant="ember-outline" size={size}>
          <Link to="/leaderboard" search={{ period: 'all-time' }}>
            View Leaderboard
            <Trophy className="w-5 h-5" />
          </Link>
        </Button>
      )}
    </div>
  );
}

export interface AuthAwareSimpleCTAProps {
  /** Button size variant */
  size?: 'default' | 'sm' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
  /** Custom text for authenticated state (default: "Go to Dashboard") */
  authenticatedText?: string;
  /** Custom text for unauthenticated state (default: "Start Tracking for Free") */
  unauthenticatedText?: string;
}

/**
 * Simple auth-aware CTA button (single button, no secondary).
 *
 * Use this for simpler CTAs that don't need the "View Leaderboard" button.
 */
export function AuthAwareSimpleCTA({
  size = 'xl',
  className,
  authenticatedText = 'Go to Dashboard',
  unauthenticatedText = 'Start Tracking for Free',
}: AuthAwareSimpleCTAProps) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    // Loading skeleton - same size as button to prevent layout shift
    return <Skeleton className={cn('h-12 w-[240px] rounded-md', className)} />;
  }

  if (user) {
    // Authenticated: Show dashboard link
    return (
      <Button asChild variant="ember" size={size} className={className}>
        <Link to="/dashboard">
          {authenticatedText}
          <ChevronRight className="w-5 h-5" />
        </Link>
      </Button>
    );
  }

  // Unauthenticated: Show sign up link
  return (
    <Button asChild variant="ember" size={size} className={className}>
      <Link to="/login" search={{ error: undefined, error_description: undefined }}>
        {unauthenticatedText}
        <ChevronRight className="w-5 h-5" />
      </Link>
    </Button>
  );
}
