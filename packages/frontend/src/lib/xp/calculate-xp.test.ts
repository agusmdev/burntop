/**
 * Tests for XP Calculation System
 *
 * @see calculate-xp.ts
 */

import { describe, expect, test } from 'vitest';

import {
  calculateTokenXp,
  calculateStreakXp,
  calculateAchievementXp,
  calculateReferralXp,
  calculateTotalXp,
  calculateLevel,
  calculateXpForLevel,
  calculateLevelProgress,
  getLevelTitle,
  XP_RATES,
  ACHIEVEMENT_XP_REWARDS,
  TIER_ADVANCEMENT_XP,
} from './calculate-xp';

describe('calculateTokenXp', () => {
  test('awards 1 XP per 10,000 tokens', () => {
    expect(calculateTokenXp({ totalTokens: 10_000 })).toBe(1);
    expect(calculateTokenXp({ totalTokens: 100_000 })).toBe(10);
    expect(calculateTokenXp({ totalTokens: 1_000_000 })).toBe(100);
  });

  test('rounds down partial 10k increments', () => {
    expect(calculateTokenXp({ totalTokens: 15_000 })).toBe(1);
    expect(calculateTokenXp({ totalTokens: 19_999 })).toBe(1);
    expect(calculateTokenXp({ totalTokens: 20_000 })).toBe(2);
  });

  test('returns 0 for zero or negative tokens', () => {
    expect(calculateTokenXp({ totalTokens: 0 })).toBe(0);
    expect(calculateTokenXp({ totalTokens: -100 })).toBe(0);
  });
});

describe('calculateStreakXp', () => {
  test('awards 10 XP per streak day', () => {
    expect(calculateStreakXp({ streakDays: 1 })).toBe(10);
    expect(calculateStreakXp({ streakDays: 7 })).toBe(70);
    expect(calculateStreakXp({ streakDays: 30 })).toBe(300);
    expect(calculateStreakXp({ streakDays: 365 })).toBe(3650);
  });

  test('returns 0 for zero or negative streak', () => {
    expect(calculateStreakXp({ streakDays: 0 })).toBe(0);
    expect(calculateStreakXp({ streakDays: -5 })).toBe(0);
  });
});

describe('calculateAchievementXp', () => {
  test('awards XP based on rarity', () => {
    expect(calculateAchievementXp({ rarity: 'common' })).toBe(50);
    expect(calculateAchievementXp({ rarity: 'uncommon' })).toBe(100);
    expect(calculateAchievementXp({ rarity: 'rare' })).toBe(200);
    expect(calculateAchievementXp({ rarity: 'epic' })).toBe(500);
    expect(calculateAchievementXp({ rarity: 'legendary' })).toBe(1000);
  });

  test('adds tier advancement bonus', () => {
    expect(calculateAchievementXp({ rarity: 'rare', tier: 1 })).toBe(200); // No tier bonus
    expect(calculateAchievementXp({ rarity: 'rare', tier: 2 })).toBe(300); // +100 for Silver
    expect(calculateAchievementXp({ rarity: 'rare', tier: 3 })).toBe(400); // +200 for Gold
    expect(calculateAchievementXp({ rarity: 'rare', tier: 4 })).toBe(700); // +500 for Platinum
    expect(calculateAchievementXp({ rarity: 'rare', tier: 5 })).toBe(1200); // +1000 for Diamond
  });

  test('returns 0 for unknown rarity', () => {
    expect(calculateAchievementXp({ rarity: 'unknown' })).toBe(0);
  });
});

describe('calculateReferralXp', () => {
  test('awards 25 XP per direct referral', () => {
    expect(calculateReferralXp({ directReferrals: 1 })).toBe(25);
    expect(calculateReferralXp({ directReferrals: 5 })).toBe(125);
    expect(calculateReferralXp({ directReferrals: 10 })).toBe(250);
  });

  test('awards 25% bonus for level 2 referrals', () => {
    const xp = calculateReferralXp({
      directReferrals: 0,
      level2Referrals: 4,
    });
    // 4 * 25 * 0.25 = 25
    expect(xp).toBe(25);
  });

  test('awards 10% bonus for level 3 referrals', () => {
    const xp = calculateReferralXp({
      directReferrals: 0,
      level3Referrals: 10,
    });
    // 10 * 25 * 0.1 = 25
    expect(xp).toBe(25);
  });

  test('combines all referral levels', () => {
    const xp = calculateReferralXp({
      directReferrals: 5, // 125 XP
      level2Referrals: 3, // 18.75 XP (floored to 18)
      level3Referrals: 2, // 5 XP
    });
    // Floor of (125 + 18.75 + 5) = 148
    expect(xp).toBe(148);
  });

  test('returns 0 for no referrals', () => {
    expect(calculateReferralXp({ directReferrals: 0 })).toBe(0);
  });
});

describe('calculateTotalXp', () => {
  test('sums XP from all sources', () => {
    const totalXp = calculateTotalXp({
      tokens: { totalTokens: 500_000 }, // 50 XP
      streak: { streakDays: 30 }, // 300 XP
      achievements: [
        { rarity: 'rare' }, // 200 XP
        { rarity: 'epic', tier: 2 }, // 600 XP
      ],
      referrals: { directReferrals: 3 }, // 75 XP
    });

    expect(totalXp).toBe(50 + 300 + 200 + 600 + 75);
  });

  test('handles partial sources', () => {
    const xp1 = calculateTotalXp({
      tokens: { totalTokens: 100_000 },
    });
    expect(xp1).toBe(10);

    const xp2 = calculateTotalXp({
      streak: { streakDays: 7 },
      referrals: { directReferrals: 2 },
    });
    expect(xp2).toBe(70 + 50);
  });

  test('returns 0 for no sources', () => {
    expect(calculateTotalXp({})).toBe(0);
  });
});

describe('calculateLevel', () => {
  test('calculates correct level from XP', () => {
    expect(calculateLevel(0)).toBe(1); // Minimum level
    expect(calculateLevel(50)).toBe(1); // Still level 1
    expect(calculateLevel(100)).toBe(1); // Level 1 max
    expect(calculateLevel(400)).toBe(2); // Level 2 start
    expect(calculateLevel(900)).toBe(3); // Level 3 start
    expect(calculateLevel(10_000)).toBe(10);
    expect(calculateLevel(62_500)).toBe(25);
    expect(calculateLevel(250_000)).toBe(50);
    expect(calculateLevel(1_000_000)).toBe(100);
  });

  test('returns 1 for negative XP', () => {
    expect(calculateLevel(-100)).toBe(1);
  });

  test('matches formula: floor(sqrt(XP / 100))', () => {
    const testXp = 5000;
    const expectedLevel = Math.floor(Math.sqrt(testXp / 100));
    expect(calculateLevel(testXp)).toBe(expectedLevel);
  });
});

describe('calculateXpForLevel', () => {
  test('calculates XP required for level', () => {
    expect(calculateXpForLevel(1)).toBe(0);
    expect(calculateXpForLevel(2)).toBe(400);
    expect(calculateXpForLevel(3)).toBe(900);
    expect(calculateXpForLevel(10)).toBe(10_000);
    expect(calculateXpForLevel(25)).toBe(62_500);
    expect(calculateXpForLevel(50)).toBe(250_000);
    expect(calculateXpForLevel(100)).toBe(1_000_000);
  });

  test('matches inverse of calculateLevel', () => {
    for (let level = 1; level <= 20; level++) {
      const xp = calculateXpForLevel(level);
      expect(calculateLevel(xp)).toBe(level);
    }
  });
});

describe('calculateLevelProgress', () => {
  test('calculates progress within a level', () => {
    // User with 1500 XP should be level 3 (900-1600 XP range)
    const progress = calculateLevelProgress(1500);

    expect(progress.currentLevel).toBe(3);
    expect(progress.nextLevel).toBe(4);
    expect(progress.currentLevelXp).toBe(900);
    expect(progress.nextLevelXp).toBe(1600);
    expect(progress.xpIntoLevel).toBe(600); // 1500 - 900
    expect(progress.xpToNextLevel).toBe(100); // 1600 - 1500
    expect(progress.progressPercent).toBeCloseTo(85.71, 2);
  });

  test('calculates progress at level boundary', () => {
    const progress = calculateLevelProgress(900); // Exactly at level 3 start

    expect(progress.currentLevel).toBe(3);
    expect(progress.xpIntoLevel).toBe(0);
    expect(progress.progressPercent).toBe(0);
  });

  test('calculates progress for new user', () => {
    const progress = calculateLevelProgress(0);

    expect(progress.currentLevel).toBe(1);
    expect(progress.nextLevel).toBe(2);
    expect(progress.currentLevelXp).toBe(0);
    expect(progress.nextLevelXp).toBe(400);
    expect(progress.xpToNextLevel).toBe(400);
  });
});

describe('getLevelTitle', () => {
  test('returns correct titles for level ranges', () => {
    // 1-10: Novice
    expect(getLevelTitle(1)).toBe('Novice');
    expect(getLevelTitle(5)).toBe('Novice');
    expect(getLevelTitle(10)).toBe('Novice');
    // 11-25: Apprentice
    expect(getLevelTitle(11)).toBe('Apprentice');
    expect(getLevelTitle(15)).toBe('Apprentice');
    expect(getLevelTitle(25)).toBe('Apprentice');
    // 26-50: Developer
    expect(getLevelTitle(26)).toBe('Developer');
    expect(getLevelTitle(40)).toBe('Developer');
    expect(getLevelTitle(50)).toBe('Developer');
    // 51-75: Senior Dev
    expect(getLevelTitle(51)).toBe('Senior Dev');
    expect(getLevelTitle(60)).toBe('Senior Dev');
    expect(getLevelTitle(75)).toBe('Senior Dev');
    // 76-100: AI Native
    expect(getLevelTitle(76)).toBe('AI Native');
    expect(getLevelTitle(90)).toBe('AI Native');
    expect(getLevelTitle(100)).toBe('AI Native');
    // 101+: AI Legend
    expect(getLevelTitle(101)).toBe('AI Legend');
    expect(getLevelTitle(150)).toBe('AI Legend');
  });
});

describe('XP_RATES constants', () => {
  test('defines expected rate constants', () => {
    expect(XP_RATES.TOKENS_PER_10K).toBe(1);
    expect(XP_RATES.STREAK_PER_DAY).toBe(10);
    expect(XP_RATES.REFERRAL_DIRECT).toBe(25);
    expect(XP_RATES.REFERRAL_LEVEL_2_BONUS).toBe(0.25);
    expect(XP_RATES.REFERRAL_LEVEL_3_BONUS).toBe(0.1);
  });
});

describe('ACHIEVEMENT_XP_REWARDS constants', () => {
  test('defines expected achievement rewards', () => {
    expect(ACHIEVEMENT_XP_REWARDS.common).toBe(50);
    expect(ACHIEVEMENT_XP_REWARDS.uncommon).toBe(100);
    expect(ACHIEVEMENT_XP_REWARDS.rare).toBe(200);
    expect(ACHIEVEMENT_XP_REWARDS.epic).toBe(500);
    expect(ACHIEVEMENT_XP_REWARDS.legendary).toBe(1000);
  });
});

describe('TIER_ADVANCEMENT_XP constants', () => {
  test('defines expected tier advancement rewards', () => {
    expect(TIER_ADVANCEMENT_XP[1]).toBe(0);
    expect(TIER_ADVANCEMENT_XP[2]).toBe(100);
    expect(TIER_ADVANCEMENT_XP[3]).toBe(200);
    expect(TIER_ADVANCEMENT_XP[4]).toBe(500);
    expect(TIER_ADVANCEMENT_XP[5]).toBe(1000);
  });
});
