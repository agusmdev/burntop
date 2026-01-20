import { useState, useCallback } from 'react';

import type { NavItem } from '@/components/sidebar';
import type { TopNavUser } from '@/components/top-nav';
import type { ReactNode } from 'react';

import { MobileNav } from '@/components/mobile-nav';
import { Sidebar, SidebarSkeleton } from '@/components/sidebar';
import { TopNav, TopNavSkeleton } from '@/components/top-nav';
import { cn } from '@/lib/utils';

export interface DashboardLayoutProps {
  /** Main content to render in the dashboard */
  children: ReactNode;
  /** Current user data, undefined if not logged in */
  user?: TopNavUser;
  /** Custom navigation items for the sidebar */
  navItems?: NavItem[];
  /** Show the search input in the top nav (desktop only) */
  showSearch?: boolean;
  /** Callback when sign in is clicked */
  onSignIn?: () => void;
  /** Callback when sign out is clicked */
  onSignOut?: () => void;
  /** Additional CSS classes for the outer wrapper */
  className?: string;
  /** Additional CSS classes for the main content area */
  contentClassName?: string;
}

/**
 * Dashboard layout component that combines Sidebar and TopNav.
 *
 * Features:
 * - Responsive sidebar (hidden on mobile, visible on desktop)
 * - Mobile navigation drawer with Sheet component (focus trap, keyboard nav, Escape to close)
 * - Consistent header with user menu and notifications
 * - Flexible content area that fills available space
 *
 * @example
 * ```tsx
 * <DashboardLayout user={currentUser} onSignOut={handleSignOut}>
 *   <PageLayout>
 *     <PageHeader title="Dashboard" />
 *     <DashboardContent />
 *   </PageLayout>
 * </DashboardLayout>
 * ```
 */
export function DashboardLayout({
  children,
  user,
  navItems,
  showSearch,
  onSignIn,
  onSignOut,
  className,
  contentClassName,
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <div className={cn('flex h-screen overflow-hidden bg-bg-base', className)}>
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar navItems={navItems} user={user} onSignIn={onSignIn} onSignOut={onSignOut} />
      </div>

      {/* Mobile Navigation Drawer */}
      <MobileNav
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        navItems={navItems}
        user={user}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navigation */}
        <TopNav
          user={user}
          onMobileMenuToggle={handleMobileMenuToggle}
          mobileMenuOpen={mobileMenuOpen}
          showSearch={showSearch}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
        />

        {/* Page Content */}
        <main className={cn('flex-1 overflow-y-auto', contentClassName)}>{children}</main>
      </div>
    </div>
  );
}

export interface DashboardLayoutSkeletonProps {
  /** Show the search input skeleton in the top nav */
  showSearch?: boolean;
  /** Additional CSS classes for the outer wrapper */
  className?: string;
  /** Additional CSS classes for the main content area */
  contentClassName?: string;
  /** Content skeleton to render inside */
  children?: ReactNode;
}

/**
 * Skeleton loader for the DashboardLayout component.
 * Use this when authentication or user data is loading to prevent layout shift.
 */
export function DashboardLayoutSkeleton({
  showSearch = false,
  className,
  contentClassName,
  children,
}: DashboardLayoutSkeletonProps) {
  return (
    <div className={cn('flex h-screen overflow-hidden bg-bg-base', className)}>
      {/* Desktop Sidebar Skeleton */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <SidebarSkeleton />
      </div>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navigation Skeleton */}
        <TopNavSkeleton showSearch={showSearch} />

        {/* Page Content Skeleton */}
        <main className={cn('flex-1 overflow-y-auto', contentClassName)}>
          {children || (
            <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
              {/* Header skeleton */}
              <div className="space-y-2">
                <div className="h-8 w-48 animate-pulse rounded bg-bg-subtle sm:h-9 sm:w-64" />
                <div className="h-4 w-64 animate-pulse rounded bg-bg-subtle sm:h-5 sm:w-80" />
              </div>
              {/* Content skeleton */}
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="h-6 w-32 animate-pulse rounded bg-bg-subtle" />
                  <div className="rounded-xl border border-border-default bg-bg-elevated p-6">
                    <div className="space-y-3">
                      <div className="h-4 w-full animate-pulse rounded bg-bg-subtle" />
                      <div className="h-4 w-3/4 animate-pulse rounded bg-bg-subtle" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-bg-subtle" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
