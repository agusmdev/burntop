import { Link, createFileRoute } from '@tanstack/react-router';
import { Flame, Zap, TrendingUp, Users, ChevronRight, Check, Github, Heart } from 'lucide-react';

import { useGetLeaderboardApiV1LeaderboardGet } from '@/api/leaderboard/leaderboard';
import { useGetPlatformStatsApiV1StatsPlatformGet } from '@/api/stats/stats';
import { AuthAwareSimpleCTA } from '@/components/auth-aware-cta';
import { AuthAwareHeader } from '@/components/auth-aware-header';
import { CliCommand } from '@/components/cli-command';
import {
  HeroIllustration,
  DashboardIllustration,
  TrophyIllustration,
  AnalyticsIllustration,
  ShareIllustration,
  WrappedIllustration,
} from '@/components/illustrations';
import { formatCompactNumber } from '@/components/leaderboard-row';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DEFAULT_OG_IMAGE,
  generateOGMeta,
  generateTwitterCardMeta,
  generateWebSiteSchema,
  generateArticleSchema,
  generateBreadcrumbSchema,
  createJsonLdTag,
  getBaseUrl,
} from '@/lib/seo';

export const Route = createFileRoute('/')({
  head: () => {
    const baseUrl = getBaseUrl();
    const defaultOgImage = `${baseUrl}${DEFAULT_OG_IMAGE}`;

    return {
      meta: [
        {
          title: 'burntop.dev - AI Usage Tracking & Analytics for Developers',
        },
        {
          name: 'description',
          content:
            'Track your AI tool usage across Claude, Cursor, and more. Analyze costs, usage patterns, and share your stats with the developer community. Get started with bunx burntop sync.',
        },
        {
          name: 'keywords',
          content:
            'AI usage tracking, Claude, Cursor, ChatGPT, developer tools, analytics, leaderboard, Open Source',
        },
        ...generateOGMeta({
          title: 'burntop.dev - AI Usage Tracking & Analytics for Developers',
          description:
            'Track your AI tool usage across Claude, Cursor, and more. Analyze costs, usage patterns, and share your stats with the developer community.',
          url: baseUrl,
          image: defaultOgImage,
          type: 'website',
        }),
        ...generateTwitterCardMeta({
          title: 'burntop.dev - AI Usage Tracking & Analytics for Developers',
          description:
            'Track your AI tool usage across Claude, Cursor, and more. Analyze costs, usage patterns, and share your stats with the developer community.',
          image: defaultOgImage,
          card: 'summary_large_image',
        }),
      ],
      links: [
        {
          rel: 'canonical',
          href: baseUrl,
        },
      ],
      scripts: [
        createJsonLdTag(generateWebSiteSchema()),
        createJsonLdTag(
          generateArticleSchema({
            title: 'burntop.dev - AI Usage Tracking & Analytics for Developers',
            description:
              'Track your AI tool usage across Claude, Cursor, and more. Analyze costs, usage patterns, and share your stats with the developer community.',
            url: baseUrl,
            image: defaultOgImage,
          })
        ),
        createJsonLdTag(generateBreadcrumbSchema([{ name: 'Home', item: baseUrl }])),
      ],
    };
  },
  component: App,
});

/**
 * Leaderboard preview component for landing page.
 * Uses React Query for optimal data fetching and caching.
 */
function LeaderboardPreview() {
  const {
    data: response,
    isLoading,
    error,
  } = useGetLeaderboardApiV1LeaderboardGet({
    period: 'all',
    limit: 5,
  });

  // Extract entries from response - check if response has status 200
  const data =
    response && 'status' in response && response.status === 200 ? response.data.entries : null;

  if (error) {
    return (
      <Card className="bg-bg-elevated border-border-subtle p-8 text-center">
        <p className="text-text-secondary">
          {error instanceof Error ? error.message : 'Failed to load leaderboard'}
        </p>
      </Card>
    );
  }

  return (
    <Card className="bg-bg-elevated border-border-subtle overflow-hidden">
      <div className="bg-bg-surface/50 px-4 py-3 border-b border-border-subtle">
        <div className="grid grid-cols-[3rem_1fr_4rem_5rem] gap-2 text-sm font-medium text-text-tertiary">
          <div>Rank</div>
          <div>Player</div>
          <div className="text-right">Tokens</div>
          <div className="text-right">Cost</div>
        </div>
      </div>

      <div className="divide-y divide-border-subtle">
        {isLoading ? (
          <>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3">
                <div className="grid grid-cols-[3rem_1fr_4rem_5rem] gap-2 items-center">
                  <Skeleton className="h-4 w-6" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-10 ml-auto" />
                  <Skeleton className="h-4 w-14 ml-auto" />
                </div>
              </div>
            ))}
          </>
        ) : (
          data?.map((entry) => {
            const initials = entry.username
              .split(/[\s_-]/)
              .map((part) => part[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div key={entry.user_id} className="px-4 py-3 hover:bg-bg-surface transition-colors">
                <div className="grid grid-cols-[3rem_1fr_4rem_5rem] gap-2 items-center">
                  <span
                    className={`font-mono text-sm font-semibold ${
                      entry.rank === 1
                        ? 'text-amber-400'
                        : entry.rank === 2
                          ? 'text-slate-300'
                          : entry.rank === 3
                            ? 'text-amber-600'
                            : 'text-text-tertiary'
                    }`}
                  >
                    #{entry.rank}
                  </span>

                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-7 w-7 shrink-0 ring-1 ring-border-subtle">
                      {entry.image && (
                        <AvatarImage src={entry.image} alt={`${entry.username}'s avatar`} />
                      )}
                      <AvatarFallback className="bg-bg-surface text-text-secondary text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-text-primary truncate">
                      {entry.username}
                    </span>
                  </div>

                  <span className="font-mono text-xs text-text-secondary text-right">
                    {formatCompactNumber(entry.total_tokens)}
                  </span>

                  <span className="font-mono text-sm font-medium text-ember-500 text-right">
                    ${(entry.total_cost || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

function PlatformStats() {
  const { data: response, isLoading } = useGetPlatformStatsApiV1StatsPlatformGet();

  const stats = response && 'status' in response && response.status === 200 ? response.data : null;

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(1)}B+`;
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M+`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K+`;
    return `${tokens}+`;
  };

  const tokensDisplay = isLoading ? '...' : stats ? formatTokens(stats.total_tokens) : '0';
  const usersDisplay = isLoading ? '...' : stats ? `${stats.total_users}+` : '0';
  const toolsDisplay = isLoading ? '...' : stats ? `${stats.total_tools}+` : '0';

  return (
    <div className="mt-12 lg:mt-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
        <div className="stats-card-float bg-bg-elevated/90 backdrop-blur-sm border border-border-subtle rounded-xl p-5 hover:border-ember-500/50 hover:shadow-lg hover:shadow-ember-500/10 transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-ember-500/10 mb-3 mx-auto group-hover:bg-ember-500/20 transition-colors">
            <Zap className="w-5 h-5 text-ember-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-text-primary mb-1">
            {tokensDisplay}
          </div>
          <div className="text-xs md:text-sm text-text-secondary">Tokens Tracked</div>
        </div>

        <div
          className="stats-card-float bg-bg-elevated/90 backdrop-blur-sm border border-border-subtle rounded-xl p-5 hover:border-ember-500/50 hover:shadow-lg hover:shadow-ember-500/10 transition-all duration-300 hover:-translate-y-1 group"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-ember-500/10 mb-3 mx-auto group-hover:bg-ember-500/20 transition-colors">
            <Users className="w-5 h-5 text-ember-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-text-primary mb-1">
            {usersDisplay}
          </div>
          <div className="text-xs md:text-sm text-text-secondary">Active Developers</div>
        </div>

        <div
          className="stats-card-float bg-bg-elevated/90 backdrop-blur-sm border border-border-subtle rounded-xl p-5 hover:border-ember-500/50 hover:shadow-lg hover:shadow-ember-500/10 transition-all duration-300 hover:-translate-y-1 group"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-ember-500/10 mb-3 mx-auto group-hover:bg-ember-500/20 transition-colors">
            <TrendingUp className="w-5 h-5 text-ember-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-text-primary mb-1">
            {toolsDisplay}
          </div>
          <div className="text-xs md:text-sm text-text-secondary">AI Tools Supported</div>
        </div>
      </div>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function Footer() {
  return (
    <footer className="bg-bg-elevated border-t border-border-subtle">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-ember-500 to-ember-600">
                <img
                  src="/flame_icon_only.svg"
                  alt=""
                  className="w-5 h-5 [filter:brightness(0)_invert(1)]"
                />
              </div>
              <span className="text-xl font-bold text-text-primary">burntop</span>
            </Link>
            <p className="text-text-secondary max-w-sm mb-4">
              Open source AI usage tracking for developers. Track your usage, analyze patterns, and
              share your progress with the community.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/agusmdev/burntop"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-bg-surface border border-border-subtle hover:border-ember-500/50 hover:text-ember-500 transition-colors text-text-secondary"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://x.com/agusmdev"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-bg-surface border border-border-subtle hover:border-ember-500/50 hover:text-ember-500 transition-colors text-text-secondary"
                aria-label="X (Twitter)"
              >
                <XIcon className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/leaderboard"
                  search={{ period: 'all-time' }}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Leaderboard
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/agusmdev/burntop#features"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/agusmdev/burntop#installation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Installation
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4">Community</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/agusmdev/burntop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/agusmdev/burntop/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Report an Issue
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/agusmdev/burntop/blob/main/CONTRIBUTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Contribute
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border-subtle flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-text-tertiary">
            {new Date().getFullYear()} burntop. Open source under MIT License.
          </p>
          <p className="text-sm text-text-tertiary flex items-center gap-1.5">
            Made with <Heart className="w-4 h-4 text-ember-500 fill-ember-500" /> by{' '}
            <a
              href="https://x.com/agusmdev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-ember-500 transition-colors"
            >
              @agusmdev
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-bg-base">
      <AuthAwareHeader />

      <section className="relative py-16 md:py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ember-500/5 via-bg-base to-ember-600/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,107,0,0.1),transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ember-500/10 border border-ember-500/20 mb-8">
                <Flame className="w-4 h-4 text-ember-500" />
                <span className="text-sm text-ember-500 font-medium">
                  AI usage tracking for developers
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-text-primary mb-6 tracking-tight">
                Track Your AI Usage.
                <br />
                <span className="bg-gradient-to-r from-ember-400 via-ember-500 to-ember-600 bg-clip-text text-transparent">
                  Share Your Progress.
                </span>
              </h1>

              <p className="text-lg md:text-xl text-text-secondary max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                Track tokens, costs, and usage patterns across Claude, Cursor, and more. Analyze
                your AI workflow and share stats with the developer community.
              </p>

              <div className="mb-12 lg:mb-0">
                <p className="text-sm text-text-tertiary mb-3 text-center lg:text-left">
                  Get started in seconds:
                </p>
                <div className="flex justify-center lg:justify-start">
                  <CliCommand command="bunx burntop sync" />
                </div>
              </div>
            </div>

            <div className="relative lg:pl-8">
              <LeaderboardPreview />
              <div className="mt-6 text-center">
                <Button asChild variant="ember-outline" size="lg">
                  <Link to="/leaderboard" search={{ period: 'all-time' }}>
                    View Full Leaderboard
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <PlatformStats />
        </div>
      </section>

      {/* Join Community Section */}
      <section className="py-24 px-6 bg-bg-elevated/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-12 items-center">
            {/* Left - Illustration */}
            <div className="lg:col-span-2 flex justify-center">
              <HeroIllustration className="w-full max-w-sm" />
            </div>

            {/* Right - Content */}
            <div className="lg:col-span-3">
              {/* Section Header */}
              <div className="text-center lg:text-left mb-8">
                <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
                  Join the{' '}
                  <span className="bg-gradient-to-r from-ember-400 to-ember-600 bg-clip-text text-transparent">
                    Community
                  </span>
                </h2>
                <p className="text-xl text-text-secondary max-w-2xl leading-relaxed">
                  Track your AI usage alongside hundreds of developers. Discover patterns, compare
                  stats, and see how your workflow stacks up against the community.
                </p>
              </div>

              {/* Benefits list */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-ember-500/10">
                    <Check className="w-4 h-4 text-ember-500" />
                  </div>
                  <span className="text-text-secondary">
                    See real-time rankings updated as developers sync their usage
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-ember-500/10">
                    <Check className="w-4 h-4 text-ember-500" />
                  </div>
                  <span className="text-text-secondary">
                    Build streaks and climb the leaderboard with consistent usage
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-ember-500/10">
                    <Check className="w-4 h-4 text-ember-500" />
                  </div>
                  <span className="text-text-secondary">
                    Share your profile and stats with the developer community
                  </span>
                </div>
              </div>

              {/* CTA */}
              <div className="text-center lg:text-left">
                <AuthAwareSimpleCTA unauthenticatedText="Join the Leaderboard" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Section */}
      <section className="py-24 px-6 bg-bg-elevated/50">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-ember-400 to-ember-600 bg-clip-text text-transparent">
                Track & Share
              </span>
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              From real-time dashboards to shareable badges, we've got your AI workflow covered.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group bg-bg-elevated border border-border-subtle rounded-2xl p-6 hover:border-ember-500/50 transition-all hover:shadow-lg hover:shadow-ember-500/10 overflow-hidden">
              <div className="mb-4 -mx-2 -mt-2">
                <DashboardIllustration className="w-full h-40 object-contain" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">Real-time Dashboard</h3>
              <p className="text-text-secondary leading-relaxed">
                Track your tokens, costs, and usage in real-time. See your AI usage patterns with
                beautiful visualizations.
              </p>
            </div>

            <div className="group bg-bg-elevated border border-border-subtle rounded-2xl p-6 hover:border-ember-500/50 transition-all hover:shadow-lg hover:shadow-ember-500/10 overflow-hidden">
              <div className="mb-4 -mx-2 -mt-2">
                <TrophyIllustration className="w-full h-40 object-contain" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">Community Leaderboard</h3>
              <p className="text-text-secondary leading-relaxed">
                See how your usage compares. Filter by tool, model, or time period. Discover trends
                across the developer community.
              </p>
            </div>

            <div className="group bg-bg-elevated border border-border-subtle rounded-2xl p-6 hover:border-ember-500/50 transition-all hover:shadow-lg hover:shadow-ember-500/10 overflow-hidden">
              <div className="mb-4 -mx-2 -mt-2">
                <AnalyticsIllustration className="w-full h-40 object-contain" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">Detailed Analytics</h3>
              <p className="text-text-secondary leading-relaxed">
                Dive deep into your usage patterns. See which models you use most, when you're most
                productive, and how your costs break down.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-8 max-w-2xl mx-auto lg:max-w-none lg:grid-cols-2 lg:px-[16.666%]">
            <div className="group bg-bg-elevated border border-border-subtle rounded-2xl p-6 hover:border-ember-500/50 transition-all hover:shadow-lg hover:shadow-ember-500/10 overflow-hidden">
              <div className="mb-4 -mx-2 -mt-2">
                <ShareIllustration className="w-full h-40 object-contain" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">Shareable Stats</h3>
              <p className="text-text-secondary leading-relaxed">
                Share your stats on social media with beautiful OG images. Embed badges in your
                GitHub README to show off your AI usage.
              </p>
            </div>

            <div className="group bg-bg-elevated border border-border-subtle rounded-2xl p-6 hover:border-ember-500/50 transition-all hover:shadow-lg hover:shadow-ember-500/10 overflow-hidden">
              <div className="mb-4 -mx-2 -mt-2">
                <WrappedIllustration className="w-full h-40 object-contain" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">Yearly Wrapped</h3>
              <p className="text-text-secondary leading-relaxed">
                Get your personalized year-in-review. See your top models, usage highlights, and how
                your AI workflow evolved throughout the year.
              </p>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <p className="text-lg text-text-secondary mb-6">
              Join hundreds of developers tracking their AI usage
            </p>
            <AuthAwareSimpleCTA />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6 bg-bg-base">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              Simple{' '}
              <span className="bg-gradient-to-r from-ember-400 to-ember-600 bg-clip-text text-transparent">
                Pricing
              </span>
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              No credit card required. No hidden fees. Just pure AI tracking goodness.
            </p>
          </div>

          {/* Pricing Card */}
          <Card className="bg-bg-elevated border-2 border-ember-500/30 rounded-3xl overflow-hidden">
            <div className="p-12 text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ember-500/10 border border-ember-500/20 mb-6">
                <Flame className="w-4 h-4 text-ember-500" />
                <span className="text-sm text-ember-500 font-medium">Free Forever</span>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="text-6xl md:text-7xl font-black text-text-primary mb-2">$0</div>
                <div className="text-xl text-text-secondary">Forever. No catch.</div>
              </div>

              {/* Features */}
              <div className="max-w-md mx-auto mb-10">
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-ember-500/10 mt-0.5">
                      <Check className="w-4 h-4 text-ember-500" />
                    </div>
                    <div>
                      <div className="text-text-primary font-medium">Unlimited tracking</div>
                      <div className="text-sm text-text-secondary">
                        Track all your AI tool usage
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-ember-500/10 mt-0.5">
                      <Check className="w-4 h-4 text-ember-500" />
                    </div>
                    <div>
                      <div className="text-text-primary font-medium">All features included</div>
                      <div className="text-sm text-text-secondary">
                        Leaderboards, achievements, analytics, and more
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-ember-500/10 mt-0.5">
                      <Check className="w-4 h-4 text-ember-500" />
                    </div>
                    <div>
                      <div className="text-text-primary font-medium">10+ AI tools supported</div>
                      <div className="text-sm text-text-secondary">
                        Claude, Cursor, ChatGPT, and more
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-ember-500/10 mt-0.5">
                      <Check className="w-4 h-4 text-ember-500" />
                    </div>
                    <div>
                      <div className="text-text-primary font-medium">Shareable stats & badges</div>
                      <div className="text-sm text-text-secondary">
                        Share your stats on social media and GitHub
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-ember-500/10 mt-0.5">
                      <Check className="w-4 h-4 text-ember-500" />
                    </div>
                    <div>
                      <div className="text-text-primary font-medium">Yearly Wrapped</div>
                      <div className="text-sm text-text-secondary">
                        Get your personalized year-in-review
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-ember-500/10 mt-0.5">
                      <Check className="w-4 h-4 text-ember-500" />
                    </div>
                    <div>
                      <div className="text-text-primary font-medium">
                        No limits, no restrictions
                      </div>
                      <div className="text-sm text-text-secondary">Use it as much as you want</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <AuthAwareSimpleCTA
                className="w-full max-w-xs"
                unauthenticatedText="Get Started Now"
              />

              {/* Fine print */}
              <p className="text-sm text-text-tertiary mt-6">
                Built by developers, for developers. Open source and community-driven.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Open Source Section */}
      <section className="py-24 px-6 bg-bg-elevated/30">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ember-500/10 border border-ember-500/20 mb-8">
            <Github className="w-4 h-4 text-ember-500" />
            <span className="text-sm text-ember-500 font-medium">Open Source</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-6">
            Built in the{' '}
            <span className="bg-gradient-to-r from-ember-400 to-ember-600 bg-clip-text text-transparent">
              Open
            </span>
          </h2>

          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Burntop is fully open source. Explore the code, contribute new features, report bugs, or
            fork it and make it your own. Built by the community, for the community.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button asChild variant="ember" size="xl">
              <a
                href="https://github.com/agusmdev/burntop"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-5 h-5" />
                Star on GitHub
              </a>
            </Button>
            <Button asChild variant="ember-outline" size="xl">
              <a
                href="https://github.com/agusmdev/burntop/fork"
                target="_blank"
                rel="noopener noreferrer"
              >
                Fork Repository
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6">
              <div className="text-3xl font-bold text-ember-500 mb-2">MIT</div>
              <div className="text-sm text-text-secondary">Licensed</div>
            </div>
            <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6">
              <div className="text-3xl font-bold text-text-primary mb-2">100%</div>
              <div className="text-sm text-text-secondary">Free & Open</div>
            </div>
            <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6">
              <div className="text-3xl font-bold text-text-primary mb-2">
                <Heart className="w-8 h-8 text-ember-500 fill-ember-500 mx-auto" />
              </div>
              <div className="text-sm text-text-secondary">Community Driven</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
