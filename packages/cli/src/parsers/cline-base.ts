/**
 * Cline Base Parser
 *
 * Abstract base class for parsing usage data from Cline-family VS Code extensions.
 * Cline, Roo Code, and Kilo Code all share the same storage format.
 *
 * Storage structure:
 * - state/taskHistory.json - Main index with task list and aggregated token usage
 * - tasks/{taskId}/ - Per-task folders with conversation history
 *
 * Platform paths:
 * - macOS: ~/Library/Application Support/Code/User/globalStorage/{extensionId}/
 * - Windows: %APPDATA%/Code/User/globalStorage/{extensionId}/
 * - Linux: ~/.config/Code/User/globalStorage/{extensionId}/
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { SourceCheckpoint } from '../config/sync-checkpoint.js';
import type {
  IncrementalParseResult,
  ParseOptions,
  ParseResult,
  Parser,
  UsageRecord,
  UsageStats,
} from './types.js';

/**
 * Structure of a task history item from state/taskHistory.json
 */
interface ClineHistoryItem {
  /** Unique task identifier */
  id: string;
  /** ULID for enhanced tracking (optional) */
  ulid?: string;
  /** Unix timestamp (task creation) */
  ts: number;
  /** Original prompt text */
  task?: string;
  /** Input tokens consumed */
  tokensIn?: number;
  /** Output tokens generated */
  tokensOut?: number;
  /** Tokens written to cache */
  cacheWrites?: number;
  /** Tokens read from cache */
  cacheReads?: number;
  /** Calculated API cost in USD */
  totalCost?: number;
  /** AI model identifier */
  modelId?: string;
  /** Working directory when task was initialized */
  cwdOnTaskInitialization?: string;
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
 * Extract date (YYYY-MM-DD) from Unix timestamp
 */
function extractDateFromTimestamp(ts: number): string {
  return new Date(ts).toISOString().split('T')[0] || 'unknown';
}

/**
 * Get the VS Code globalStorage path based on platform
 */
function getGlobalStoragePath(extensionId: string): string {
  const home = homedir();
  const platform = process.platform;

  if (platform === 'darwin') {
    return join(
      home,
      'Library',
      'Application Support',
      'Code',
      'User',
      'globalStorage',
      extensionId
    );
  } else if (platform === 'win32') {
    return join(home, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', extensionId);
  } else {
    // Linux
    return join(home, '.config', 'Code', 'User', 'globalStorage', extensionId);
  }
}

/**
 * Abstract base class for Cline-family parsers
 */
export abstract class ClineBaseParser implements Parser {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly extensionId: string;

  get defaultPaths(): string[] {
    return [getGlobalStoragePath(this.extensionId)];
  }

  async exists(): Promise<boolean> {
    const basePath = this.defaultPaths[0];
    if (!basePath) return false;

    const taskHistoryPath = join(basePath, 'state', 'taskHistory.json');
    return existsSync(taskHistoryPath) && statSync(taskHistoryPath).isFile();
  }

  async parse(options?: ParseOptions): Promise<ParseResult> {
    const limit = options?.limit || 0;
    const onProgress = options?.onProgress;
    const records: UsageRecord[] = [];
    const errors: Array<{ file: string; error: string }> = [];
    const stats = createEmptyStats();
    const processedSessions = new Set<string>();

    const basePath = this.defaultPaths[0];
    if (!basePath) {
      return {
        source: this.name,
        records: [],
        stats,
        filesProcessed: 0,
        errors: [{ file: 'unknown', error: 'No base path configured' }],
      };
    }

    const taskHistoryPath = join(basePath, 'state', 'taskHistory.json');

    if (!existsSync(taskHistoryPath)) {
      return {
        source: this.name,
        records: [],
        stats,
        filesProcessed: 0,
        errors: [{ file: taskHistoryPath, error: 'Task history file not found' }],
      };
    }

    try {
      const content = readFileSync(taskHistoryPath, 'utf-8');
      const historyItems = JSON.parse(content) as ClineHistoryItem[];

      if (!Array.isArray(historyItems)) {
        return {
          source: this.name,
          records: [],
          stats,
          filesProcessed: 1,
          errors: [
            { file: taskHistoryPath, error: 'Invalid task history format - expected array' },
          ],
        };
      }

      const totalItems = limit > 0 ? Math.min(historyItems.length, limit) : historyItems.length;
      let processed = 0;

      for (const item of historyItems) {
        // Check limit
        if (limit > 0 && processed >= limit) {
          break;
        }

        processed++;

        // Report progress every 100 items
        if (onProgress && processed % 100 === 0) {
          onProgress(processed, totalItems);
        }

        // Skip items without token data
        if (!item.tokensIn && !item.tokensOut && !item.cacheWrites && !item.cacheReads) {
          continue;
        }

        // Create usage record from task
        const record: UsageRecord = {
          id: item.id,
          sessionId: item.id, // Each task is its own session in Cline
          source: this.name,
          model: item.modelId || 'unknown',
          timestamp: new Date(item.ts).toISOString(),
          inputTokens: item.tokensIn || 0,
          outputTokens: item.tokensOut || 0,
          cacheCreationTokens: item.cacheWrites || 0,
          cacheReadTokens: item.cacheReads || 0,
        };

        if (item.cwdOnTaskInitialization) {
          record.cwd = item.cwdOnTaskInitialization;
        }

        records.push(record);
        processedSessions.add(item.id);

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
        const date = extractDateFromTimestamp(item.ts);
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

      // Update session counts per date
      const sessionsPerDate = new Map<string, Set<string>>();
      for (const record of records) {
        const date = record.timestamp.split('T')[0] || 'unknown';
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
        filesProcessed: 1,
        errors,
      };
    } catch (err) {
      errors.push({
        file: taskHistoryPath,
        error: err instanceof Error ? err.message : 'Unknown error reading task history',
      });

      return {
        source: this.name,
        records: [],
        stats,
        filesProcessed: 1,
        errors,
      };
    }
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

    const basePath = this.defaultPaths[0];
    if (!basePath) {
      return {
        source: this.name,
        records: [],
        stats,
        filesProcessed: 0,
        errors: [{ file: 'unknown', error: 'No base path configured' }],
        checkpoint: { lastSyncedAt: new Date().toISOString() },
        isIncremental: false,
        skippedFiles: 0,
      };
    }

    const taskHistoryPath = join(basePath, 'state', 'taskHistory.json');

    if (!existsSync(taskHistoryPath)) {
      return {
        source: this.name,
        records: [],
        stats,
        filesProcessed: 0,
        errors: [{ file: taskHistoryPath, error: 'Task history file not found' }],
        checkpoint: { lastSyncedAt: new Date().toISOString() },
        isIncremental: false,
        skippedFiles: 0,
      };
    }

    const stat = statSync(taskHistoryPath);
    const prevJson = checkpoint?.json;

    // If file unchanged, return empty result
    if (prevJson && prevJson.mtime === stat.mtimeMs && prevJson.size === stat.size) {
      return {
        source: this.name,
        records: [],
        stats,
        filesProcessed: 1,
        errors: [],
        checkpoint: { lastSyncedAt: new Date().toISOString(), json: prevJson },
        isIncremental: true,
        skippedFiles: 1,
      };
    }

    try {
      const content = readFileSync(taskHistoryPath, 'utf-8');
      const historyItems = JSON.parse(content) as ClineHistoryItem[];

      if (!Array.isArray(historyItems)) {
        return {
          source: this.name,
          records: [],
          stats,
          filesProcessed: 1,
          errors: [
            { file: taskHistoryPath, error: 'Invalid task history format - expected array' },
          ],
          checkpoint: {
            lastSyncedAt: new Date().toISOString(),
            json: { mtime: stat.mtimeMs, size: stat.size, taskCount: 0 },
          },
          isIncremental: !!checkpoint,
          skippedFiles: 0,
        };
      }

      // Get only new tasks (beyond previous task count)
      const prevTaskCount = prevJson?.taskCount || 0;
      const newItems = historyItems.slice(prevTaskCount);
      const totalNewItems = limit > 0 ? Math.min(newItems.length, limit) : newItems.length;
      let processed = 0;

      for (const item of newItems) {
        // Check limit
        if (limit > 0 && processed >= limit) {
          break;
        }

        processed++;

        // Report progress
        if (onProgress && processed % 100 === 0) {
          onProgress(processed, totalNewItems);
        }

        // Skip items without token data
        if (!item.tokensIn && !item.tokensOut && !item.cacheWrites && !item.cacheReads) {
          continue;
        }

        // Create usage record from task
        const record: UsageRecord = {
          id: item.id,
          sessionId: item.id,
          source: this.name,
          model: item.modelId || 'unknown',
          timestamp: new Date(item.ts).toISOString(),
          inputTokens: item.tokensIn || 0,
          outputTokens: item.tokensOut || 0,
          cacheCreationTokens: item.cacheWrites || 0,
          cacheReadTokens: item.cacheReads || 0,
        };

        if (item.cwdOnTaskInitialization) {
          record.cwd = item.cwdOnTaskInitialization;
        }

        records.push(record);
        processedSessions.add(item.id);

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
        const date = extractDateFromTimestamp(item.ts);
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

      // Update session counts per date
      const sessionsPerDate = new Map<string, Set<string>>();
      for (const record of records) {
        const date = record.timestamp.split('T')[0] || 'unknown';
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
        filesProcessed: 1,
        errors,
        checkpoint: {
          lastSyncedAt: new Date().toISOString(),
          json: { mtime: stat.mtimeMs, size: stat.size, taskCount: historyItems.length },
        },
        isIncremental: !!checkpoint,
        skippedFiles: 0,
      };
    } catch (err) {
      errors.push({
        file: taskHistoryPath,
        error: err instanceof Error ? err.message : 'Unknown error reading task history',
      });

      return {
        source: this.name,
        records: [],
        stats,
        filesProcessed: 1,
        errors,
        checkpoint: { lastSyncedAt: new Date().toISOString() },
        isIncremental: false,
        skippedFiles: 0,
      };
    }
  }
}
