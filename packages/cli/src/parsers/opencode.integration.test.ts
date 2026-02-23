import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Database } from 'bun:sqlite';
import { afterEach, describe, expect, it } from 'bun:test';

import { OpenCodeParser } from './opencode';

function setupTempDataHome(): { cleanup: () => void; opencodeRoot: string } {
  const originalXdg = process.env['XDG_DATA_HOME'];
  const tempDir = mkdtempSync(join(tmpdir(), 'opencode-parser-'));
  const opencodeRoot = join(tempDir, 'opencode');
  mkdirSync(opencodeRoot, { recursive: true });
  process.env['XDG_DATA_HOME'] = tempDir;

  return {
    opencodeRoot,
    cleanup: () => {
      if (originalXdg) {
        process.env['XDG_DATA_HOME'] = originalXdg;
      } else {
        delete process.env['XDG_DATA_HOME'];
      }
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    },
  };
}

function createOpenCodeDb(dbPath: string): Database {
  const db = new Database(dbPath);
  db.run(
    'CREATE TABLE message (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, time_created INTEGER NOT NULL, time_updated INTEGER NOT NULL, data TEXT NOT NULL)'
  );
  return db;
}

describe('OpenCodeParser integration', () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    while (cleanups.length > 0) {
      const cleanup = cleanups.pop();
      cleanup?.();
    }
  });

  it('parses assistant messages from SQLite storage', async () => {
    const { cleanup, opencodeRoot } = setupTempDataHome();
    cleanups.push(cleanup);

    const dbPath = join(opencodeRoot, 'opencode.db');
    const db = createOpenCodeDb(dbPath);

    const createdAt = Date.UTC(2026, 0, 15, 10, 30, 0);
    db.query(
      'INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?)'
    ).run(
      'msg_sqlite_1',
      'session_sqlite',
      createdAt,
      createdAt,
      JSON.stringify({
        role: 'assistant',
        modelID: 'gpt-5.3-codex',
        time: { created: createdAt },
        tokens: {
          input: 150,
          output: 40,
          reasoning: 10,
          cache: { read: 75, write: 5 },
        },
      })
    );
    db.query(
      'INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?)'
    ).run(
      'msg_sqlite_user',
      'session_sqlite',
      createdAt + 1,
      createdAt + 1,
      JSON.stringify({
        role: 'user',
        time: { created: createdAt + 1 },
        tokens: { input: 1, output: 1, cache: { read: 0, write: 0 } },
      })
    );
    db.close();

    const parser = new OpenCodeParser();
    const result = await parser.parse();

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toEqual({
      id: 'msg_sqlite_1',
      sessionId: 'session_sqlite',
      source: 'opencode',
      model: 'gpt-5.3-codex',
      timestamp: new Date(createdAt).toISOString(),
      inputTokens: 150,
      outputTokens: 50,
      cacheCreationTokens: 5,
      cacheReadTokens: 75,
    });
    expect(result.stats.messageCount).toBe(1);
    expect(result.stats.sessionCount).toBe(1);
  });

  it('keeps legacy JSON message parsing', async () => {
    const { cleanup, opencodeRoot } = setupTempDataHome();
    cleanups.push(cleanup);

    const messageDir = join(opencodeRoot, 'storage', 'message', 'session-json');
    mkdirSync(messageDir, { recursive: true });

    const createdAt = Date.UTC(2026, 0, 20, 14, 0, 0);
    writeFileSync(
      join(messageDir, 'msg_json_1.json'),
      JSON.stringify({
        id: 'msg_json_1',
        sessionID: 'session_json',
        role: 'assistant',
        modelID: 'gpt-4.1',
        time: { created: createdAt },
        tokens: {
          input: 90,
          output: 30,
          reasoning: 5,
          cache: { read: 0, write: 2 },
        },
      })
    );

    const parser = new OpenCodeParser();
    const result = await parser.parse();

    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.id).toBe('msg_json_1');
    expect(result.stats.totalInputTokens).toBe(90);
    expect(result.stats.totalOutputTokens).toBe(35);
    expect(result.stats.totalCacheCreationTokens).toBe(2);
  });

  it('parses SQLite and JSON together and avoids duplicate message IDs', async () => {
    const { cleanup, opencodeRoot } = setupTempDataHome();
    cleanups.push(cleanup);

    const dbPath = join(opencodeRoot, 'opencode.db');
    const db = createOpenCodeDb(dbPath);

    const sqliteTimestamp = Date.UTC(2026, 1, 1, 9, 0, 0);
    db.query(
      'INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?)'
    ).run(
      'msg_shared_id',
      'session_shared',
      sqliteTimestamp,
      sqliteTimestamp,
      JSON.stringify({
        role: 'assistant',
        modelID: 'gpt-5.3-codex',
        time: { created: sqliteTimestamp },
        tokens: {
          input: 200,
          output: 100,
          cache: { read: 50, write: 0 },
        },
      })
    );
    db.close();

    const jsonDir = join(opencodeRoot, 'storage', 'message', 'session-shared');
    mkdirSync(jsonDir, { recursive: true });
    writeFileSync(
      join(jsonDir, 'msg_shared_id.json'),
      JSON.stringify({
        id: 'msg_shared_id',
        sessionID: 'session_shared',
        role: 'assistant',
        modelID: 'gpt-5.3-codex',
        time: { created: sqliteTimestamp },
        tokens: {
          input: 999,
          output: 999,
          cache: { read: 999, write: 999 },
        },
      })
    );
    writeFileSync(
      join(jsonDir, 'msg_json_unique.json'),
      JSON.stringify({
        id: 'msg_json_unique',
        sessionID: 'session_json_unique',
        role: 'assistant',
        modelID: 'gpt-4.1',
        time: { created: sqliteTimestamp + 1000 },
        tokens: {
          input: 10,
          output: 5,
          cache: { read: 0, write: 0 },
        },
      })
    );

    const parser = new OpenCodeParser();
    const result = await parser.parse();

    expect(result.records).toHaveLength(2);
    expect(result.stats.messageCount).toBe(2);
    expect(result.stats.totalInputTokens).toBe(210);
    expect(result.stats.totalOutputTokens).toBe(105);
    expect(result.stats.totalCacheReadTokens).toBe(50);
    expect(result.stats.totalCacheCreationTokens).toBe(0);
  });
});
