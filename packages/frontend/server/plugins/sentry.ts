import { initSentry } from '../../src/lib/sentry';

/**
 * Nitro plugin to initialize Sentry on server startup
 */
export default () => {
  // Initialize Sentry when the server starts
  initSentry();
};
