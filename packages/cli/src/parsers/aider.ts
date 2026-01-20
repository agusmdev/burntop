/**
 * Aider Parser
 *
 * Parses usage data from Aider analytics log files (~/.aider/*.jsonl)
 *
 * Aider stores analytics events in JSONL format when using --analytics-log.
 * Each line is a JSON object with event data. We focus on "message_send" events
 * which contain token usage information.
 *
 * Event structure:
 * {
 *   "event": "message_send",
 *   "properties": {
 *     "main_model": "claude-3-5-sonnet-20241022",
 *     "prompt_tokens": 1234,
 *     "completion_tokens": 567,
 *     "total_tokens": 1801,
 *     "cost": 0.0123,
 *     "edit_format": "diff"
 *   },
 *   "user_id": "uuid",
 *   "time": 1234567890
 * }
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { FileCheckpoint, SourceCheckpoint } from '../config/sync-checkpoint.js';
import type {
  IncrementalParseResult,
  ParseOptions,
  ParseResult,
  Parser,
  UsageRecord,
  UsageStats,
} from './types.js';

/** Event structure from Aider analytics log */
interface AiderAnalyticsEvent {
  event: string;
  properties?: {
    main_model?: string;
    weak_model?: string;
    editor_model?: string;
    edit_format?: string;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
    total_cost?: number;
  };
  user_id?: string;
  time?: number;
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
 * Parse a single Aider analytics JSONL file
 */
function parseAnalyticsFile(
  filePath: string,
  userId: string
): { records: UsageRecord[]; error?: string } {
  const records: UsageRecord[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      try {
        const event = JSON.parse(line) as AiderAnalyticsEvent;

        // Only process message_send events with token data
        if (event.event !== 'message_send' || !event.properties) {
          continue;
        }

        const props = event.properties;

        // Skip if no actual token usage
        if (!props.prompt_tokens && !props.completion_tokens) {
          continue;
        }

        // Generate a unique ID from timestamp and line content
        const timestamp = event.time
          ? new Date(event.time * 1000).toISOString()
          : new Date().toISOString();
        const recordId = `${event.time || Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const record: UsageRecord = {
          id: recordId,
          sessionId: event.user_id || userId,
          source: 'aider',
          model: props.main_model || 'unknown',
          timestamp,
          inputTokens: props.prompt_tokens || 0,
          outputTokens: props.completion_tokens || 0,
          // Aider doesn't track cache tokens separately in analytics
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
        };

        records.push(record);
      } catch {
        // Skip malformed lines
        continue;
      }
    }

    return { records };
  } catch (err) {
    return {
      records: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Find all JSONL files in Aider directory
 */
function findAnalyticsFiles(dir: string): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) {
    return files;
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return files;
}

/**
 * Extract date from ISO timestamp
 */
function extractDate(timestamp: string): string {
  return timestamp.split('T')[0] || 'unknown';
}

export class AiderParser implements Parser {
  readonly name = 'aider';
  readonly displayName = 'Aider';
  readonly defaultPaths: string[];

  constructor() {
    const home = homedir();
    this.defaultPaths = [join(home, '.aider')];
  }

  async exists(): Promise<boolean> {
    for (const basePath of this.defaultPaths) {
      if (!existsSync(basePath) || !statSync(basePath).isDirectory()) {
        continue;
      }

      // Check if there are any JSONL files
      const files = findAnalyticsFiles(basePath);
      if (files.length > 0) {
        return true;
      }
    }
    return false;
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
      if (!existsSync(basePath)) {
        continue;
      }

      const analyticsFiles = findAnalyticsFiles(basePath);
      const totalFiles = limit > 0 ? Math.min(analyticsFiles.length, limit) : analyticsFiles.length;

      for (const filePath of analyticsFiles) {
        // Check limit
        if (limit > 0 && filesProcessed >= limit) {
          break;
        }

        // Generate a session ID from the filename
        const filename = filePath.split('/').pop() || '';
        const sessionId = filename.replace('.jsonl', '');

        const result = parseAnalyticsFile(filePath, sessionId);

        filesProcessed++;

        // Report progress
        if (onProgress && filesProcessed % 10 === 0) {
          onProgress(filesProcessed, totalFiles);
        }

        if (result.error) {
          errors.push({ file: filePath, error: result.error });
          continue;
        }

        if (result.records.length > 0) {
          records.push(...result.records);

          // Track unique sessions
          for (const record of result.records) {
            processedSessions.add(record.sessionId);
          }

          // Update stats
          for (const record of result.records) {
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
            dateStats.cacheCreationTokens += record.cacheCreationTokens;
            dateStats.cacheReadTokens += record.cacheReadTokens;
            dateStats.messageCount++;
          }
        }
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
      if (!existsSync(basePath)) {
        continue;
      }

      const analyticsFiles = findAnalyticsFiles(basePath);
      const totalFiles = limit > 0 ? Math.min(analyticsFiles.length, limit) : analyticsFiles.length;

      for (const filePath of analyticsFiles) {
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

        const filename = filePath.split('/').pop() || '';
        const sessionId = filename.replace('.jsonl', '');
        const result = parseAnalyticsFile(filePath, sessionId);

        filesProcessed++;

        if (onProgress && filesProcessed % 10 === 0) {
          onProgress(filesProcessed, totalFiles);
        }

        newFileCheckpoints[filePath] = { mtime: stat.mtimeMs, size: stat.size };

        if (result.error) {
          errors.push({ file: filePath, error: result.error });
          continue;
        }

        if (result.records.length > 0) {
          records.push(...result.records);
          for (const record of result.records) {
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
            dateStats.cacheCreationTokens += record.cacheCreationTokens;
            dateStats.cacheReadTokens += record.cacheReadTokens;
            dateStats.messageCount++;
          }
        }
      }
    }

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
      checkpoint: { lastSyncedAt: new Date().toISOString(), files: newFileCheckpoints },
      isIncremental: !!checkpoint,
      skippedFiles,
    };
  }
}
