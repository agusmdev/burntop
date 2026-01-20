#!/usr/bin/env bun
/**
 * burntop CLI - Gamified AI usage tracking
 *
 * Track your AI tool usage, view stats, and compete on the leaderboard.
 */

import { Command } from 'commander';

import { loginCommand, logoutCommand, statsCommand, syncCommand } from './commands/index.js';

const program = new Command();

program
  .name('burntop')
  .description('Track your AI tool usage and compete on the leaderboard')
  .version('0.0.1');

// Stats command - show detailed usage statistics
program
  .command('stats', { isDefault: true })
  .description('Show detailed AI usage statistics')
  .option('-v, --verbose', 'Show additional details')
  .option('-s, --source <source>', 'Only show stats for specific source (e.g., claude-code)')
  .option('-p, --period <period>', 'Time period to show (day, week, month, all)')
  .action(async (options: { verbose?: boolean; source?: string; period?: string }) => {
    await statsCommand(options);
  });

// Login command - authenticate with burntop via GitHub
program
  .command('login')
  .description('Log in to your burntop account via GitHub')
  .action(async () => {
    await loginCommand();
  });

// Logout command - clear stored credentials
program
  .command('logout')
  .description('Log out from your burntop account')
  .action(async () => {
    await logoutCommand();
  });

// Sync command - upload local data to burntop.dev
program
  .command('sync')
  .description('Sync your local AI usage data to burntop')
  .option('-v, --verbose', 'Show additional details')
  .option('-s, --source <source>', 'Only sync specific source (e.g., claude-code)')
  .option('--dry-run', 'Scan data but do not upload')
  .option('--full', 'Force full sync, ignoring any cached checkpoint')
  .action(async (options: { verbose?: boolean; source?: string; dryRun?: boolean; full?: boolean }) => {
    await syncCommand(options);
  });

program.parse();
