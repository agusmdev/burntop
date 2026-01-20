/**
 * Sync checkpoint management for burntop CLI
 *
 * Tracks the state of the last successful sync for each source to enable
 * incremental syncing. This avoids reprocessing all files on every sync,
 * making frequent syncs (every 5-15 minutes) efficient.
 *
 * Checkpoint data is stored in ~/.config/burntop/sync-checkpoint.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { getMachineId } from './machine-id';

const CONFIG_DIR = join(process.env['HOME'] || process.env['USERPROFILE'] || '', '.config', 'burntop');
const CHECKPOINT_FILE = join(CONFIG_DIR, 'sync-checkpoint.json');

/**
 * Checkpoint for a single file (used by file-based parsers)
 */
export interface FileCheckpoint {
  /** File modification time (ms since epoch) */
  mtime: number;
  /** File size in bytes (for quick change detection) */
  size: number;
  /** For JSONL files: last processed line number */
  lastLine?: number;
  /** For JSONL files: byte offset for seeking */
  lastOffset?: number;
}

/**
 * Checkpoint data for a single source (parser)
 */
export interface SourceCheckpoint {
  /** Timestamp of last successful sync for this source */
  lastSyncedAt: string;

  /**
   * For file-based sources (Claude Code, Continue, Aider, etc.)
   * Maps file path to checkpoint data
   */
  files?: Record<string, FileCheckpoint>;

  /**
   * For SQLite-based sources (Cursor)
   */
  sqlite?: {
    /** Last processed timestamp from database */
    lastTimestamp?: string;
    /** Database file modification time for quick change detection */
    dbMtime?: number;
    /** Database file size for quick change detection */
    dbSize?: number;
  };

  /**
   * For single JSON file sources (Cline, Roo Code, Kilo Code)
   */
  json?: {
    /** File modification time */
    mtime: number;
    /** File size for quick change detection */
    size?: number;
    /** Last processed task ID */
    lastTaskId?: string;
    /** Number of tasks at last sync (for detecting new tasks) */
    taskCount?: number;
  };
}

/**
 * Complete sync checkpoint structure
 */
export interface SyncCheckpoint {
  /** Checkpoint format version for migration support */
  version: '1.0';
  /** Machine ID this checkpoint belongs to */
  machineId: string;
  /** Per-source checkpoint data */
  sources: Record<string, SourceCheckpoint>;
}

/**
 * Ensure the config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load the sync checkpoint from disk.
 * Returns null if no checkpoint exists or if it's invalid.
 *
 * The checkpoint is also invalidated if the machine ID doesn't match,
 * ensuring each machine maintains its own sync state.
 */
export function loadCheckpoint(): SyncCheckpoint | null {
  try {
    if (!existsSync(CHECKPOINT_FILE)) {
      return null;
    }

    const content = readFileSync(CHECKPOINT_FILE, 'utf-8');
    const checkpoint = JSON.parse(content) as SyncCheckpoint;

    // Validate checkpoint structure
    if (
      !checkpoint ||
      checkpoint.version !== '1.0' ||
      typeof checkpoint.sources !== 'object'
    ) {
      return null;
    }

    // Validate machine ID matches current machine
    // Each machine should have its own checkpoint state
    const currentMachineId = getMachineId();
    if (checkpoint.machineId !== currentMachineId) {
      // Machine ID mismatch - this could be a shared config folder
      // Start fresh for this machine
      return null;
    }

    return checkpoint;
  } catch {
    // Return null on any error (corrupted file, parse error, etc.)
    return null;
  }
}

/**
 * Save the sync checkpoint to disk.
 * Overwrites any existing checkpoint.
 */
export function saveCheckpoint(checkpoint: SyncCheckpoint): void {
  ensureConfigDir();
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2), {
    mode: 0o600, // Owner read/write only
  });
}

/**
 * Get the checkpoint for a specific source.
 * Returns undefined if no checkpoint exists for this source.
 */
export function getSourceCheckpoint(sourceName: string): SourceCheckpoint | undefined {
  const checkpoint = loadCheckpoint();
  return checkpoint?.sources[sourceName];
}

/**
 * Update the checkpoint for a specific source.
 * Creates a new checkpoint if none exists.
 */
export function updateSourceCheckpoint(
  sourceName: string,
  sourceCheckpoint: SourceCheckpoint
): void {
  const existingCheckpoint = loadCheckpoint();

  const newCheckpoint: SyncCheckpoint = existingCheckpoint || {
    version: '1.0',
    machineId: getMachineId(),
    sources: {},
  };

  newCheckpoint.sources[sourceName] = sourceCheckpoint;
  saveCheckpoint(newCheckpoint);
}

/**
 * Create a new empty checkpoint for the current machine.
 */
export function createEmptyCheckpoint(): SyncCheckpoint {
  return {
    version: '1.0',
    machineId: getMachineId(),
    sources: {},
  };
}

/**
 * Clear the sync checkpoint (forces full resync on next sync).
 */
export function clearCheckpoint(): void {
  try {
    if (existsSync(CHECKPOINT_FILE)) {
      const { unlinkSync } = require('node:fs');
      unlinkSync(CHECKPOINT_FILE);
    }
  } catch {
    // Ignore errors when deleting
  }
}

/**
 * Get the path to the checkpoint file (for debugging)
 */
export function getCheckpointPath(): string {
  return CHECKPOINT_FILE;
}

/**
 * Helper: Check if a file has changed since the last checkpoint.
 * Returns true if the file should be reprocessed.
 */
export function hasFileChanged(
  filePath: string,
  fileCheckpoint: FileCheckpoint | undefined,
  currentMtime: number,
  currentSize: number
): boolean {
  if (!fileCheckpoint) {
    // No checkpoint for this file - it's new
    return true;
  }

  // File has changed if mtime or size differs
  return fileCheckpoint.mtime !== currentMtime || fileCheckpoint.size !== currentSize;
}

/**
 * Helper: Create a file checkpoint from current file stats.
 */
export function createFileCheckpoint(
  mtime: number,
  size: number,
  lastLine?: number,
  lastOffset?: number
): FileCheckpoint {
  return {
    mtime,
    size,
    ...(lastLine !== undefined && { lastLine }),
    ...(lastOffset !== undefined && { lastOffset }),
  };
}
