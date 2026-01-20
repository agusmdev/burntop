/**
 * Cursor Parser
 *
 * Parses usage data from Cursor IDE (SQLite database)
 *
 * Cursor stores chat session data in a SQLite database at:
 * ~/Library/Application Support/Cursor/User/globalStorage/state.vscdb
 *
 * Data structure:
 * - `composerData:{uuid}` keys contain session metadata including modelConfig.modelName
 * - `bubbleId:{composerId}:{bubbleId}` keys contain message data with tokenCount
 * - type: 2 indicates assistant responses (which have token counts)
 */

import { existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { Database } from 'bun:sqlite';

import type { SourceCheckpoint } from '../config/sync-checkpoint.js';
import type {
  IncrementalParseResult,
  ParseOptions,
  ParseResult,
  Parser,
  UsageRecord,
  UsageStats,
} from './types.js';

/** Structure of Cursor composer data */
interface CursorComposerData {
  _v: number;
  composerId: string;
  createdAt: number;
  status: string;
  modelConfig?: {
    modelName?: string;
    maxMode?: boolean;
  };
  fullConversationHeadersOnly?: Array<{
    bubbleId: string;
    type: number;
    serverBubbleId?: string;
  }>;
}

/** Structure of Cursor bubble data */
interface CursorBubbleData {
  _v: number;
  type: number;
  bubbleId: string;
  createdAt?: string;
  tokenCount?: {
    inputTokens: number;
    outputTokens: number;
  };
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
 * Extract date from ISO timestamp or Unix timestamp
 */
function extractDate(timestamp: string | number): string {
  if (typeof timestamp === 'number') {
    // Unix timestamp in milliseconds
    return new Date(timestamp).toISOString().split('T')[0] || 'unknown';
  }
  return timestamp.split('T')[0] || 'unknown';
}

/**
 * Get the Cursor database path based on platform
 */
function getCursorDbPath(): string {
  const home = homedir();
  const platform = process.platform;

  if (platform === 'darwin') {
    return join(
      home,
      'Library',
      'Application Support',
      'Cursor',
      'User',
      'globalStorage',
      'state.vscdb'
    );
  } else if (platform === 'win32') {
    return join(home, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
  } else {
    // Linux
    return join(home, '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
  }
}

export class CursorParser implements Parser {
  readonly name = 'cursor';
  readonly displayName = 'Cursor';
  readonly defaultPaths: string[];

  constructor() {
    this.defaultPaths = [getCursorDbPath()];
  }

  async exists(): Promise<boolean> {
    const dbPath = this.defaultPaths[0];
    if (!dbPath) return false;
    return existsSync(dbPath) && statSync(dbPath).isFile();
  }

  async parse(options?: ParseOptions): Promise<ParseResult> {
    const limit = options?.limit || 0;
    const onProgress = options?.onProgress;
    const records: UsageRecord[] = [];
    const errors: Array<{ file: string; error: string }> = [];
    const stats = createEmptyStats();
    const processedSessions = new Set<string>();

    const dbPath = this.defaultPaths[0];
    if (!dbPath || !existsSync(dbPath)) {
      return {
        source: this.name,
        records: [],
        stats,
        filesProcessed: 0,
        errors: [{ file: dbPath || 'unknown', error: 'Database not found' }],
      };
    }

    let db: Database | null = null;

    try {
      // Open database in read-only mode
      db = new Database(dbPath, { readonly: true });

      // Get all composer sessions
      const composerRows = db
        .query<
          { key: string; value: Buffer },
          []
        >("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'")
        .all();

      const sessionModels = new Map<string, string>();
      const sessionTimestamps = new Map<string, number>();
      const sessionBubbles = new Map<string, string[]>();

      // Parse composer data to get model info and bubble IDs
      for (const row of composerRows) {
        try {
          const composerData = JSON.parse(row.value.toString()) as CursorComposerData;
          const composerId = composerData.composerId;
          const modelName = composerData.modelConfig?.modelName || 'unknown';
          const createdAt = composerData.createdAt;

          sessionModels.set(composerId, modelName);
          sessionTimestamps.set(composerId, createdAt);

          // Extract bubble IDs (type 2 = assistant responses)
          const bubbleIds =
            composerData.fullConversationHeadersOnly
              ?.filter((b) => b.type === 2)
              .map((b) => b.bubbleId) || [];
          sessionBubbles.set(composerId, bubbleIds);
        } catch {
          // Skip invalid JSON
        }
      }

      // Get all bubbles with token data
      const bubbleRows = db
        .query<
          { key: string; value: Buffer },
          []
        >("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'")
        .all();

      let filesProcessed = 0;
      const totalFiles = bubbleRows.length;

      for (const row of bubbleRows) {
        // Check limit
        if (limit > 0 && records.length >= limit) {
          break;
        }

        filesProcessed++;

        // Report progress every 100 records
        if (onProgress && filesProcessed % 100 === 0) {
          onProgress(filesProcessed, totalFiles);
        }

        try {
          // Parse bubble key: bubbleId:{composerId}:{bubbleId}
          const keyParts = row.key.split(':');
          if (keyParts.length !== 3) continue;

          const composerId = keyParts[1];
          const bubbleId = keyParts[2];

          if (!composerId || !bubbleId) continue;

          const bubbleData = JSON.parse(row.value.toString()) as CursorBubbleData;

          // Only process assistant responses (type 2) with token data
          if (bubbleData.type !== 2) continue;
          if (!bubbleData.tokenCount) continue;

          const { inputTokens, outputTokens } = bubbleData.tokenCount;

          // Skip if no actual token usage
          if (!inputTokens && !outputTokens) continue;

          const model = sessionModels.get(composerId) || 'unknown';
          const sessionCreatedAt = sessionTimestamps.get(composerId);

          // Use bubble createdAt if available, otherwise fall back to session timestamp
          let timestamp: string;
          if (bubbleData.createdAt) {
            timestamp = bubbleData.createdAt;
          } else if (sessionCreatedAt) {
            timestamp = new Date(sessionCreatedAt).toISOString();
          } else {
            timestamp = new Date().toISOString();
          }

          const record: UsageRecord = {
            id: bubbleId,
            sessionId: composerId,
            source: 'cursor',
            model,
            timestamp,
            inputTokens: inputTokens || 0,
            outputTokens: outputTokens || 0,
            cacheCreationTokens: 0, // Cursor doesn't expose cache metrics
            cacheReadTokens: 0,
          };

          records.push(record);
          processedSessions.add(composerId);

          // Update stats
          stats.totalInputTokens += record.inputTokens;
          stats.totalOutputTokens += record.outputTokens;
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
          modelStats.messageCount++;

          // By date
          const date = extractDate(record.timestamp);
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
          dateStats.messageCount++;
        } catch {
          // Skip invalid entries
        }
      }

      // Update session counts per date
      const sessionsPerDate = new Map<string, Set<string>>();
      for (const record of records) {
        const date = extractDate(record.timestamp);
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
    } catch (err) {
      errors.push({
        file: dbPath,
        error: err instanceof Error ? err.message : 'Unknown error reading database',
      });

      return {
        source: this.name,
        records: [],
        stats,
        filesProcessed: 0,
        errors,
      };
    } finally {
      // Close database connection
      if (db) {
        db.close();
      }
    }
  }

  async parseIncremental(
    checkpoint: SourceCheckpoint | undefined,
    options?: ParseOptions
  ): Promise<IncrementalParseResult> {
    const dbPath = this.defaultPaths[0];
    if (!dbPath || !existsSync(dbPath)) {
      return {
        source: this.name,
        records: [],
        stats: createEmptyStats(),
        filesProcessed: 0,
        errors: [{ file: dbPath || 'unknown', error: 'Database not found' }],
        checkpoint: { lastSyncedAt: new Date().toISOString() },
        isIncremental: false,
        skippedFiles: 0,
      };
    }

    const stat = statSync(dbPath);
    const prevSqlite = checkpoint?.sqlite;

    // If DB file unchanged, return empty result
    if (prevSqlite && prevSqlite.dbMtime === stat.mtimeMs) {
      return {
        source: this.name,
        records: [],
        stats: createEmptyStats(),
        filesProcessed: 1,
        errors: [],
        checkpoint: { lastSyncedAt: new Date().toISOString(), sqlite: prevSqlite },
        isIncremental: true,
        skippedFiles: 1,
      };
    }

    // Database has changed - do a full parse
    const result = await this.parse(options);

    // Find max timestamp for checkpoint
    const maxTimestamp = result.records.reduce(
      (max, r) => (r.timestamp > max ? r.timestamp : max),
      ''
    );

    return {
      ...result,
      checkpoint: {
        lastSyncedAt: new Date().toISOString(),
        sqlite: {
          dbMtime: stat.mtimeMs,
          dbSize: stat.size,
          ...(maxTimestamp ? { lastTimestamp: maxTimestamp } : {}),
        },
      },
      isIncremental: !!checkpoint,
      skippedFiles: 0,
    };
  }
}
