/**
 * Error screen with no data yet: Retry runs immediately (owner-approved), limited only by a short
 * anti-spam guard. Cached-data refresh keeps the existing 30 s cooldown in reliability/useRefresh.
 */
export const INITIAL_RETRY_GUARD_MS = 3000;
export function createRetryGuard(ms = INITIAL_RETRY_GUARD_MS) {
  let last = -Infinity;
  return (now = Date.now()) => {
    if (now - last < ms) return false;
    last = now;
    return true;
  };
}
