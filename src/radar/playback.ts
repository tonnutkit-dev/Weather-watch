import type { RadarFrame } from './types';
import type { RadarPresentation } from './presentation';
export const FIRST_FRAME_DELAY_MS = 1500;
export const FRAME_INTERVAL_MS = 5000;
const CHECK_MS = 500;
export type PlaybackPhase = 'paused' | 'playing' | 'buffering' | 'budget' | 'suspended' | 'failed' | 'unavailable';
export interface PlaybackSnapshot { playing: boolean; phase: PlaybackPhase; reason: string }
export interface PlaybackEnvironment {
  hidden: boolean; enabled: boolean; refreshing: boolean; error: boolean;
  key: string; presentation?: RadarPresentation; remaining: number;
}
/** One foreground timer, no catch-up/prefetch. Transport completion is NOT pixel confirmation. */
export class RadarPlayback {
  private frames: RadarFrame[] = [];
  private index = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private nextAt = 0;
  private state: PlaybackSnapshot = { playing: false, phase: 'paused', reason: 'user' };
  private listeners = new Set<() => void>();
  constructor(private environment: () => PlaybackEnvironment,
    private selectIndex: (index: number) => void, private intent: (playing: boolean) => void) {}
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private publish(phase: PlaybackPhase, reason: string, playing = this.state.playing) {
    if (this.state.phase === phase && this.state.reason === reason && this.state.playing === playing) return;
    this.state = { playing, phase, reason }; this.listeners.forEach(fn => fn());
  }
  private clear() { if (this.timer !== undefined) clearTimeout(this.timer); this.timer = undefined; }
  private schedule(delay: number) { this.clear(); this.timer = setTimeout(this.tick, delay); }
  setFrames(frames: RadarFrame[]) {
    const selected = this.frames[this.index]?.time;
    const match = selected == null ? -1 : frames.findIndex(f => f.time === selected);
    this.frames = frames;
    this.index = match >= 0 ? match : selected == null ? Math.max(0, frames.length - 1) : Math.min(this.index, Math.max(0, frames.length - 1));
    this.selectIndex(this.index);
    // Preserve play intent/selected source time across metadata refresh. No timer reset.
    if (!frames.length) this.stop('no-frames', 'unavailable');
  }
  play = () => {
    if (this.frames.length < 2 || !this.environment().enabled) return;
    this.intent(true); this.publish('buffering', 'starting', true);
    this.nextAt = Date.now() + FIRST_FRAME_DELAY_MS;
    if (this.environment().hidden) this.publish('suspended', 'background');
    else this.schedule(FIRST_FRAME_DELAY_MS);
  };
  stop = (reason = 'user', phase: PlaybackPhase = 'paused') => {
    this.clear(); this.intent(false); this.publish(phase, reason, false);
  };
  toggle = () => this.state.playing ? this.stop() : this.play();
  scrub = (index: number) => {
    this.stop('manual'); this.index = Math.max(0, Math.min(index, this.frames.length - 1)); this.selectIndex(this.index);
  };
  visibility = () => {
    this.clear(); if (!this.state.playing) return;
    if (this.environment().hidden) this.publish('suspended', 'background');
    else { this.publish('buffering', 'resume'); this.nextAt = Date.now() + FIRST_FRAME_DELAY_MS; this.schedule(FIRST_FRAME_DELAY_MS); }
  };
  private tick = () => {
    this.timer = undefined; if (!this.state.playing) return;
    const e = this.environment();
    if (e.hidden) { this.publish('suspended', 'background'); return; }
    if (!e.enabled || this.frames.length < 2) { this.stop('inactive', 'unavailable'); return; }
    if (e.error) { this.stop('metadata-failed', 'failed'); return; }
    const p = e.presentation?.key === e.key ? e.presentation : undefined;
    if (p?.status === 'failed') { this.stop('tiles-failed', 'failed'); return; }
    if (e.remaining === 0) this.publish('budget', 'rolling-minute');
    else if (e.refreshing || !p || p.status !== 'unverified' || p.evidence === 'no-current-frame-tiles-confirmed') this.publish('buffering', 'tiles-unverified');
    else {
      this.publish('playing', 'transport-qualified-not-pixels');
      if (Date.now() >= this.nextAt) {
        this.index = (this.index + 1) % this.frames.length;
        this.nextAt = Date.now() + FRAME_INTERVAL_MS;
        this.selectIndex(this.index);
        this.publish('buffering', 'next-selected-frame');
      }
    }
    this.schedule(CHECK_MS);
  };
  dispose = () => { this.clear(); this.listeners.clear(); };
}
