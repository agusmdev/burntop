/**
 * OAuth Callback Page
 *
 * Handles OAuth callbacks from GitHub/Twitter via FastAPI backend.
 * Extracts session token from URL and redirects to dashboard.
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { handleLoginSuccess } from '@/lib/auth/client';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || undefined,
      error: (search.error as string) || undefined,
      error_description: (search.error_description as string) || undefined,
    };
  },
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { token, error, error_description } = Route.useSearch();

  useEffect(() => {
    // Handle OAuth error
    if (error) {
      toast.error('Authentication failed', {
        description: error_description || error,
      });
      navigate({
        to: '/login',
        search: { error, error_description },
      });
      return;
    }

    // Handle successful OAuth
    if (token) {
      toast.success('Signed in successfully!');
      handleLoginSuccess(token, '/dashboard');
      return;
    }

    // No token or error - something went wrong
    toast.error('Authentication failed', {
      description: 'No session token received from OAuth provider',
    });
    navigate({ to: '/login' });
  }, [token, error, error_description, navigate]);

  // Show loading state while processing OAuth callback
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-ember-500 to-ember-600 mb-4 shadow-lg shadow-ember-500/20 animate-pulse">
          <span className="text-3xl font-black text-text-inverse">B</span>
        </div>
        <p className="text-text-secondary">Completing authentication...</p>
      </div>
    </div>
  );
}
