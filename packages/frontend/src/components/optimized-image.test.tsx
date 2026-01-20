import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OptimizedImage } from './optimized-image';

describe('OptimizedImage', () => {
  it('renders an image with src and alt', () => {
    render(<OptimizedImage src="/test.jpg" alt="Test image" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/test.jpg');
    expect(img).toHaveAttribute('alt', 'Test image');
  });

  it('applies lazy loading by default', () => {
    render(<OptimizedImage src="/test.jpg" alt="Test image" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('applies eager loading when priority is true', () => {
    render(<OptimizedImage src="/test.jpg" alt="Test image" priority />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('applies async decoding', () => {
    render(<OptimizedImage src="/test.jpg" alt="Test image" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('applies width and height when provided', () => {
    render(
      <OptimizedImage src="/test.jpg" alt="Test image" width={800} height={600} />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('width', '800');
    expect(img).toHaveAttribute('height', '600');
  });

  it('does not set width/height when not provided', () => {
    render(<OptimizedImage src="/test.jpg" alt="Test image" />);

    const img = screen.getByRole('img');
    expect(img).not.toHaveAttribute('width');
    expect(img).not.toHaveAttribute('height');
  });

  it('applies custom className', () => {
    render(
      <OptimizedImage src="/test.jpg" alt="Test image" className="custom-image" />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveClass('custom-image');
  });

  it('handles external URLs', () => {
    render(
      <OptimizedImage
        src="https://example.com/image.jpg"
        alt="External image"
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('combines multiple classNames', () => {
    render(
      <OptimizedImage
        src="/test.jpg"
        alt="Test image"
        className="class1 class2"
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveClass('class1');
    expect(img).toHaveClass('class2');
  });
});
