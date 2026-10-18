import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { RadarPlayback, FIRST_FRAME_DELAY_MS, FRAME_INTERVAL_MS, READY_DWELL_MS, type PlaybackEnvironment } from '../radar/playback';
import { RadarPresentationStore } from '../radar/presentation';
import { useRadarPlayback } from '../radar/usePlayback';
import { normalizeRadar } from '../providers/radar';
const frames = [{ time: 100, path: '/a' }, { time: 200, path: '/b' }, { time: 300, path: '/c' }];
function fixture() {
  const selected = vi.fn(), intent = vi.fn();
  const e: PlaybackEnvironment = { hidden: false, enabled: true, refreshing: false, error: false, remaining: 80, key: 'current',
    presentation: { key: 'current', requestedTime: 300, displayedTime: null, status: 'unverified', evidence: 'current-generation-transport-complete;viewport-pixels-unverified' } };
  const player = new RadarPlayback(() => e, selected, intent); player.setFrames(frames); selected.mockClear();
  return { player, e, selected, intent };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1000000); });
afterEach(() => { vi.useRealTimers(); });
describe('radar automatic playback contract', () => {
  it('reproduces legacy first-frame silence for 2s, then advancement only at15s', () => {
    const select = vi.fn(); const timer = setInterval(select, 15000);
    vi.advanceTimersByTime(2000); expect(select).not.toHaveBeenCalled();
    vi.advanceTimersByTime(13000); expect(select).toHaveBeenCalledTimes(1); clearInterval(timer);
  });
  it('responds immediately, advances at1.5s, loops last→first and continues every2.5s', () => {
    const { player, selected, intent } = fixture(); player.play();
    expect(intent).toHaveBeenLastCalledWith(true); expect(player.getSnapshot().playing).toBe(true);
    vi.advanceTimersByTime(1499); expect(selected).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(selected).toHaveBeenLastCalledWith(0);
    vi.advanceTimersByTime(FRAME_INTERVAL_MS); expect(selected).toHaveBeenLastCalledWith(1);
    player.dispose(); expect(vi.getTimerCount()).toBe(0);
  });
  it('pause stops every pending timer and manual scrub pauses at the chosen index', () => {
    const { player, selected } = fixture(); player.play(); player.stop();
    vi.advanceTimersByTime(30000); expect(selected).not.toHaveBeenCalled();
    player.play(); player.scrub(1); expect(selected).toHaveBeenLastCalledWith(1); expect(player.getSnapshot().playing).toBe(false);
    vi.advanceTimersByTime(30000); expect(selected).toHaveBeenCalledTimes(1);
    player.play(); vi.advanceTimersByTime(FIRST_FRAME_DELAY_MS); expect(selected).toHaveBeenLastCalledWith(2); player.dispose();
  });
  it('loading or mismatched/no-tile evidence waits rather than advancing an unready selection', () => {
    const { player, selected, e } = fixture(); e.presentation!.status = 'pending'; player.play();
    vi.advanceTimersByTime(10000); expect(selected).not.toHaveBeenCalled(); expect(player.getSnapshot().phase).toBe('buffering');
    e.presentation!.status = 'unverified'; e.presentation!.evidence = 'no-current-frame-tiles-confirmed';
    vi.advanceTimersByTime(5000); expect(selected).not.toHaveBeenCalled();
    e.presentation!.key = 'superseded'; e.presentation!.evidence = 'transport-complete'; vi.advanceTimersByTime(5000); expect(selected).not.toHaveBeenCalled();
    e.presentation!.key = e.key; vi.advanceTimersByTime(500); expect(selected).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000); expect(selected).toHaveBeenCalledTimes(1);
    expect(e.presentation!.displayedTime).toBeNull(); player.dispose();
  });
  it('failed tiles stop intent and do not pretend playback succeeded', () => {
    const { player, selected, e } = fixture(); player.play(); e.presentation!.status = 'failed';
    vi.advanceTimersByTime(1500); expect(player.getSnapshot()).toMatchObject({ playing: false, phase: 'failed', reason: 'tiles-failed' });
    expect(selected).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it('zero remaining budget holds the frame until admission returns', () => {
    const { player, selected, e } = fixture(); e.presentation!.status='pending'; player.play(); e.remaining = 0;
    vi.advanceTimersByTime(30000); expect(selected).not.toHaveBeenCalled(); expect(player.getSnapshot().phase).toBe('budget');
    e.remaining = 1; e.presentation!.status='unverified'; vi.advanceTimersByTime(1500); expect(selected).toHaveBeenCalledTimes(1); player.dispose();
  });
  it('qualified cached frames can advance at zero network capacity; missing imagery then waits', () => {
    const { player, selected, e } = fixture(); e.remaining=0; player.play();
    vi.advanceTimersByTime(1500); expect(selected).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(FRAME_INTERVAL_MS); expect(selected).toHaveBeenCalledTimes(2);
    e.presentation!.status='pending'; vi.advanceTimersByTime(10000);
    expect(selected).toHaveBeenCalledTimes(2); expect(player.getSnapshot().phase).toBe('budget'); player.dispose();
  });
  it('background clears the timer; resume waits, never catches up missed frames', () => {
    const { player, selected, e } = fixture(); player.play(); e.hidden = true; player.visibility();
    expect(player.getSnapshot()).toMatchObject({ phase: 'suspended', playing: true }); expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(3600000); expect(selected).not.toHaveBeenCalled();
    e.hidden = false; player.visibility(); vi.advanceTimersByTime(1499); expect(selected).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(selected).toHaveBeenCalledTimes(1); player.dispose();
  });
  it('refresh preserves intent/source time and waits for metadata completion', () => {
    const { player, selected, e } = fixture(); player.scrub(1); player.play(); e.refreshing = true;
    player.setFrames([...frames, { time: 400, path: '/d' }]); selected.mockClear();
    vi.advanceTimersByTime(6000); expect(selected).not.toHaveBeenCalled(); expect(player.getSnapshot().playing).toBe(true);
    e.refreshing = false; vi.advanceTimersByTime(1500); expect(selected).toHaveBeenLastCalledWith(2); player.dispose();
  });

  it('holds a late-qualified real frame briefly before advancing instead of flashing through it', () => {
    const { player, selected, e } = fixture(); e.presentation!.status = 'pending'; player.play();
    vi.advanceTimersByTime(10000); expect(selected).not.toHaveBeenCalled();
    e.presentation!.status = 'unverified'; vi.advanceTimersByTime(500); expect(selected).not.toHaveBeenCalled();
    vi.advanceTimersByTime(READY_DWELL_MS - 1); expect(selected).not.toHaveBeenCalled();
    vi.advanceTimersByTime(501); expect(selected).toHaveBeenCalledTimes(1); player.dispose();
  });
  it('rapid viewport/theme generations invalidate old readiness and preserve qualified timestamps', () => {
    const { player, selected, e } = fixture(); player.play();
    e.key = 'new-theme-and-viewport'; vi.advanceTimersByTime(5000); expect(selected).not.toHaveBeenCalled();
    e.presentation = { ...e.presentation!, key:e.key, status:'pending' }; vi.advanceTimersByTime(5000); expect(selected).not.toHaveBeenCalled();
    e.presentation.status = 'unverified'; vi.advanceTimersByTime(500); expect(selected).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000); expect(selected).toHaveBeenCalledTimes(1); expect(e.presentation.displayedTime).toBeNull(); player.dispose();
  });
  it('a long buffer never catches up multiple missed frames, and repeated ticks do not notify stable status', () => {
    const { player, selected, e } = fixture(); const changed = vi.fn(); player.subscribe(changed);
    e.presentation!.status = 'pending'; player.play(); vi.advanceTimersByTime(60000);
    expect(selected).not.toHaveBeenCalled(); expect(changed.mock.calls.length).toBeLessThanOrEqual(2);
    e.presentation!.status = 'unverified'; vi.advanceTimersByTime(1500); expect(selected).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(FRAME_INTERVAL_MS); expect(selected).toHaveBeenCalledTimes(2); player.dispose();
  });
  it('inactive layer, one-frame history or metadata failure does not run a loop', () => {
    const { player, e } = fixture(); e.enabled = false; player.play(); expect(vi.getTimerCount()).toBe(0);
    e.enabled = true; player.setFrames(frames.slice(0,1)); player.play(); expect(vi.getTimerCount()).toBe(0);
    player.setFrames(frames); player.play(); e.error = true; vi.advanceTimersByTime(1500);
    expect(player.getSnapshot().phase).toBe('failed'); expect(vi.getTimerCount()).toBe(0);
  });
});
// Hook+controls harness validates real React timer/visibility cleanup across sheet-like rerenders.
it('React mobile sheet transitions preserve playback; visibility listener is cleaned up', async () => {
  const store = new RadarPresentationStore(); store.report({ key: 'key', requestedTime: 300, displayedTime: null, status: 'unverified', evidence: 'transport-complete' });
  const radar = normalizeRadar({ host: 'https://tilecache.rainviewer.com', radar: { past: frames.map(f => ({ ...f, path: `/v2/radar/${f.time}` })) } }, 10000);
  function Harness({ sheet }: { sheet: string }) {
    const p = useRadarPlayback(radar, true, false, false, () => 'key', store);
    return <><span>{sheet}</span><output data-testid="index">{p.index}</output><button onClick={p.controller.toggle}>{p.playing ? 'pause' : 'play'}</button></>;
  }
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const view = render(<Harness sheet="collapsed" />); fireEvent.click(screen.getByText('play'));
  view.rerender(<Harness sheet="half" />); view.rerender(<Harness sheet="expanded" />);
  expect(screen.getByText('pause')).toBeInTheDocument();
  await act(async () => { vi.advanceTimersByTime(1500); }); expect(screen.getByTestId('index')).toHaveTextContent('0');
  hidden.mockReturnValue(true); fireEvent(document, new Event('visibilitychange')); expect(vi.getTimerCount()).toBe(0);
  hidden.mockReturnValue(false); fireEvent(document, new Event('visibilitychange')); expect(vi.getTimerCount()).toBe(1);
  view.unmount(); expect(vi.getTimerCount()).toBe(0);
  fireEvent(document, new Event('visibilitychange')); expect(vi.getTimerCount()).toBe(0);
});
