/**
 * Sync command - upload local AI usage data to burntop.dev
 *
 * Scans all supported AI tools for usage data and uploads to the
 * burntop cloud service for tracking, leaderboards, and achievements.
 *
 * Features:
 * - Multi-machine sync: Each machine has a unique ID, so syncs from different
 *   machines don't overwrite each other
 * - Incremental sync: Only processes new/changed files since last sync
 *   Use --full to force a complete resync
 */

import { getCredentials, performGitHubLogin } from '../auth/index.js';
import {
  getMachineId,
  getUserConfig,
  updateConfig,
  isFirstSync,
  setupAutoSync,
  removeAutoSync,
  checkAutoSyncStatus,
} from '../config/index.js';
import {
  createEmptyCheckpoint,
  loadCheckpoint,
  saveCheckpoint,
  type SourceCheckpoint,
  type SyncCheckpoint,
} from '../config/sync-checkpoint.js';
import {
  AiderParser,
  ClaudeCodeParser,
  ClineParser,
  CodexParser,
  ContinueParser,
  CursorParser,
  DroidParser,
  GeminiCliParser,
  KiloCodeParser,
  OpenCodeParser,
  RooCodeParser,
  type IncrementalParseResult,
  type ParseOptions,
  type ParseResult,
  type UsageRecord,
} from '../parsers/index.js';

// API base URL - defaults to production, can be overridden for development
// For local development: export BURNTOP_API_URL=http://localhost:8000
const API_BASE_URL = process.env['BURNTOP_API_URL'] || 'https://api.burntop.dev';

/**
 * Format a number with commas for readability.
 * Returns '0' for null/undefined values to prevent runtime errors.
 */
function formatNumber(num: number | undefined | null): string {
  if (num == null) return '0';
  return num.toLocaleString('en-US');
}

/**
 * Format token count in a human-readable way (e.g., 1.2M, 45.3K)
 */
function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return formatNumber(tokens);
}

/**
 * Clear the current line and print progress
 */
function printProgress(processed: number, total: number): void {
  process.stdout.write(
    `\r  Processing: ${formatNumber(processed)}/${formatNumber(total)} files...`
  );
}

/**
 * Payload sent to the sync API endpoint
 */
interface SyncPayload {
  /** Version of the sync payload format */
  version: string;
  /** Client identifier */
  client: string;
  /** Machine identifier for multi-machine sync */
  machineId: string;
  /** Timestamp when sync was initiated */
  syncedAt: string;
  /** Usage records to sync */
  records: SyncRecord[];
}

/**
 * A usage record formatted for the sync API
 * Aggregated by date, source, and model for efficiency
 */
interface SyncRecord {
  /** Date of usage (YYYY-MM-DD) */
  date: string;
  /** Source tool identifier */
  source: string;
  /** Model identifier */
  model: string;
  /** Token counts */
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  /** Number of messages/interactions */
  messageCount: number;
}

/**
 * Achievement unlocked during sync
 */
interface AchievementUnlock {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  xp_reward: number;
  tier: number;
  icon_url?: string;
}

/**
 * User statistics after sync
 */
interface SyncStats {
  totalTokens: number;
  totalCost: number;
  currentStreak: number;
  longestStreak: number;
  achievementsUnlocked: number;
}

/**
 * Response from the sync API (FastAPI endpoint)
 */
interface SyncResponse {
  success: boolean;
  message?: string;
  recordsProcessed: number;
  newRecords: number;
  updatedRecords: number;
  stats: SyncStats;
  newAchievements?: AchievementUnlock[];
}

interface SyncOptions {
  verbose?: boolean;
  source?: string;
  dryRun?: boolean;
  /** Force full sync, ignoring any cached checkpoint */
  full?: boolean;
  /** Enable auto-sync cronjob */
  enableAuto?: boolean;
  /** Disable auto-sync cronjob */
  disableAuto?: boolean;
  /** Show auto-sync status */
  status?: boolean;
  /** Skip auto-sync prompt */
  noPrompt?: boolean;
}

/**
 * Aggregate usage records by date, source, and model
 */
function aggregateRecords(records: UsageRecord[]): SyncRecord[] {
  const aggregated = new Map<string, SyncRecord>();

  for (const record of records) {
    // Extract date from timestamp (YYYY-MM-DD)
    const date = record.timestamp.split('T')[0];
    if (!date) continue;

    const key = `${date}:${record.source}:${record.model}`;
    const existing = aggregated.get(key);

    if (existing) {
      existing.inputTokens += record.inputTokens;
      existing.outputTokens += record.outputTokens;
      existing.cacheCreationTokens += record.cacheCreationTokens;
      existing.cacheReadTokens += record.cacheReadTokens;
      existing.messageCount += 1;
    } else {
      aggregated.set(key, {
        date,
        source: record.source,
        model: record.model,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        cacheCreationTokens: record.cacheCreationTokens,
        cacheReadTokens: record.cacheReadTokens,
        messageCount: 1,
      });
    }
  }

  return Array.from(aggregated.values());
}

async function promptYesNo(question: string): Promise<boolean> {
  const readline = await import('node:readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === '' || normalized === 'y' || normalized === 'yes');
    });
  });
}

async function showAutoSyncStatus(): Promise<void> {
  const status = await checkAutoSyncStatus();

  console.log('\x1b[1m\x1b[38;5;208mburntop\x1b[0m - Auto-Sync Status');
  console.log('');

  if (status.enabled) {
    console.log('\x1b[32m✓\x1b[0m Auto-sync is enabled');
    console.log('');
    console.log(`  Platform: ${status.platform}`);
    if (status.nextRun) {
      console.log(`  Next run: ${status.nextRun}`);
    }
    if (status.command) {
      console.log(`  Command: ${status.command}`);
    }
  } else {
    console.log('\x1b[90m○\x1b[0m Auto-sync is not enabled');
    console.log('');
    console.log(`  Platform: ${status.platform}`);
    console.log('  Run "burntop sync --enable-auto" to enable');
  }

  console.log('');
}

async function enableAutoSync(): Promise<void> {
  console.log('\x1b[1m\x1b[38;5;208mburntop\x1b[0m - Enable Auto-Sync');
  console.log('');
  await setupAutoSync();
}

async function disableAutoSync(): Promise<void> {
  console.log('\x1b[1m\x1b[38;5;208mburntop\x1b[0m - Disable Auto-Sync');
  console.log('');
  await removeAutoSync();
  updateConfig({ autoSync: false });
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  if (options.status) {
    await showAutoSyncStatus();
    return;
  }

  if (options.enableAuto) {
    await enableAutoSync();
    return;
  }

  if (options.disableAuto) {
    await disableAutoSync();
    return;
  }

  console.log('');
  console.log('\x1b[1m\x1b[38;5;208mburntop\x1b[0m - Sync Usage Data');
  console.log('');

  let credentials = getCredentials();

  if (!credentials) {
    console.log('\x1b[33m!\x1b[0m Not logged in.');
    console.log('');

    const shouldLogin = await promptYesNo('Login with GitHub to sync your data? (Y/n): ');

    if (!shouldLogin) {
      console.log('');
      console.log('Sync cancelled. Run \x1b[1mburntop login\x1b[0m when ready to authenticate.');
      console.log('');
      return;
    }

    console.log('');
    console.log('Starting GitHub authentication...\n');

    try {
      let pollCount = 0;
      const result = await performGitHubLogin(() => {
        pollCount++;
        if (pollCount % 3 === 0) {
          process.stdout.write('.');
        }
      });

      console.log('\n');
      console.log(`\x1b[32m✓\x1b[0m Logged in as @${result.username}`);
      console.log('');

      credentials = getCredentials();
      if (!credentials) {
        console.log('\x1b[31m✗\x1b[0m Failed to save credentials.');
        process.exit(1);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
          console.error('\n\x1b[31m✗\x1b[0m Could not connect to burntop server.');
          console.error('Please check your internet connection and try again.');
        } else {
          console.error(`\n\x1b[31m✗\x1b[0m Login failed: ${error.message}`);
        }
      } else {
        console.error('\n\x1b[31m✗\x1b[0m Login failed: An unexpected error occurred');
      }
      process.exit(1);
    }
  }

  console.log(`Logged in as: \x1b[1m${credentials.username}\x1b[0m`);

  const config = getUserConfig();
  const firstSync = isFirstSync();

  if (!options.noPrompt && firstSync && config.autoSync !== true) {
    console.log('');
    console.log('\x1b[33m!\x1b[0m First sync detected.');
    console.log('');
    console.log('Enable auto-sync to automatically sync your AI usage every hour?');
    console.log('');
    console.log('Benefits:');
    console.log('  • Your data is always up-to-date on burntop.dev');
    console.log('  • Runs in the background, no manual intervention needed');
    console.log('  • Never miss tracking your daily AI usage');
    console.log('');
    console.log('Sync logs will be saved to: ~/.burntop/sync.log');
    console.log('');
    const shouldEnable = await promptYesNo('Enable auto-sync? (Y/n): ');

    if (shouldEnable) {
      try {
        await setupAutoSync();
        updateConfig({ autoSync: true });
      } catch (error) {
        console.log('');
        console.log('\x1b[33m!\x1b[0m Failed to enable auto-sync.');
        console.log(`  ${error instanceof Error ? error.message : String(error)}`);
        console.log('');
        console.log('You can enable it later with: burntop sync --enable-auto');
      }
    } else {
      updateConfig({ autoSync: false });
    }

    console.log('');
  }

  // Get machine ID for multi-machine sync support
  const machineId = getMachineId();
  if (options.verbose) {
    console.log(`Machine ID: ${machineId}`);
  }

  // Load existing checkpoint for incremental sync (unless --full is specified)
  const existingCheckpoint = options.full ? null : loadCheckpoint();
  const isIncrementalSync = !!existingCheckpoint && !options.full;

  if (options.verbose) {
    if (options.full) {
      console.log('Mode: Full sync (--full specified)');
    } else if (existingCheckpoint) {
      console.log('Mode: Incremental sync (using checkpoint)');
    } else {
      console.log('Mode: Full sync (no checkpoint found)');
    }
  }

  console.log('');

  const parsers = [
    new ClaudeCodeParser(),
    new ClineParser(),
    new CodexParser(),
    new ContinueParser(),
    new CursorParser(),
    new DroidParser(),
    new GeminiCliParser(),
    new KiloCodeParser(),
    new OpenCodeParser(),
    new RooCodeParser(),
    new AiderParser(),
  ];

  // Collect all records and track checkpoints for later saving
  const allRecords: UsageRecord[] = [];
  const parseResults: Array<{ name: string; displayName: string; result: ParseResult }> = [];
  const newCheckpoints: Record<string, SourceCheckpoint> = {};
  let totalSkippedFiles = 0;

  for (const parser of parsers) {
    // Skip if source filter is specified and doesn't match
    if (options.source && parser.name !== options.source) {
      continue;
    }

    const exists = await parser.exists();
    if (!exists) {
      if (options.verbose) {
        console.log(`${parser.displayName}: No data found`);
      }
      continue;
    }

    process.stdout.write(`Scanning ${parser.displayName}...`);

    // Configure parse options
    const parseOptions: ParseOptions = {
      onProgress: printProgress,
    };

    let result: ParseResult;
    let skippedFiles = 0;
    let isIncremental = false;

    // Use incremental parsing if available and we have a checkpoint
    if (parser.parseIncremental && !options.full) {
      const sourceCheckpoint = existingCheckpoint?.sources[parser.name];
      const incrementalResult = await parser.parseIncremental(sourceCheckpoint, parseOptions);

      result = incrementalResult;
      skippedFiles = incrementalResult.skippedFiles;
      isIncremental = incrementalResult.isIncremental;
      newCheckpoints[parser.name] = incrementalResult.checkpoint;
      totalSkippedFiles += skippedFiles;
    } else {
      // Fall back to full parse
      result = await parser.parse(parseOptions);

      // For full parse, create a basic checkpoint that will be populated
      // on next incremental run when files are re-scanned
      newCheckpoints[parser.name] = {
        lastSyncedAt: new Date().toISOString(),
        files: {},
      };
    }

    // Clear progress line
    process.stdout.write('\r' + ' '.repeat(60) + '\r');

    if (result.records.length > 0) {
      parseResults.push({
        name: parser.name,
        displayName: parser.displayName,
        result,
      });
      allRecords.push(...result.records);

      const totalTokens =
        result.stats.totalInputTokens +
        result.stats.totalOutputTokens +
        result.stats.totalCacheCreationTokens;

      // Show incremental status if applicable
      const incrementalNote =
        isIncremental && skippedFiles > 0 ? ` (${formatNumber(skippedFiles)} files unchanged)` : '';

      console.log(
        `\x1b[32m✓\x1b[0m ${parser.displayName}: ${formatNumber(result.stats.messageCount)} messages, ${formatTokens(totalTokens)} tokens${incrementalNote}`
      );
    } else if (isIncremental && skippedFiles > 0) {
      // No new records but we did check files
      console.log(
        `\x1b[90m○\x1b[0m ${parser.displayName}: No new data (${formatNumber(skippedFiles)} files unchanged)`
      );
    }
  }

  if (allRecords.length === 0) {
    console.log('');
    console.log('No AI usage data found to sync.');
    console.log('');
    console.log('Supported tools:');
    console.log('  - Aider (~/.aider/*.jsonl via --analytics-log)');
    console.log('  - Claude Code (~/.claude/projects/**/*.jsonl)');
    console.log('  - Cline (VS Code globalStorage/saoudrizwan.claude-dev/)');
    console.log('  - Continue (~/.continue/sessions/*.json)');
    console.log('  - Cursor (~/Library/Application Support/Cursor/User/globalStorage/state.vscdb)');
    console.log('  - Droid (~/.factory/sessions/*.settings.json)');
    console.log('  - Gemini CLI (~/.gemini/tmp/*/chats/session-*.json)');
    console.log('  - Kilo Code (VS Code globalStorage/kilocode.kilo-code/)');
    console.log('  - OpenCode (~/.local/share/opencode/storage/message/)');
    console.log('  - Roo Code (VS Code globalStorage/rooveterinaryinc.roo-cline/)');
    return;
  }

  // Aggregate records by date/source/model
  const aggregatedRecords = aggregateRecords(allRecords);

  console.log('');
  console.log(
    `Total: ${formatNumber(allRecords.length)} messages across ${parseResults.length} source(s)`
  );
  console.log(`Aggregated into ${formatNumber(aggregatedRecords.length)} daily records`);

  // Dry run mode - don't actually upload
  if (options.dryRun) {
    console.log('');
    console.log('\x1b[33mDry run mode\x1b[0m - data was not uploaded.');
    console.log('');
    console.log('Remove --dry-run to sync your data to burntop.dev');
    return;
  }

  // Prepare sync payload
  const payload: SyncPayload = {
    version: '1.0.0',
    client: 'burntop-cli',
    machineId,
    syncedAt: new Date().toISOString(),
    records: aggregatedRecords,
  };

  console.log('');
  process.stdout.write('Uploading to burntop.dev...');

  try {
    // Use FastAPI v1 endpoint
    const response = await fetch(`${API_BASE_URL}/api/v1/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    // Clear progress
    process.stdout.write('\r' + ' '.repeat(40) + '\r');

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 401) {
        console.log('\x1b[31m✗\x1b[0m Authentication failed.');
        console.log('');
        console.log(
          '  Your session may have expired. Run \x1b[1mburntop login\x1b[0m to re-authenticate.'
        );
        process.exit(1);
      }

      if (response.status === 404) {
        console.log('\x1b[33m!\x1b[0m Sync API not available yet.');
        console.log('');
        console.log('  The sync endpoint is coming soon. Your data was scanned locally.');
        console.log('  Visit https://burntop.dev for updates.');
        return;
      }

      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as SyncResponse;

    if (result.success) {
      console.log('\x1b[32m✓\x1b[0m Sync complete!');
      console.log('');

      // Display sync statistics
      console.log(`  Records processed: ${formatNumber(result.recordsProcessed)}`);
      console.log(`  New records: ${formatNumber(result.newRecords)}`);
      console.log(`  Updated records: ${formatNumber(result.updatedRecords)}`);

      // Display user statistics
      console.log('');
      console.log(`  Total tokens: ${formatTokens(result.stats.totalTokens)}`);
      console.log(`  Current streak: ${result.stats.currentStreak} days`);

      // Display new achievements if any
      if (result.newAchievements && result.newAchievements.length > 0) {
        console.log('');
        console.log('\x1b[1m\x1b[38;5;208m🎉 New Achievements Unlocked!\x1b[0m');
        for (const achievement of result.newAchievements) {
          console.log('');
          console.log(`  \x1b[1m${achievement.name}\x1b[0m`);
          console.log(`  ${achievement.description}`);
          console.log(
            `  +${achievement.xp_reward} XP • ${achievement.rarity} • Tier ${achievement.tier}`
          );
        }
      }

      // Save checkpoint after successful sync
      // This ensures we only skip files that were successfully synced
      const checkpoint: SyncCheckpoint = {
        version: '1.0',
        machineId,
        sources: newCheckpoints,
      };
      saveCheckpoint(checkpoint);

      if (options.verbose) {
        console.log('');
        console.log(`  Checkpoint saved for ${Object.keys(newCheckpoints).length} source(s)`);
      }

      console.log('');
      console.log(`  View your stats: https://burntop.dev/p/${credentials.username}`);
    } else {
      console.log('\x1b[31m✗\x1b[0m Sync failed.');
      if (result.message) {
        console.log(`  ${result.message}`);
      }
      // Note: We don't save the checkpoint on failure
      // This ensures files will be re-synced on next attempt
    }
  } catch (err) {
    process.stdout.write('\r' + ' '.repeat(40) + '\r');

    if (err instanceof TypeError && err.message.includes('fetch')) {
      console.log('\x1b[31m✗\x1b[0m Network error.');
      console.log('');
      console.log('  Could not connect to burntop.dev. Check your internet connection.');
    } else {
      console.log('\x1b[31m✗\x1b[0m Sync failed.');
      console.log(`  ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    process.exit(1);
  }

  console.log('');
}
