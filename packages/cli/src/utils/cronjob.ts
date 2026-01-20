/**
 * Cronjob management for burntop auto-sync
 *
 * Handles setup, removal, and status checking of hourly cronjobs for
 * automatic sync on Linux/macOS systems.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const BURNTOP_DIR = join(homedir(), '.burntop');
const SYNC_LOG_FILE = join(BURNTOP_DIR, 'sync.log');
const CRON_MARKER = '# burntop auto-sync -';

export interface CronStatus {
  enabled: boolean;
  nextRun: string | undefined;
  command: string | undefined;
  platform: string;
}

function ensureBurntopDir(): void {
  if (!existsSync(BURNTOP_DIR)) {
    mkdirSync(BURNTOP_DIR, { recursive: true });
  }
}

function getPlatform(): string {
  const platform = process.platform;
  if (platform === 'win32') {
    return 'windows';
  }
  if (platform === 'darwin') {
    return 'macos';
  }
  return 'linux';
}

function getBunPath(): string {
  try {
    const bunPath = execSync('which bun', { encoding: 'utf-8' }).trim();
    if (bunPath) {
      return bunPath;
    }
  } catch {
    const commonPaths = [
      '/usr/local/bin/bun',
      '/usr/bin/bun',
      `${process.env['HOME']}/.bun/bin/bun`,
    ];
    for (const path of commonPaths) {
      if (existsSync(path)) {
        return path;
      }
    }
  }
  return 'bun';
}

function getCronMarker(version: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `${CRON_MARKER} ${version} added on ${date}`;
}

function parseCrontab(crontabContent: string): { lines: string[]; hasBurntop: boolean } {
  const lines = crontabContent.split('\n');
  const hasBurntop = lines.some((line) => line.includes(CRON_MARKER));
  return { lines, hasBurntop };
}

function readCrontab(): string | null {
  try {
    return execSync('crontab -l', { encoding: 'utf-8' }).trim();
  } catch (error) {
    if ((error as { status?: number }).status === 1) {
      return null;
    }
    throw error;
  }
}

function writeCrontab(content: string): void {
  try {
    execSync(`crontab -`, { input: content, encoding: 'utf-8' });
  } catch (error) {
    throw new Error(
      `Failed to write crontab: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function promptYesNo(question: string): Promise<boolean> {
  const readline = require('node:readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<boolean>((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === '' || normalized === 'y' || normalized === 'yes');
    });
  });
}

export async function setupAutoSync(): Promise<void> {
  const platform = getPlatform();

  if (platform === 'windows') {
    console.log('\x1b[33m!\x1b[0m Windows detected.');
    console.log('');
    console.log('Cronjobs are not supported on Windows.');
    console.log('Please use Task Scheduler instead.');
    console.log('');
    console.log('To create a scheduled task:');
    console.log('  1. Open Task Scheduler');
    console.log('  2. Create a new task');
    console.log('  3. Set trigger to "Daily" or "Hourly"');
    console.log('  4. Action: Run a program');
    console.log('  5. Program: bun');
    console.log('  6. Arguments: x burntop sync');
    throw new Error('Platform not supported for cronjobs');
  }

  if (platform === 'macos') {
    console.log('\x1b[33m!\x1b[0m macOS detected.');
    console.log('');
    console.log('Using cron for auto-sync. For better integration, consider using launchd.');
    console.log('Launchd is the macOS native scheduler.');
  }

  ensureBurntopDir();

  const bunPath = getBunPath();
  const marker = getCronMarker('1.0');
  const cronEntry = `0 * * * * ${bunPath}x burntop sync >> ${SYNC_LOG_FILE} 2>&1`;

  const currentCrontab = readCrontab();
  const { lines, hasBurntop } = parseCrontab(currentCrontab || '');

  if (hasBurntop) {
    console.log('\x1b[33m!\x1b[0m Existing burntop cronjob found.');
    console.log('');
    const shouldReplace = await promptYesNo('Replace existing cronjob? (Y/n): ');
    if (!shouldReplace) {
      console.log('Cronjob setup cancelled.');
      return;
    }

    const filteredLines = lines.filter((line) => !line.includes(CRON_MARKER));
    filteredLines.push(marker);
    filteredLines.push(cronEntry);
    writeCrontab(filteredLines.join('\n'));
  } else {
    const newLines = currentCrontab ? [...lines, marker, cronEntry] : [marker, cronEntry];
    writeCrontab(newLines.join('\n'));
  }

  console.log('\x1b[32m✓\x1b[0m Auto-sync enabled.');
  console.log('');
  console.log(`  Schedule: Every hour (0 * * * *)`);
  console.log(`  Log file: ${SYNC_LOG_FILE}`);
  console.log('');
  console.log('To view logs:');
  console.log(`  cat ${SYNC_LOG_FILE}`);
}

export async function removeAutoSync(): Promise<void> {
  const platform = getPlatform();

  if (platform === 'windows') {
    console.log('\x1b[33m!\x1b[0m Windows detected.');
    console.log('Please remove burntop task from Task Scheduler manually.');
    return;
  }

  const currentCrontab = readCrontab();
  if (!currentCrontab) {
    console.log('\x1b[33m!\x1b[0m No cronjob found.');
    console.log('Auto-sync is not enabled.');
    return;
  }

  const { lines, hasBurntop } = parseCrontab(currentCrontab);
  if (!hasBurntop) {
    console.log('\x1b[33m!\x1b[0m No burntop cronjob found.');
    console.log('Auto-sync is not enabled.');
    return;
  }

  const filteredLines = lines.filter((line) => !line.includes(CRON_MARKER));
  if (filteredLines.length === 0) {
    execSync('crontab -r', { encoding: 'utf-8' });
    console.log('\x1b[32m✓\x1b[0m Auto-sync disabled (cronjob removed).');
  } else {
    writeCrontab(filteredLines.join('\n'));
    console.log('\x1b[32m✓\x1b[0m Auto-sync disabled (cronjob removed).');
  }
}

export async function checkAutoSyncStatus(): Promise<CronStatus> {
  const platform = getPlatform();
  const status: CronStatus = { enabled: false, nextRun: undefined, command: undefined, platform };

  if (platform === 'windows') {
    console.log('\x1b[33m!\x1b[0m Windows detected.');
    console.log('Auto-sync is managed via Task Scheduler.');
    return status;
  }

  const currentCrontab = readCrontab();
  if (!currentCrontab) {
    status.enabled = false;
    return status;
  }

  const { lines, hasBurntop } = parseCrontab(currentCrontab);
  status.enabled = hasBurntop;

  if (hasBurntop) {
    const cronLine = lines.find(
      (line) => line.includes('0 * * * *') && line.includes('burntop sync')
    );
    status.command = cronLine?.trim();

    if (status.command) {
      const nextRun = new Date();
      nextRun.setMinutes(0, 0, 0);
      nextRun.setHours(nextRun.getHours() + 1);
      status.nextRun = nextRun.toLocaleString();
    }
  }

  return status;
}
