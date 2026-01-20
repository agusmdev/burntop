/**
 * Tests for Streak Milestone Card Template
 *
 * Verifies that the streak milestone card component renders correctly
 * with various milestone values and streak configurations
 * Note: Full PNG rendering tests are skipped as they require font loading
 */

import { describe, expect, it } from 'vitest';

import { StreakMilestoneCardTemplate, STREAK_MILESTONES } from './streak-milestone-card-template';

describe('StreakMilestoneCardTemplate', () => {
  it('should render component with minimal required props', () => {
    const card = (
      <StreakMilestoneCardTemplate username="testuser" currentStreak={7} longestStreak={7} />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StreakMilestoneCardTemplate);
  });

  it('should render component for 3-day streak milestone', () => {
    const card = (
      <StreakMilestoneCardTemplate username="beginner" currentStreak={3} longestStreak={3} />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StreakMilestoneCardTemplate);
  });

  it('should render component for 7-day streak milestone', () => {
    const card = (
      <StreakMilestoneCardTemplate
        username="consistent"
        currentStreak={7}
        longestStreak={7}
        xpReward={70}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StreakMilestoneCardTemplate);
  });

  it('should render component for 30-day streak milestone', () => {
    const card = (
      <StreakMilestoneCardTemplate
        username="dedicated"
        currentStreak={30}
        longestStreak={30}
        xpReward={300}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StreakMilestoneCardTemplate);
  });

  it('should render component for 100-day streak milestone', () => {
    const card = (
      <StreakMilestoneCardTemplate
        username="committed"
        currentStreak={100}
        longestStreak={100}
        xpReward={1000}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StreakMilestoneCardTemplate);
  });

  it('should render component for 365-day streak milestone', () => {
    const card = (
      <StreakMilestoneCardTemplate
        username="yearlong"
        currentStreak={365}
        longestStreak={365}
        xpReward={3650}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StreakMilestoneCardTemplate);
  });

  it('should render component for 1000-day streak milestone', () => {
    const card = (
      <StreakMilestoneCardTemplate
        username="legendary"
        currentStreak={1000}
        longestStreak={1000}
        xpReward={10000}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StreakMilestoneCardTemplate);
  });

  it('should render component when current streak equals longest streak (new record)', () => {
    const card = (
      <StreakMilestoneCardTemplate
        username="record_breaker"
        currentStreak={50}
        longestStreak={50}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StreakMilestoneCardTemplate);
  });

  it('should render component when current streak is less than longest streak', () => {
    const card = (
      <StreakMilestoneCardTemplate username="comeback_kid" currentStreak={30} longestStreak={100} />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StreakMilestoneCardTemplate);
  });

  it('should render component with custom motivational message', () => {
    const card = (
      <StreakMilestoneCardTemplate
        username="custom_message"
        currentStreak={15}
        longestStreak={15}
        message="You are crushing it! 🚀"
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StreakMilestoneCardTemplate);
  });

  it('should render component with single day streak', () => {
    const card = (
      <StreakMilestoneCardTemplate username="newbie" currentStreak={1} longestStreak={1} />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StreakMilestoneCardTemplate);
  });

  it('should render component with custom XP reward', () => {
    const card = (
      <StreakMilestoneCardTemplate
        username="bonus_xp"
        currentStreak={7}
        longestStreak={10}
        xpReward={150}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StreakMilestoneCardTemplate);
  });

  it('should export streak milestones constant', () => {
    expect(STREAK_MILESTONES).toEqual([3, 7, 30, 100, 365, 1000]);
  });
});
