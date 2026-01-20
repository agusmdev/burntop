import { describe, expect, it } from 'vitest';

import { STORY_IMAGE_DIMENSIONS, WrappedStoryTemplate } from './wrapped-story-template';

describe('WrappedStoryTemplate', () => {
  it('should use correct story dimensions (9:16 aspect ratio)', () => {
    expect(STORY_IMAGE_DIMENSIONS.width).toBe(1080);
    expect(STORY_IMAGE_DIMENSIONS.height).toBe(1920);

    // Verify aspect ratio is 9:16
    const aspectRatio = STORY_IMAGE_DIMENSIONS.width / STORY_IMAGE_DIMENSIONS.height;
    expect(aspectRatio).toBeCloseTo(9 / 16, 2);
  });

  it('should render without errors', () => {
    const component = WrappedStoryTemplate({
      username: 'testuser',
      year: 2025,
      totalTokens: 1500000,
      totalCost: '45.67',
      daysActive: 150,
      topModel: 'claude-3-5-sonnet-20241022',
      topTool: 'cursor',
      longestStreak: 42,
      totalAchievements: 15,
      cacheEfficiency: 85.5,
    });

    expect(component).toBeDefined();
    expect(component.props.style.width).toBe(STORY_IMAGE_DIMENSIONS.width);
    expect(component.props.style.height).toBe(STORY_IMAGE_DIMENSIONS.height);
  });

  it('should handle null values gracefully', () => {
    const component = WrappedStoryTemplate({
      username: 'testuser',
      year: 2025,
      totalTokens: 0,
      totalCost: '0',
      daysActive: 0,
      topModel: null,
      topTool: null,
      longestStreak: 0,
      totalAchievements: 0,
      cacheEfficiency: 0,
    });

    expect(component).toBeDefined();
  });
});
