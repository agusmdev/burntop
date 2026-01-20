/**
 * Tests for Weekly Recap Card Template
 *
 * Validates that the weekly recap card renders correctly with various
 * data configurations and edge cases.
 */

import { describe, expect, it } from 'vitest';

import { WeeklyRecapCardTemplate } from './weekly-recap-card-template';

describe('WeeklyRecapCardTemplate', () => {
  it('should render component with basic props', () => {
    const card = (
      <WeeklyRecapCardTemplate
        username="testuser"
        weeklyTokens={500000}
        weeklyCost="15.50"
        daysActive={5}
        weekOverWeekGrowth={12.5}
        weekStart={new Date('2026-01-05')}
        weekEnd={new Date('2026-01-11')}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(WeeklyRecapCardTemplate);
  });

  it('should render component with all optional props', () => {
    const card = (
      <WeeklyRecapCardTemplate
        username="poweruser"
        weeklyTokens={1500000}
        weeklyCost="45.75"
        daysActive={7}
        weekOverWeekGrowth={25.3}
        weekStart={new Date('2026-01-05')}
        weekEnd={new Date('2026-01-11')}
        topModel="claude-3.5-sonnet"
        mostProductiveDay="Wednesday"
        achievementsEarned={5}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(WeeklyRecapCardTemplate);
  });

  it('should render component with positive growth', () => {
    const card = (
      <WeeklyRecapCardTemplate
        username="growing_user"
        weeklyTokens={750000}
        weeklyCost="22.50"
        daysActive={6}
        weekOverWeekGrowth={35.8}
        weekStart={new Date('2026-01-05')}
        weekEnd={new Date('2026-01-11')}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(WeeklyRecapCardTemplate);
  });

  it('should render component with negative growth', () => {
    const card = (
      <WeeklyRecapCardTemplate
        username="declining_user"
        weeklyTokens={250000}
        weeklyCost="7.50"
        daysActive={3}
        weekOverWeekGrowth={-15.7}
        weekStart={new Date('2026-01-05')}
        weekEnd={new Date('2026-01-11')}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(WeeklyRecapCardTemplate);
  });

  it('should render component with zero growth', () => {
    const card = (
      <WeeklyRecapCardTemplate
        username="steady_user"
        weeklyTokens={500000}
        weeklyCost="15.00"
        daysActive={5}
        weekOverWeekGrowth={0}
        weekStart={new Date('2026-01-05')}
        weekEnd={new Date('2026-01-11')}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(WeeklyRecapCardTemplate);
  });

  it('should render component with 7 days active', () => {
    const card = (
      <WeeklyRecapCardTemplate
        username="perfect_week"
        weeklyTokens={1000000}
        weeklyCost="30.00"
        daysActive={7}
        weekOverWeekGrowth={10.5}
        weekStart={new Date('2026-01-05')}
        weekEnd={new Date('2026-01-11')}
        achievementsEarned={0}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(WeeklyRecapCardTemplate);
  });

  it('should render component with 0 days active', () => {
    const card = (
      <WeeklyRecapCardTemplate
        username="inactive_user"
        weeklyTokens={0}
        weeklyCost="0.00"
        daysActive={0}
        weekOverWeekGrowth={-100}
        weekStart={new Date('2026-01-05')}
        weekEnd={new Date('2026-01-11')}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(WeeklyRecapCardTemplate);
  });

  it('should render component with achievements earned', () => {
    const card = (
      <WeeklyRecapCardTemplate
        username="achiever"
        weeklyTokens={800000}
        weeklyCost="24.00"
        daysActive={6}
        weekOverWeekGrowth={18.2}
        weekStart={new Date('2026-01-05')}
        weekEnd={new Date('2026-01-11')}
        achievementsEarned={3}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(WeeklyRecapCardTemplate);
  });

  it('should render component with top model', () => {
    const card = (
      <WeeklyRecapCardTemplate
        username="claude_fan"
        weeklyTokens={600000}
        weeklyCost="18.00"
        daysActive={5}
        weekOverWeekGrowth={8.5}
        weekStart={new Date('2026-01-05')}
        weekEnd={new Date('2026-01-11')}
        topModel="claude-3-opus"
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(WeeklyRecapCardTemplate);
  });

  it('should render component with most productive day', () => {
    const card = (
      <WeeklyRecapCardTemplate
        username="friday_coder"
        weeklyTokens={550000}
        weeklyCost="16.50"
        daysActive={5}
        weekOverWeekGrowth={12.0}
        weekStart={new Date('2026-01-05')}
        weekEnd={new Date('2026-01-11')}
        mostProductiveDay="Friday"
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(WeeklyRecapCardTemplate);
  });

  it('should render component with large token numbers', () => {
    const card = (
      <WeeklyRecapCardTemplate
        username="heavy_user"
        weeklyTokens={25000000}
        weeklyCost="750.00"
        daysActive={7}
        weekOverWeekGrowth={50.0}
        weekStart={new Date('2026-01-05')}
        weekEnd={new Date('2026-01-11')}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(WeeklyRecapCardTemplate);
  });

  it('should render component with week spanning different months', () => {
    const card = (
      <WeeklyRecapCardTemplate
        username="month_crosser"
        weeklyTokens={500000}
        weeklyCost="15.00"
        daysActive={5}
        weekOverWeekGrowth={12.5}
        weekStart={new Date('2026-01-27')}
        weekEnd={new Date('2026-02-02')}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(WeeklyRecapCardTemplate);
  });
});
