/**
 * Claude Code Parser
 *
 * Parses usage data from Claude Code CLI (~/.claude/projects/**\/*.jsonl)
 *
 * Claude Code stores session data in JSONL files where each session has its own file.
 * Messages with type "assistant" contain usage information in the message.usage field.
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

/** Structure of a Claude Code assistant message with usage data */
interface ClaudeCodeMessage {
  type: 'assistant' | 'user' | 'queue-operation';
  uuid?: string;
  sessionId?: string;
  timestamp?: string;
  cwd?: string;
  message?: {
    model?: string;
    role?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
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
 * Parse a single JSONL session file
 */
function parseSessionFile(
  filePath: string,
  sessionId: string
): { records: UsageRecord[]; error?: string } {
  const records: UsageRecord[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const entry = JSON.parse(line) as ClaudeCodeMessage;

        // Only process assistant messages with usage data
        if (entry.type === 'assistant' && entry.message?.usage && entry.uuid && entry.timestamp) {
          const usage = entry.message.usage;

          // Skip if no actual token usage
          if (
            !usage.input_tokens &&
            !usage.output_tokens &&
            !usage.cache_creation_input_tokens &&
            !usage.cache_read_input_tokens
          ) {
            continue;
          }

          const record: UsageRecord = {
            id: entry.uuid,
            sessionId: entry.sessionId || sessionId,
            source: 'claude-code',
            model: entry.message.model || 'unknown',
            timestamp: entry.timestamp,
            inputTokens: usage.input_tokens || 0,
            outputTokens: usage.output_tokens || 0,
            cacheCreationTokens: usage.cache_creation_input_tokens || 0,
            cacheReadTokens: usage.cache_read_input_tokens || 0,
          };
          if (entry.cwd) {
            record.cwd = entry.cwd;
          }
          records.push(record);
        }
      } catch {
        // Skip invalid JSON lines
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
 * Recursively find all .jsonl files in a directory
 */
function findJsonlFiles(dir: string): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) {
    return files;
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...findJsonlFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        // Only include session files (UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.jsonl)
        // Skip history.jsonl and other non-session files
        if (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/.test(entry.name)
        ) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return files;
}

/**
 * Extract session ID from filename
 */
function extractSessionId(filePath: string): string {
  const filename = filePath.split('/').pop() || '';
  return filename.replace('.jsonl', '');
}

/**
 * Extract date from ISO timestamp
 */
function extractDate(timestamp: string): string {
  return timestamp.split('T')[0] || 'unknown';
}

export class ClaudeCodeParser implements Parser {
  readonly name = 'claude-code';
  readonly displayName = 'Claude Code';
  readonly defaultPaths: string[];

  constructor() {
    const home = homedir();
    this.defaultPaths = [join(home, '.claude', 'projects')];
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
      const jsonlFiles = findJsonlFiles(basePath);
      const totalFiles = limit > 0 ? Math.min(jsonlFiles.length, limit) : jsonlFiles.length;

      for (const filePath of jsonlFiles) {
        // Check limit
        if (limit > 0 && filesProcessed >= limit) {
          break;
        }

        const sessionId = extractSessionId(filePath);
        const result = parseSessionFile(filePath, sessionId);

        filesProcessed++;

        // Report progress every 100 files
        if (onProgress && filesProcessed % 100 === 0) {
          onProgress(filesProcessed, totalFiles);
        }

        if (result.error) {
          errors.push({ file: filePath, error: result.error });
          continue;
        }

        if (result.records.length > 0) {
          records.push(...result.records);
          processedSessions.add(sessionId);

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

    // Update session counts per date (optimized - track while processing)
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

    // Get existing file checkpoints
    const fileCheckpoints = checkpoint?.files || {};
    const newFileCheckpoints: Record<string, FileCheckpoint> = {};
    let skippedFiles = 0;
    let filesProcessed = 0;

    for (const basePath of this.defaultPaths) {
      const jsonlFiles = findJsonlFiles(basePath);
      const totalFiles = limit > 0 ? Math.min(jsonlFiles.length, limit) : jsonlFiles.length;

      for (const filePath of jsonlFiles) {
        // Check limit
        if (limit > 0 && filesProcessed >= limit) {
          break;
        }

        // Check if file has changed since last sync
        const stat = statSync(filePath);
        const prevCheckpoint = fileCheckpoints[filePath];

        if (
          prevCheckpoint &&
          prevCheckpoint.mtime === stat.mtimeMs &&
          prevCheckpoint.size === stat.size
        ) {
          // File unchanged - skip parsing but keep checkpoint
          newFileCheckpoints[filePath] = prevCheckpoint;
          skippedFiles++;
          filesProcessed++;
          continue;
        }

        // File is new or changed - parse it
        const sessionId = extractSessionId(filePath);
        const result = parseSessionFile(filePath, sessionId);

        filesProcessed++;

        // Report progress every 100 files
        if (onProgress && filesProcessed % 100 === 0) {
          onProgress(filesProcessed, totalFiles);
        }

        // Save new checkpoint for this file
        newFileCheckpoints[filePath] = {
          mtime: stat.mtimeMs,
          size: stat.size,
        };

        if (result.error) {
          errors.push({ file: filePath, error: result.error });
          continue;
        }

        if (result.records.length > 0) {
          records.push(...result.records);
          processedSessions.add(sessionId);

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
      checkpoint: {
        lastSyncedAt: new Date().toISOString(),
        files: newFileCheckpoints,
      },
      isIncremental: !!checkpoint,
      skippedFiles,
    };
  }
}
