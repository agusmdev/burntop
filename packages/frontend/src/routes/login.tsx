/**
 * Login Page
 *
 * Authentication page for burntop.
 * Users can sign in with email/password or OAuth providers.
 *
 * @see Plan Phase 2.4 - Auth UI
 */

import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Github } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useLoginApiV1AuthLoginPost } from '@/api/authentication/authentication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSessionToken, handleLoginSuccess } from '@/lib/auth/client';

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
  const queryClient = useQueryClient();
  const { error, error_description } = Route.useSearch();
  const loginMutation = useLoginApiV1AuthLoginPost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      },
    },
  });
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
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

  const handleEmailLogin = async () => {
    // Validate required fields
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const result = await loginMutation.mutateAsync({
        data: {
          email: formData.email,
          password: formData.password,
        },
      });

      // Extract session token from response (Orval returns {status, data})
      if (result.status === 200 && 'data' in result && result.data.token) {
        toast.success('Signed in successfully!');
        handleLoginSuccess(result.data.token, '/dashboard');
      } else {
        toast.error('Sign in failed', {
          description: 'Invalid response from server',
        });
      }
    } catch (error) {
      toast.error('Failed to sign in', {
        description: error instanceof Error ? error.message : 'Invalid email or password',
      });
    }
  };

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
            <span className="text-3xl font-black text-text-inverse">B</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome to burntop</h1>
          <p className="text-text-secondary">Track your AI usage, compete with friends</p>
        </div>

        {/* Auth Card */}
        <div className="bg-bg-elevated border border-border-default rounded-lg p-8 shadow-sm">
          {/* Email/Password Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loginMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loginMutation.isPending}
              />
            </div>

            <Button
              variant="ember"
              size="lg"
              className="w-full"
              type="button"
              disabled={loginMutation.isPending}
              onClick={handleEmailLogin}
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-default"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-bg-elevated px-2 text-text-muted">Or continue with</span>
            </div>
          </div>

          {/* Social Auth Buttons */}
          <div className="space-y-3">
            {/* GitHub Login Button */}
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleGitHubLogin}
              type="button"
              disabled={isOauthLoading || loginMutation.isPending}
            >
              <Github className="w-5 h-5" />
              {oauthLoading === 'github' ? 'Redirecting...' : 'GitHub'}
            </Button>
          </div>

          {/* Signup Link */}
          <p className="text-sm text-text-muted text-center mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-ember-500 hover:text-ember-400 font-medium">
              Create one
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
