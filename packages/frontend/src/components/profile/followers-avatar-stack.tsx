import type { FollowerResponse } from '@/api/generated.schemas';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface FollowersAvatarStackProps {
  followers: FollowerResponse[];
  maxDisplay?: number;
  totalCount?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: {
    avatar: 'h-6 w-6',
    overlap: '-ml-2',
    text: 'text-[10px]',
    ring: 'ring-1',
  },
  md: {
    avatar: 'h-8 w-8',
    overlap: '-ml-2.5',
    text: 'text-xs',
    ring: 'ring-2',
  },
  lg: {
    avatar: 'h-10 w-10',
    overlap: '-ml-3',
    text: 'text-sm',
    ring: 'ring-2',
  },
};

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function FollowersAvatarStack({
  followers,
  maxDisplay = 5,
  totalCount,
  size = 'md',
  className,
}: FollowersAvatarStackProps) {
  const styles = sizeStyles[size];
  const displayFollowers = followers.slice(0, maxDisplay);
  const remainingCount = (totalCount ?? followers.length) - displayFollowers.length;

  if (displayFollowers.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center', className)}>
      {displayFollowers.map((follower, index) => (
        <Avatar
          key={follower.id}
          className={cn(
            styles.avatar,
            styles.ring,
            'ring-bg-elevated',
            index > 0 && styles.overlap,
            'transition-transform hover:scale-110 hover:z-10'
          )}
        >
          <AvatarImage src={follower.image || undefined} alt={follower.name || follower.username} />
          <AvatarFallback className="bg-bg-surface text-text-secondary text-[10px]">
            {getInitials(follower.name || follower.username)}
          </AvatarFallback>
        </Avatar>
      ))}

      {remainingCount > 0 && (
        <div
          className={cn(
            styles.avatar,
            styles.overlap,
            styles.ring,
            'ring-bg-elevated',
            'flex items-center justify-center rounded-full bg-bg-surface text-text-secondary font-medium',
            styles.text
          )}
        >
          +{remainingCount > 99 ? '99' : remainingCount}
        </div>
      )}
    </div>
  );
}

export function FollowersAvatarStackSkeleton({
  count = 3,
  size = 'md',
}: {
  count?: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const styles = sizeStyles[size];

  return (
    <div className="flex items-center">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(styles.avatar, 'rounded-full', index > 0 && styles.overlap)}
        />
      ))}
    </div>
  );
}
