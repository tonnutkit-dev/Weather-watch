import { useEffect, useRef, useState } from 'react';
import type { Radar } from './types';
import { RadarPlayback } from './playback';
import { remainingBudget } from './budget';
import type { RadarPresentationStore } from './presentation';
export function useRadarPlayback(radar: Radar | undefined, enabled: boolean, refreshing: boolean, error: boolean,
  keyForIndex: (index: number) => string, presentation: RadarPresentationStore) {
  const [index, setIndex] = useState(0), [playing, setPlaying] = useState(false);
  const current = useRef({ enabled, refreshing, error, keyForIndex, index });
  current.current = { enabled, refreshing, error, keyForIndex, index };
  const [controller] = useState(() => new RadarPlayback(() => ({
    ...current.current, key: current.current.keyForIndex(current.current.index),
    hidden: document.hidden, presentation: presentation.getSnapshot(), remaining: remainingBudget(),
  }), setIndex, setPlaying));
  useEffect(() => { controller.setFrames(radar?.frames ?? []); }, [controller, radar?.frames]);
  useEffect(() => { if (!enabled) controller.stop('layer-hidden'); }, [controller, enabled]);
  useEffect(() => {
    document.addEventListener('visibilitychange', controller.visibility);
    return () => { document.removeEventListener('visibilitychange', controller.visibility); controller.dispose(); };
  }, [controller]);
  return { index, playing, controller };
}
