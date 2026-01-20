/**
 * Config command for managing burntop settings
 *
 * Allows users to view and modify burntop configuration options.
 */

import { getUserConfig, updateConfig, getConfigPath } from '../config/index.js';

interface ConfigOptions {
  set?: string[];
  get?: string;
  list?: boolean;
}

async function handleSet(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.log('\x1b[31m✗\x1b[0m Usage: burntop config set <key> <value>');
    console.log('');
    console.log('Available keys:');
    console.log('  auto-sync - Enable/disable automatic hourly sync (true/false)');
    console.log('');
    console.log('Example:');
    console.log('  burntop config set auto-sync true');
    console.log('  burntop config set auto-sync false');
    return;
  }

  const key = args[0];
  const value = args[1];

  switch (key) {
    case 'auto-sync':
      if (value === 'true' || value === 'false') {
        const enabled = value === 'true';
        updateConfig({ autoSync: enabled });
        console.log(`\x1b[32m✓\x1b[0m Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        console.log('\x1b[31m✗\x1b[0m Invalid value for auto-sync.');
        console.log('');
        console.log('Valid values: true, false');
      }
      break;

    default:
      console.log(`\x1b[31m✗\x1b[0m Unknown config key: ${key}`);
      console.log('');
      console.log('Available keys:');
      console.log('  auto-sync');
  }
}

async function handleGet(key: string): Promise<void> {
  const config = getUserConfig();

  switch (key) {
    case 'auto-sync':
      console.log(`auto-sync: ${config.autoSync ?? false}`);
      break;

    default:
      console.log(`\x1b[31m✗\x1b[0m Unknown config key: ${key}`);
      console.log('');
      console.log('Available keys:');
      console.log('  auto-sync');
  }
}

async function handleList(): Promise<void> {
  const config = getUserConfig();

  console.log('\x1b[1m\x1b[38;5;208mburntop\x1b[0m Configuration');
  console.log('');
  console.log(`auto-sync: ${config.autoSync ?? false}`);
  console.log('');
  console.log(`Config file: ${getConfigPath()}`);
}

export async function configCommand(options: ConfigOptions): Promise<void> {
  if (options.set) {
    await handleSet(options.set);
  } else if (options.get) {
    await handleGet(options.get);
  } else if (options.list) {
    await handleList();
  } else {
    await handleList();
  }
}
