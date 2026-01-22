import { TanStackDevtools } from '@tanstack/react-devtools';
import { QueryClientProvider } from '@tanstack/react-query';
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { useEffect } from 'react';

import { Plausible } from '../components/Plausible';
import { Toaster } from '../components/ui/sonner';
import { Umami } from '../components/Umami';
import { registerServiceWorker } from '../lib/register-sw';
import {
  DEFAULT_OG_IMAGE,
  generateOGMeta,
  generateOrganizationSchema,
  generateTwitterCardMeta,
  createJsonLdTag,
  getBaseUrl,
} from '../lib/seo';
import { queryClient } from '../router';
import appCss from '../styles.css?url';

import type { ReactNode } from 'react';

export const Route = createRootRoute({
  head: () => {
    const baseUrl = getBaseUrl();
    const defaultOgImage = `${baseUrl}${DEFAULT_OG_IMAGE}`;

    return {
      meta: [
        {
          charSet: 'utf-8',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        {
          title: 'burntop.dev - Gamified AI Usage Tracking',
        },
        {
          name: 'description',
          content:
            'Track your AI tool usage across Claude, Cursor, and more. Analyze costs, usage patterns, and share your stats with the developer community.',
        },
        {
          name: 'keywords',
          content:
            'AI usage tracking, Claude, Cursor, ChatGPT, analytics, dashboard, leaderboard, developer tools',
        },
        {
          name: 'theme-color',
          content: '#FF6B00',
        },
        ...generateOGMeta({
          title: 'burntop.dev - Gamified AI Usage Tracking',
          description:
            'Track your AI tool usage across Claude, Cursor, and more. Analyze costs, usage patterns, and share your stats with the developer community.',
          url: baseUrl,
          image: defaultOgImage,
          type: 'website',
        }),
        ...generateTwitterCardMeta({
          title: 'burntop.dev - Gamified AI Usage Tracking',
          description:
            'Track your AI tool usage across Claude, Cursor, and more. Analyze costs, usage patterns, and share your stats with the developer community.',
          image: defaultOgImage,
          card: 'summary_large_image',
        }),
      ],
      links: [
        {
          rel: 'stylesheet',
          href: appCss,
        },
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/favicon.svg',
        },
        {
          rel: 'icon',
          type: 'image/x-icon',
          href: '/favicon.ico',
        },
        {
          rel: 'apple-touch-icon',
          href: '/flame_logo_512px.png',
        },
        {
          rel: 'manifest',
          href: '/manifest.json',
        },
        {
          rel: 'canonical',
          href: baseUrl,
        },
      ],
      scripts: [createJsonLdTag(generateOrganizationSchema())],
    };
  },

  component: RootComponent,
  shellComponent: RootDocument,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  // Register service worker on mount (client-side only)
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <html lang="en">
      <head>
        <HeadContent />
        <Plausible />
        <Umami />
      </head>
      <body>
        {children}
        <Toaster />
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
