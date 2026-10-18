import { ProviderError } from "../providers/http";

/** Network, timeout, and 5xx failures. Client errors stay terminal. */
export function transientProviderFailure(error: unknown): boolean {
  return (
    !(error instanceof ProviderError) || error.status === 0 || error.status >= 500
  );
}

/** Air, radar, and geocoding keep the existing single retry. */
export function defaultProviderRetry(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && transientProviderFailure(error);
}

export function providerRetryDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 4000);
}

/**
 * An uncached weather load may survive two transient failures.
 * One stalled 12s cold connection plus its existing retry otherwise
 * lands in the error state near 26s, before a warmed path can answer
 * inside the 45s temperature window. Cached refresh and offline loads
 * keep the single retry so those states do not wait on extra attempts.
 */
export function weatherLoadRetry(
  failureCount: number,
  error: unknown,
  hasCachedWeather: boolean,
  online = navigator.onLine,
): boolean {
  if (!transientProviderFailure(error)) return false;
  const budget = !hasCachedWeather && online ? 2 : 1;
  return failureCount < budget;
}
