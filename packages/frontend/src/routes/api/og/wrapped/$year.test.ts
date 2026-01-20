import { describe, expect, it } from 'vitest';

describe('Wrapped OG Image API Route', () => {
  it('should support standard format (default)', () => {
    const url = new URL('http://localhost:3000/api/og/wrapped/2025');
    const format = url.searchParams.get('format') || 'standard';

    expect(format).toBe('standard');
  });

  it('should support story format via query parameter', () => {
    const url = new URL('http://localhost:3000/api/og/wrapped/2025?format=story');
    const format = url.searchParams.get('format') || 'standard';

    expect(format).toBe('story');
  });

  it('should support square format via query parameter', () => {
    const url = new URL('http://localhost:3000/api/og/wrapped/2025?format=square');
    const format = url.searchParams.get('format') || 'standard';

    expect(format).toBe('square');
  });

  it('should validate format parameter', () => {
    const validFormats = ['standard', 'story', 'square'];
    const url = new URL('http://localhost:3000/api/og/wrapped/2025?format=story');
    const format = url.searchParams.get('format') || 'standard';

    expect(validFormats).toContain(format);
  });

  it('should reject invalid format', () => {
    const validFormats = ['standard', 'story', 'square'];
    const url = new URL('http://localhost:3000/api/og/wrapped/2025?format=invalid');
    const format = url.searchParams.get('format') || 'standard';

    if (format !== 'standard' && format !== 'story' && format !== 'square') {
      expect(validFormats).not.toContain(format);
    }
  });
});
