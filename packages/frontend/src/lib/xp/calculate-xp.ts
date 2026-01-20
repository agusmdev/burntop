/**
 * XP Calculation System
 *
 * This module contains all logic for calculating and awarding experience points (XP) to users.
 * XP is earned through various activities: token usage, maintaining streaks, unlocking achievements, and referrals.
 *
 * @see plan.md Phase 7.1 - XP Calculation
 * @see full-spec.md Section 3.2 for XP reward mechanics
 */

/**
 * XP reward rates for different activities
 */
export const XP_RATES = {
  /** XP awarded per 10,000 tokens used */
  TOKENS_PER_10K: 1,

  /** XP awarded per day of active streak maintained */
  STREAK_PER_DAY: 10,

  /** XP awarded per direct referral signup (level 1) */
  REFERRAL_DIRECT: 25,

  /** XP bonus percentage for level 2 referrals (referee's referral) */
  REFERRAL_LEVEL_2_BONUS: 0.25, // 25% of direct reward

  /** XP bonus percentage for level 3 referrals (second-level) */
  REFERRAL_LEVEL_3_BONUS: 0.1, // 10% of direct reward
} as const;

/**
 * XP rewards for achievements by rarity tier
 *
 * @see lib/db/seed-achievements.ts for achievement definitions
 */
export const ACHIEVEMENT_XP_REWARDS: Record<string, number> = {
  common: 50,
  uncommon: 100,
  rare: 200,
  epic: 500,
  legendary: 1000,
} as const;

/**
 * XP rewards for achievement tier advancements
 *
 * Progressive achievements have 5 tiers: Bronze -> Silver -> Gold -> Platinum -> Diamond
 * Each tier advancement grants additional XP beyond the base achievement unlock.
 */
export const TIER_ADVANCEMENT_XP: Record<number, number> = {
  1: 0, // Bronze (initial unlock, no bonus)
  2: 100, // Silver
  3: 200, // Gold
  4: 500, // Platinum
  5: 1000, // Diamond
} as const;

/**
 * Options for calculating XP from token usage
 */
export interface TokenXpOptions {
  /** Total number of tokens used */
  totalTokens: number;
}

/**
 * Calculate XP earned from token usage
 *
 * Users earn 1 XP for every 10,000 tokens used across all AI tools.
 * This incentivizes active usage while keeping XP gains gradual.
 *
 * @param options - Token usage data
 * @returns XP earned from tokens
 *
 * @example
 * ```typescript
 * const xp = calculateTokenXp({ totalTokens: 150_000 });
 * console.log(xp); // 15 XP
 * ```
 */
export function calculateTokenXp(options: TokenXpOptions): number {
  const { totalTokens } = options;

  if (totalTokens <= 0) return 0;

  // Award 1 XP per 10,000 tokens
  return Math.floor(totalTokens / 10_000) * XP_RATES.TOKENS_PER_10K;
}

/**
 * Options for calculating XP from streak maintenance
 */
export interface StreakXpOptions {
  /** Number of consecutive days in current streak */
  streakDays: number;
}

/**
 * Calculate XP earned from maintaining a streak
 *
 * Users earn 10 XP for each day they maintain an active streak.
 * This rewards consistency and daily engagement with AI tools.
 *
 * Note: This calculates the TOTAL XP from a streak, not incremental.
 * For daily XP awards, call this with streakDays=1.
 *
 * @param options - Streak data
 * @returns XP earned from streak
 *
 * @example
 * ```typescript
 * // Award XP for maintaining a 7-day streak
 * const xp = calculateStreakXp({ streakDays: 7 });
 * console.log(xp); // 70 XP
 *
 * // Award daily XP for extending streak by 1 day
 * const dailyXp = calculateStreakXp({ streakDays: 1 });
 * console.log(dailyXp); // 10 XP
 * ```
 */
export function calculateStreakXp(options: StreakXpOptions): number {
  const { streakDays } = options;

  if (streakDays <= 0) return 0;

  return streakDays * XP_RATES.STREAK_PER_DAY;
}

/**
 * Options for calculating XP from achievement unlocks
 */
export interface AchievementXpOptions {
  /** Rarity tier of the achievement: "common", "uncommon", "rare", "epic", "legendary" */
  rarity: string;

  /** Current tier of the achievement (1-5 for progressive achievements) */
  tier?: number;
}

/**
 * Calculate XP earned from unlocking an achievement
 *
 * XP rewards scale with achievement rarity:
 * - Common: 50 XP
 * - Uncommon: 100 XP
 * - Rare: 200 XP
 * - Epic: 500 XP
 * - Legendary: 1000 XP
 *
 * For progressive achievements, tier advancements grant additional XP.
 *
 * @param options - Achievement data
 * @returns XP earned from achievement
 *
 * @example
 * ```typescript
 * // Unlock a rare achievement
 * const xp = calculateAchievementXp({ rarity: 'rare' });
 * console.log(xp); // 200 XP
 *
 * // Advance to Gold tier (tier 3)
 * const tierXp = calculateAchievementXp({ rarity: 'epic', tier: 3 });
 * console.log(tierXp); // 500 (base) + 200 (tier) = 700 XP
 * ```
 */
export function calculateAchievementXp(options: AchievementXpOptions): number {
  const { rarity, tier } = options;

  // Base XP from achievement rarity
  const baseXp = ACHIEVEMENT_XP_REWARDS[rarity] ?? 0;

  // Bonus XP from tier advancement (if applicable)
  const tierXp = tier ? (TIER_ADVANCEMENT_XP[tier] ?? 0) : 0;

  return baseXp + tierXp;
}

/**
 * Options for calculating XP from referrals
 */
export interface ReferralXpOptions {
  /** Number of direct referrals (level 1) */
  directReferrals: number;

  /** Number of second-level referrals (level 2 - referee's referral) */
  level2Referrals?: number;

  /** Number of third-level referrals (level 3 - second-level referral) */
  level3Referrals?: number;
}

/**
 * Calculate XP earned from referrals
 *
 * Referral XP rewards follow a multi-tier structure:
 * - Level 1 (direct): 25 XP per signup
 * - Level 2 (referee refers someone): 25% bonus (6.25 XP)
 * - Level 3 (second-level referral): 10% bonus (2.5 XP)
 *
 * @param options - Referral data
 * @returns XP earned from referrals
 *
 * @example
 * ```typescript
 * // 5 direct referrals
 * const xp = calculateReferralXp({ directReferrals: 5 });
 * console.log(xp); // 125 XP
 *
 * // With chain bonuses
 * const chainXp = calculateReferralXp({
 *   directReferrals: 5,
 *   level2Referrals: 3,
 *   level3Referrals: 2
 * });
 * console.log(chainXp); // 125 + 18.75 + 5 = 148.75 XP
 * ```
 */
export function calculateReferralXp(options: ReferralXpOptions): number {
  const { directReferrals, level2Referrals = 0, level3Referrals = 0 } = options;

  // Level 1: Direct referrals (full reward)
  const level1Xp = directReferrals * XP_RATES.REFERRAL_DIRECT;

  // Level 2: Referee's referrals (25% bonus)
  const level2Xp = level2Referrals * XP_RATES.REFERRAL_DIRECT * XP_RATES.REFERRAL_LEVEL_2_BONUS;

  // Level 3: Second-level referrals (10% bonus)
  const level3Xp = level3Referrals * XP_RATES.REFERRAL_DIRECT * XP_RATES.REFERRAL_LEVEL_3_BONUS;

  return Math.floor(level1Xp + level2Xp + level3Xp);
}

/**
 * Options for calculating total XP across all sources
 */
export interface TotalXpOptions {
  /** Token usage data */
  tokens?: TokenXpOptions;

  /** Streak maintenance data */
  streak?: StreakXpOptions;

  /** Achievement unlock data (array for multiple achievements) */
  achievements?: AchievementXpOptions[];

  /** Referral data */
  referrals?: ReferralXpOptions;
}

/**
 * Calculate total XP from all sources
 *
 * This is a convenience function that aggregates XP from multiple activities.
 * Use this when you need to calculate a user's total XP from various sources at once.
 *
 * @param options - All XP sources
 * @returns Total XP earned
 *
 * @example
 * ```typescript
 * const totalXp = calculateTotalXp({
 *   tokens: { totalTokens: 500_000 },
 *   streak: { streakDays: 30 },
 *   achievements: [
 *     { rarity: 'rare' },
 *     { rarity: 'epic', tier: 2 }
 *   ],
 *   referrals: { directReferrals: 3 }
 * });
 * console.log(totalXp); // Sum of all XP sources
 * ```
 */
export function calculateTotalXp(options: TotalXpOptions): number {
  let totalXp = 0;

  // XP from tokens
  if (options.tokens) {
    totalXp += calculateTokenXp(options.tokens);
  }

  // XP from streaks
  if (options.streak) {
    totalXp += calculateStreakXp(options.streak);
  }

  // XP from achievements
  if (options.achievements && options.achievements.length > 0) {
    for (const achievement of options.achievements) {
      totalXp += calculateAchievementXp(achievement);
    }
  }

  // XP from referrals
  if (options.referrals) {
    totalXp += calculateReferralXp(options.referrals);
  }

  return totalXp;
}

/**
 * Calculate user level from total XP
 *
 * Level formula: Level = max(1, floor(sqrt(XP / 100)))
 *
 * This creates a gentle exponential curve where:
 * - Early levels are easy to achieve (encourages new users)
 * - Later levels require significantly more XP (long-term goals)
 *
 * Level progression examples:
 * - Level 1: 0-100 XP
 * - Level 2: 100-400 XP
 * - Level 3: 400-900 XP
 * - Level 5: 2,500-3,600 XP
 * - Level 10: 10,000-12,100 XP
 * - Level 25: 62,500-67,600 XP
 * - Level 50: 250,000-260,100 XP
 * - Level 100: 1,000,000-1,020,100 XP
 *
 * @param xp - Total experience points
 * @returns User level (minimum 1)
 *
 * @example
 * ```typescript
 * const level = calculateLevel(10000);
 * console.log(level); // 10
 *
 * const newUserLevel = calculateLevel(50);
 * console.log(newUserLevel); // 1
 * ```
 */
export function calculateLevel(xp: number): number {
  if (xp < 0) return 1;
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)));
}

/**
 * Calculate XP required for a specific level
 *
 * Inverse of calculateLevel: returns the minimum XP needed to reach a target level.
 *
 * @param level - Target level
 * @returns Minimum XP required
 *
 * @example
 * ```typescript
 * const xpNeeded = calculateXpForLevel(10);
 * console.log(xpNeeded); // 10,000 XP
 * ```
 */
export function calculateXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return level * level * 100;
}

/**
 * Calculate XP progress to next level
 *
 * Returns information about progress toward the next level.
 *
 * @param currentXp - User's current XP
 * @returns Progress information
 *
 * @example
 * ```typescript
 * const progress = calculateLevelProgress(1500);
 * console.log(progress);
 * // {
 * //   currentLevel: 3,
 * //   nextLevel: 4,
 * //   currentLevelXp: 900,
 * //   nextLevelXp: 1600,
 * //   xpIntoLevel: 600,
 * //   xpToNextLevel: 100,
 * //   progressPercent: 85.71
 * // }
 * ```
 */
export function calculateLevelProgress(currentXp: number): {
  currentLevel: number;
  nextLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpToNextLevel: number;
  progressPercent: number;
} {
  const currentLevel = calculateLevel(currentXp);
  const nextLevel = currentLevel + 1;

  const currentLevelXp = calculateXpForLevel(currentLevel);
  const nextLevelXp = calculateXpForLevel(nextLevel);

  const xpIntoLevel = currentXp - currentLevelXp;
  const xpToNextLevel = nextLevelXp - currentXp;
  const xpRequiredForLevel = nextLevelXp - currentLevelXp;

  const progressPercent = (xpIntoLevel / xpRequiredForLevel) * 100;

  return {
    currentLevel,
    nextLevel,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpToNextLevel,
    progressPercent: Math.round(progressPercent * 100) / 100, // Round to 2 decimal places
  };
}

/**
 * Get user level title based on level
 *
 * Returns a descriptive title for the user's current level.
 * Titles based on spec thresholds.
 *
 * @param level - User's current level
 * @returns Level title
 *
 * @example
 * ```typescript
 * const title = getLevelTitle(5);
 * console.log(title); // "Novice"
 *
 * const highTitle = getLevelTitle(55);
 * console.log(highTitle); // "Senior Dev"
 * ```
 */
export function getLevelTitle(level: number): string {
  if (level >= 101) return 'AI Legend';
  if (level >= 76) return 'AI Native';
  if (level >= 51) return 'Senior Dev';
  if (level >= 26) return 'Developer';
  if (level >= 11) return 'Apprentice';
  return 'Novice';
}
