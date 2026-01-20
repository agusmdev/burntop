/**
 * OG Image Generation Module
 *
 * Exports all utilities and components for generating
 * Open Graph images for social media sharing.
 */

export { BaseCardTemplate, OG_COLORS, OG_IMAGE_DIMENSIONS } from './base-card-template';

export type { FontConfig } from './render-card';

export {
  createImageHeaders,
  createSvgHeaders,
  loadFont,
  renderCardToPng,
  renderCardToSvg,
} from './render-card';

export { StatsCardTemplate } from './stats-card-template';

export { StreakMilestoneCardTemplate, STREAK_MILESTONES } from './streak-milestone-card-template';

export { WeeklyRecapCardTemplate } from './weekly-recap-card-template';

export { WrappedCardTemplate } from './wrapped-card-template';

export { WrappedSquareTemplate, SQUARE_IMAGE_DIMENSIONS } from './wrapped-square-template';

export { ErrorCardTemplate } from './error-card-template';
export type { ErrorCardType } from './error-card-template';

export {
  validateStatsData,
  hasMinimumActivityData,
  getSafeCacheEfficiency,
  validateWeeklyEstimates,
  validateDaysActive,
  safeNumber,
  safeString,
} from './validate-data';
export type { ValidationResult } from './validate-data';
