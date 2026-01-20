/**
 * User configuration management for burntop CLI
 *
 * Stores user preferences in ~/.config/burntop/config.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface UserConfig {
  /** Config file version */
  version?: string;
  /** Whether auto-sync is enabled */
  autoSync?: boolean;
}

const CONFIG_DIR = join(homedir(), '.config', 'burntop');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/**
 * Ensure the config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Get user configuration
 * @returns UserConfig with defaults applied
 */
export function getUserConfig(): UserConfig {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return { version: '1.0.0', autoSync: false };
    }

    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(content) as UserConfig;

    // Apply defaults
    return {
      version: config.version || '1.0.0',
      autoSync: config.autoSync ?? false,
    };
  } catch {
    // Return defaults on error
    return { version: '1.0.0', autoSync: false };
  }
}

/**
 * Save user configuration to disk
 */
export function saveUserConfig(config: UserConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
    mode: 0o644, // Owner read/write, others read
  });
}

/**
 * Update a specific config value
 */
export function updateConfig(updates: Partial<UserConfig>): void {
  const currentConfig = getUserConfig();
  const newConfig = { ...currentConfig, ...updates };
  saveUserConfig(newConfig);
}

/**
 * Get the path to the config file (for debugging)
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}
