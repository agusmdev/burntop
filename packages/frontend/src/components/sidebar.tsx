import { Link, useRouterState } from '@tanstack/react-router';
import { Home, LayoutDashboard, LogOut, Settings, Trophy, User, Users } from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

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

/**
 * User data for sidebar
 */
export interface SidebarUser {
  /** User's display name */
  name: string;
  /** User's username/handle */
  username: string;
  /** URL to user's avatar image */
  avatarUrl?: string;
}

/**
 * Navigation item configuration
 */
export interface NavItem {
  /** Display label for the nav item */
  label: string;
  /** Route path to navigate to */
  href: string;
  /** Icon component to display */
  icon: LucideIcon;
  /** Whether to match the route exactly */
  exact?: boolean;
}

/**
 * Default navigation items for the main sidebar
 */
export const defaultNavItems: NavItem[] = [
  { label: 'Home', href: '/', icon: Home, exact: true },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Friends', href: '/friends', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export interface SidebarProps {
  /** Navigation items to display */
  navItems?: NavItem[];
  /** Additional CSS classes */
  className?: string;
  /** Whether the sidebar is collapsed (icon-only mode) */
  collapsed?: boolean;
  /** Callback when a nav item is clicked */
  onNavClick?: () => void;
  /** Current user data, undefined if not logged in */
  user?: SidebarUser;
  /** Callback when sign in is clicked (for unauthenticated users) */
  onSignIn?: () => void;
  /** Callback when sign out is clicked */
  onSignOut?: () => void;
}

/**
 * Main sidebar navigation component for the burntop app.
 * Features the Ember design system with orange accent colors.
 */
export function Sidebar({
  navItems = defaultNavItems,
  className,
  collapsed = false,
  onNavClick,
  user,
  onSignIn,
  onSignOut,
}: SidebarProps) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  /**
   * Check if a nav item is currently active
   */
  const isActive = (item: NavItem): boolean => {
    if (item.exact) {
      return currentPath === item.href;
    }
    return currentPath.startsWith(item.href);
  };

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
    <aside
      className={cn(
        'flex h-full flex-col bg-sidebar border-r border-sidebar-border',
        collapsed ? 'w-16' : 'w-64',
        'transition-[width] duration-200 ease-out',
        className
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <Link to="/" className="flex items-center gap-3" onClick={onNavClick}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ember-500">
            <img
              src="/flame_icon_only.svg"
              alt=""
              className="h-5 w-5 [filter:brightness(0)_invert(1)]"
            />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold text-sidebar-foreground">burntop</span>
          )}
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5',
                'text-sm font-medium transition-colors duration-150',
                active
                  ? 'bg-ember-500/10 text-ember-500'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  active ? 'text-ember-500' : 'text-text-secondary'
                )}
                aria-hidden="true"
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer / User section */}
      <div className="border-t border-sidebar-border p-3">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2',
                  'text-sm text-text-secondary transition-colors hover:bg-sidebar-accent',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="bg-ember-500/20 text-ember-500 text-sm font-medium">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 truncate text-left">
                    <p className="truncate text-sm font-medium text-sidebar-foreground">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">@{user.username}</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
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
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg bg-ember-500 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-ember-600',
              collapsed ? 'px-2' : 'px-4'
            )}
          >
            {!collapsed && 'Sign in'}
            {collapsed && <User className="h-5 w-5" />}
          </button>
        )}
      </div>
    </aside>
  );
}

export interface SidebarSkeletonProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether the sidebar is collapsed */
  collapsed?: boolean;
}

/**
 * Skeleton loader for the Sidebar component.
 * Use this when the sidebar data is loading to prevent layout shift.
 */
export function SidebarSkeleton({ className, collapsed = false }: SidebarSkeletonProps) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-sidebar border-r border-sidebar-border',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo skeleton */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-bg-subtle" />
          {!collapsed && <div className="h-5 w-20 animate-pulse rounded bg-bg-subtle" />}
        </div>
      </div>

      {/* Nav items skeleton */}
      <nav className="flex-1 space-y-1 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5',
              collapsed && 'justify-center px-2'
            )}
          >
            <div className="h-5 w-5 shrink-0 animate-pulse rounded bg-bg-subtle" />
            {!collapsed && <div className="h-4 w-24 animate-pulse rounded bg-bg-subtle" />}
          </div>
        ))}
      </nav>

      {/* Footer skeleton */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2',
            collapsed && 'justify-center px-2'
          )}
        >
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-bg-subtle" />
          {!collapsed && <div className="h-3 w-16 animate-pulse rounded bg-bg-subtle" />}
        </div>
      </div>
    </aside>
  );
}
