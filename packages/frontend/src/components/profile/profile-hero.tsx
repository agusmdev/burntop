import { Link } from '@tanstack/react-router';
import { Calendar, ExternalLink, MapPin, Share2, UserMinus, UserPlus } from 'lucide-react';

import { FollowersAvatarStack } from './followers-avatar-stack';

import type {
  FollowerResponse,
  UserPublicResponse,
  UserStatsResponse,
} from '@/api/generated.schemas';

import { MonthlyBadge } from '@/components/monthly-badge';
import { StreakCounter } from '@/components/streak-counter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ProfileHeroProps {
  profile: UserPublicResponse;
  stats: UserStatsResponse;
  followers: FollowerResponse[];
  followerCount: number;
  followingCount: number;
  isOwnProfile: boolean;
  isFollowing: boolean;
  followsYou: boolean;
  isFollowPending: boolean;
  onFollowToggle: () => void;
  onShare: () => void;
  className?: string;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

export function ProfileHero({
  profile,
  stats,
  followers,
  followerCount,
  followingCount,
  isOwnProfile,
  isFollowing,
  followsYou,
  isFollowPending,
  onFollowToggle,
  onShare,
  className,
}: ProfileHeroProps) {
  const isHighTier = stats.monthly_badge === 'AI Native' || stats.monthly_badge === 'Token Titan';

  return (
    <div className={cn('relative', className)}>
      {/* Background gradient glow for high-tier users */}
      {isHighTier && (
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
          <div className="absolute -top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-ember-500/10 blur-[120px]" />
        </div>
      )}

      <div className="rounded-2xl border border-border-default bg-bg-elevated/80 backdrop-blur-sm p-6 md:p-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left: Avatar + Badge */}
          <div className="flex flex-col items-center lg:items-start gap-4">
            {/* Avatar with glow effect */}
            <div
              className={cn(
                'relative',
                isHighTier &&
                  'after:absolute after:inset-0 after:rounded-full after:shadow-[0_0_40px_rgba(255,107,0,0.4)] after:-z-10'
              )}
            >
              <Avatar
                className={cn(
                  'h-28 w-28 md:h-32 md:w-32 ring-2 ring-border-default',
                  isHighTier && 'ring-ember-500/50'
                )}
              >
                <AvatarImage
                  src={profile.image || undefined}
                  alt={profile.name || profile.username}
                  className="object-cover"
                />
                <AvatarFallback className="text-3xl md:text-4xl bg-bg-surface text-text-primary font-semibold">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Monthly Badge */}
            <MonthlyBadge monthlyTokens={stats.monthly_tokens} size="lg" showName showProgress />
          </div>

          {/* Center: User Info */}
          <div className="flex-1 space-y-4 text-center lg:text-left">
            {/* Name + Username + Badges */}
            <div className="space-y-1">
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-text-primary tracking-tight">
                  {profile.name || profile.username}
                </h1>
                {!isOwnProfile && followsYou && (
                  <Badge
                    variant="secondary"
                    className="w-fit mx-auto lg:mx-0 text-xs bg-bg-surface border-border-default text-text-secondary"
                  >
                    {isFollowing ? 'Mutual' : 'Follows you'}
                  </Badge>
                )}
              </div>
              <p className="text-text-secondary text-lg">@{profile.username}</p>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-text-primary max-w-2xl leading-relaxed">{profile.bio}</p>
            )}

            {/* Metadata Row */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-text-secondary">
              {profile.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-text-tertiary" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-ember-500 hover:text-ember-400 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hover:underline">
                    {profile.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </span>
                </a>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-text-tertiary" />
                <span>
                  Joined{' '}
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Social Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-6">
              <Link
                to="/followers"
                className="group flex items-center gap-2 hover:text-text-primary transition-colors"
              >
                <FollowersAvatarStack followers={followers.slice(0, 3)} size="sm" />
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-text-primary group-hover:text-ember-500 transition-colors">
                    {formatNumber(followerCount)}
                  </span>
                  <span className="text-text-secondary">
                    {followerCount === 1 ? 'follower' : 'followers'}
                  </span>
                </div>
              </Link>
              <Link
                to="/following"
                className="group flex items-center gap-1.5 hover:text-text-primary transition-colors"
              >
                <span className="font-semibold text-text-primary group-hover:text-ember-500 transition-colors">
                  {formatNumber(followingCount)}
                </span>
                <span className="text-text-secondary">following</span>
              </Link>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-start justify-center lg:justify-end">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="default" onClick={onShare} className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>

              {!isOwnProfile && (
                <Button
                  variant={isFollowing ? 'outline' : 'default'}
                  size="default"
                  onClick={onFollowToggle}
                  disabled={isFollowPending}
                  className={cn(
                    'gap-2 min-w-[110px]',
                    !isFollowing && 'bg-ember-500 hover:bg-ember-600 text-white'
                  )}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="h-4 w-4" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Follow
                    </>
                  )}
                </Button>
              )}

              {isOwnProfile && (
                <Button variant="outline" size="default" asChild>
                  <Link to="/settings">Edit Profile</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row - Full Width Below */}
        <div className="mt-6 pt-6 border-t border-border-subtle">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {/* Streak Counter */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-surface/50 border border-border-subtle">
              <StreakCounter
                days={stats.current_streak}
                label="day streak"
                size="lg"
                orientation="horizontal"
              />
            </div>

            {/* Total Tokens */}
            <div className="px-4 py-3 rounded-xl bg-bg-surface/50 border border-border-subtle text-center min-w-[120px]">
              <div className="text-xl font-mono font-bold text-ember-500">
                {formatNumber(stats.total_tokens)}
              </div>
              <div className="text-xs text-text-tertiary">Total Tokens</div>
            </div>

            {/* Total Cost */}
            <div className="px-4 py-3 rounded-xl bg-bg-surface/50 border border-border-subtle text-center min-w-[120px]">
              <div className="text-xl font-mono font-bold text-text-primary">
                {formatCost(stats.total_cost)}
              </div>
              <div className="text-xs text-text-tertiary">Total Cost</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileHeroSkeleton() {
  return (
    <div className="rounded-2xl border border-border-default bg-bg-elevated/80 p-6 md:p-8">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left */}
        <div className="flex flex-col items-center lg:items-start gap-4">
          <Skeleton className="h-28 w-28 md:h-32 md:w-32 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>

        {/* Center */}
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64 mx-auto lg:mx-0" />
            <Skeleton className="h-5 w-32 mx-auto lg:mx-0" />
          </div>
          <Skeleton className="h-16 w-full max-w-2xl mx-auto lg:mx-0" />
          <div className="flex justify-center lg:justify-start gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex justify-center lg:justify-start gap-6">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>

        {/* Right - Action Buttons */}
        <div className="flex items-start justify-center lg:justify-end">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mt-6 pt-6 border-t border-border-subtle">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Skeleton className="h-14 w-40 rounded-xl" />
          <Skeleton className="h-14 w-[120px] rounded-xl" />
          <Skeleton className="h-14 w-[120px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
