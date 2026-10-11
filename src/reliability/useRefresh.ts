import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshGate, REFRESH_INTERVAL } from './freshness';
const gate = new RefreshGate();
export function recordRefresh(key: readonly unknown[]) { gate.record(JSON.stringify(key)); }
export function useBoundedRefresh(weatherKey: readonly unknown[], airKey: readonly unknown[]) {
  const client = useQueryClient();
  const keys = useRef([weatherKey, airKey]); keys.current = [weatherKey, airKey];
  const refresh = useCallback((manual = true) => {
    if (document.hidden || !navigator.onLine) return;
    for (const key of keys.current) {
      const state = client.getQueryState(key);
      if (state?.fetchStatus === 'fetching') continue;
      const id = JSON.stringify(key);
      if (!gate.allow(id, manual)) continue;
      gate.record(id);
      void client.refetchQueries({ queryKey: key, exact: true, type: 'active' }, { cancelRefetch: false });
    }
  }, [client]);
  useEffect(() => {
    const resume = () => refresh(false);
    const timer = setInterval(resume, REFRESH_INTERVAL);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    return () => { clearInterval(timer); window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume); window.removeEventListener('focus', resume); };
  }, [refresh]);
  return refresh;
}
