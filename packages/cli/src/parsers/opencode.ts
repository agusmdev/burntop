/**
 * OpenCode Parser
 *
 * Supports both OpenCode storage formats:
 * - Current SQLite database: ~/.local/share/opencode/opencode.db
 * - Legacy JSON messages: ~/.local/share/opencode/storage/message/
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { Database } from 'bun:sqlite';

import type {
  IncrementalParseResult,
  ParseOptions,
  ParseResult,
  Parser,
  UsageRecord,
  UsageStats,
} from './types.js';
import type { FileCheckpoint, SourceCheckpoint } from '../config/sync-checkpoint.js';

interface OpenCodeMessageTokens {
  input?: number;
  output?: number;
  reasoning?: number;
  cache?: {
    read?: number;
    write?: number;
  };
}

interface OpenCodeMessagePayload {
  role?: string;
  modelID?: string;
  tokens?: OpenCodeMessageTokens;
  time?: {
    created?: number;
    completed?: number;
  };
}

interface OpenCodeLegacyMessage extends OpenCodeMessagePayload {
  id?: string;
  sessionID?: string;
}

interface ParseContext {
  seenRecordIds: Set<string>;
  records: UsageRecord[];
  errors: Array<{ file: string; error: string }>;
  filesProcessed: number;
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

function extractDate(timestamp: string): string {
  return timestamp.split('T')[0] || 'unknown';
}

function getOpenCodeRootPath(): string {
  const home = homedir();
  const xdgDataHome = process.env['XDG_DATA_HOME'];

  if (xdgDataHome) {
    return join(xdgDataHome, 'opencode');
  }

  if (process.platform === 'win32') {
    const localAppData = process.env['LOCALAPPDATA'] || join(home, 'AppData', 'Local');
    return join(localAppData, 'opencode');
  }

  return join(home, '.local', 'share', 'opencode');
}

function getOpenCodePaths(): { dbPath: string; messageDir: string } {
  const root = getOpenCodeRootPath();
  return {
    dbPath: join(root, 'opencode.db'),
    messageDir: join(root, 'storage', 'message'),
  };
}

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
    return files;
  }

  return files;
}

function parseMessagePayload(
  payload: OpenCodeMessagePayload,
  messageId: string,
  sessionId: string
): UsageRecord | null {
  if (!payload || payload.role !== 'assistant' || !payload.tokens) {
    return null;
  }

  const inputTokens = payload.tokens.input || 0;
  const outputTokens = (payload.tokens.output || 0) + (payload.tokens.reasoning || 0);
  const cacheCreationTokens = payload.tokens.cache?.write || 0;
  const cacheReadTokens = payload.tokens.cache?.read || 0;

  if (!inputTokens && !outputTokens && !cacheCreationTokens && !cacheReadTokens) {
    return null;
  }

  const createdAt = payload.time?.created;
  if (createdAt === undefined || createdAt === null) {
    return null;
  }

  return {
    id: messageId,
    sessionId,
    source: 'opencode',
    model: payload.modelID || 'unknown',
    timestamp: new Date(createdAt).toISOString(),
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
  };
}

function parseLegacyMessageFile(filePath: string): UsageRecord | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const msg = JSON.parse(content) as OpenCodeLegacyMessage;

    if (!msg.id || !msg.sessionID) {
      return null;
    }

    return parseMessagePayload(msg, msg.id, msg.sessionID);
  } catch {
    return null;
  }
}

function addRecord(record: UsageRecord, context: ParseContext): void {
  if (context.seenRecordIds.has(record.id)) {
    return;
  }
  context.seenRecordIds.add(record.id);
  context.records.push(record);
}

function buildStats(records: UsageRecord[]): UsageStats {
  const stats = createEmptyStats();
  const sessions = new Set<string>();
  const sessionsByDate = new Map<string, Set<string>>();

  for (const record of records) {
    sessions.add(record.sessionId);

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

    let dateSessions = sessionsByDate.get(date);
    if (!dateSessions) {
      dateSessions = new Set<string>();
      sessionsByDate.set(date, dateSessions);
    }
    dateSessions.add(record.sessionId);
  }

  for (const [date, dateSessions] of sessionsByDate) {
    const dateStats = stats.byDate[date];
    if (dateStats) {
      dateStats.sessionCount = dateSessions.size;
    }
  }

  stats.sessionCount = sessions.size;
  return stats;
}

function parseFromLegacyJson(
  messageDir: string,
  context: ParseContext,
  limit: number,
  onProgress?: (processed: number, total: number) => void,
  fileCheckpoints?: Record<string, FileCheckpoint>,
  newFileCheckpoints?: Record<string, FileCheckpoint>,
  incremental = false
): { skippedFiles: number } {
  const jsonFiles = findJsonFiles(messageDir);
  const totalFiles = limit > 0 ? Math.min(jsonFiles.length, limit) : jsonFiles.length;
  let skippedFiles = 0;

  for (const filePath of jsonFiles) {
    if (limit > 0 && context.filesProcessed >= limit) {
      break;
    }

    if (incremental) {
      const stat = statSync(filePath);
      const prevCheckpoint = fileCheckpoints?.[filePath];
      if (
        prevCheckpoint &&
        prevCheckpoint.mtime === stat.mtimeMs &&
        prevCheckpoint.size === stat.size
      ) {
        if (newFileCheckpoints) {
          newFileCheckpoints[filePath] = prevCheckpoint;
        }
        skippedFiles++;
        context.filesProcessed++;
        continue;
      }

      if (newFileCheckpoints) {
        newFileCheckpoints[filePath] = { mtime: stat.mtimeMs, size: stat.size };
      }
    }

    context.filesProcessed++;
    if (onProgress && context.filesProcessed % 100 === 0) {
      onProgress(context.filesProcessed, totalFiles);
    }

    try {
      const record = parseLegacyMessageFile(filePath);
      if (record) {
        addRecord(record, context);
      }
    } catch (err) {
      context.errors.push({
        file: filePath,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return { skippedFiles };
}

function parseFromSqlite(
  dbPath: string,
  context: ParseContext,
  limit: number,
  sqliteCheckpoint: SourceCheckpoint['sqlite'] | undefined,
  incremental: boolean
): {
  skippedFiles: number;
  sqlite: SourceCheckpoint['sqlite'];
} {
  if (!existsSync(dbPath)) {
    return {
      skippedFiles: 0,
      sqlite: sqliteCheckpoint,
    };
  }

  if (limit > 0 && context.filesProcessed >= limit) {
    return {
      skippedFiles: 0,
      sqlite: sqliteCheckpoint,
    };
  }

  const stat = statSync(dbPath);
  const sqliteResult: SourceCheckpoint['sqlite'] = {
    dbMtime: stat.mtimeMs,
    dbSize: stat.size,
  };

  if (
    incremental &&
    sqliteCheckpoint?.dbMtime === stat.mtimeMs &&
    sqliteCheckpoint?.dbSize === stat.size
  ) {
    context.filesProcessed++;
    return {
      skippedFiles: 1,
      sqlite: sqliteCheckpoint,
    };
  }

  let db: Database | null = null;

  try {
    db = new Database(dbPath, { readonly: true });

    const tableExists = db
      .query<
        { count: number },
        []
      >("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'message'")
      .get();

    context.filesProcessed++;

    if (!tableExists || Number(tableExists.count) === 0) {
      return {
        skippedFiles: 0,
        sqlite: sqliteResult,
      };
    }

    const rows = db
      .query<
        { id: string; session_id: string; data: string },
        []
      >('SELECT id, session_id, data FROM message ORDER BY time_created ASC')
      .all();

    for (const row of rows) {
      try {
        const payload = JSON.parse(row.data) as OpenCodeMessagePayload;
        const record = parseMessagePayload(payload, row.id, row.session_id);
        if (record) {
          addRecord(record, context);
        }
      } catch {
        continue;
      }
    }

    return {
      skippedFiles: 0,
      sqlite: sqliteResult,
    };
  } catch (err) {
    context.errors.push({
      file: dbPath,
      error: err instanceof Error ? err.message : 'Unknown error reading database',
    });
    return {
      skippedFiles: 0,
      sqlite: sqliteResult,
    };
  } finally {
    if (db) {
      db.close();
    }
  }
}

export class OpenCodeParser implements Parser {
  readonly name = 'opencode';
  readonly displayName = 'OpenCode';
  readonly defaultPaths: string[];
  private readonly dbPath: string;
  private readonly messageDir: string;

  constructor() {
    const paths = getOpenCodePaths();
    this.dbPath = paths.dbPath;
    this.messageDir = paths.messageDir;
    this.defaultPaths = [this.dbPath, this.messageDir];
  }

  async exists(): Promise<boolean> {
    const hasDb = existsSync(this.dbPath) && statSync(this.dbPath).isFile();
    const hasJson = existsSync(this.messageDir) && statSync(this.messageDir).isDirectory();
    return hasDb || hasJson;
  }

  async parse(options?: ParseOptions): Promise<ParseResult> {
    const limit = options?.limit || 0;
    const context: ParseContext = {
      seenRecordIds: new Set<string>(),
      records: [],
      errors: [],
      filesProcessed: 0,
    };

    parseFromSqlite(this.dbPath, context, limit, undefined, false);
    parseFromLegacyJson(this.messageDir, context, limit, options?.onProgress);

    return {
      source: this.name,
      records: context.records,
      stats: buildStats(context.records),
      filesProcessed: context.filesProcessed,
      errors: context.errors,
    };
  }

  async parseIncremental(
    checkpoint: SourceCheckpoint | undefined,
    options?: ParseOptions
  ): Promise<IncrementalParseResult> {
    const limit = options?.limit || 0;
    const context: ParseContext = {
      seenRecordIds: new Set<string>(),
      records: [],
      errors: [],
      filesProcessed: 0,
    };

    const fileCheckpoints = checkpoint?.files || {};
    const newFileCheckpoints: Record<string, FileCheckpoint> = {};

    let skippedFiles = 0;

    const sqliteResult = parseFromSqlite(this.dbPath, context, limit, checkpoint?.sqlite, true);
    skippedFiles += sqliteResult.skippedFiles;

    const jsonResult = parseFromLegacyJson(
      this.messageDir,
      context,
      limit,
      options?.onProgress,
      fileCheckpoints,
      newFileCheckpoints,
      true
    );
    skippedFiles += jsonResult.skippedFiles;

    return {
      source: this.name,
      records: context.records,
      stats: buildStats(context.records),
      filesProcessed: context.filesProcessed,
      errors: context.errors,
      checkpoint: {
        lastSyncedAt: new Date().toISOString(),
        files: newFileCheckpoints,
        ...(sqliteResult.sqlite ? { sqlite: sqliteResult.sqlite } : {}),
      },
      isIncremental: !!checkpoint,
      skippedFiles,
    };
  }
}
