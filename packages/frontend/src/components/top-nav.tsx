import { Link } from '@tanstack/react-router';
import { Flame, LogOut, Menu, Search, Settings, User, X } from 'lucide-react';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface TopNavUser {
  /** User's display name */
  name: string;
  /** User's username/handle */
  username: string;
  /** URL to user's avatar image */
  avatarUrl?: string;
}

export interface TopNavProps {
  /** Current user data, undefined if not logged in */
  user?: TopNavUser;
  /** Callback when mobile menu toggle is clicked */
  onMobileMenuToggle?: () => void;
  /** Whether the mobile menu is currently open */
  mobileMenuOpen?: boolean;
  /** Show the search input (desktop only) */
  showSearch?: boolean;
  /** Callback when sign in is clicked (for unauthenticated users) */
  onSignIn?: () => void;
  /** Callback when sign out is clicked */
  onSignOut?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Top navigation header component for the burntop app.
 * Features the Ember design system with orange accent colors.
 *
 * Includes:
 * - Logo/brand on the left
 * - Optional search input (desktop)
 * - User dropdown menu or sign in button
 * - Mobile menu toggle
 */
export function TopNav({
  user,
  onMobileMenuToggle,
  mobileMenuOpen = false,
  showSearch = false,
  onSignIn,
  onSignOut,
  className,
}: TopNavProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  /**
   * Get initials from user's name for avatar fallback
   */
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header
      className={cn(
        'flex h-16 items-center justify-between border-b border-sidebar-border bg-bg-base px-4',
        className
      )}
    >
      {/* Left section: Mobile menu + Logo */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary lg:hidden"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        {/* Logo - visible on mobile, hidden on desktop when sidebar is visible */}
        <Link to="/" className="flex items-center gap-3 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ember-500">
            <Flame className="h-5 w-5 text-text-inverse" />
          </div>
          <span className="text-lg font-semibold text-text-primary">burntop</span>
        </Link>
      </div>

      {/* Center section: Search (desktop only) */}
      {showSearch && (
        <div className="hidden flex-1 justify-center px-4 md:flex md:max-w-md lg:max-w-lg">
          <div className="relative w-full">
            <Search
              className={cn(
                'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
                searchFocused ? 'text-ember-500' : 'text-text-tertiary'
              )}
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search users, achievements..."
              className={cn(
                'w-full rounded-lg border bg-bg-surface py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary',
                'transition-colors duration-150',
                'focus:border-ember-500 focus:outline-none focus:ring-1 focus:ring-ember-500',
                searchFocused ? 'border-ember-500' : 'border-border-default'
              )}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>
      )}

      {/* Right section: User menu */}
      <div className="flex items-center gap-2">
        {/* User menu or Sign in */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-bg-surface"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="bg-ember-500/20 text-ember-500 text-sm font-medium">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium text-text-primary md:block">
                  {user.name}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-text-primary">{user.name}</p>
                  <p className="text-xs leading-none text-text-secondary">@{user.username}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={`/p/${user.username}`} className="flex cursor-pointer items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/settings" className="flex cursor-pointer items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={onSignOut}
                className="cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="rounded-lg bg-ember-500 px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-ember-600"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}

export interface TopNavSkeletonProps {
  /** Show the search input skeleton */
  showSearch?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton loader for the TopNav component.
 * Use this when the header data is loading to prevent layout shift.
 */
export function TopNavSkeleton({ showSearch = false, className }: TopNavSkeletonProps) {
  return (
    <header
      className={cn(
        'flex h-16 items-center justify-between border-b border-sidebar-border bg-bg-base px-4',
        className
      )}
    >
      {/* Left section skeleton */}
      <div className="flex items-center gap-3">
        {/* Mobile menu placeholder */}
        <div className="h-9 w-9 animate-pulse rounded-lg bg-bg-subtle lg:hidden" />

        {/* Logo skeleton - mobile only */}
        <div className="flex items-center gap-3 lg:hidden">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-bg-subtle" />
          <div className="h-5 w-20 animate-pulse rounded bg-bg-subtle" />
        </div>
      </div>

      {/* Center section skeleton */}
      {showSearch && (
        <div className="hidden flex-1 justify-center px-4 md:flex md:max-w-md lg:max-w-lg">
          <div className="h-9 w-full animate-pulse rounded-lg bg-bg-subtle" />
        </div>
      )}

      {/* Right section skeleton */}
      <div className="flex items-center gap-2">
        {/* User avatar skeleton */}
        <div className="flex items-center gap-2 rounded-lg p-1.5">
          <div className="h-8 w-8 animate-pulse rounded-full bg-bg-subtle" />
          <div className="hidden h-4 w-24 animate-pulse rounded bg-bg-subtle md:block" />
        </div>
      </div>
    </header>
  );
}
