/**
 * Public Profile Hero Component
 *
 * Hero section for public profile view (non-authenticated visitors).
 * Similar to ProfileHero but with "Track Your Stats" CTA instead of Follow button.
 */

import { Link } from '@tanstack/react-router';
import { Calendar, ExternalLink, Flame, MapPin, Share2 } from 'lucide-react';

import { FollowersAvatarStack } from './followers-avatar-stack';

import type {
  FollowerResponse,
  UserPublicResponse,
  UserStatsResponse,
} from '@/api/generated.schemas';

import { MonthlyBadge } from '@/components/monthly-badge';
import { StreakCounter } from '@/components/streak-counter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PublicProfileHeroProps {
  profile: UserPublicResponse;
  stats: UserStatsResponse;
  followers: FollowerResponse[];
  followerCount: number;
  followingCount: number;
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

/**
 * Public profile hero component.
 *
 * Displays user profile information with CTA to encourage signup.
 * Removes follow-related functionality and edit profile button.
 */
export function PublicProfileHero({
  profile,
  stats,
  followers,
  followerCount,
  followingCount,
  onShare,
  className,
}: PublicProfileHeroProps) {
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
            {/* Name + Username */}
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-text-primary tracking-tight">
                {profile.name || profile.username}
              </h1>
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
              <div className="flex items-center gap-2">
                <FollowersAvatarStack followers={followers.slice(0, 3)} size="sm" />
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-text-primary">
                    {formatNumber(followerCount)}
                  </span>
                  <span className="text-text-secondary">
                    {followerCount === 1 ? 'follower' : 'followers'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-text-primary">
                  {formatNumber(followingCount)}
                </span>
                <span className="text-text-secondary">following</span>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-start justify-center lg:justify-end">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="default" onClick={onShare} className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>

              {/* CTA Button for Public View */}
              <Button
                variant="default"
                size="default"
                asChild
                className="gap-2 min-w-[140px] bg-ember-500 hover:bg-ember-600 text-white"
              >
                <Link to="/login" search={{ error: undefined, error_description: undefined }}>
                  <Flame className="h-4 w-4" />
                  Track Your Stats
                </Link>
              </Button>
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
