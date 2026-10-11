import type { MapProps } from '../maps/MapCanvas';
export type RadarPresentationStatus = 'pending' | 'unverified' | 'failed' | 'cancelled';
export interface RadarPresentation {
  key: string;
  requestedTime: number | null;
  status: RadarPresentationStatus;
  /** No public renderer event proves complete viewport pixel coverage. Never infer this from idle. */
  displayedTime: null;
  evidence: string;
}
export function radarRequestKey(p: Pick<MapProps, 'frame' | 'location' | 'theme' | 'layers'>) {
  return JSON.stringify([p.frame?.path, p.frame?.time, p.location.latitude, p.location.longitude, p.theme, p.layers.radar]);
}
export class RadarPresentationGate {
  generation = 0;
  state: RadarPresentation = { key: '', requestedTime: null, status: 'cancelled', displayedTime: null, evidence: 'inactive' };
  private pending = new Set<number>();
  private successes = 0;
  private sequence = 0;
  constructor(private emit: (state: RadarPresentation) => void) {}
  begin(key: string, time: number | null, active: boolean) {
    if (key === this.state.key && active === (this.state.status !== 'cancelled')) return;
    this.generation++; this.pending.clear(); this.successes = 0;
    this.state = { key, requestedTime: time, status: active ? 'pending' : 'cancelled', displayedTime: null, evidence: active ? 'request-selected' : 'inactive' };
    this.emit(this.state);
  }
  start(generation: number) {
    const id = ++this.sequence;
    if (generation === this.generation && this.state.status !== 'cancelled') {
      this.pending.add(id);
      if (this.state.status !== 'failed') this.publish('pending', 'tile-loading');
    }
    return id;
  }
  finish(generation: number, id: number, result: 'success' | 'failed' | 'aborted') {
    if (generation !== this.generation || !this.pending.delete(id)) return;
    if (result === 'success') this.successes++;
    if (result === 'failed') this.publish('failed', 'tile-fetch-or-decode-failed');
  }
  viewport() {
    if (this.state.status !== 'cancelled' && this.state.status !== 'failed') this.publish('pending', 'viewport-changing');
  }
  settle(evidence: string) {
    if (this.state.status === 'cancelled' || this.state.status === 'failed' || this.pending.size) return;
    // Readiness is deliberately qualified: source idle/load may include missing or fallback tiles.
    this.publish('unverified', this.successes ? evidence : 'no-current-frame-tiles-confirmed');
  }
  reject(evidence: string) { if (this.state.status !== 'cancelled') this.publish('failed', evidence); }
  suspend() { this.generation++; this.pending.clear(); this.publish('cancelled', 'background-or-unmounted'); }
  private publish(status: RadarPresentationStatus, evidence: string) {
    if (status === this.state.status && evidence === this.state.evidence) return;
    this.state = { ...this.state, status, evidence }; this.emit(this.state);
  }
}
// Fragment is local instrumentation only: removed before cache lookup/network; provider URL stays unchanged.
let nextId = 0;
const gates = new Map<string, RadarPresentationGate>();
export function registerRadarGate(gate: RadarPresentationGate) {
  const id = String(++nextId); gates.set(id, gate);
  return { id, dispose: () => gates.delete(id) };
}
export function taggedRadarUrl(url: string, id: string, generation: number) { return `${url}#ww=${id}.${generation}`; }
export function radarTransport(url: string) {
  const parsed = new URL(url.replace(/^wwradar:/, 'https:'));
  const match = parsed.hash.match(/^#ww=(\d+)\.(\d+)$/);
  parsed.hash = '';
  const gate = match ? gates.get(match[1]!) : undefined;
  const generation = Number(match?.[2]);
  const request = gate?.start(generation);
  return { url: parsed.toString(), finish: (result: 'success' | 'failed' | 'aborted') => {
    if (request != null) gate?.finish(generation, request, result);
  } };
}

/** Status updates belong to radar controls; they must not rerender App/forecast/map on every gate event. */
export class RadarPresentationStore {
  private state: RadarPresentation | undefined;
  private listeners = new Set<() => void>();
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  report = (state: RadarPresentation) => {
    this.state = state;
    for (const listener of this.listeners) listener();
  };
}
