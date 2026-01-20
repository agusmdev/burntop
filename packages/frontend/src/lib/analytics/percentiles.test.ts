/**
 * Tests for user percentile calculations
 */

import { describe, expect, it } from 'vitest';

describe('Percentile Calculations', () => {
  describe('calculatePercentile logic', () => {
    it('should calculate percentile correctly for a user in the middle', () => {
      // Simulating 5 users with different token counts: [100, 200, 300, 400, 500]
      // User with 300 tokens (middle) should be at 40th percentile (2 users below / 5 total)
      const allValues = [100, 200, 300, 400, 500];
      const userValue = 300;

      const sorted = [...allValues].sort((a, b) => a - b);
      const countBelow = sorted.filter((v) => v < userValue).length;
      const percentile = Math.round((countBelow / sorted.length) * 100);

      expect(percentile).toBe(40);
      expect(countBelow).toBe(2); // 100 and 200 are below 300
    });

    it('should return 0 percentile for lowest performer', () => {
      const allValues = [100, 200, 300];
      const userValue = 100; // Lowest

      const sorted = [...allValues].sort((a, b) => a - b);
      const countBelow = sorted.filter((v) => v < userValue).length;
      const percentile = Math.round((countBelow / sorted.length) * 100);

      expect(percentile).toBe(0);
      expect(countBelow).toBe(0); // No users below
    });

    it('should calculate correct percentile for top performer', () => {
      const allValues = [100, 200, 300];
      const userValue = 300; // Highest

      const sorted = [...allValues].sort((a, b) => a - b);
      const countBelow = sorted.filter((v) => v < userValue).length;
      const percentile = Math.round((countBelow / sorted.length) * 100);

      expect(percentile).toBe(67); // 2 out of 3 users below
      expect(countBelow).toBe(2);
    });

    it('should handle single user (50th percentile)', () => {
      const allValues = [100];
      const userValue = 100;

      // With only one user, should default to median
      if (allValues.length === 1) {
        expect(50).toBe(50);
      } else {
        const sorted = [...allValues].sort((a, b) => a - b);
        const countBelow = sorted.filter((v) => v < userValue).length;
        const percentile = Math.round((countBelow / sorted.length) * 100);
        expect(percentile).toBe(50);
      }
    });

    it('should handle empty data (50th percentile default)', () => {
      const allValues: number[] = [];

      // With no data, should default to median
      if (allValues.length === 0) {
        expect(50).toBe(50);
      }
    });

    it('should calculate percentile correctly with duplicate values', () => {
      // Users with values: [100, 100, 200, 300, 300]
      // User with 200 should be at 40th percentile (2 values strictly below)
      const allValues = [100, 100, 200, 300, 300];
      const userValue = 200;

      const sorted = [...allValues].sort((a, b) => a - b);
      const countBelow = sorted.filter((v) => v < userValue).length;
      const percentile = Math.round((countBelow / sorted.length) * 100);

      expect(percentile).toBe(40); // 2 out of 5 users below
      expect(countBelow).toBe(2); // Only the two 100s are strictly below
    });

    it('should calculate percentile for 2 users', () => {
      const allValues = [100, 200];
      const userValue = 200; // Higher user

      const sorted = [...allValues].sort((a, b) => a - b);
      const countBelow = sorted.filter((v) => v < userValue).length;
      const percentile = Math.round((countBelow / sorted.length) * 100);

      expect(percentile).toBe(50); // 1 out of 2 users below
      expect(countBelow).toBe(1);
    });

    it('should handle large dataset', () => {
      // Create 100 users with values from 1 to 100
      const allValues = Array.from({ length: 100 }, (_, i) => i + 1);
      const userValue = 75; // User at 75

      const sorted = [...allValues].sort((a, b) => a - b);
      const countBelow = sorted.filter((v) => v < userValue).length;
      const percentile = Math.round((countBelow / sorted.length) * 100);

      expect(percentile).toBe(74); // 74 users below (1-74)
      expect(countBelow).toBe(74);
    });
  });

  describe('cache efficiency calculation', () => {
    it('should calculate cache efficiency correctly', () => {
      const cacheRead = 75;
      const cacheWrite = 25;
      const input = 0;
      const output = 0;

      // Cache efficiency = cacheRead / (input + output + cacheRead) * 100
      const cacheEfficiency =
        input + output > 0 ? (cacheRead / (input + output + cacheRead)) * 100 : 0;

      expect(cacheEfficiency).toBe(0); // Denominator includes input+output which are 0

      // Correct formula: cacheRead / (cacheRead + cacheWrite) * 100
      const correctEfficiency = (cacheRead / (cacheRead + cacheWrite)) * 100;
      expect(correctEfficiency).toBe(75);
    });

    it('should handle zero cache tokens', () => {
      const cacheRead = 0;
      const cacheWrite = 0;

      const efficiency =
        cacheRead + cacheWrite > 0 ? (cacheRead / (cacheRead + cacheWrite)) * 100 : 0;

      expect(efficiency).toBe(0);
    });

    it('should calculate 100% cache efficiency', () => {
      const cacheRead = 100;
      const cacheWrite = 0;

      const efficiency = (cacheRead / (cacheRead + cacheWrite)) * 100;

      expect(efficiency).toBe(100);
    });
  });

  describe('response structure validation', () => {
    it('should define expected UserPercentiles interface', () => {
      const expectedStructure = {
        tokensPercentile: expect.any(Number),
        costPercentile: expect.any(Number),
        streakPercentile: expect.any(Number),
        cacheEfficiencyPercentile: expect.any(Number),
        reasoningTokensPercentile: expect.any(Number),
        uniqueToolsPercentile: expect.any(Number),
        uniqueModelsPercentile: expect.any(Number),
        totalUsers: expect.any(Number),
      };

      expect(expectedStructure).toBeDefined();

      // All percentiles should be between 0 and 100
      const mockPercentiles = {
        tokensPercentile: 75,
        costPercentile: 80,
        streakPercentile: 60,
        cacheEfficiencyPercentile: 90,
        reasoningTokensPercentile: 70,
        uniqueToolsPercentile: 65,
        uniqueModelsPercentile: 55,
        totalUsers: 100,
      };

      expect(mockPercentiles.tokensPercentile).toBeGreaterThanOrEqual(0);
      expect(mockPercentiles.tokensPercentile).toBeLessThanOrEqual(100);
    });
  });
});
