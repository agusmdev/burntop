import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FollowersAvatarStack, FollowersAvatarStackSkeleton } from './followers-avatar-stack';

// Mock followers data
const mockFollowers = [
  {
    id: '1',
    username: 'john_doe',
    name: 'John Doe',
    image: 'https://example.com/john.jpg',
  },
  {
    id: '2',
    username: 'jane_smith',
    name: 'Jane Smith',
    image: 'https://example.com/jane.jpg',
  },
  {
    id: '3',
    username: 'bob_wilson',
    name: 'Bob Wilson',
    image: null,
  },
  {
    id: '4',
    username: 'alice_brown',
    name: null,
    image: null,
  },
  {
    id: '5',
    username: 'charlie_davis',
    name: 'Charlie Davis',
    image: 'https://example.com/charlie.jpg',
  },
  {
    id: '6',
    username: 'diana_evans',
    name: 'Diana Evans',
    image: null,
  },
];

describe('FollowersAvatarStack', () => {
  it('renders null when no followers', () => {
    const { container } = render(<FollowersAvatarStack followers={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders avatars for followers', () => {
    render(<FollowersAvatarStack followers={mockFollowers.slice(0, 2)} />);

    // Should render avatar images
    const images = screen.getAllByRole('img');
    expect(images.length).toBe(2);
  });

  it('limits display to maxDisplay', () => {
    render(<FollowersAvatarStack followers={mockFollowers} maxDisplay={3} />);

    // Should show 3 avatars + 1 remaining count
    const avatars = screen.getAllByRole('img');
    expect(avatars.length).toBeLessThanOrEqual(3);
  });

  it('shows remaining count when there are more followers', () => {
    render(
      <FollowersAvatarStack followers={mockFollowers} maxDisplay={3} totalCount={10} />
    );

    // Should show "+7" (10 - 3)
    expect(screen.getByText('+7')).toBeInTheDocument();
  });

  it('caps remaining count at 99+', () => {
    render(
      <FollowersAvatarStack followers={mockFollowers} maxDisplay={3} totalCount={150} />
    );

    // Should show "+99" not "+147"
    expect(screen.getByText('+99')).toBeInTheDocument();
  });

  it('shows initials for avatars without images', () => {
    render(
      <FollowersAvatarStack
        followers={[{ id: '1', username: 'testuser', name: 'Test User', image: null }]}
      />
    );

    // Should show initials "TU"
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('shows initials from username when no name', () => {
    render(
      <FollowersAvatarStack
        followers={[{ id: '1', username: 'testuser', name: null, image: null }]}
      />
    );

    // Should show initials "T"
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('shows ? for empty name', () => {
    render(
      <FollowersAvatarStack
        followers={[{ id: '1', username: '', name: null, image: null }]}
      />
    );

    // Should show "?"
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  describe('size variants', () => {
    it('applies small size styles', () => {
      const { container } = render(
        <FollowersAvatarStack
          followers={mockFollowers.slice(0, 2)}
          size="sm"
        />
      );

      const avatars = container.querySelectorAll('.h-6.w-6');
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('applies medium size styles (default)', () => {
      const { container } = render(
        <FollowersAvatarStack
          followers={mockFollowers.slice(0, 2)}
          size="md"
        />
      );

      const avatars = container.querySelectorAll('.h-8.w-8');
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('applies large size styles', () => {
      const { container } = render(
        <FollowersAvatarStack
          followers={mockFollowers.slice(0, 2)}
          size="lg"
        />
      );

      const avatars = container.querySelectorAll('.h-10.w-10');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <FollowersAvatarStack
        followers={mockFollowers.slice(0, 2)}
        className="custom-stack"
      />
    );

    expect(container.firstChild).toHaveClass('custom-stack');
  });

  it('uses default maxDisplay of 5', () => {
    render(<FollowersAvatarStack followers={mockFollowers} />);

    // Should show 5 avatars + remaining count
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('does not show remaining count when all fit', () => {
    render(<FollowersAvatarStack followers={mockFollowers.slice(0, 3)} maxDisplay={5} />);

    // Should not show any +X
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });
});

describe('FollowersAvatarStackSkeleton', () => {
  it('renders skeleton elements', () => {
    const { container } = render(<FollowersAvatarStackSkeleton count={3} />);

    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBe(3);
  });

  it('renders default count of 3', () => {
    const { container } = render(<FollowersAvatarStackSkeleton />);

    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBe(3);
  });

  it('applies size styles', () => {
    const { container } = render(<FollowersAvatarStackSkeleton size="lg" />);

    const skeletons = container.querySelectorAll('.h-10.w-10');
    expect(skeletons.length).toBe(3);
  });
});
