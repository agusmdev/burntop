import { Sparkles, Star, Zap, Crown } from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type BadgeTierName = 'None' | 'Power User' | 'AI Native' | 'Token Titan';

export type MonthlyBadgeSize = 'sm' | 'md' | 'lg';

interface BadgeTier {
  name: BadgeTierName;
  minTokens: number;
  maxTokens: number;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  glowClass: string;
}

const BADGE_TIERS: BadgeTier[] = [
  {
    name: 'None',
    minTokens: 0,
    maxTokens: 10_000_000,
    icon: Star,
    colorClass: 'text-text-secondary',
    bgClass: 'bg-bg-surface border-border-default',
    glowClass: '',
  },
  {
    name: 'Power User',
    minTokens: 10_000_000,
    maxTokens: 100_000_000,
    icon: Zap,
    colorClass: 'text-ember-500',
    bgClass: 'bg-ember-900/20 border-ember-600',
    glowClass: 'shadow-[0_0_8px_rgba(255,107,0,0.2)]',
  },
  {
    name: 'AI Native',
    minTokens: 100_000_000,
    maxTokens: 1_000_000_000,
    icon: Sparkles,
    colorClass: 'text-ember-300',
    bgClass: 'bg-gradient-to-r from-ember-900/40 to-ember-800/30 border-ember-400',
    glowClass: 'shadow-[0_0_16px_rgba(255,107,0,0.4)]',
  },
  {
    name: 'Token Titan',
    minTokens: 1_000_000_000,
    maxTokens: Infinity,
    icon: Crown,
    colorClass: 'text-ember-200',
    bgClass: 'bg-gradient-to-r from-ember-800/50 to-ember-700/40 border-ember-300',
    glowClass: 'shadow-[0_0_24px_rgba(255,107,0,0.5)]',
  },
];

export function getBadgeTier(monthlyTokens: number): BadgeTier {
  for (let i = BADGE_TIERS.length - 1; i >= 0; i--) {
    if (monthlyTokens >= BADGE_TIERS[i].minTokens) {
      return BADGE_TIERS[i];
    }
  }
  return BADGE_TIERS[0];
}

export function getNextTier(currentTier: BadgeTier): BadgeTier | null {
  const currentIndex = BADGE_TIERS.findIndex((t) => t.name === currentTier.name);
  if (currentIndex < BADGE_TIERS.length - 1) {
    return BADGE_TIERS[currentIndex + 1];
  }
  return null;
}

const sizeStyles: Record<
  MonthlyBadgeSize,
  { container: string; icon: string; tokens: string; name: string }
> = {
  sm: {
    container: 'px-2 py-0.5 gap-1',
    icon: 'h-3 w-3',
    tokens: 'text-xs',
    name: 'text-[10px]',
  },
  md: {
    container: 'px-2.5 py-1 gap-1.5',
    icon: 'h-4 w-4',
    tokens: 'text-sm',
    name: 'text-xs',
  },
  lg: {
    container: 'px-3 py-1.5 gap-2',
    icon: 'h-5 w-5',
    tokens: 'text-base',
    name: 'text-sm',
  },
};

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000_000) {
    return `${(tokens / 1_000_000_000).toFixed(1)}B`;
  }
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toLocaleString();
}

export interface MonthlyBadgeProps {
  monthlyTokens: number;
  size?: MonthlyBadgeSize;
  showName?: boolean;
  showProgress?: boolean;
  animated?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MonthlyBadge({
  monthlyTokens,
  size = 'md',
  showName = false,
  showProgress = true,
  animated = true,
  onClick,
  className,
}: MonthlyBadgeProps) {
  const tier = getBadgeTier(monthlyTokens);
  const nextTier = getNextTier(tier);
  const styles = sizeStyles[size];
  const Icon = tier.icon;

  const progressText =
    nextTier && tier.name !== 'Token Titan'
      ? `${formatTokens(monthlyTokens)} / ${formatTokens(nextTier.minTokens)}`
      : formatTokens(monthlyTokens);

  const tooltipContent = (
    <div className="space-y-1.5 text-center">
      <p className="font-semibold text-text-primary">
        {tier.name === 'None' ? 'No Badge' : tier.name}
      </p>
      <div className="text-xs text-text-secondary">
        {formatTokens(monthlyTokens)} tokens (last 30 days)
      </div>
      {showProgress && nextTier && tier.name !== 'Token Titan' && (
        <div className="text-xs text-text-tertiary">
          {formatTokens(nextTier.minTokens - monthlyTokens)} more to {nextTier.name}
        </div>
      )}
      {tier.name === 'Token Titan' && (
        <div className="text-xs text-ember-400">Maximum tier reached!</div>
      )}
    </div>
  );

  const badgeElement = (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label={`${tier.name === 'None' ? 'No Badge' : tier.name} - ${formatTokens(monthlyTokens)} tokens`}
      className={cn(
        'inline-flex items-center rounded-full border font-medium transition-all duration-200',
        styles.container,
        tier.bgClass,
        tier.glowClass,
        animated &&
          (tier.name === 'AI Native' || tier.name === 'Token Titan') &&
          'monthly-badge-glow',
        onClick &&
          'cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:ring-offset-2 focus:ring-offset-bg-base',
        !onClick && 'cursor-default',
        className
      )}
    >
      <Icon
        className={cn(styles.icon, tier.colorClass, 'transition-colors duration-300')}
        aria-hidden="true"
      />

      <span className={cn('font-mono font-bold', styles.tokens, tier.colorClass)}>
        {progressText}
      </span>

      {showName && tier.name !== 'None' && (
        <span className={cn('text-text-secondary', styles.name)}>{tier.name}</span>
      )}
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badgeElement}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

export interface MonthlyBadgeSkeletonProps {
  size?: MonthlyBadgeSize;
  showName?: boolean;
  className?: string;
}

export function MonthlyBadgeSkeleton({
  size = 'md',
  showName = false,
  className,
}: MonthlyBadgeSkeletonProps) {
  const styles = sizeStyles[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border-subtle bg-bg-surface animate-pulse',
        styles.container,
        className
      )}
    >
      <span className={cn('rounded-full bg-bg-subtle', styles.icon)} />
      <span className={cn('w-16 h-4 rounded bg-bg-subtle', size === 'lg' && 'w-20 h-5')} />
      {showName && <span className="w-12 h-3 rounded bg-bg-subtle" />}
    </span>
  );
}

export function MonthlyBadgeCompact({
  monthlyTokens,
  className,
}: {
  monthlyTokens: number;
  className?: string;
}) {
  const tier = getBadgeTier(monthlyTokens);

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={`${formatTokens(monthlyTokens)} tokens`}
    >
      <span className={cn('text-sm font-mono font-semibold', tier.colorClass)}>
        {formatTokens(monthlyTokens)}
      </span>
    </span>
  );
}

export { BADGE_TIERS };
export type { BadgeTier };
