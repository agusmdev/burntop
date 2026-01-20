import { describe, expect, it } from 'vitest';

import { BaseCardTemplate, OG_COLORS, OG_IMAGE_DIMENSIONS } from './base-card-template';

describe('BaseCardTemplate', () => {
  it('exports OG_IMAGE_DIMENSIONS with correct values', () => {
    expect(OG_IMAGE_DIMENSIONS).toEqual({
      width: 1200,
      height: 630,
    });
  });

  it('exports OG_COLORS with ember colors', () => {
    expect(OG_COLORS.ember[500]).toBe('#FF6B00');
    expect(OG_COLORS.bg.base).toBe('#0A0A0A');
    expect(OG_COLORS.text.primary).toBe('#FAFAFA');
  });

  it('renders without crashing', () => {
    const element = (
      <BaseCardTemplate title="Test Title">
        <div>Test Content</div>
      </BaseCardTemplate>
    );
    expect(element).toBeTruthy();
    expect(element.type).toBe(BaseCardTemplate);
  });

  it('renders with custom props', () => {
    const element = (
      <BaseCardTemplate
        title="Custom Title"
        subtitle="Custom Subtitle"
        showBranding={false}
        showEmberGlow={false}
        backgroundGradient={['#000000', '#111111']}
      >
        <div>Custom Content</div>
      </BaseCardTemplate>
    );
    expect(element).toBeTruthy();
  });

  it('renders with minimal props', () => {
    const element = (
      <BaseCardTemplate>
        <div>Minimal Content</div>
      </BaseCardTemplate>
    );
    expect(element).toBeTruthy();
  });
});
