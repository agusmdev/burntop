/**
 * Machine ID generation and management for burntop CLI
 *
 * Generates a stable, unique identifier for the current machine to enable
 * multi-machine sync support. The machine ID is stored in ~/.config/burntop/machine-id
 * and remains constant across syncs.
 *
 * The ID is generated from a hash of system properties (hostname + MAC address)
 * to ensure stability across reboots while maintaining uniqueness.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { hostname, networkInterfaces } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = join(process.env['HOME'] || process.env['USERPROFILE'] || '', '.config', 'burntop');
const MACHINE_ID_FILE = join(CONFIG_DIR, 'machine-id');

/**
 * Ensure the config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Get the first non-internal MAC address from network interfaces.
 * Returns undefined if no MAC address is found.
 */
function getFirstMacAddress(): string | undefined {
  const interfaces = networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;

    for (const info of iface) {
      // Skip internal interfaces (loopback)
      if (info.internal) continue;

      // Skip if no MAC address
      if (!info.mac || info.mac === '00:00:00:00:00:00') continue;

      return info.mac;
    }
  }

  return undefined;
}

/**
 * Generate a machine ID from system properties.
 * Uses hostname + MAC address to create a stable, unique identifier.
 *
 * @returns 8-character hex string
 */
function generateMachineId(): string {
  const machineHostname = hostname() || 'unknown';
  const macAddress = getFirstMacAddress() || 'no-mac';

  // Combine hostname and MAC address for uniqueness
  const identifier = `${machineHostname}:${macAddress}`;

  // Hash and truncate to 8 hex characters (4 bytes = 32 bits of entropy)
  // This provides good uniqueness while keeping the ID readable
  const hash = createHash('sha256').update(identifier).digest('hex');
  return hash.substring(0, 8);
}

/**
 * Get the machine ID, generating and storing it if it doesn't exist.
 *
 * The machine ID is stable across syncs - once generated, it's stored
 * and reused for all future syncs from this machine.
 *
 * @returns 8-character hex string identifying this machine
 */
export function getMachineId(): string {
  try {
    // Try to read existing machine ID
    if (existsSync(MACHINE_ID_FILE)) {
      const storedId = readFileSync(MACHINE_ID_FILE, 'utf-8').trim();

      // Validate stored ID (should be 8 hex characters)
      if (/^[a-f0-9]{8}$/i.test(storedId)) {
        return storedId.toLowerCase();
      }
      // Invalid format, regenerate
    }

    // Generate new machine ID
    const machineId = generateMachineId();

    // Store for future use
    ensureConfigDir();
    writeFileSync(MACHINE_ID_FILE, machineId, {
      mode: 0o600, // Owner read/write only (contains identifying info)
    });

    return machineId;
  } catch {
    // Fallback: generate a random ID if we can't read/write the file
    // This ensures sync still works, even if ID won't be stable
    return createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 8);
  }
}

/**
 * Get the path to the machine ID file (for debugging)
 */
export function getMachineIdPath(): string {
  return MACHINE_ID_FILE;
}

/**
 * Reset the machine ID (for testing purposes only)
 * This will cause a new machine ID to be generated on next getMachineId() call
 */
export function resetMachineId(): void {
  try {
    if (existsSync(MACHINE_ID_FILE)) {
      const { unlinkSync } = require('node:fs');
      unlinkSync(MACHINE_ID_FILE);
    }
  } catch {
    // Ignore errors when deleting
  }
}
