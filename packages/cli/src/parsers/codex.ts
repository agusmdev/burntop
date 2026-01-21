/**
 * Codex CLI Parser
 *
 * Parses usage data from OpenAI Codex CLI sessions (~/.codex/sessions/)
 *
 * Codex CLI is OpenAI's coding agent that stores transcripts locally.
 * Sessions are stored in JSONL format in the sessions directory.
 *
 * The CODEX_HOME environment variable can override the default location.
 * Default: ~/.codex
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

/** Structure of a Codex session event with usage data */
interface CodexSessionEvent {
  type?: string;
  role?: 'user' | 'assistant' | 'system';
  id?: string;
  session_id?: string;
  timestamp?: string;
  time?: number;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  // OpenAI responses API format
  response?: {
    model?: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      input_tokens?: number;
      output_tokens?: number;
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
 * Get Codex home directory
 */
function getCodexHome(): string {
  return process.env['CODEX_HOME'] || join(homedir(), '.codex');
}

/**
 * Parse a single Codex session JSONL file
 */
function parseSessionFile(
  filePath: string,
  sessionId: string
): { records: UsageRecord[]; error?: string } {
  const records: UsageRecord[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    let lineIndex = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      lineIndex++;

      try {
        const event = JSON.parse(line) as CodexSessionEvent;

        // Extract usage data from various possible locations
        let usage = event.usage;
        let model = event.model;

        // Check if usage is in response object
        if (!usage && event.response?.usage) {
          usage = event.response.usage;
          model = model || event.response.model;
        }

        // Skip if no usage data
        if (!usage) continue;

        // Get token counts (support both OpenAI and Anthropic-style naming)
        const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
        const outputTokens = usage.output_tokens || usage.completion_tokens || 0;
        const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
        const cacheReadTokens = usage.cache_read_input_tokens || 0;

        // Skip if no actual token usage
        if (!inputTokens && !outputTokens && !cacheCreationTokens && !cacheReadTokens) {
          continue;
        }

        // Generate timestamp
        let timestamp: string;
        if (event.timestamp) {
          timestamp = event.timestamp;
        } else if (event.time) {
          timestamp = new Date(event.time * 1000).toISOString();
        } else {
          // Use file modification time as fallback
          const stat = statSync(filePath);
          timestamp = stat.mtime.toISOString();
        }

        // Generate unique ID
        const recordId = event.id || `codex-${sessionId}-${lineIndex}-${Date.now().toString(36)}`;

        const record: UsageRecord = {
          id: recordId,
          sessionId: event.session_id || sessionId,
          source: 'codex',
          model: model || 'unknown',
          timestamp,
          inputTokens,
          outputTokens,
          cacheCreationTokens,
          cacheReadTokens,
        };

        records.push(record);
      } catch {
        // Skip malformed JSON lines
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
 * Find all session files in Codex sessions directory
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
        // Recursively search subdirectories
        files.push(...findSessionFiles(fullPath));
      } else if (entry.isFile()) {
        // Accept both .jsonl and .json files
        if (entry.name.endsWith('.jsonl') || entry.name.endsWith('.json')) {
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
 * Extract session ID from file path
 */
function extractSessionId(filePath: string): string {
  const filename = filePath.split('/').pop() || '';
  return filename.replace(/\.(jsonl|json)$/, '');
}

/**
 * Extract date from ISO timestamp
 */
function extractDate(timestamp: string): string {
  return timestamp.split('T')[0] || 'unknown';
}

export class CodexParser implements Parser {
  readonly name = 'codex';
  readonly displayName = 'Codex CLI';
  readonly defaultPaths: string[];

  constructor() {
    const codexHome = getCodexHome();
    this.defaultPaths = [join(codexHome, 'sessions')];
  }

  async exists(): Promise<boolean> {
    for (const basePath of this.defaultPaths) {
      if (existsSync(basePath) && statSync(basePath).isDirectory()) {
        const files = findSessionFiles(basePath);
        if (files.length > 0) {
          return true;
        }
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

        // Report progress every 50 files
        if (onProgress && filesProcessed % 50 === 0) {
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

        if (onProgress && filesProcessed % 50 === 0) {
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
          }

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
