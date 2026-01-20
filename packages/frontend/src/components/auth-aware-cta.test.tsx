import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthAwareCTA, AuthAwareSimpleCTA } from './auth-aware-cta';

// Mock the auth client
vi.mock('@/lib/auth/client', () => ({
  useUser: vi.fn(),
}));

// Mock TanStack Router Link
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

import { useUser } from '@/lib/auth/client';

// Mock user object with all required fields
const mockUser = {
  id: '1',
  username: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  email_verified: true,
  is_public: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  image: null,
};

describe('AuthAwareCTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeleton when loading', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
    });

    const { container } = render(<AuthAwareCTA />);

    // Skeleton should be present
    const skeleton = container.querySelector('[class*="animate-pulse"]');
    expect(skeleton).toBeInTheDocument();
  });

  it('shows "Get Started Free" for unauthenticated users', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareCTA />);

    expect(screen.getByText('Get Started Free')).toBeInTheDocument();
    expect(screen.queryByText('Go to Dashboard')).not.toBeInTheDocument();
  });

  it('links to /login for unauthenticated users', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareCTA />);

    const link = screen.getByText('Get Started Free').closest('a');
    expect(link).toHaveAttribute('href', '/login');
  });

  it('shows "Go to Dashboard" for authenticated users', () => {
    vi.mocked(useUser).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      error: null,
    });

    render(<AuthAwareCTA />);

    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Get Started Free')).not.toBeInTheDocument();
  });

  it('links to /dashboard for authenticated users', () => {
    vi.mocked(useUser).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      error: null,
    });

    render(<AuthAwareCTA />);

    const link = screen.getByText('Go to Dashboard').closest('a');
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('shows "View Leaderboard" button when not loading', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareCTA />);

    expect(screen.getByText('View Leaderboard')).toBeInTheDocument();
  });

  it('hides secondary button during loading', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareCTA />);

    expect(screen.queryByText('View Leaderboard')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    const { container } = render(<AuthAwareCTA className="custom-cta" />);

    expect(container.firstChild).toHaveClass('custom-cta');
  });
});

describe('AuthAwareSimpleCTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeleton when loading', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
    });

    const { container } = render(<AuthAwareSimpleCTA />);

    const skeleton = container.querySelector('[class*="animate-pulse"]');
    expect(skeleton).toBeInTheDocument();
  });

  it('shows default unauthenticated text', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareSimpleCTA />);

    expect(screen.getByText('Start Tracking for Free')).toBeInTheDocument();
  });

  it('shows custom unauthenticated text', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareSimpleCTA unauthenticatedText="Sign Up Now" />);

    expect(screen.getByText('Sign Up Now')).toBeInTheDocument();
  });

  it('shows default authenticated text', () => {
    vi.mocked(useUser).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      error: null,
    });

    render(<AuthAwareSimpleCTA />);

    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('shows custom authenticated text', () => {
    vi.mocked(useUser).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      error: null,
    });

    render(<AuthAwareSimpleCTA authenticatedText="View Stats" />);

    expect(screen.getByText('View Stats')).toBeInTheDocument();
  });

  it('links to /login for unauthenticated users', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareSimpleCTA />);

    const link = screen.getByText('Start Tracking for Free').closest('a');
    expect(link).toHaveAttribute('href', '/login');
  });

  it('links to /dashboard for authenticated users', () => {
    vi.mocked(useUser).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      error: null,
    });

    render(<AuthAwareSimpleCTA />);

    const link = screen.getByText('Go to Dashboard').closest('a');
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('applies custom className', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareSimpleCTA className="custom-simple-cta" />);

    const button = screen.getByText('Start Tracking for Free').closest('a');
    expect(button).toHaveClass('custom-simple-cta');
  });
});
