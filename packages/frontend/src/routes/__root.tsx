import { TanStackDevtools } from '@tanstack/react-devtools';
import { QueryClientProvider } from '@tanstack/react-query';
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { useEffect } from 'react';

import { Plausible } from '../components/Plausible';
import { Toaster } from '../components/ui/sonner';
import { registerServiceWorker } from '../lib/register-sw';
import { queryClient } from '../router';
import appCss from '../styles.css?url';

import type { ReactNode } from 'react';

export const Route = createRootRoute({
  head: () => ({
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
        name: 'theme-color',
        content: '#FF6B00',
      },
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
    ],
  }),

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
