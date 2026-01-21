/**
 * Droid (Factory.ai) Parser
 *
 * Parses usage data from Factory Droid CLI (~/.factory/sessions/)
 *
 * Droid stores session data in *.settings.json files containing token usage.
 * Each settings file represents a session with aggregated token counts.
 *
 * Data structure:
 * - `tokenUsage.inputTokens`, `tokenUsage.outputTokens` for main token counts
 * - `tokenUsage.cacheCreationTokens`, `tokenUsage.cacheReadTokens` for cache tokens
 * - `tokenUsage.thinkingTokens` for reasoning tokens
 * - `model` field contains the model name (may need normalization)
 * - `providerLock` contains the provider name
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

interface DroidSettingsJson {
  model?: string;
  providerLock?: string;
  providerLockTimestamp?: string;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
    thinkingTokens?: number;
  };
}

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

function normalizeModelName(model: string): string {
  return model
    .replace(/^custom:/, '')
    .replace(/\[.*?\]/g, '')
    .replace(/-+$/, '')
    .toLowerCase()
    .replace(/\./g, '-')
    .replace(/-+/g, '-');
}

function getProviderFromModel(model: string): string {
  const lower = model.toLowerCase();

  if (
    lower.includes('claude') ||
    lower.includes('anthropic') ||
    lower.includes('opus') ||
    lower.includes('sonnet') ||
    lower.includes('haiku')
  ) {
    return 'anthropic';
  }
  if (
    lower.includes('gpt') ||
    lower.includes('openai') ||
    lower.includes('o1') ||
    lower.includes('o3')
  ) {
    return 'openai';
  }
  if (lower.includes('gemini') || lower.includes('google')) {
    return 'google';
  }
  if (lower.includes('grok')) {
    return 'xai';
  }

  return 'unknown';
}

function getDefaultModelFromProvider(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'anthropic':
      return 'claude-unknown';
    case 'openai':
      return 'gpt-unknown';
    case 'google':
      return 'gemini-unknown';
    case 'xai':
      return 'grok-unknown';
    default:
      return `${provider}-unknown`;
  }
}

function extractDate(timestamp: string | number): string {
  if (typeof timestamp === 'number') {
    return new Date(timestamp).toISOString().split('T')[0] || 'unknown';
  }
  return timestamp.split('T')[0] || 'unknown';
}

function getDroidDataPath(): string {
  const home = homedir();
  return join(home, '.factory', 'sessions');
}

function findSettingsFiles(dir: string): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) {
    return files;
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.settings.json')) {
        files.push(join(dir, entry.name));
      }
    }
  } catch {
    // Ignore errors reading directory
  }

  return files;
}

function extractSessionId(filePath: string): string {
  const filename = filePath.split('/').pop() || '';
  return filename.replace('.settings.json', '');
}

function parseSettingsFile(filePath: string): UsageRecord | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const settings = JSON.parse(content) as DroidSettingsJson;

    if (!settings.tokenUsage) {
      return null;
    }

    const usage = settings.tokenUsage;
    const totalTokens =
      (usage.inputTokens || 0) +
      (usage.outputTokens || 0) +
      (usage.cacheCreationTokens || 0) +
      (usage.cacheReadTokens || 0) +
      (usage.thinkingTokens || 0);

    if (totalTokens === 0) {
      return null;
    }

    const sessionId = extractSessionId(filePath);
    const provider = settings.providerLock || getProviderFromModel(settings.model || '');
    const model = settings.model
      ? normalizeModelName(settings.model)
      : getDefaultModelFromProvider(provider);

    let timestamp: string;
    if (settings.providerLockTimestamp) {
      timestamp = settings.providerLockTimestamp;
    } else {
      try {
        const stat = statSync(filePath);
        timestamp = stat.mtime.toISOString();
      } catch {
        timestamp = new Date().toISOString();
      }
    }

    return {
      id: sessionId,
      sessionId,
      source: 'droid',
      model,
      timestamp,
      inputTokens: usage.inputTokens || 0,
      outputTokens: (usage.outputTokens || 0) + (usage.thinkingTokens || 0),
      cacheCreationTokens: usage.cacheCreationTokens || 0,
      cacheReadTokens: usage.cacheReadTokens || 0,
    };
  } catch {
    return null;
  }
}

export class DroidParser implements Parser {
  readonly name = 'droid';
  readonly displayName = 'Droid (Factory.ai)';
  readonly defaultPaths: string[];

  constructor() {
    this.defaultPaths = [getDroidDataPath()];
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
      const settingsFiles = findSettingsFiles(basePath);
      const totalFiles = limit > 0 ? Math.min(settingsFiles.length, limit) : settingsFiles.length;

      for (const filePath of settingsFiles) {
        if (limit > 0 && filesProcessed >= limit) {
          break;
        }

        filesProcessed++;

        if (onProgress && filesProcessed % 100 === 0) {
          onProgress(filesProcessed, totalFiles);
        }

        try {
          const record = parseSettingsFile(filePath);

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
      const settingsFiles = findSettingsFiles(basePath);
      const totalFiles = limit > 0 ? Math.min(settingsFiles.length, limit) : settingsFiles.length;

      for (const filePath of settingsFiles) {
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
          const record = parseSettingsFile(filePath);

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
