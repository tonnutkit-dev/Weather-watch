import { useEffect, useState } from 'react';
import { SOURCE_LIMIT, REFRESH_INTERVAL } from './freshness';
/** One timeout per next source expiry, plus resume/connectivity reevaluation; no animation/polling clock. */
export function useSourceClock(weatherTime?: number | null, airTime?: number | null, weatherFetchedAt?: number, airFetchedAt?: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      const at = Date.now(); setNow(at);
      clearTimeout(timer);
      const deadlines = [weatherTime == null ? null : (weatherTime + SOURCE_LIMIT.weather) * 1000,
        airTime == null ? null : (airTime + SOURCE_LIMIT.air) * 1000,
        weatherFetchedAt == null ? null : weatherFetchedAt * 1000 + REFRESH_INTERVAL,
        airFetchedAt == null ? null : airFetchedAt * 1000 + REFRESH_INTERVAL]
        .filter((x): x is number => x != null && x > at);
      if (deadlines.length) timer = setTimeout(update, Math.min(...deadlines) - at + 1);
    };
    update();
    document.addEventListener('visibilitychange', update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', update);
      window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, [weatherTime, airTime, weatherFetchedAt, airFetchedAt]);
  return now;
}
