/**
 * XP System - Barrel export
 *
 * @see calculate-xp.ts for implementation
 */

export {
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

export type {
  TokenXpOptions,
  StreakXpOptions,
  AchievementXpOptions,
  ReferralXpOptions,
  TotalXpOptions,
} from './calculate-xp';
