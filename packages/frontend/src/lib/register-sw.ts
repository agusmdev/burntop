/**
 * Service Worker Registration
 * Handles registration and updates for the service worker
 */

/* eslint-disable no-console */

export async function registerServiceWorker(): Promise<
  globalThis.ServiceWorkerRegistration | undefined
> {
  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers are not supported in this browser');
    return undefined;
  }

  // Only register in production or when explicitly enabled
  if (import.meta.env.DEV && !import.meta.env.VITE_SW_DEV) {
    return undefined;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (!newWorker) {
        return;
      }

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker is installed, but old one is still controlling the page
          console.log('New service worker available. Refresh to update.');

          // Optionally show a notification to the user
          showUpdateNotification(newWorker);
        }
      });
    });

    // Check for updates every hour
    setInterval(
      () => {
        registration.update();
      },
      60 * 60 * 1000
    );

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return undefined;
  }
}

/**
 * Unregister all service workers
 * Useful for debugging or when removing SW support
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const results = await Promise.all(
      registrations.map((registration) => registration.unregister())
    );
    return results.every((result) => result === true);
  } catch (error) {
    console.error('Failed to unregister service workers:', error);
    return false;
  }
}

/**
 * Show a notification when a new service worker is available
 */
function showUpdateNotification(_worker: globalThis.ServiceWorker): void {
  // Check if the user wants to be notified
  const shouldNotify = localStorage.getItem('sw-update-notify') !== 'false';

  if (!shouldNotify) {
    return;
  }

  // You can integrate with your toast/notification system here
  // For now, we'll just log to console
  console.log('A new version is available. The page will update on next reload.');

  // Optionally, automatically activate the new service worker
  // Uncomment the following lines to skip waiting automatically
  // _worker.postMessage({ type: 'SKIP_WAITING' });
  // window.location.reload();
}

/* eslint-enable no-console */

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function setupOnlineListener(onOnline: () => void, onOffline: () => void): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
