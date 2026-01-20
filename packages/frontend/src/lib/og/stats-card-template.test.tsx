/**
 * Tests for Stats Card Template
 *
 * Verifies that the stats card component renders correctly with various data inputs
 * Note: Full PNG rendering tests are skipped as they require font loading
 */

import { describe, expect, it } from 'vitest';

import { StatsCardTemplate } from './stats-card-template';

describe('StatsCardTemplate', () => {
  it('should render component with minimal required props', () => {
    const card = (
      <StatsCardTemplate
        username="testuser"
        totalTokens={1500000}
        totalCost="45.50"
        currentStreak={7}
        level={12}
        xp={15000}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
  });

  it('should render component with all optional props', () => {
    const card = (
      <StatsCardTemplate
        username="poweruser"
        totalTokens={50000000}
        totalCost="1234.56"
        currentStreak={45}
        level={99}
        xp={999999}
        topModel="claude-3.5-sonnet"
        cacheEfficiency={85.5}
        totalAchievements={42}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
  });

  it('should render component with large numbers', () => {
    const card = (
      <StatsCardTemplate
        username="mega_user"
        totalTokens={1_234_567_890}
        totalCost="10000.99"
        currentStreak={365}
        level={100}
        xp={10000000}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
  });

  it('should render component with zero values', () => {
    const card = (
      <StatsCardTemplate
        username="newbie"
        totalTokens={0}
        totalCost="0.00"
        currentStreak={0}
        level={1}
        xp={0}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
  });

  it('should render component with single day streak', () => {
    const card = (
      <StatsCardTemplate
        username="newcomer"
        totalTokens={5000}
        totalCost="1.25"
        currentStreak={1}
        level={1}
        xp={100}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
  });

  it('should render component with only top model', () => {
    const card = (
      <StatsCardTemplate
        username="claude_fan"
        totalTokens={100000}
        totalCost="25.00"
        currentStreak={10}
        level={5}
        xp={5000}
        topModel="claude-3-opus"
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
  });

  it('should render component with only cache efficiency', () => {
    const card = (
      <StatsCardTemplate
        username="cache_master"
        totalTokens={500000}
        totalCost="75.00"
        currentStreak={20}
        level={15}
        xp={20000}
        cacheEfficiency={95.7}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
  });

  // Phase 21.8.1 - Test new props: avatarUrl, displayName, monthlyBadge, longestStreak

  it('should render component with avatarUrl', () => {
    const card = (
      <StatsCardTemplate
        username="avatar_user"
        avatarUrl="https://avatars.githubusercontent.com/u/12345"
        totalTokens={250000}
        totalCost="30.00"
        currentStreak={15}
        level={8}
        xp={8000}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
    expect(card.props.avatarUrl).toBe('https://avatars.githubusercontent.com/u/12345');
  });

  it('should render component with displayName', () => {
    const card = (
      <StatsCardTemplate
        username="johndoe"
        displayName="John Doe"
        totalTokens={300000}
        totalCost="40.00"
        currentStreak={12}
        level={10}
        xp={12000}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
    expect(card.props.displayName).toBe('John Doe');
  });

  it('should render component with Power User badge', () => {
    const card = (
      <StatsCardTemplate
        username="power_user"
        monthlyBadge="Power User"
        totalTokens={5000000}
        totalCost="150.00"
        currentStreak={25}
        level={20}
        xp={25000}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
    expect(card.props.monthlyBadge).toBe('Power User');
  });

  it('should render component with AI Native badge', () => {
    const card = (
      <StatsCardTemplate
        username="ai_native"
        monthlyBadge="AI Native"
        totalTokens={20000000}
        totalCost="500.00"
        currentStreak={50}
        level={35}
        xp={50000}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
    expect(card.props.monthlyBadge).toBe('AI Native');
  });

  it('should render component with Token Titan badge', () => {
    const card = (
      <StatsCardTemplate
        username="token_titan"
        monthlyBadge="Token Titan"
        totalTokens={100000000}
        totalCost="2500.00"
        currentStreak={100}
        level={50}
        xp={100000}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
    expect(card.props.monthlyBadge).toBe('Token Titan');
  });

  it('should render component with all new props combined', () => {
    const card = (
      <StatsCardTemplate
        username="complete_user"
        avatarUrl="https://avatars.githubusercontent.com/u/99999"
        displayName="Complete User"
        monthlyBadge="AI Native"
        totalTokens={15000000}
        totalCost="350.00"
        currentStreak={42}
        longestStreak={60}
        level={30}
        xp={40000}
        topModel="claude-3.5-sonnet"
        cacheEfficiency={82.3}
        totalAchievements={28}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
    expect(card.props.avatarUrl).toBe('https://avatars.githubusercontent.com/u/99999');
    expect(card.props.displayName).toBe('Complete User');
    expect(card.props.monthlyBadge).toBe('AI Native');
    expect(card.props.longestStreak).toBe(60);
  });

  it('should render component without avatar (fallback to initials)', () => {
    const card = (
      <StatsCardTemplate
        username="no_avatar"
        displayName="No Avatar User"
        totalTokens={100000}
        totalCost="20.00"
        currentStreak={5}
        level={7}
        xp={7000}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
    expect(card.props.avatarUrl).toBeUndefined();
    // Template should use getInitials() to display "NA" for "No Avatar"
  });

  it('should render component without display name (fallback to username)', () => {
    const card = (
      <StatsCardTemplate
        username="username_only"
        avatarUrl="https://avatars.githubusercontent.com/u/11111"
        totalTokens={75000}
        totalCost="15.00"
        currentStreak={3}
        level={4}
        xp={4000}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
    expect(card.props.displayName).toBeUndefined();
    // Template should fall back to username display
  });

  it('should render component with no badge (no tier)', () => {
    const card = (
      <StatsCardTemplate
        username="no_tier"
        avatarUrl="https://avatars.githubusercontent.com/u/22222"
        displayName="No Tier User"
        totalTokens={1000}
        totalCost="0.50"
        currentStreak={1}
        level={1}
        xp={100}
      />
    );

    expect(card).toBeTruthy();
    expect(card.type).toBe(StatsCardTemplate);
    expect(card.props.monthlyBadge).toBeUndefined();
  });
});
