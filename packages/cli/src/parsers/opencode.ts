/**
 * OpenCode Parser
 *
 * Parses usage data from OpenCode CLI (~/.local/share/opencode/storage/message/)
 *
 * OpenCode stores individual JSON files per message in subdirectories.
 * Messages with role "assistant" contain token usage information.
 *
 * Data structure:
 * - Each JSON file contains a single message
 * - `role: "assistant"` messages have token data in the `tokens` field
 * - `tokens.input`, `tokens.output` for main token counts
 * - `tokens.cache.read`, `tokens.cache.write` for cache tokens
 * - `tokens.reasoning` for reasoning tokens (optional)
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type {
  IncrementalParseResult,
  ParseOptions,
  ParseResult,
  Parser,
  UsageRecord,
  UsageStats,
} from './types.js';
import type { FileCheckpoint, SourceCheckpoint } from '../config/sync-checkpoint.js';

/** Structure of an OpenCode message JSON file */
interface OpenCodeMessage {
  id: string;
  sessionID: string;
  role: string;
  modelID?: string;
  providerID?: string;
  cost?: number;
  tokens?: {
    input: number;
    output: number;
    reasoning?: number;
    cache: {
      read: number;
      write: number;
    };
  };
  time: {
    created: number; // Unix timestamp in milliseconds (as float)
    completed?: number;
  };
  agent?: string;
  mode?: string;
}

/**
 * Create empty stats object
 */
function createEmptyStats(): UsageStats {
  return {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheCreationTokens: 0,
    totalCacheReadTokens: 0,
    sessionCount: 0,
    messageCount: 0,
    byModel: {},
    byDate: {},
  };
}

/**
 * Extract date from Unix timestamp (milliseconds)
 */
function extractDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0] || 'unknown';
}

/**
 * Get the OpenCode data path based on platform
 */
function getOpenCodeDataPath(): string {
  const home = homedir();

  // Check XDG_DATA_HOME first (Linux standard)
  const xdgDataHome = process.env['XDG_DATA_HOME'];
  if (xdgDataHome) {
    return join(xdgDataHome, 'opencode', 'storage', 'message');
  }

  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS: ~/.local/share/opencode/storage/message
    return join(home, '.local', 'share', 'opencode', 'storage', 'message');
  } else if (platform === 'win32') {
    // Windows: %LOCALAPPDATA%\opencode\storage\message
    const localAppData = process.env['LOCALAPPDATA'] || join(home, 'AppData', 'Local');
    return join(localAppData, 'opencode', 'storage', 'message');
  } else {
    // Linux: ~/.local/share/opencode/storage/message
    return join(home, '.local', 'share', 'opencode', 'storage', 'message');
  }
}

/**
 * Recursively find all .json files in a directory
 */
function findJsonFiles(dir: string): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) {
    return files;
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...findJsonFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return files;
}

/**
 * Parse a single OpenCode message JSON file
 */
function parseMessageFile(filePath: string): UsageRecord | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const msg = JSON.parse(content) as OpenCodeMessage;

    // Only process assistant messages with token data
    if (msg.role !== 'assistant') {
      return null;
    }

    if (!msg.tokens) {
      return null;
    }

    const { input, output, reasoning, cache } = msg.tokens;

    // Skip if no actual token usage
    if (!input && !output && !cache.read && !cache.write) {
      return null;
    }

    const model = msg.modelID || 'unknown';
    const timestamp = new Date(msg.time.created).toISOString();

    return {
      id: msg.id,
      sessionId: msg.sessionID,
      source: 'opencode',
      model,
      timestamp,
      inputTokens: input || 0,
      outputTokens: (output || 0) + (reasoning || 0), // Include reasoning in output
      cacheCreationTokens: cache.write || 0,
      cacheReadTokens: cache.read || 0,
    };
  } catch {
    return null;
  }
}

export class OpenCodeParser implements Parser {
  readonly name = 'opencode';
  readonly displayName = 'OpenCode';
  readonly defaultPaths: string[];

  constructor() {
    this.defaultPaths = [getOpenCodeDataPath()];
  }

  async exists(): Promise<boolean> {
    return this.defaultPaths.some((p) => existsSync(p) && statSync(p).isDirectory());
  }

  async parse(options?: ParseOptions): Promise<ParseResult> {
    const limit = options?.limit || 0;
    const onProgress = options?.onProgress;
    const records: UsageRecord[] = [];
    const errors: Array<{ file: string; error: string }> = [];
    const stats = createEmptyStats();
    const processedSessions = new Set<string>();

    let filesProcessed = 0;

    for (const basePath of this.defaultPaths) {
      const jsonFiles = findJsonFiles(basePath);
      const totalFiles = limit > 0 ? Math.min(jsonFiles.length, limit) : jsonFiles.length;

      for (const filePath of jsonFiles) {
        // Check limit
        if (limit > 0 && filesProcessed >= limit) {
          break;
        }

        filesProcessed++;

        // Report progress every 100 files
        if (onProgress && filesProcessed % 100 === 0) {
          onProgress(filesProcessed, totalFiles);
        }

        try {
          const record = parseMessageFile(filePath);

          if (record) {
            records.push(record);
            processedSessions.add(record.sessionId);

            // Update stats
            stats.totalInputTokens += record.inputTokens;
            stats.totalOutputTokens += record.outputTokens;
            stats.totalCacheCreationTokens += record.cacheCreationTokens;
            stats.totalCacheReadTokens += record.cacheReadTokens;
            stats.messageCount++;

            // By model
            let modelStats = stats.byModel[record.model];
            if (!modelStats) {
              modelStats = {
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
                messageCount: 0,
              };
              stats.byModel[record.model] = modelStats;
            }
            modelStats.inputTokens += record.inputTokens;
            modelStats.outputTokens += record.outputTokens;
            modelStats.cacheCreationTokens += record.cacheCreationTokens;
            modelStats.cacheReadTokens += record.cacheReadTokens;
            modelStats.messageCount++;

            // By date
            const date = extractDate(new Date(record.timestamp).getTime());
            let dateStats = stats.byDate[date];
            if (!dateStats) {
              dateStats = {
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
                messageCount: 0,
                sessionCount: 0,
              };
              stats.byDate[date] = dateStats;
            }
            dateStats.inputTokens += record.inputTokens;
            dateStats.outputTokens += record.outputTokens;
            dateStats.cacheCreationTokens += record.cacheCreationTokens;
            dateStats.cacheReadTokens += record.cacheReadTokens;
            dateStats.messageCount++;
          }
        } catch (err) {
          errors.push({
            file: filePath,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    // Update session counts per date
    const sessionsPerDate = new Map<string, Set<string>>();
    for (const record of records) {
      const date = extractDate(new Date(record.timestamp).getTime());
      let sessions = sessionsPerDate.get(date);
      if (!sessions) {
        sessions = new Set<string>();
        sessionsPerDate.set(date, sessions);
      }
      sessions.add(record.sessionId);
    }
    for (const [date, sessions] of sessionsPerDate) {
      const dateStats = stats.byDate[date];
      if (dateStats) {
        dateStats.sessionCount = sessions.size;
      }
    }

    stats.sessionCount = processedSessions.size;

    return {
      source: this.name,
      records,
      stats,
      filesProcessed,
      errors,
    };
  }

  async parseIncremental(
    checkpoint: SourceCheckpoint | undefined,
    options?: ParseOptions
  ): Promise<IncrementalParseResult> {
    const limit = options?.limit || 0;
    const onProgress = options?.onProgress;
    const records: UsageRecord[] = [];
    const errors: Array<{ file: string; error: string }> = [];
    const stats = createEmptyStats();
    const processedSessions = new Set<string>();

    const fileCheckpoints = checkpoint?.files || {};
    const newFileCheckpoints: Record<string, FileCheckpoint> = {};
    let skippedFiles = 0;
    let filesProcessed = 0;

    for (const basePath of this.defaultPaths) {
      const jsonFiles = findJsonFiles(basePath);
      const totalFiles = limit > 0 ? Math.min(jsonFiles.length, limit) : jsonFiles.length;

      for (const filePath of jsonFiles) {
        if (limit > 0 && filesProcessed >= limit) {
          break;
        }

        const stat = statSync(filePath);
        const prevCheckpoint = fileCheckpoints[filePath];

        if (
          prevCheckpoint &&
          prevCheckpoint.mtime === stat.mtimeMs &&
          prevCheckpoint.size === stat.size
        ) {
          newFileCheckpoints[filePath] = prevCheckpoint;
          skippedFiles++;
          filesProcessed++;
          continue;
        }

        filesProcessed++;

        if (onProgress && filesProcessed % 100 === 0) {
          onProgress(filesProcessed, totalFiles);
        }

        newFileCheckpoints[filePath] = { mtime: stat.mtimeMs, size: stat.size };

        try {
          const record = parseMessageFile(filePath);

          if (record) {
            records.push(record);
            processedSessions.add(record.sessionId);

            stats.totalInputTokens += record.inputTokens;
            stats.totalOutputTokens += record.outputTokens;
            stats.totalCacheCreationTokens += record.cacheCreationTokens;
            stats.totalCacheReadTokens += record.cacheReadTokens;
            stats.messageCount++;

            let modelStats = stats.byModel[record.model];
            if (!modelStats) {
              modelStats = {
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
                messageCount: 0,
              };
              stats.byModel[record.model] = modelStats;
            }
            modelStats.inputTokens += record.inputTokens;
            modelStats.outputTokens += record.outputTokens;
            modelStats.cacheCreationTokens += record.cacheCreationTokens;
            modelStats.cacheReadTokens += record.cacheReadTokens;
            modelStats.messageCount++;

            const date = extractDate(new Date(record.timestamp).getTime());
            let dateStats = stats.byDate[date];
            if (!dateStats) {
              dateStats = {
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
                messageCount: 0,
                sessionCount: 0,
              };
              stats.byDate[date] = dateStats;
            }
            dateStats.inputTokens += record.inputTokens;
            dateStats.outputTokens += record.outputTokens;
            dateStats.cacheCreationTokens += record.cacheCreationTokens;
            dateStats.cacheReadTokens += record.cacheReadTokens;
            dateStats.messageCount++;
          }
        } catch (err) {
          errors.push({
            file: filePath,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    const sessionsPerDate = new Map<string, Set<string>>();
    for (const record of records) {
      const date = extractDate(new Date(record.timestamp).getTime());
      let sessions = sessionsPerDate.get(date);
      if (!sessions) {
        sessions = new Set<string>();
        sessionsPerDate.set(date, sessions);
      }
      sessions.add(record.sessionId);
    }
    for (const [date, sessions] of sessionsPerDate) {
      const dateStats = stats.byDate[date];
      if (dateStats) {
        dateStats.sessionCount = sessions.size;
      }
    }

    stats.sessionCount = processedSessions.size;

    return {
      source: this.name,
      records,
      stats,
      filesProcessed,
      errors,
      checkpoint: { lastSyncedAt: new Date().toISOString(), files: newFileCheckpoints },
      isIncremental: !!checkpoint,
      skippedFiles,
    };
  }
}
