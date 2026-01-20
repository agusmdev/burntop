/**
 * Continue Parser
 *
 * Parses usage data from Continue IDE extension (~/.continue/sessions/*.json)
 *
 * Continue stores chat sessions as JSON files where each session contains a history
 * of chat messages with token usage information. The usage field on assistant messages
 * contains promptTokens and completionTokens.
 *
 * Session file structure:
 * {
 *   "sessionId": "uuid",
 *   "title": "Session title",
 *   "workspaceDirectory": "/path/to/project",
 *   "history": [
 *     {
 *       "message": { "role": "assistant", "content": "...", "usage": { ... } },
 *       "contextItems": [...],
 *       ...
 *     }
 *   ],
 *   "usage": { "promptTokens": 1234, "completionTokens": 567, "totalCost": 0.01, ... }
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

/** Token usage structure from Continue messages */
interface ContinueUsage {
  completionTokens?: number;
  promptTokens?: number;
  promptTokensDetails?: {
    cachedTokens?: number;
    cacheWriteTokens?: number;
    audioTokens?: number;
  };
  completionTokensDetails?: {
    acceptedPredictionTokens?: number;
    reasoningTokens?: number;
    rejectedPredictionTokens?: number;
    audioTokens?: number;
  };
}

/** Session-level usage with cost */
interface ContinueSessionUsage extends ContinueUsage {
  totalCost?: number;
}

/** Chat message from Continue session */
interface ContinueChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'thinking';
  content: string | unknown[];
  usage?: ContinueUsage;
  toolCalls?: unknown[];
  metadata?: Record<string, unknown>;
}

/** Chat history item from Continue session */
interface ContinueChatHistoryItem {
  message: ContinueChatMessage;
  contextItems?: unknown[];
  editorState?: unknown;
  modifiers?: unknown;
  promptLogs?: Array<{
    modelTitle?: string;
    modelProvider?: string;
    prompt?: string;
    completion?: string;
  }>;
  toolCallStates?: unknown[];
  isGatheringContext?: boolean;
  reasoning?: unknown;
  appliedRules?: unknown[];
  conversationSummary?: string;
}

/** Session file structure from Continue */
interface ContinueSession {
  sessionId: string;
  title?: string;
  workspaceDirectory?: string;
  history: ContinueChatHistoryItem[];
  mode?: string;
  chatModelTitle?: string | null;
  usage?: ContinueSessionUsage;
}

/** Session metadata from sessions.json */
interface ContinueSessionMetadata {
  sessionId: string;
  title: string;
  dateCreated: string;
  workspaceDirectory?: string;
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
 * Parse a single Continue session file
 */
function parseSessionFile(
  filePath: string,
  metadata?: ContinueSessionMetadata
): { records: UsageRecord[]; error?: string } {
  const records: UsageRecord[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const session = JSON.parse(content) as ContinueSession;

    // Validate session structure
    if (!session.history || !Array.isArray(session.history)) {
      return { records: [], error: 'Invalid session structure' };
    }

    const sessionId =
      session.sessionId || filePath.split('/').pop()?.replace('.json', '') || 'unknown';
    const dateCreated = metadata?.dateCreated || new Date().toISOString();

    // Determine the model from chatModelTitle or promptLogs
    let defaultModel = session.chatModelTitle || 'unknown';

    for (let i = 0; i < session.history.length; i++) {
      const historyItem = session.history[i];
      if (!historyItem) {
        continue;
      }

      const message = historyItem.message;

      // Only process assistant messages with usage data
      if (message.role === 'assistant' && message.usage) {
        const usage = message.usage;

        // Skip if no actual token usage
        if (!usage.promptTokens && !usage.completionTokens) {
          continue;
        }

        // Try to get model from promptLogs if available
        let model = defaultModel;
        if (historyItem.promptLogs && historyItem.promptLogs.length > 0) {
          const promptLog = historyItem.promptLogs[0];
          if (promptLog && promptLog.modelTitle) {
            model = promptLog.modelTitle;
          }
        }

        // Generate a unique ID
        const recordId = `${sessionId}-${i}`;

        const record: UsageRecord = {
          id: recordId,
          sessionId,
          source: 'continue',
          model,
          timestamp: dateCreated, // Continue doesn't store per-message timestamps, use session date
          inputTokens: usage.promptTokens || 0,
          outputTokens: usage.completionTokens || 0,
          // Continue tracks cache tokens in promptTokensDetails
          cacheCreationTokens: usage.promptTokensDetails?.cacheWriteTokens || 0,
          cacheReadTokens: usage.promptTokensDetails?.cachedTokens || 0,
        };

        // Only add cwd if it exists
        if (session.workspaceDirectory) {
          record.cwd = session.workspaceDirectory;
        }

        records.push(record);
      }
    }

    // If no individual usage records, try to use session-level usage
    if (records.length === 0 && session.usage) {
      const usage = session.usage;
      if (usage.promptTokens || usage.completionTokens) {
        const record: UsageRecord = {
          id: `${sessionId}-session`,
          sessionId,
          source: 'continue',
          model: defaultModel,
          timestamp: dateCreated,
          inputTokens: usage.promptTokens || 0,
          outputTokens: usage.completionTokens || 0,
          cacheCreationTokens: usage.promptTokensDetails?.cacheWriteTokens || 0,
          cacheReadTokens: usage.promptTokensDetails?.cachedTokens || 0,
        };

        // Only add cwd if it exists
        if (session.workspaceDirectory) {
          record.cwd = session.workspaceDirectory;
        }

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
 * Find all session JSON files in Continue sessions directory
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

      // Skip sessions.json (it's metadata, not a session file)
      if (entry.name === 'sessions.json') {
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return files;
}

/**
 * Load sessions metadata from sessions.json
 */
function loadSessionsMetadata(dir: string): Map<string, ContinueSessionMetadata> {
  const metadataMap = new Map<string, ContinueSessionMetadata>();
  const sessionsJsonPath = join(dir, 'sessions.json');

  if (!existsSync(sessionsJsonPath)) {
    return metadataMap;
  }

  try {
    const content = readFileSync(sessionsJsonPath, 'utf-8');
    const sessions = JSON.parse(content) as ContinueSessionMetadata[];

    if (Array.isArray(sessions)) {
      for (const session of sessions) {
        if (session.sessionId) {
          metadataMap.set(session.sessionId, session);
        }
      }
    }
  } catch {
    // Ignore errors reading sessions.json
  }

  return metadataMap;
}

/**
 * Extract session ID from filename
 */
function extractSessionId(filePath: string): string {
  const filename = filePath.split('/').pop() || '';
  return filename.replace('.json', '');
}

/**
 * Extract date from ISO timestamp
 */
function extractDate(timestamp: string): string {
  return timestamp.split('T')[0] || 'unknown';
}

export class ContinueParser implements Parser {
  readonly name = 'continue';
  readonly displayName = 'Continue';
  readonly defaultPaths: string[];

  constructor() {
    const home = homedir();
    this.defaultPaths = [join(home, '.continue', 'sessions')];
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
      if (!existsSync(basePath)) {
        continue;
      }

      // Load sessions metadata for timestamps
      const metadataMap = loadSessionsMetadata(basePath);

      const sessionFiles = findSessionFiles(basePath);
      const totalFiles = limit > 0 ? Math.min(sessionFiles.length, limit) : sessionFiles.length;

      for (const filePath of sessionFiles) {
        // Check limit
        if (limit > 0 && filesProcessed >= limit) {
          break;
        }

        const sessionId = extractSessionId(filePath);
        const metadata = metadataMap.get(sessionId);
        const result = parseSessionFile(filePath, metadata);

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
      if (!existsSync(basePath)) {
        continue;
      }

      const metadataMap = loadSessionsMetadata(basePath);
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
        const metadata = metadataMap.get(sessionId);
        const result = parseSessionFile(filePath, metadata);

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
