import type { ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Optional action buttons to display on the right */
  actions?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Page header with title, optional description, and actions.
 * Used at the top of page content areas.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-text-secondary sm:text-base">{description}</p>
        )}
      </div>
      {actions && <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">{actions}</div>}
    </div>
  );
}

export interface PageHeaderSkeletonProps {
  /** Show description skeleton */
  showDescription?: boolean;
  /** Show actions skeleton */
  showActions?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton loader for PageHeader component.
 */
export function PageHeaderSkeleton({
  showDescription = true,
  showActions = false,
  className,
}: PageHeaderSkeletonProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 sm:h-9 sm:w-64" />
        {showDescription && <Skeleton className="h-4 w-64 sm:h-5 sm:w-80" />}
      </div>
      {showActions && (
        <div className="mt-3 flex gap-2 sm:mt-0">
          <Skeleton className="h-9 w-24" />
        </div>
      )}
    </div>
  );
}

export interface PageSectionProps {
  /** Section title */
  title?: string;
  /** Optional description for the section */
  description?: string;
  /** Section content */
  children: ReactNode;
  /** Additional CSS classes for the section wrapper */
  className?: string;
  /** Additional CSS classes for the content area */
  contentClassName?: string;
}

/**
 * A section within a page with optional title and description.
 * Provides consistent spacing and styling for content sections.
 */
export function PageSection({
  title,
  description,
  children,
  className,
  contentClassName,
}: PageSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || description) && (
        <div>
          {title && <h2 className="text-lg font-semibold text-text-primary sm:text-xl">{title}</h2>}
          {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

export type PageLayoutVariant = 'default' | 'wide' | 'full';

export interface PageLayoutProps {
  /** Page content */
  children: ReactNode;
  /** Layout variant controlling max-width */
  variant?: PageLayoutVariant;
  /** Additional CSS classes for the outer wrapper */
  className?: string;
  /** Additional CSS classes for the content container */
  contentClassName?: string;
}

const variantStyles: Record<PageLayoutVariant, string> = {
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
  full: 'max-w-none',
};

/**
 * Page layout wrapper component providing consistent spacing and max-width constraints.
 *
 * Use this component to wrap page content for consistent layout across the app.
 *
 * @example
 * ```tsx
 * <PageLayout>
 *   <PageHeader title="Dashboard" description="Your AI usage overview" />
 *   <PageSection title="Stats">
 *     <StatsCard />
 *   </PageSection>
 * </PageLayout>
 * ```
 */
export function PageLayout({
  children,
  variant = 'default',
  className,
  contentClassName,
}: PageLayoutProps) {
  return (
    <div className={cn('min-h-full w-full bg-bg-base', className)}>
      <div
        className={cn(
          'mx-auto space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8',
          variantStyles[variant],
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface PageLayoutSkeletonProps {
  /** Layout variant controlling max-width */
  variant?: PageLayoutVariant;
  /** Number of content sections to show */
  sections?: number;
  /** Show page header skeleton */
  showHeader?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton loader for PageLayout component.
 * Use this when page data is loading to prevent layout shift.
 */
export function PageLayoutSkeleton({
  variant = 'default',
  sections = 2,
  showHeader = true,
  className,
}: PageLayoutSkeletonProps) {
  return (
    <div className={cn('min-h-full w-full bg-bg-base', className)}>
      <div
        className={cn(
          'mx-auto space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8',
          variantStyles[variant]
        )}
      >
        {showHeader && <PageHeaderSkeleton />}
        {Array.from({ length: sections }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="rounded-xl border border-border-default bg-bg-elevated p-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Content card wrapper with consistent styling.
 * Use inside PageSection for elevated content areas.
 */
export interface PageCardProps {
  /** Card content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function PageCard({ children, className }: PageCardProps) {
  return (
    <div
      className={cn('rounded-xl border border-border-default bg-bg-elevated p-4 sm:p-6', className)}
    >
      {children}
    </div>
  );
}
