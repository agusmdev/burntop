/**
 * Login Page
 *
 * Authentication page for burntop.
 * Users can sign in with GitHub OAuth only.
 *
 * @see Plan Phase 2.4 - Auth UI
 */

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Github } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { getSessionToken } from '@/lib/auth/client';

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      error: (search.error as string) || undefined,
      error_description: (search.error_description as string) || undefined,
    };
  },
});

function LoginPage() {
  const navigate = useNavigate();
  const { error, error_description } = Route.useSearch();
  const [oauthLoading, setOauthLoading] = useState<'github' | null>(null);

  // Show error toast if there's an auth error from callback
  useEffect(() => {
    if (error) {
      toast.error('Authentication failed', {
        description: error_description || error,
      });
      // Clear error from URL
      navigate({
        to: '/login',
        search: { error: undefined, error_description: undefined },
        replace: true,
      });
    }
  }, [error, error_description, navigate]);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const token = getSessionToken();
    if (token) {
      navigate({ to: '/dashboard' });
    }
  }, [navigate]);

  const handleGitHubLogin = () => {
    setOauthLoading('github');
    // Redirect to FastAPI OAuth authorization endpoint
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    window.location.href = `${apiUrl}/api/v1/auth/oauth/github`;
  };

  const isOauthLoading = oauthLoading !== null;

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-ember-500 to-ember-600 mb-4 shadow-lg shadow-ember-500/20">
            <img
              src="/flame_icon_only.svg"
              alt=""
              className="w-10 h-10 [filter:brightness(0)_invert(1)]"
            />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome to burntop</h1>
          <p className="text-text-secondary">Track your AI usage, compete with friends</p>
        </div>

        {/* Auth Card */}
        <div className="bg-bg-elevated border border-border-default rounded-lg p-8 shadow-sm">
          {/* GitHub Login Button */}
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleGitHubLogin}
            type="button"
            disabled={isOauthLoading}
          >
            <Github className="w-5 h-5" />
            {oauthLoading === 'github' ? 'Redirecting...' : 'Continue with GitHub'}
          </Button>

          {/* Signup Link */}
          <p className="text-sm text-text-muted text-center mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-ember-500 hover:text-ember-400 font-medium">
              Sign up with GitHub
            </Link>
          </p>
        </div>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-ember-500">🔥</div>
            <p className="text-xs text-text-muted mt-1">Track streaks</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-ember-500">🏆</div>
            <p className="text-xs text-text-muted mt-1">Earn badges</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-ember-500">📊</div>
            <p className="text-xs text-text-muted mt-1">Compare stats</p>
          </div>
        </div>
      </div>
    </div>
  );
}
