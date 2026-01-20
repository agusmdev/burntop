/**
 * Logout command for burntop CLI
 */

import { getCredentials, clearCredentials } from '../auth/index.js';

/**
 * Execute the logout command
 */
export async function logoutCommand(): Promise<void> {
  const credentials = getCredentials();

  if (!credentials) {
    console.log('You are not logged in.');
    return;
  }

  const username = credentials.username;
  clearCredentials();

  console.log(`Logged out from @${username}`);
  console.log('Run `burntop login` to log in again.');
}
