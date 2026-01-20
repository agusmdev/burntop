import { describe, expect, it, vi, beforeEach } from 'vitest';

import { registerServiceWorker, isOnline, setupOnlineListener } from './register-sw';

describe('Service Worker Registration', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('registerServiceWorker', () => {
    it('should return undefined if service workers are not supported', async () => {
      // Mock navigator without serviceWorker
      const originalNavigator = globalThis.navigator;
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const result = await registerServiceWorker();
      expect(result).toBeUndefined();

      // Restore original navigator
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });

    it('should skip registration in development mode', async () => {
      // Mock import.meta.env
      const originalEnv = import.meta.env;
      Object.defineProperty(import.meta, 'env', {
        value: { DEV: true },
        writable: true,
        configurable: true,
      });

      const mockRegister = vi.fn();
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          serviceWorker: {
            register: mockRegister,
          },
        },
        writable: true,
        configurable: true,
      });

      const result = await registerServiceWorker();
      expect(result).toBeUndefined();
      expect(mockRegister).not.toHaveBeenCalled();

      // Restore
      Object.defineProperty(import.meta, 'env', {
        value: originalEnv,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('isOnline', () => {
    it('should return navigator.onLine status', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          onLine: true,
        },
        writable: true,
        configurable: true,
      });

      expect(isOnline()).toBe(true);

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          onLine: false,
        },
        writable: true,
        configurable: true,
      });

      expect(isOnline()).toBe(false);
    });
  });

  describe('setupOnlineListener', () => {
    it('should add event listeners and return cleanup function', () => {
      const onOnline = vi.fn();
      const onOffline = vi.fn();

      const mockAddEventListener = vi.fn();
      const mockRemoveEventListener = vi.fn();

      Object.defineProperty(globalThis, 'window', {
        value: {
          addEventListener: mockAddEventListener,
          removeEventListener: mockRemoveEventListener,
        },
        writable: true,
        configurable: true,
      });

      const cleanup = setupOnlineListener(onOnline, onOffline);

      expect(mockAddEventListener).toHaveBeenCalledWith('online', onOnline);
      expect(mockAddEventListener).toHaveBeenCalledWith('offline', onOffline);

      cleanup();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('online', onOnline);
      expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', onOffline);
    });
  });
});
