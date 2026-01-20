/**
 * Wrapped Page - Annual Summary Experience
 *
 * Interactive slideshow-style summary of user's year in AI usage.
 * Displays stats, achievements, trends, and predictions in an engaging format.
 *
 * TODO: Implement backend endpoint GET /api/v1/wrapped/{year} for full functionality
 *
 * @see Plan Phase 13.3 - Wrapped UI
 */

import { createFileRoute, Link, Navigate } from '@tanstack/react-router';

import { PageLayout } from '@/components/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/lib/auth/client';

export const Route = createFileRoute('/wrapped')({
  component: WrappedPage,
  head: () => ({
    meta: [
      {
        title: 'Wrapped - Your Year in AI - burntop.dev',
      },
      {
        name: 'description',
        content:
          'Your annual AI usage summary. See your top models, total tokens, longest streak, achievements unlocked, and predictions for next year.',
      },
    ],
  }),
});

function WrappedPage() {
  const { user, isLoading } = useUser();

  // Show loading skeleton while checking auth
  if (isLoading) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gradient-to-br from-bg-base via-bg-elevated to-bg-base">
          <div className="container mx-auto px-4 py-8">
            <div className="relative mx-auto max-w-4xl">
              <Card className="bg-bg-elevated border-border-default">
                <CardHeader>
                  <Skeleton className="h-9 w-48 mx-auto" />
                </CardHeader>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center gap-6">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-20 w-80" />
                    <Skeleton className="h-10 w-36" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" search={{ error: undefined, error_description: undefined }} />;
  }

  const currentYear = new Date().getFullYear();

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-bg-base via-bg-elevated to-bg-base">
        <div className="container mx-auto px-4 py-8">
          <div className="relative mx-auto max-w-4xl">
            <Card className="bg-bg-elevated border-border-default">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-text-primary text-center">
                  {currentYear} Wrapped
                </CardTitle>
              </CardHeader>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center gap-6 text-center">
                  <div className="text-6xl">🚧</div>
                  <div>
                    <h3 className="text-2xl font-semibold text-text-primary mb-3">Coming Soon!</h3>
                    <p className="text-text-secondary max-w-md mb-6">
                      Your annual AI usage summary is being prepared. Check back later to see your
                      top models, total tokens, longest streak, and more!
                    </p>
                    <div className="text-sm text-text-tertiary mb-8">
                      This feature requires backend implementation of the Wrapped API endpoint.
                    </div>
                  </div>
                  <Button asChild variant="default">
                    <Link to="/dashboard">Go to Dashboard</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
