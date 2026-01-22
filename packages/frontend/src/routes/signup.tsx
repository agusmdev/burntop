/**
 * Signup Page
 *
 * Email/password registration page for burntop.
 * Users can create an account with email and password.
 *
 * @see Plan Phase 2.4 - Auth UI
 */

import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Github } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useRegisterApiV1AuthRegisterPost } from '@/api/authentication/authentication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { handleLoginSuccess, useUser } from '@/lib/auth/client';

// Zod schema for form validation
const signupSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username must contain only letters, numbers, and underscores'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const Route = createFileRoute('/signup')({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const registerMutation = useRegisterApiV1AuthRegisterPost({
    mutation: {
      onError: (error) => {
        toast.error('Failed to create account', {
          description: error instanceof Error ? error.message : 'Please try again later',
        });
      },
      onSuccess: () => {
        // Invalidate auth queries to refresh auth state
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      },
    },
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [oauthLoading, setOauthLoading] = useState<'github' | null>(null);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate({ to: '/dashboard' });
    }
  }, [user, navigate]);

  const handleEmailSignup = async () => {
    // Validate form data using Zod schema
    const validationResult = signupSchema.safeParse(formData);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      toast.error(firstError.message);
      return;
    }

    try {
      const result = await registerMutation.mutateAsync({
        data: {
          email: validationResult.data.email,
          password: validationResult.data.password,
          username: validationResult.data.username,
          name: validationResult.data.name,
        },
      });

      // Extract session token from response (Orval returns {status, data})
      if (result.status === 201 && 'data' in result && result.data.token) {
        toast.success('Account created successfully!');
        handleLoginSuccess(result.data.token, '/dashboard');
      } else {
        toast.error('Registration failed', {
          description: 'Invalid response from server',
        });
      }
    } catch {
      // Error is handled by mutation's onError callback
    }
  };

  const handleGitHubSignup = () => {
    setOauthLoading('github');
    // Redirect to FastAPI OAuth authorization endpoint
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    window.location.href = `${apiUrl}/api/v1/auth/oauth/github`;
  };

  const isOauthLoading = oauthLoading !== null;
  const isFormDisabled = registerMutation.isPending || isOauthLoading;

  // Don't block on isPending - render form immediately
  // Redirect will happen via useEffect when session is detected
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
          {/* Email/Password Form - using div instead of form to avoid hydration issues */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isFormDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="your_username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={isFormDisabled}
              />
              <p className="text-xs text-text-muted">
                3-30 characters, letters, numbers, and underscores only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isFormDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={isFormDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                disabled={isFormDisabled}
              />
            </div>

            <Button
              variant="ember"
              size="lg"
              className="w-full"
              type="button"
              disabled={isFormDisabled}
              onClick={handleEmailSignup}
            >
              {registerMutation.isPending ? 'Creating account...' : 'Create account'}
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
            {/* GitHub Signup Button */}
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleGitHubSignup}
              type="button"
              disabled={isOauthLoading || registerMutation.isPending}
            >
              <Github className="w-5 h-5" />
              {oauthLoading === 'github' ? 'Redirecting...' : 'GitHub'}
            </Button>
          </div>

          {/* Login Link */}
          <p className="text-sm text-text-muted text-center mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              search={{ error: undefined, error_description: undefined }}
              className="text-ember-500 hover:text-ember-400 font-medium"
            >
              Sign in
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
