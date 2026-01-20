/**
 * Config exports for burntop CLI
 */

export { getMachineId, getMachineIdPath, resetMachineId } from './machine-id.js';
export {
  clearCheckpoint,
  createEmptyCheckpoint,
  createFileCheckpoint,
  getCheckpointPath,
  getSourceCheckpoint,
  hasFileChanged,
  loadCheckpoint,
  saveCheckpoint,
  updateSourceCheckpoint,
} from './sync-checkpoint.js';
export type { FileCheckpoint, SourceCheckpoint, SyncCheckpoint } from './sync-checkpoint.js';
export { getConfigPath, getUserConfig, saveUserConfig, updateConfig } from './user-config.js';
export type { UserConfig } from './user-config.js';

export { isFirstSync } from '../utils/first-sync.js';
export {
  setupAutoSync,
  removeAutoSync,
  checkAutoSyncStatus,
  type CronStatus,
} from '../utils/cronjob.js';
