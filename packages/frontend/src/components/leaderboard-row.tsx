import { ChevronDown, ChevronUp, Flame, Minus, UserCheck, UserPlus, Users } from 'lucide-react';

import type React from 'react';

import { ToolIcon, getToolConfig } from '@/components/tool-icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface LeaderboardRowProps {
  rank: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  tokens: string;
  cost: string;
  streak: number;
  preferredTool: string | null;
  rankChange: number | null | undefined;
  isCurrentUser?: boolean;
  className?: string;
  followersCount?: number;
  isFollowing?: boolean;
  onFollowToggle?: (username: string, currentlyFollowing: boolean) => void;
  isFollowLoading?: boolean;
}

/**
 * Formats a number as a compact string (e.g., 1000 -> "1K", 1500000 -> "1.5M")
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return num.toString();
}

export function LeaderboardRow({
  rank,
  username,
  displayName,
  avatarUrl,
  tokens,
  cost,
  streak,
  preferredTool,
  rankChange,
  isCurrentUser = false,
  className,
  followersCount,
  isFollowing,
  onFollowToggle,
  isFollowLoading,
}: LeaderboardRowProps) {
  const initials = (displayName || username)
    .split(/[\s_-]/)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleFollowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFollowToggle && isFollowing !== null && isFollowing !== undefined) {
      onFollowToggle(username, isFollowing);
    }
  };

  return (
    <TableRow
      className={cn(
        'group transition-colors',
        isCurrentUser
          ? 'bg-ember-500/5 border-l-2 border-l-ember-500 hover:bg-ember-500/10'
          : 'hover:bg-bg-surface',
        className
      )}
    >
      {/* Rank */}
      <TableCell className="w-16 py-4">
        <span
          className={cn(
            'font-mono text-sm font-semibold',
            rank === 1 && 'text-amber-400',
            rank === 2 && 'text-slate-300',
            rank === 3 && 'text-amber-600',
            rank > 3 && 'text-text-tertiary group-hover:text-text-secondary'
          )}
        >
          #{rank}
        </span>
      </TableCell>

      {/* User */}
      <TableCell className="py-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border-subtle">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={`${username}'s avatar`} />}
            <AvatarFallback className="bg-bg-surface text-text-secondary text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-text-primary truncate">
            {displayName || username}
          </span>
          {/* Follow button next to name */}
          {isFollowing !== undefined && onFollowToggle && !isCurrentUser && (
            <button
              type="button"
              className={cn(
                'flex cursor-pointer items-center justify-center h-6 w-6 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0',
                isFollowing
                  ? 'text-text-tertiary hover:text-text-secondary hover:bg-bg-surface'
                  : 'text-text-tertiary hover:text-ember-500 hover:bg-ember-500/10'
              )}
              onClick={handleFollowClick}
              disabled={isFollowLoading}
              title={isFollowing ? 'Unfollow' : 'Follow'}
            >
              {isFollowLoading ? (
                <span className="animate-pulse text-xs">...</span>
              ) : isFollowing ? (
                <UserCheck className="h-3.5 w-3.5" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </TableCell>

      {/* Followers */}
      {followersCount !== undefined && (
        <TableCell className="hidden sm:table-cell py-4">
          <div className="flex items-center justify-end gap-1.5">
            <Users className="h-3.5 w-3.5 text-text-tertiary" />
            <span className="font-mono text-xs text-text-secondary">
              {formatCompactNumber(followersCount)}
            </span>
          </div>
        </TableCell>
      )}

      {/* Tokens */}
      <TableCell className="hidden md:table-cell py-4">
        <span className="font-mono text-xs text-text-secondary">{tokens}</span>
      </TableCell>

      {/* Cost */}
      <TableCell className="py-4">
        <span className="font-mono text-sm font-medium text-ember-500">{cost}</span>
      </TableCell>

      {/* Preferred Tool */}
      <TableCell className="hidden lg:table-cell py-4">
        {preferredTool ? (
          <div className="flex items-center gap-1.5" title={getToolConfig(preferredTool).name}>
            <ToolIcon source={preferredTool} size="sm" />
            <span className="text-xs text-text-secondary truncate max-w-[60px]">
              {getToolConfig(preferredTool).name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-text-disabled">—</span>
        )}
      </TableCell>

      {/* Streak */}
      <TableCell className="hidden sm:table-cell py-4">
        <div className="flex items-center justify-end gap-1">
          {streak > 0 ? (
            <>
              <Flame className="h-3.5 w-3.5 text-ember-500" />
              <span className="font-mono text-xs text-text-secondary">{streak}d</span>
            </>
          ) : (
            <span className="text-xs text-text-disabled">—</span>
          )}
        </div>
      </TableCell>

      {/* Rank Change */}
      <TableCell className="hidden md:table-cell py-4">
        <div className="flex justify-end">
          {rankChange != null ? (
            <RankChangeIndicator change={rankChange} />
          ) : (
            <span className="text-xs text-text-disabled">—</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

interface RankChangeIndicatorProps {
  change: number;
}

function RankChangeIndicator({ change }: RankChangeIndicatorProps) {
  if (change === 0) {
    return (
      <span className="flex items-center text-text-disabled" aria-label="No rank change">
        <Minus className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (change > 0) {
    return (
      <span
        className="flex items-center gap-0.5 text-success text-xs font-medium"
        aria-label={`Up ${change} position${change !== 1 ? 's' : ''}`}
      >
        <ChevronUp className="h-3.5 w-3.5" />
        {change}
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-0.5 text-error text-xs font-medium"
      aria-label={`Down ${Math.abs(change)} position${Math.abs(change) !== 1 ? 's' : ''}`}
    >
      <ChevronDown className="h-3.5 w-3.5" />
      {Math.abs(change)}
    </span>
  );
}

export interface LeaderboardRowSkeletonProps {
  showFollowColumns?: boolean;
  className?: string;
}

export function LeaderboardRowSkeleton({
  showFollowColumns = false,
  className,
}: LeaderboardRowSkeletonProps) {
  return (
    <TableRow className={cn('hover:bg-transparent', className)}>
      {/* Rank */}
      <TableCell className="w-16 py-4">
        <Skeleton className="h-4 w-8" />
      </TableCell>

      {/* User */}
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </TableCell>

      {/* Followers */}
      {showFollowColumns && (
        <TableCell className="hidden sm:table-cell py-4">
          <div className="flex justify-end">
            <Skeleton className="h-4 w-10" />
          </div>
        </TableCell>
      )}

      {/* Tokens */}
      <TableCell className="hidden md:table-cell py-4">
        <Skeleton className="h-4 w-12" />
      </TableCell>

      {/* Cost */}
      <TableCell className="py-4">
        <Skeleton className="h-4 w-16" />
      </TableCell>

      {/* Tool - always rendered */}
      <TableCell className="hidden lg:table-cell py-4">
        <Skeleton className="h-4 w-16" />
      </TableCell>

      {/* Streak - always rendered */}
      <TableCell className="hidden sm:table-cell py-4">
        <div className="flex justify-end">
          <Skeleton className="h-4 w-10" />
        </div>
      </TableCell>

      {/* Rank Change - always rendered */}
      <TableCell className="hidden md:table-cell py-4">
        <div className="flex justify-end">
          <Skeleton className="h-4 w-8" />
        </div>
      </TableCell>
    </TableRow>
  );
}
