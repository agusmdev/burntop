/**
 * Badge Showcase Page
 *
 * Documentation page showing all available badge variants with embed codes.
 * Helps users integrate burntop badges into their GitHub READMEs, websites, etc.
 *
 * @see Plan Phase 12.3 - Badge Documentation
 */

import { createFileRoute } from '@tanstack/react-router';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { handleLogout, useUser } from '@/lib/auth/client';
import { createOptionalAuthRoute } from '@/lib/auth/protected-route';

export const Route = createFileRoute('/badges')({
  component: BadgesPage,
  head: () => ({
    meta: [
      {
        title: 'Badge Showcase - burntop.dev',
      },
      {
        name: 'description',
        content:
          'Embed your burntop stats anywhere with customizable SVG badges. Perfect for GitHub READMEs, personal websites, and portfolios.',
      },
    ],
  }),
  ...createOptionalAuthRoute({}),
});

interface BadgeExample {
  title: string;
  description: string;
  variant: string;
  params?: string;
  previewUrl: string;
}

const BADGE_EXAMPLES: BadgeExample[] = [
  {
    title: 'Compact Badge',
    description: 'Minimal badge showing total tokens only',
    variant: 'compact',
    params: '',
    previewUrl: '/api/badge/demo?variant=compact',
  },
  {
    title: 'Standard Badge',
    description: 'Shows tokens, streak, and level',
    variant: 'standard',
    params: '',
    previewUrl: '/api/badge/demo?variant=standard',
  },
  {
    title: 'Detailed Badge',
    description: 'Full stats including tokens, cost, streak, level, and achievements',
    variant: 'detailed',
    params: '',
    previewUrl: '/api/badge/demo?variant=detailed',
  },
  {
    title: 'Streak Badge',
    description: 'Shows current streak only',
    variant: 'streak',
    params: '',
    previewUrl: '/api/badge/demo?variant=streak',
  },
  {
    title: 'Level Badge',
    description: 'Shows current level only',
    variant: 'level',
    params: '',
    previewUrl: '/api/badge/demo?variant=level',
  },
];

const BADGE_STYLES = [
  { value: 'flat', label: 'Flat (default)' },
  { value: 'flat-square', label: 'Flat Square' },
  { value: 'plastic', label: 'Plastic' },
  { value: 'for-the-badge', label: 'For The Badge' },
];

const BADGE_THEMES = [
  { value: 'dark', label: 'Dark (default)' },
  { value: 'light', label: 'Light' },
];

function BadgesPage() {
  const { user } = useUser();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract username from user data if logged in
  // User data from /auth/me endpoint includes these fields
  interface AuthUser {
    username?: string;
    email?: string;
    name?: string;
    image?: string;
  }
  const userData = user as AuthUser | null;
  const username = userData?.username || userData?.email?.split('@')[0] || 'your-username';

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateMarkdown = (variant: string, style?: string, theme?: string) => {
    const params = new URLSearchParams();
    if (variant !== 'standard') params.append('variant', variant);
    if (style && style !== 'flat') params.append('style', style);
    if (theme && theme !== 'dark') params.append('theme', theme);

    const queryString = params.toString();
    const badgeUrl = `https://burntop.dev/api/badge/${username}${queryString ? `?${queryString}` : ''}`;
    const profileUrl = `https://burntop.dev/p/${username}`;

    return `[![burntop stats](${badgeUrl})](${profileUrl})`;
  };

  const generateHtml = (variant: string, style?: string, theme?: string) => {
    const params = new URLSearchParams();
    if (variant !== 'standard') params.append('variant', variant);
    if (style && style !== 'flat') params.append('style', style);
    if (theme && theme !== 'dark') params.append('theme', theme);

    const queryString = params.toString();
    const badgeUrl = `https://burntop.dev/api/badge/${username}${queryString ? `?${queryString}` : ''}`;
    const profileUrl = `https://burntop.dev/p/${username}`;

    return `<a href="${profileUrl}">
  <img src="${badgeUrl}" alt="burntop stats" />
</a>`;
  };

  const topNavUser = user
    ? {
        name: userData?.name || 'User',
        username: username,
        avatarUrl: userData?.image || undefined,
      }
    : undefined;

  const PageContent = () => (
    <div className="px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Badge Showcase</h1>
          <p className="text-text-secondary">
            Embed your burntop stats anywhere with these customizable SVG badges.
          </p>
        </div>

        {/* Introduction Card */}
        <Card className="bg-bg-elevated border-border-default mb-8">
          <CardHeader>
            <CardTitle className="text-text-primary">Getting Started</CardTitle>
            <CardDescription className="text-text-secondary">
              Add these badges to your GitHub README, personal website, or anywhere that supports
              images.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-2">Quick Start</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-text-secondary">
                <li>Choose a badge variant below</li>
                <li>Copy the Markdown or HTML code</li>
                <li>Paste it into your README or website</li>
                <li>Replace "your-username" with your actual username</li>
              </ol>
            </div>
            <div className="p-4 bg-bg-surface border border-border-default rounded-lg">
              <p className="text-xs text-text-tertiary mb-2">Example for GitHub README:</p>
              <code className="text-xs text-ember-400 break-all">
                {generateMarkdown('standard')}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Badge Variants */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-bold text-text-primary">Badge Variants</h2>
          {BADGE_EXAMPLES.map((example, index) => (
            <Card key={index} className="bg-bg-elevated border-border-default">
              <CardHeader>
                <CardTitle className="text-text-primary">{example.title}</CardTitle>
                <CardDescription className="text-text-secondary">
                  {example.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview */}
                <div className="p-6 bg-bg-surface border border-border-default rounded-lg flex items-center justify-center">
                  <img
                    src={example.previewUrl}
                    alt={example.title}
                    className="max-w-full"
                    onError={(e) => {
                      // eslint-disable-next-line no-undef
                      if (e.target instanceof HTMLImageElement) {
                        e.target.src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="20"%3E%3Ctext x="50%25" y="15" text-anchor="middle" fill="%23999"%3EPreview unavailable%3C/text%3E%3C/svg%3E';
                      }
                    }}
                  />
                </div>

                {/* Code Tabs */}
                <Tabs defaultValue="markdown" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="markdown">Markdown</TabsTrigger>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                  </TabsList>
                  <TabsContent value="markdown" className="mt-4">
                    <div className="relative">
                      <pre className="p-4 bg-bg-surface border border-border-default rounded-lg overflow-x-auto text-xs text-text-secondary">
                        {generateMarkdown(example.variant)}
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => handleCopy(generateMarkdown(example.variant), `md-${index}`)}
                      >
                        {copiedId === `md-${index}` ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="html" className="mt-4">
                    <div className="relative">
                      <pre className="p-4 bg-bg-surface border border-border-default rounded-lg overflow-x-auto text-xs text-text-secondary">
                        {generateHtml(example.variant)}
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => handleCopy(generateHtml(example.variant), `html-${index}`)}
                      >
                        {copiedId === `html-${index}` ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Customization Options */}
        <Card className="bg-bg-elevated border-border-default mb-8">
          <CardHeader>
            <CardTitle className="text-text-primary">Customization Options</CardTitle>
            <CardDescription className="text-text-secondary">
              Customize badges with query parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Styles */}
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-3">Styles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BADGE_STYLES.map((style) => (
                  <div key={style.value} className="space-y-2">
                    <p className="text-xs text-text-tertiary">{style.label}</p>
                    <div className="p-3 bg-bg-surface border border-border-default rounded flex items-center justify-center">
                      <img
                        src={`/api/badge/demo?style=${style.value}`}
                        alt={style.label}
                        className="max-w-full"
                      />
                    </div>
                    <code className="text-xs text-ember-400 block">?style={style.value}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Themes */}
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-3">Themes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BADGE_THEMES.map((theme) => (
                  <div key={theme.value} className="space-y-2">
                    <p className="text-xs text-text-tertiary">{theme.label}</p>
                    <div className="p-3 bg-bg-surface border border-border-default rounded flex items-center justify-center">
                      <img
                        src={`/api/badge/demo?theme=${theme.value}`}
                        alt={theme.label}
                        className="max-w-full"
                      />
                    </div>
                    <code className="text-xs text-ember-400 block">?theme={theme.value}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Color */}
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-3">Custom Color</h3>
              <p className="text-sm text-text-secondary mb-3">
                Add <code className="text-ember-400">?color=HEX</code> to use a custom accent color
                (without the #).
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-bg-surface border border-border-default rounded flex items-center justify-center">
                  <img
                    src="/api/badge/demo?color=3B82F6"
                    alt="Custom blue color"
                    className="max-w-full"
                  />
                </div>
                <code className="text-xs text-ember-400 block">?color=3B82F6</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Documentation */}
        <Card className="bg-bg-elevated border-border-default">
          <CardHeader>
            <CardTitle className="text-text-primary">API Reference</CardTitle>
            <CardDescription className="text-text-secondary">
              Badge endpoint documentation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-2">Endpoint</h3>
              <code className="text-sm text-ember-400">
                GET https://burntop.dev/api/badge/:username
              </code>
            </div>

            <div>
              <h3 className="text-sm font-medium text-text-primary mb-2">Query Parameters</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border-default">
                    <tr>
                      <th className="text-left py-2 px-3 text-text-primary">Parameter</th>
                      <th className="text-left py-2 px-3 text-text-primary">Type</th>
                      <th className="text-left py-2 px-3 text-text-primary">Options</th>
                      <th className="text-left py-2 px-3 text-text-primary">Default</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-secondary">
                    <tr className="border-b border-border-subtle">
                      <td className="py-2 px-3">
                        <code className="text-ember-400">variant</code>
                      </td>
                      <td className="py-2 px-3">string</td>
                      <td className="py-2 px-3">compact, standard, detailed, streak, level</td>
                      <td className="py-2 px-3">standard</td>
                    </tr>
                    <tr className="border-b border-border-subtle">
                      <td className="py-2 px-3">
                        <code className="text-ember-400">style</code>
                      </td>
                      <td className="py-2 px-3">string</td>
                      <td className="py-2 px-3">flat, flat-square, plastic, for-the-badge</td>
                      <td className="py-2 px-3">flat</td>
                    </tr>
                    <tr className="border-b border-border-subtle">
                      <td className="py-2 px-3">
                        <code className="text-ember-400">theme</code>
                      </td>
                      <td className="py-2 px-3">string</td>
                      <td className="py-2 px-3">dark, light</td>
                      <td className="py-2 px-3">dark</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">
                        <code className="text-ember-400">color</code>
                      </td>
                      <td className="py-2 px-3">string</td>
                      <td className="py-2 px-3">Hex color (without #)</td>
                      <td className="py-2 px-3">FF6B00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-text-primary mb-2">Example</h3>
              <code className="text-xs text-ember-400 block p-3 bg-bg-surface border border-border-default rounded">
                https://burntop.dev/api/badge/alice?variant=detailed&style=flat-square&theme=dark
              </code>
            </div>

            <div>
              <h3 className="text-sm font-medium text-text-primary mb-2">Notes</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
                <li>Badges are cached for 15 minutes for optimal performance</li>
                <li>Private profiles will return a "Private profile" error badge</li>
                <li>Non-existent users will return a "User not found" error badge</li>
                <li>All badges are generated as SVG for crisp rendering at any size</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (user && topNavUser) {
    return (
      <DashboardLayout user={topNavUser} onSignOut={() => handleLogout('/')}>
        <PageContent />
      </DashboardLayout>
    );
  }

  // Public access (no login required)
  return (
    <div className="min-h-screen bg-bg-base">
      <PageContent />
    </div>
  );
}
