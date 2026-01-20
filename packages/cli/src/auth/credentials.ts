/**
 * Credentials storage and management for burntop CLI
 *
 * Stores credentials in ~/.config/burntop/credentials.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface Credentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  userId: string;
  username: string;
}

const CONFIG_DIR = join(homedir(), '.config', 'burntop');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');

/**
 * Ensure the config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Get stored credentials
 * @returns Credentials if they exist and are valid, null otherwise
 */
export function getCredentials(): Credentials | null {
  try {
    if (!existsSync(CREDENTIALS_FILE)) {
      return null;
    }

    const content = readFileSync(CREDENTIALS_FILE, 'utf-8');
    const credentials = JSON.parse(content) as Credentials;

    // Check if token is expired (with 5 minute buffer)
    if (credentials.expiresAt) {
      const bufferMs = 5 * 60 * 1000; // 5 minutes
      if (Date.now() >= credentials.expiresAt - bufferMs) {
        return null;
      }
    }

    return credentials;
  } catch {
    return null;
  }
}

/**
 * Save credentials to disk
 */
export function saveCredentials(credentials: Credentials): void {
  ensureConfigDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), {
    mode: 0o600, // Only owner can read/write
  });
}

/**
 * Delete stored credentials
 */
export function clearCredentials(): void {
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      unlinkSync(CREDENTIALS_FILE);
    }
  } catch {
    // Ignore errors when clearing
  }
}

/**
 * Get the path to the credentials file (for debugging)
 */
export function getCredentialsPath(): string {
  return CREDENTIALS_FILE;
}
