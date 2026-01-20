/**
 * Authentication module for burntop CLI
 *
 * Uses GitHub Device Flow for authentication (no email/password)
 */

export {
  getCredentials,
  saveCredentials,
  clearCredentials,
  getCredentialsPath,
  type Credentials,
} from './credentials.js';

export {
  requestDeviceCode,
  pollForToken,
  openBrowser,
  performGitHubLogin,
  type DeviceCodeResponse,
  type TokenResponse,
  type DeviceFlowError,
  type GitHubLoginResult,
} from './device-flow.js';
