#!/usr/bin/env bun
/**
 * burntop CLI - Gamified AI usage tracking
 *
 * Track your AI tool usage, view stats, and compete on the leaderboard.
 */

import { Command } from 'commander';

import {
  loginCommand,
  logoutCommand,
  statsCommand,
  syncCommand,
  configCommand,
} from './commands/index.js';

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

// Config command - manage burntop settings
program
  .command('config')
  .description('View or modify burntop configuration')
  .option('--set <key> <value>', 'Set a configuration value')
  .option('--get <key>', 'Get a configuration value')
  .option('-l, --list', 'List all configuration values')
  .action(async (options: { set?: string[]; get?: string; list?: boolean }) => {
    await configCommand(options);
  });

// Sync command - upload local data to burntop.dev
program
  .command('sync')
  .description('Sync your local AI usage data to burntop')
  .option('-v, --verbose', 'Show additional details')
  .option('-s, --source <source>', 'Only sync specific source (e.g., claude-code)')
  .option('--dry-run', 'Scan data but do not upload')
  .option('--full', 'Force full sync, ignoring any cached checkpoint')
  .option('--enable-auto', 'Enable auto-sync cronjob')
  .option('--disable-auto', 'Disable auto-sync cronjob')
  .option('--status', 'Show auto-sync status')
  .option('--no-prompt', 'Skip auto-sync prompt')
  .action(
    async (options: {
      verbose?: boolean;
      source?: string;
      dryRun?: boolean;
      full?: boolean;
      enableAuto?: boolean;
      disableAuto?: boolean;
      status?: boolean;
      noPrompt?: boolean;
    }) => {
      await syncCommand(options);
    }
  );

program.parse();
