import { ProviderError } from "../providers/http";

/** TanStack asks with the number of failures already finished. `count < 1` is one retry. */
export const STANDARD_RETRY_LIMIT = 1;

export function isRetryableLoadError(error: unknown): boolean {
  return (
    !(error instanceof ProviderError) || error.status === 0 || error.status >= 500
  );
}

export function standardRetry(failureCount: number, error: unknown): boolean {
  return failureCount < STANDARD_RETRY_LIMIT && isRetryableLoadError(error);
}

export function retryDelay(failureCount: number): number {
  return Math.min(1000 * 2 ** failureCount, 4000);
}
