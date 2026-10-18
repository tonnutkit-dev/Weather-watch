import type { QueryClient, QueryFunctionContext, QueryKey } from "@tanstack/react-query";
import type { Location } from "../locations/types";
import { PROVIDER_DEADLINE_MS } from "../providers/http";
import { getWeather } from "../providers/weather";
import { automaticRefreshAllowed, recordRefresh } from "./useRefresh";
import {
  isRetryableLoadError,
  retryDelay,
  STANDARD_RETRY_LIMIT,
} from "./loadPolicy";

/**
 * First uncached attempt only. Slow links (including high-latency paths to
 * Open-Meteo) can finish inside this budget. Later attempts stay at the
 * approved 12s deadline so a dead connection still yields to a retry.
 */
export const INITIAL_WEATHER_DEADLINE_MS = 18_000;
/**
 * Two retries after the first attempt: three connections in one page load.
 * A cold start that stalls twice still gets a third try before the 45s gate.
 */
export const INITIAL_WEATHER_RETRY_LIMIT = 2;

export type WeatherLoadPhase = "initial" | "refresh";

export function weatherLoadPhase(
  hasCachedWeather: boolean,
  online: boolean,
): WeatherLoadPhase {
  return !hasCachedWeather && online ? "initial" : "refresh";
}

export function shouldRetryWeather(
  failureCount: number,
  error: unknown,
  phase: WeatherLoadPhase,
): boolean {
  if (!isRetryableLoadError(error)) return false;
  const limit =
    phase === "initial" ? INITIAL_WEATHER_RETRY_LIMIT : STANDARD_RETRY_LIMIT;
  return failureCount < limit;
}

export function weatherAttemptDeadline(
  phase: WeatherLoadPhase,
  priorFailures: number,
): number {
  return phase === "initial" && priorFailures === 0
    ? INITIAL_WEATHER_DEADLINE_MS
    : PROVIDER_DEADLINE_MS;
}

export function weatherQueryOptions(
  client: QueryClient,
  location: Location,
  queryKey: QueryKey,
) {
  const phaseNow = () => {
    const state = client.getQueryState(queryKey);
    return weatherLoadPhase(state?.data !== undefined, navigator.onLine);
  };
  return {
    queryKey,
    queryFn: ({ signal }: QueryFunctionContext) => {
      recordRefresh(queryKey);
      const state = client.getQueryState(queryKey);
      const phase = weatherLoadPhase(state?.data !== undefined, navigator.onLine);
      return getWeather(
        location,
        signal,
        weatherAttemptDeadline(phase, state?.fetchFailureCount ?? 0),
      );
    },
    retry: (failureCount: number, error: Error) => {
      const configured = client.getDefaultOptions().queries?.retry;
      if (configured === false || configured === 0) return false;
      return shouldRetryWeather(failureCount, error, phaseNow());
    },
    retryDelay,
    staleTime: 600000,
    refetchOnReconnect: false as const,
    refetchOnWindowFocus: false as const,
    retryOnMount: false as const,
    refetchOnMount: (query: { queryKey: QueryKey }) =>
      automaticRefreshAllowed(query.queryKey),
  };
}
