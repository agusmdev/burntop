/**
 * GitHub Device Code OAuth Flow for burntop CLI
 *
 * Implements GitHub's OAuth 2.0 Device Authorization Grant
 * https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 */

import { saveCredentials, type Credentials } from './credentials.js';

// GitHub OAuth App Client ID (device flow enabled)
// Self-hosters can override with their own OAuth app via BURNTOP_GITHUB_CLIENT_ID
const GITHUB_CLIENT_ID = process.env['BURNTOP_GITHUB_CLIENT_ID'] || 'Ov23liG5Eal2Pc2AHtAf';

// GitHub Device Flow endpoints
const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

// API base URL - defaults to production, can be overridden for development
const API_BASE_URL = process.env['BURNTOP_API_URL'] || 'https://api.burntop.dev';

export interface GitHubDeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GitHubTokenError {
  error: string;
  error_description?: string;
  error_uri?: string;
}

export interface DeviceFlowError {
  error: string;
  error_description?: string;
}

export interface SessionResponse {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  name: string | null;
  image: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number | undefined;
  refresh_token?: string | undefined;
  user: {
    id: string;
    username: string;
    displayName?: string | undefined;
    avatar?: string | undefined;
  };
}

/**
 * Request a device code from GitHub
 */
export async function requestDeviceCode(): Promise<GitHubDeviceCodeResponse> {
  const response = await fetch(GITHUB_DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: 'user:email',
    }),
  });

  if (!response.ok) {
    const error = (await response.json()) as GitHubTokenError;
    throw new Error(error.error_description || error.error || 'Failed to request device code');
  }

  return response.json() as Promise<GitHubDeviceCodeResponse>;
}

/**
 * Poll GitHub for the access token after user has authenticated
 */
export async function pollForGitHubToken(
  deviceCode: string,
  interval: number,
  expiresIn: number,
  onPoll?: () => void
): Promise<string> {
  const startTime = Date.now();
  const timeoutMs = expiresIn * 1000;
  let pollInterval = interval * 1000;

  while (Date.now() - startTime < timeoutMs) {
    // Wait before polling
    await sleep(pollInterval);
    onPoll?.();

    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data = (await response.json()) as GitHubTokenResponse | GitHubTokenError;

    // Check if we got an access token
    if ('access_token' in data) {
      return data.access_token;
    }

    // Handle errors
    const error = data as GitHubTokenError;

    switch (error.error) {
      case 'authorization_pending':
        // User hasn't authorized yet, continue polling
        continue;

      case 'slow_down':
        // Increase polling interval by 5 seconds
        pollInterval += 5000;
        continue;

      case 'access_denied':
        throw new Error('Authorization was denied by the user');

      case 'expired_token':
        throw new Error('The device code has expired. Please try again.');

      default:
        throw new Error(error.error_description || error.error || 'Authorization failed');
    }
  }

  throw new Error('Authorization timed out. Please try again.');
}

/**
 * Exchange GitHub access token for burntop session
 */
export async function exchangeGitHubTokenForSession(
  githubAccessToken: string
): Promise<{ session: SessionResponse; user: UserResponse }> {
  // Step 1: Exchange GitHub token for burntop session
  const sessionResponse = await fetch(`${API_BASE_URL}/api/v1/auth/oauth/github/device`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_token: githubAccessToken,
    }),
  });

  if (!sessionResponse.ok) {
    let errorMessage = 'Failed to authenticate with burntop';

    try {
      const error = (await sessionResponse.json()) as DeviceFlowError;
      if (error.error_description) {
        errorMessage = error.error_description;
      } else if (error.error) {
        errorMessage = error.error;
      }
    } catch {
      // Use default error message
    }

    throw new Error(errorMessage);
  }

  const session = (await sessionResponse.json()) as SessionResponse;

  // Step 2: Get user info using the session token
  const meResponse = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  if (!meResponse.ok) {
    throw new Error('Failed to fetch user information');
  }

  const user = (await meResponse.json()) as UserResponse;

  return { session, user };
}

/**
 * Complete device flow login
 *
 * This function handles the full GitHub device flow:
 * 1. Request device code from GitHub
 * 2. Poll GitHub for access token
 * 3. Exchange GitHub token for burntop session
 * 4. Save credentials
 */
export async function pollForToken(
  deviceCode: string,
  interval: number,
  expiresIn: number,
  onPoll?: () => void
): Promise<TokenResponse> {
  // Poll GitHub for access token
  const githubAccessToken = await pollForGitHubToken(deviceCode, interval, expiresIn, onPoll);

  // Exchange GitHub token for burntop session
  const { session, user } = await exchangeGitHubTokenForSession(githubAccessToken);

  // Save credentials
  const expiresAt = new Date(session.expires_at).getTime();

  const credentials: Credentials = {
    accessToken: session.token,
    userId: user.id,
    username: user.username,
    expiresAt,
  };

  saveCredentials(credentials);

  // Return in the expected format for compatibility
  return {
    access_token: session.token,
    token_type: 'bearer',
    expires_in: Math.floor((expiresAt - Date.now()) / 1000),
    user: {
      id: user.id,
      username: user.username,
      displayName: user.name || undefined,
    },
  };
}

/**
 * Helper to sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Try to open a URL in the user's default browser
 */
export async function openBrowser(url: string): Promise<boolean> {
  const { platform } = process;

  try {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    if (platform === 'darwin') {
      await execAsync(`open "${url}"`);
    } else if (platform === 'win32') {
      await execAsync(`start "" "${url}"`);
    } else {
      // Linux and others
      await execAsync(`xdg-open "${url}"`);
    }
    return true;
  } catch {
    return false;
  }
}

export interface GitHubLoginResult {
  username: string;
  userId: string;
  displayName?: string | undefined;
}

export async function performGitHubLogin(onPoll?: () => void): Promise<GitHubLoginResult> {
  const deviceCode = await requestDeviceCode();

  console.log('Please visit the following URL to authorize burntop:');
  console.log(`\n  ${deviceCode.verification_uri}\n`);
  console.log(`Enter this code: \x1b[1m${deviceCode.user_code}\x1b[0m\n`);

  const browserOpened = await openBrowser(deviceCode.verification_uri);
  if (browserOpened) {
    console.log('Browser opened automatically. Please enter the code shown above.\n');
  } else {
    console.log('Please open the URL in your browser manually.\n');
  }

  process.stdout.write('Waiting for authorization');

  const result = await pollForToken(
    deviceCode.device_code,
    deviceCode.interval,
    deviceCode.expires_in,
    onPoll
  );

  return {
    username: result.user.username,
    userId: result.user.id,
    displayName: result.user.displayName,
  };
}

// Export types for backward compatibility
export type DeviceCodeResponse = GitHubDeviceCodeResponse;
