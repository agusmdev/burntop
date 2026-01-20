import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique referral code for a user
 *
 * Format: FIRE{YEAR}{RANDOM}
 * Example: FIRE2025ABC, FIRE2025XYZ
 *
 * @returns A unique referral code string (12 characters)
 */
export function generateReferralCode(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';

  // Generate 3 random characters
  for (let i = 0; i < 3; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `FIRE${year}${random}`;
}
