import { Link, useRouterState } from '@tanstack/react-router';
import { Flame, LogOut, Settings, User } from 'lucide-react';

import type { NavItem, SidebarUser } from '@/components/sidebar';
import type { LucideIcon } from 'lucide-react';

import { defaultNavItems } from '@/components/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export interface MobileNavProps {
  /** Whether the mobile navigation is open */
  open: boolean;
  /** Callback when the open state changes */
  onOpenChange: (open: boolean) => void;
  /** Navigation items to display */
  navItems?: NavItem[];
  /** Additional CSS classes for the sheet content */
  className?: string;
  /** Current user data, undefined if not logged in */
  user?: SidebarUser;
  /** Callback when sign in is clicked (for unauthenticated users) */
  onSignIn?: () => void;
  /** Callback when sign out is clicked */
  onSignOut?: () => void;
}

/**
 * Mobile navigation drawer component.
 * Uses a Sheet component for accessible slide-in navigation on mobile devices.
 *
 * Features:
 * - Focus trapping for keyboard navigation
 * - Escape key to close
 * - Click outside to close
 * - Smooth slide-in animation
 * - Active route highlighting
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <MobileNav open={open} onOpenChange={setOpen} />
 * ```
 */
export function MobileNav({
  open,
  onOpenChange,
  navItems = defaultNavItems,
  className,
  user,
  onSignIn,
  onSignOut,
}: MobileNavProps) {
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
   * Handle navigation item click - close the drawer
   */
  const handleNavClick = () => {
    onOpenChange(false);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className={cn('w-64 p-0', className)}
        aria-describedby={undefined}
      >
        {/* Hidden title for accessibility - required by Radix Dialog */}
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

        {/* Logo / Brand */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Link to="/" className="flex items-center gap-3" onClick={handleNavClick}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ember-500">
              <Flame className="h-5 w-5 text-text-inverse" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">burntop</span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 p-3" role="navigation" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon: LucideIcon = item.icon;

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5',
                  'text-sm font-medium transition-colors duration-150',
                  active
                    ? 'bg-ember-500/10 text-ember-500'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
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
                <span>{item.label}</span>
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
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="bg-ember-500/20 text-ember-500 text-sm font-medium">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 truncate text-left">
                    <p className="truncate text-sm font-medium text-sidebar-foreground">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">@{user.username}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-text-primary">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-text-secondary">@{user.username}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a
                    href={`/p/${user.username}`}
                    className="flex cursor-pointer items-center"
                    onClick={handleNavClick}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href="/settings"
                    className="flex cursor-pointer items-center"
                    onClick={handleNavClick}
                  >
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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-ember-500 px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-ember-600"
            >
              Sign in
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
