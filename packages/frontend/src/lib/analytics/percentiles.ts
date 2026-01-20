/**
 * Percentile calculation utilities
 *
 * STUB FILE: This file was created as a stub during migration.
 * The actual implementation should calculate percentiles for user statistics.
 *
 * TODO: Implement actual percentile calculations when needed
 */

/**
 * Calculate the percentile rank for a value in a dataset
 * @param value The value to calculate the percentile for
 * @param values Array of all values in the dataset
 * @returns Percentile rank (0-100)
 */
export function calculatePercentile(value: number, values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const belowCount = sorted.filter((v) => v < value).length;

  return Math.round((belowCount / sorted.length) * 100);
}

/**
 * Calculate percentiles for multiple metrics
 * @param userValue User's value for the metric
 * @param communityValues All community values for the metric
 * @returns Object with percentile and comparison data
 */
export function calculateMetricPercentile(
  userValue: number,
  communityValues: number[]
): {
  percentile: number;
  isAboveAverage: boolean;
  communityAverage: number;
} {
  const percentile = calculatePercentile(userValue, communityValues);
  const communityAverage =
    communityValues.length > 0
      ? communityValues.reduce((a, b) => a + b, 0) / communityValues.length
      : 0;

  return {
    percentile,
    isAboveAverage: userValue > communityAverage,
    communityAverage,
  };
}
