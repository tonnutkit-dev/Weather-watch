import { useEffect, useState } from 'react';
import { SOURCE_LIMIT, REFRESH_INTERVAL } from './freshness';
/** Read wall time on existing renders; schedule only the next validity/cache boundary. */
export function useSourceClock(weatherTime?: number | null, airTime?: number | null, weatherFetchedAt?: number, airFetchedAt?: number) {
  const [, reevaluate] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const at = Date.now(); clearTimeout(timer);
      const deadlines = [weatherTime == null ? null : (weatherTime + SOURCE_LIMIT.weather) * 1000,
        airTime == null ? null : (airTime + SOURCE_LIMIT.air) * 1000,
        weatherFetchedAt == null ? null : weatherFetchedAt * 1000 + REFRESH_INTERVAL,
        airFetchedAt == null ? null : airFetchedAt * 1000 + REFRESH_INTERVAL]
        .filter((x): x is number => x != null && Number.isFinite(x) && x > at);
      if (deadlines.length) timer = setTimeout(update, Math.min(2147483647, Math.min(...deadlines) - at + 1));
    };
    const update = () => { reevaluate(version => version + 1); schedule(); };
    // Data arrival already rendered with actual wall time. Do not render App again here.
    schedule();
    document.addEventListener('visibilitychange', update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', update);
      window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, [weatherTime, airTime, weatherFetchedAt, airFetchedAt]);
  return Date.now();
}
