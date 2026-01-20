import { BarChart3, Calendar, DollarSign, Flame, Share2, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface WeeklyShareCardProps {
  weeklyTokens: number;
  weeklyCost: number;
  currentStreak: number;
  daysActive: number;
  onShare: () => void;
  className?: string;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

export function WeeklyShareCard({
  weeklyTokens,
  weeklyCost,
  currentStreak,
  daysActive,
  onShare,
  className,
}: WeeklyShareCardProps) {
  const stats = [
    {
      icon: Zap,
      value: formatTokens(weeklyTokens),
      label: 'tokens',
      color: 'text-ember-500',
      bgColor: 'bg-ember-500/10',
    },
    {
      icon: DollarSign,
      value: formatCost(weeklyCost),
      label: 'spent',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: Flame,
      value: currentStreak.toString(),
      label: 'streak',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      icon: Calendar,
      value: daysActive.toString(),
      label: 'days',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
  ];

  return (
    <div
      className={cn(
        'relative rounded-xl p-6 overflow-hidden',
        'bg-gradient-to-br from-bg-elevated via-bg-elevated to-ember-500/5',
        'ring-1 ring-ember-500/20',
        'shadow-[0_0_30px_rgba(255,107,0,0.08)]',
        className
      )}
    >
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-ember-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-ember-500" />
          <h3 className="text-lg font-semibold text-text-primary">Your Week in Review</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 p-3 rounded-lg bg-bg-surface/50 border border-border-subtle"
            >
              <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
              <div>
                <div className={cn('text-lg font-bold font-mono', stat.color)}>{stat.value}</div>
                <div className="text-xs text-text-tertiary">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={onShare}
          variant="outline"
          className="w-full sm:w-auto gap-2 border-ember-500/30 text-ember-500 hover:bg-ember-500/10 hover:border-ember-500/50"
        >
          <Share2 className="h-4 w-4" />
          Share Your Week
        </Button>
      </div>
    </div>
  );
}
