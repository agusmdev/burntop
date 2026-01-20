import { describe, expect, test } from 'vitest';

import { generateReferralCode } from './utils';

describe('generateReferralCode', () => {
  test('generates a referral code with correct format', () => {
    const code = generateReferralCode();
    const year = new Date().getFullYear();

    // Should be FIRE{YEAR}{3 random chars}
    expect(code).toMatch(new RegExp(`^FIRE${year}[A-Z0-9]{3}$`));
  });

  test('generates codes with correct length (FIRE + 4 digits + 3 chars)', () => {
    const code = generateReferralCode();
    const year = new Date().getFullYear();
    const expectedLength = 4 + year.toString().length + 3; // FIRE + YYYY + ABC
    expect(code.length).toBe(expectedLength); // FIRE2026ABC = 11 chars
  });

  test('generates different codes on multiple calls', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 10; i++) {
      codes.add(generateReferralCode());
    }

    // With 36^3 = 46656 possible combinations, we should get unique codes
    // In 10 attempts, collision is unlikely
    expect(codes.size).toBeGreaterThan(5);
  });

  test('starts with FIRE prefix', () => {
    const code = generateReferralCode();
    expect(code.startsWith('FIRE')).toBe(true);
  });
});
