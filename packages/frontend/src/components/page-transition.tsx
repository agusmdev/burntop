'use client';

import { useEffect, useState } from 'react';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface PageTransitionProps {
  /** Page content to animate */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Page transition wrapper component that applies fade-in and slide-up animations
 * when the page mounts.
 *
 * Uses CSS animations for optimal performance without requiring additional
 * animation libraries.
 *
 * @example
 * ```tsx
 * <PageTransition>
 *   <PageLayout>
 *     <PageHeader title="Dashboard" />
 *     <DashboardContent />
 *   </PageLayout>
 * </PageTransition>
 * ```
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    setMounted(true);
  }, []);

  return (
    <div
      className={cn(
        'page-transition',
        mounted ? 'page-transition-enter' : 'page-transition-initial',
        className
      )}
    >
      {children}
    </div>
  );
}
