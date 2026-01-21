/**
 * First sync detection utility for burntop CLI
 *
 * Determines if the current sync operation is the first sync ever performed
 * on this machine by checking for the existence of sync checkpoints.
 */

import { existsSync } from 'node:fs';

import { getCheckpointPath } from '../config/sync-checkpoint.js';

export function isFirstSync(): boolean {
  const checkpointPath = getCheckpointPath();
  return !existsSync(checkpointPath);
}
