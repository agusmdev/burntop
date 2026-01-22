/**
 * Signup Page
 *
 * Registration page for burntop.
 * Users can create an account with GitHub OAuth only.
 *
 * @see Plan Phase 2.4 - Auth UI
 */

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Github } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/auth/client';

export const Route = createFileRoute('/signup')({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [oauthLoading, setOauthLoading] = useState<'github' | null>(null);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate({ to: '/dashboard' });
    }
  }, [user, navigate]);

  const handleGitHubSignup = () => {
    setOauthLoading('github');
    // Redirect to FastAPI OAuth authorization endpoint
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    window.location.href = `${apiUrl}/api/v1/auth/oauth/github`;
  };

  const isOauthLoading = oauthLoading !== null;

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4 py-8">
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
          <h1 className="text-3xl font-bold text-text-primary mb-2">Create your account</h1>
          <p className="text-text-secondary">Join burntop and start tracking your AI usage</p>
        </div>

        {/* Auth Card */}
        <div className="bg-bg-elevated border border-border-default rounded-lg p-8 shadow-sm">
          {/* GitHub Signup Button */}
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleGitHubSignup}
            type="button"
            disabled={isOauthLoading}
          >
            <Github className="w-5 h-5" />
            {oauthLoading === 'github' ? 'Redirecting...' : 'Continue with GitHub'}
          </Button>

          {/* Login Link */}
          <p className="text-sm text-text-muted text-center mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              search={{ error: undefined, error_description: undefined }}
              className="text-ember-500 hover:text-ember-400 font-medium"
            >
              Sign in with GitHub
            </Link>
          </p>
        </div>

        {/* Privacy Notice */}
        <p className="text-xs text-text-muted text-center mt-4">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
