import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { freshness, RefreshGate } from '../reliability/freshness';
import { useSourceClock } from '../reliability/useFreshness';
import { RadarPresentationGate, registerRadarGate, taggedRadarUrl, radarTransport } from '../radar/presentation';
const at = Date.parse('2026-10-11T06:00:00Z');
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe('R02 source validity and request admission', () => {
  it.each(['weather', 'air'] as const)('new fetch cannot renew expired %s source data', kind => {
    expect(freshness(at / 1000 - 10801, at / 1000, kind, false, false, at).assessmentAllowed).toBe(false);
    expect(freshness(at / 1000 - 10801, at / 1000, kind, false, false, at).state).toBe('expired');
  });
  it('distinguishes usable cache, refresh, failure, missing and future timestamps', () => {
    expect(freshness(at / 1000 - 60, at / 1000 - 601, 'weather', false, false, at).state).toBe('cached');
    expect(freshness(at / 1000 - 60, at / 1000, 'weather', true, false, at).state).toBe('refreshing');
    expect(freshness(at / 1000 - 60, at / 1000, 'weather', false, true, at).assessmentAllowed).toBe(false);
    expect(freshness(null, at / 1000, 'weather', false, false, at).state).toBe('unavailable');
    expect(freshness(at / 1000 + 600, at / 1000, 'weather', false, false, at).assessmentAllowed).toBe(false);
  });
  it('expires exactly at the source deadline with no user interaction', () => {
    vi.useFakeTimers(); vi.setSystemTime(at);
    const { result } = renderHook(() => useSourceClock(at / 1000, at / 1000));
    act(() => vi.advanceTimersByTime(7200001));
    expect(freshness(at / 1000, at / 1000, 'weather', false, false, result.current).state).toBe('expired');
    act(() => vi.advanceTimersByTime(3600001));
    expect(freshness(at / 1000, at / 1000, 'air', false, false, result.current).state).toBe('expired');
  });
  it('reevaluates suspended clocks on foreground and online events', () => {
    vi.useFakeTimers(); vi.setSystemTime(at);
    const { result } = renderHook(() => useSourceClock(at / 1000, at / 1000));
    vi.setSystemTime(at + 10800001);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current).toBe(at + 10800001);
    vi.setSystemTime(at + 10800002);
    act(() => window.dispatchEvent(new Event('online')));
    expect(result.current).toBe(at + 10800002);
  });
  it('bounds foreground/manual requests independently by location', () => {
    const gate = new RefreshGate(); gate.record('TH', at);
    expect(gate.allow('TH', false, at + 599999)).toBe(false);
    expect(gate.allow('TH', false, at + 600000)).toBe(true);
    expect(gate.allow('TH', true, at + 29999)).toBe(false);
    expect(gate.allow('TH', true, at + 30000)).toBe(true);
    expect(gate.allow('CN-XIAN', false, at + 1)).toBe(true);
  });
});
describe('R01 honest frame lifecycle', () => {
  it('never treats selected/loading/idle as confirmed displayed imagery', () => {
    const gate = new RadarPresentationGate(vi.fn()); gate.begin('a', 100, true);
    const generation = gate.generation, request = gate.start(generation);
    gate.settle('idle'); expect(gate.state.status).toBe('pending');
    gate.finish(generation, request, 'success'); gate.settle('renderer-idle');
    expect(gate.state.status).toBe('unverified'); expect(gate.state.displayedTime).toBeNull();
    expect(gate.state.requestedTime).toBe(100);
  });
  it('rejects failed imagery and never labels retained pixels with a new time', () => {
    const gate = new RadarPresentationGate(vi.fn()); gate.begin('a', 100, true);
    const request = gate.start(gate.generation); gate.finish(gate.generation, request, 'failed');
    gate.settle('idle'); expect(gate.state.status).toBe('failed'); expect(gate.state.displayedTime).toBeNull();
  });
  it('ignores late success and failure from superseded frame/theme/location generations', () => {
    const gate = new RadarPresentationGate(vi.fn()); gate.begin('a', 100, true);
    const old = gate.generation, request = gate.start(old);
    gate.begin('b', 200, true); gate.finish(old, request, 'failed'); gate.finish(old, request, 'success');
    expect(gate.state.status).toBe('pending'); expect(gate.state.requestedTime).toBe(200);
  });
  it('invalidates on viewport/background/layer transitions and ignores aborted callbacks', () => {
    const gate = new RadarPresentationGate(vi.fn()); gate.begin('a', 100, true);
    gate.settle('idle'); gate.viewport(); expect(gate.state.status).toBe('pending');
    const generation = gate.generation, request = gate.start(generation);
    gate.suspend(); gate.finish(generation, request, 'success');
    expect(gate.state.status).toBe('cancelled');
    gate.begin('b', 100, false); expect(gate.state.displayedTime).toBeNull();
  });
  it('strips local generation fragments before provider transport and cache lookup', () => {
    const gate = new RadarPresentationGate(vi.fn()); gate.begin('a', 100, true);
    const registration = registerRadarGate(gate);
    const url = 'https://tilecache.rainviewer.com/v2/radar/100/512/4/12/7/2/1_1.png';
    const request = radarTransport(taggedRadarUrl(url.replace('https:', 'wwradar:'), registration.id, gate.generation));
    expect(request.url).toBe(url); request.finish('success'); gate.settle('idle');
    expect(gate.state.status).toBe('unverified'); registration.dispose();
  });
});
