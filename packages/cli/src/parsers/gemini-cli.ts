/**
 * Gemini CLI Parser
 *
 * Parses usage data from Gemini CLI (~/.gemini/tmp/*\/chats/session-*.json)
 *
 * Gemini CLI stores session data in JSON files where each session is a separate file.
 * Messages with type "gemini" contain token usage information in the tokens field.
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

/** Token summary structure from Gemini CLI */
interface GeminiTokensSummary {
  input: number;
  output: number;
  cached: number;
  thoughts?: number;
  tool?: number;
  total: number;
}

/** Message record from Gemini CLI session files */
interface GeminiMessage {
  id: string;
  timestamp: string;
  type: 'user' | 'gemini' | 'info' | 'error' | 'warning';
  content: unknown;
  tokens?: GeminiTokensSummary | null;
  model?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
    status: string;
    timestamp: string;
  }>;
  thoughts?: Array<{
    summary?: string;
    timestamp: string;
  }>;
}

/** Session file structure from Gemini CLI */
interface GeminiSession {
  sessionId: string;
  projectHash: string;
  startTime: string;
  lastUpdated: string;
  messages: GeminiMessage[];
  summary?: string;
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
 * Parse a single Gemini CLI session file
 */
function parseSessionFile(
  filePath: string,
  sessionId: string
): { records: UsageRecord[]; error?: string } {
  const records: UsageRecord[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const session = JSON.parse(content) as GeminiSession;

    // Validate session structure
    if (!session.messages || !Array.isArray(session.messages)) {
      return { records: [], error: 'Invalid session structure' };
    }

    for (const message of session.messages) {
      // Only process gemini messages with token data
      if (message.type === 'gemini' && message.tokens && message.id && message.timestamp) {
        const tokens = message.tokens;

        // Skip if no actual token usage
        if (!tokens.input && !tokens.output && !tokens.cached) {
          continue;
        }

        const record: UsageRecord = {
          id: message.id,
          sessionId: session.sessionId || sessionId,
          source: 'gemini-cli',
          model: message.model || 'gemini-unknown',
          timestamp: message.timestamp,
          inputTokens: tokens.input || 0,
          outputTokens: tokens.output || 0,
          // Gemini CLI tracks cached tokens as read tokens (context caching)
          cacheCreationTokens: 0,
          cacheReadTokens: tokens.cached || 0,
        };

        records.push(record);
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
 * Recursively find all session JSON files in Gemini CLI tmp directory
 */
function findSessionFiles(dir: string): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) {
    return files;
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Look for chats subdirectory
        if (entry.name === 'chats') {
          files.push(...findSessionFiles(fullPath));
        } else {
          // Recurse into project hash directories
          files.push(...findSessionFiles(fullPath));
        }
      } else if (
        entry.isFile() &&
        entry.name.startsWith('session-') &&
        entry.name.endsWith('.json')
      ) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return files;
}

/**
 * Extract session ID from filename
 * Format: session-YYYY-MM-DDTHH-MM-xxxxxxxx.json
 */
function extractSessionId(filePath: string): string {
  const filename = filePath.split('/').pop() || '';
  // Extract the UUID portion from the filename
  const match = filename.match(/session-[\dT-]+-([a-f0-9]+)\.json$/);
  return match?.[1] ?? filename.replace('.json', '');
}

/**
 * Extract date from ISO timestamp
 */
function extractDate(timestamp: string): string {
  return timestamp.split('T')[0] || 'unknown';
}

export class GeminiCliParser implements Parser {
  readonly name = 'gemini-cli';
  readonly displayName = 'Gemini CLI';
  readonly defaultPaths: string[];

  constructor() {
    const home = homedir();
    this.defaultPaths = [join(home, '.gemini', 'tmp')];
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
      const sessionFiles = findSessionFiles(basePath);
      const totalFiles = limit > 0 ? Math.min(sessionFiles.length, limit) : sessionFiles.length;

      for (const filePath of sessionFiles) {
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
      const sessionFiles = findSessionFiles(basePath);
      const totalFiles = limit > 0 ? Math.min(sessionFiles.length, limit) : sessionFiles.length;

      for (const filePath of sessionFiles) {
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

        const sessionId = extractSessionId(filePath);
        const result = parseSessionFile(filePath, sessionId);

        filesProcessed++;

        if (onProgress && filesProcessed % 100 === 0) {
          onProgress(filesProcessed, totalFiles);
        }

        newFileCheckpoints[filePath] = { mtime: stat.mtimeMs, size: stat.size };

        if (result.error) {
          errors.push({ file: filePath, error: result.error });
          continue;
        }

        if (result.records.length > 0) {
          records.push(...result.records);
          processedSessions.add(sessionId);

          for (const record of result.records) {
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
