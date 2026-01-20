import { getCredentials, performGitHubLogin } from '../auth/index.js';

export async function loginCommand(): Promise<void> {
  const existingCredentials = getCredentials();
  if (existingCredentials) {
    console.log(`Already logged in as @${existingCredentials.username}`);
    console.log('Run `burntop logout` first if you want to log in as a different user.');
    return;
  }

  console.log('Logging in to burntop...\n');
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
    console.log(`\n\x1b[32m✓\x1b[0m Successfully logged in as @${result.username}!`);
    console.log('');
    console.log('You can now use:');
    console.log('  burntop sync      Sync your AI usage data');
    console.log('  burntop stats     View your stats');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
        console.error('\nError: Could not connect to burntop server.');
        console.error('Please check your internet connection and try again.');
        console.error('\nIf the problem persists, visit https://burntop.dev for status updates.');
      } else {
        console.error(`\nLogin failed: ${error.message}`);
      }
    } else {
      console.error('\nLogin failed: An unexpected error occurred');
    }
    process.exit(1);
  }
}
