/**
 * Auth-Aware Header Component
 *
 * A landing page header that adapts to authentication state.
 * - Shows "Get Started" button for unauthenticated users
 * - Shows user avatar/dropdown for authenticated users
 * - Uses skeleton loader during auth check to prevent layout shift
 */

import { Link } from '@tanstack/react-router';
import { Github, User as UserIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { handleLogout, useUser } from '@/lib/auth/client';
import { cn } from '@/lib/utils';

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * Get initials from user's name for avatar fallback
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export interface AuthAwareHeaderProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Auth-aware header component for landing page.
 *
 * Automatically detects authentication state and shows:
 * - "Get Started" button for guests
 * - User avatar and dropdown for authenticated users
 * - Skeleton during loading to prevent layout shift
 */
export function AuthAwareHeader({ className }: AuthAwareHeaderProps) {
  const { user, isLoading } = useUser();

  return (
    <header
      className={cn(
        'sticky top-0 z-50 bg-bg-base/80 backdrop-blur-lg border-b border-border-subtle',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-ember-500 to-ember-600 group-hover:scale-105 transition-transform">
            <img
              src="/flame_icon_only.svg"
              alt=""
              className="w-5 h-5 [filter:brightness(0)_invert(1)]"
            />
          </div>
          <span className="text-xl font-bold text-text-primary">burntop</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/leaderboard"
            search={{ period: 'all-time' }}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Leaderboard
          </Link>
          <a
            href="https://github.com/agusmdev/burntop"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
          <a
            href="https://x.com/agusmdev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
          >
            <XIcon className="w-3.5 h-3.5" />
            Follow
          </a>
        </nav>

        {/* CTA - Auth-aware */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/agusmdev/burntop"
            target="_blank"
            rel="noopener noreferrer"
            className="md:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>

          {isLoading ? (
            // Loading skeleton - same size as button to prevent layout shift
            <Skeleton className="h-9 w-[110px] rounded-md" />
          ) : user ? (
            // Authenticated: Show user avatar + dropdown
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
                <Avatar className="h-9 w-9 border-2 border-ember-500/20 hover:border-ember-500/50 transition-colors">
                  <AvatarImage src={user.image ?? undefined} alt={user.name ?? user.username} />
                  <AvatarFallback className="bg-ember-500/10 text-ember-500 text-sm font-medium">
                    {getInitials(user.name ?? user.username)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-text-primary">
                    {user.name ?? user.username}
                  </p>
                  <p className="text-xs text-text-tertiary">@{user.username}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="cursor-pointer">
                    <UserIcon className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`/p/${user.username}`} className="cursor-pointer flex items-center">
                    <UserIcon className="w-4 h-4 mr-2" />
                    Profile
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleLogout('/')}
                  className="cursor-pointer text-red-500 focus:text-red-500"
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Unauthenticated: Show "Get Started" button
            <Button asChild variant="ember" size="sm">
              <Link to="/login" search={{ error: undefined, error_description: undefined }}>
                Get Started
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
