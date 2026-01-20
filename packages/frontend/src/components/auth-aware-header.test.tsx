import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthAwareHeader } from './auth-aware-header';

// Mock the auth client
vi.mock('@/lib/auth/client', () => ({
  useUser: vi.fn(),
  handleLogout: vi.fn(),
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

// Mock user objects with all required fields
const createMockUser = (overrides = {}) => ({
  id: '1',
  username: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  email_verified: true,
  is_public: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  image: null,
  ...overrides,
});

describe('AuthAwareHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the logo', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareHeader />);

    expect(screen.getByText('burntop')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareHeader />);

    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Follow')).toBeInTheDocument();
  });

  it('shows skeleton when loading', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
    });

    const { container } = render(<AuthAwareHeader />);

    const skeleton = container.querySelector('[class*="animate-pulse"]');
    expect(skeleton).toBeInTheDocument();
  });

  it('shows "Get Started" button for unauthenticated users', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareHeader />);

    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('links "Get Started" to /login', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareHeader />);

    const link = screen.getByText('Get Started').closest('a');
    expect(link).toHaveAttribute('href', '/login');
  });

  it('shows user avatar for authenticated users', () => {
    vi.mocked(useUser).mockReturnValue({
      user: createMockUser({ image: 'https://example.com/avatar.jpg' }),
      isLoading: false,
      isAuthenticated: true,
      error: null,
    });

    render(<AuthAwareHeader />);

    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('shows initials when no avatar image', () => {
    vi.mocked(useUser).mockReturnValue({
      user: createMockUser({ image: null }),
      isLoading: false,
      isAuthenticated: true,
      error: null,
    });

    render(<AuthAwareHeader />);

    // Should show initials "TU" for "Test User"
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('shows initials from username when no name', () => {
    vi.mocked(useUser).mockReturnValue({
      user: createMockUser({ username: 'johndoe', name: null, image: null }),
      isLoading: false,
      isAuthenticated: true,
      error: null,
    });

    render(<AuthAwareHeader />);

    // Should show initials "J" for "johndoe"
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('does not show "Get Started" button for authenticated users', () => {
    vi.mocked(useUser).mockReturnValue({
      user: createMockUser(),
      isLoading: false,
      isAuthenticated: true,
      error: null,
    });

    render(<AuthAwareHeader />);

    expect(screen.queryByText('Get Started')).not.toBeInTheDocument();
  });

  it('logo links to home', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareHeader />);

    const logoLink = screen.getByText('burntop').closest('a');
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('applies custom className', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    const { container } = render(<AuthAwareHeader className="custom-header" />);

    const header = container.querySelector('header');
    expect(header).toHaveClass('custom-header');
  });

  it('renders GitHub link with correct URL', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareHeader />);

    const githubLinks = screen.getAllByText('GitHub');
    const navGithubLink = githubLinks[0].closest('a');
    expect(navGithubLink).toHaveAttribute('href', 'https://github.com/agusmdev/burntop');
    expect(navGithubLink).toHaveAttribute('target', '_blank');
    expect(navGithubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders X (Twitter) link', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    render(<AuthAwareHeader />);

    const followLink = screen.getByText('Follow').closest('a');
    expect(followLink).toHaveAttribute('href', 'https://x.com/agusmdev');
    expect(followLink).toHaveAttribute('target', '_blank');
  });
});
