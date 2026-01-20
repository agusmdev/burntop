import * as Sentry from '@sentry/node';

/**
 * Initialize Sentry for error tracking
 * Only initializes if SENTRY_DSN is provided
 */
export function initSentry() {
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    // Sentry DSN not provided - error tracking disabled
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'development',

    // Set sample rate based on environment
    // Production: sample 100% of errors, 10% of transactions
    // Development: sample 100% of both
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Capture console errors
    integrations: [
      Sentry.captureConsoleIntegration({
        levels: ['error'],
      }),
    ],

    // Don't send errors in test environment
    enabled: process.env.NODE_ENV !== 'test',

    // Filter out sensitive data
    beforeSend(event) {
      // Don't send events with passwords or tokens in the message
      const message = event.message || '';
      if (message.includes('password') || message.includes('token') || message.includes('secret')) {
        return null;
      }

      return event;
    },
  });

  // Sentry initialized successfully
}

/**
 * Capture an exception with Sentry
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

/**
 * Capture a message with Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  });
}
