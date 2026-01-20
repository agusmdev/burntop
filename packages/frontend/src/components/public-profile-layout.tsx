/**
 * Public Profile Layout Component
 *
 * A layout for public profile views (non-authenticated visitors).
 * Uses AuthAwareHeader instead of sidebar + provides footer slot for CTA banner.
 */

import type { ReactNode } from 'react';

import { AuthAwareHeader } from '@/components/auth-aware-header';

export interface PublicProfileLayoutProps {
  /** Child content to render in main area */
  children: ReactNode;
  /** Username for the profile being viewed */
  username: string;
}

/**
 * Layout component for public profile pages.
 *
 * Displays AuthAwareHeader at top, main content in middle, and footer slot at bottom.
 * Uses flex layout to push footer to bottom of viewport.
 */
export function PublicProfileLayout({ children }: PublicProfileLayoutProps) {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Header with auth-aware CTA */}
      <AuthAwareHeader />

      {/* Main content area - flex-1 pushes footer to bottom */}
      <main className="flex-1">{children}</main>

      {/* Footer slot - CTA banner will be rendered here by parent */}
    </div>
  );
}
