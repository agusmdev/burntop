/**
 * TEMPORARY STUB - Auth Middleware
 *
 * This is a temporary stub to unblock frontend development.
 * The actual auth middleware was removed during FastAPI backend migration.
 *
 * TODO: Replace with proper FastAPI backend integration (see tasks 11.6-11.12 in PRD)
 */

export async function authMiddleware() {
  // Stub: Allow all requests through
  // In reality, this should validate session tokens with FastAPI backend
  console.warn('[STUB] authMiddleware called - authentication not enforced');
  return {};
}

export async function optionalAuthMiddleware() {
  // Stub: Allow all requests through
  // In reality, this should validate session tokens with FastAPI backend
  console.warn('[STUB] optionalAuthMiddleware called - authentication not enforced');
  return {};
}
