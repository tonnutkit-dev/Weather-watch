import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

type Kind = 'weather' | 'air';
type Reply = 200 | 503 | 'hang';
type Event = { kind: string; atMs: number; attempt?: number; reply?: Reply; outcome?: string };
const fixture = JSON.parse(readFileSync('diagnostics-p0/provider-fixtures.json', 'utf8'));
const origin = 'http://127.0.0.1:4173';
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=', 'base64');

function currentBody(kind: Kind) {
  const body = structuredClone(fixture[kind].body);
  const now = Math.floor(Date.now() / 1000);
  body.current.time = now;
  body.hourly.time = body.hourly.time.map((_: number, i: number) => now + i * 3600);
  if (kind === 'weather') body.daily.time = body.daily.time.map((_: number, i: number) => now + i * 86400);
  return body;
}

const test = base.extend<{ lab: {
  events: Event[]; counts: Record<Kind, number>; forbidden: string[];
  plan: (weather: Reply[], air?: Reply[]) => void;
} }>({
  lab: [async ({ context, page }, use, info) => {
    const start = performance.now(), events: Event[] = [], forbidden: string[] = [];
    const counts = { weather: 0, air: 0 };
    let plans: Record<Kind, Reply[]> = { weather: [200], air: [200] };
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.name));
    await page.addInitScript(() => {
      (window as any).__WW_LAB_UNHANDLED = [];
      window.addEventListener('unhandledrejection', e => (window as any).__WW_LAB_UNHANDLED.push(e.reason?.name || 'rejection'));
    });
    page.on('requestfailed', request => {
      const host = new URL(request.url()).hostname;
      if (host === 'api.open-meteo.com' || host === 'air-quality-api.open-meteo.com') {
        events.push({ kind: host === 'api.open-meteo.com' ? 'weather' : 'air',
          atMs: performance.now() - start, outcome: 'browser-request-cancelled' });
      }
    });
    // All context traffic is intercepted. No remote route may continue/fetch.
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      const kind = url.hostname === 'api.open-meteo.com' ? 'weather'
        : url.hostname === 'air-quality-api.open-meteo.com' ? 'air' : null;
      if (kind) {
        const attempt = ++counts[kind], list = plans[kind];
        const reply = list[Math.min(attempt - 1, list.length - 1)];
        events.push({ kind, attempt, reply, atMs: performance.now() - start });
        if (reply === 'hang') return; // Route stays paused until actual app AbortController deadline.
        await route.fulfill(reply === 200 ? { status: 200, json: currentBody(kind) }
          : { status: 503, json: { error: true, reason: 'LAB synthetic unavailable' } });
        return;
      }
      if (url.hostname === 'tiles.openfreemap.org' && url.pathname.startsWith('/styles/')) {
        await route.fulfill({ json: { version: 8, sources: {},
          glyphs: origin + '/lab-glyphs/{fontstack}/{range}.pbf',
          layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#ecede7' } }] } });
        return;
      }
      if (url.hostname === 'api.rainviewer.com') {
        const now = Math.floor(Date.now() / 1000);
        await route.fulfill({ json: { version: '2.0', generated: now, host: 'https://tilecache.rainviewer.com',
          radar: { past: [{ time: now - 600, path: '/lab/radar' }], nowcast: [] } } });
        return;
      }
      if (url.hostname === 'tilecache.rainviewer.com') {
        await route.fulfill({ contentType: 'image/png', body: pixel }); return;
      }
      if (url.origin === origin && url.pathname.startsWith('/lab-glyphs/')) {
        await route.fulfill({ contentType: 'application/x-protobuf', body: Buffer.alloc(0) }); return;
      }
      if (url.origin === origin) { await route.continue(); return; }
      forbidden.push('unexpected-remote-' + route.request().resourceType());
      await route.abort('blockedbyclient'); // No URL, address, headers or credentials retained.
    });
    try {
      await use({ events, counts, forbidden, plan: (weather, air = [200]) => { plans = { weather, air }; } });
    } finally {
      const state = await page.locator('.situation-panel').evaluate(el => ({
        verdict: el.getAttribute('data-verdict'), weather: el.getAttribute('data-weather-freshness'),
        air: el.getAttribute('data-air-freshness'),
      })).catch(() => null);
      const unhandled = await page.evaluate(() => (window as any).__WW_LAB_UNHANDLED || []).catch(() => []);
      await info.attach('redacted-lab-events', { body: JSON.stringify({
        scope: 'LAB ONLY, synthetic responses; no remote request continued; background-only MapLibre style',
        test: info.title, status: info.status, counts, events, forbidden, errors, unhandled, state,
      }, null, 2), contentType: 'application/json' });
      expect(forbidden, 'No unexpected remote resource attempted').toEqual([]);
      expect(errors, 'No uncaught page exception').toEqual([]);
      expect(unhandled, 'No unhandled rejection').toEqual([]);
    }
  }, { auto: true }],
});

async function usableMap(page: Page) {
  const map = page.locator('.map-canvas');
  await expect(map).toHaveAttribute('data-map-engine', 'maplibre');
  await expect(map).toHaveAttribute('data-map-status', 'ready');
  const canvas = await page.locator('.maplibregl-canvas').elementHandle();
  const center = await map.getAttribute('data-map-center'), box = await map.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * .4, box!.y + 105);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * .4 + 65, box!.y + 120, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => map.getAttribute('data-map-center')).not.toBe(center);
  await page.getByRole('button', { name: 'กลับไปยังตำแหน่งที่เลือก', exact: true }).click();
  expect(await page.evaluate(el => el === document.querySelector('.maplibregl-canvas'), canvas)).toBe(true);
  await expect(page.locator('.official-alert')).toContainText('ยังไม่เชื่อมต่อ');
  await expect(page.locator('.official-alert')).toContainText('ยังไม่ได้เชื่อมต่อประกาศอัตโนมัติ');
}

async function unavailable(page: Page) {
  await expect(page.getByText('โหลดข้อมูลอากาศไม่ได้', { exact: true })).toBeVisible({ timeout: 35000 });
  await expect(page.locator('.situation-panel')).toHaveAttribute('data-verdict', 'Unknown');
  await expect(page.locator('.situation-panel')).toHaveAttribute('data-weather-freshness', 'unavailable');
  await expect(page.getByTestId('temperature')).toHaveCount(0);
  await expect(page.locator('.weather-overview').getByRole('button', { name: 'ลองใหม่', exact: true })).toBeVisible();
}

test('LAB A weather 503 twice and AQI 200 preserves truthful failure', async ({ page, lab }) => {
  lab.plan([503, 503]); await page.goto('./'); await unavailable(page);
  expect(lab.counts).toEqual({ weather: 2, air: 1 });
  const attempts = lab.events.filter(e => e.kind === 'weather' && e.attempt);
  expect(attempts[1].atMs - attempts[0].atMs).toBeGreaterThanOrEqual(950);
  await expect(page.locator('.situation-panel')).toHaveAttribute('data-air-freshness', 'fresh');
  await expect(page.locator('.weather-overview')).toContainText('503');
  await usableMap(page);
});

test('LAB B both providers hang for both unchanged real 12s deadlines', async ({ page, lab }) => {
  lab.plan(['hang', 'hang'], ['hang', 'hang']); await page.goto('./'); await unavailable(page);
  expect(lab.counts).toEqual({ weather: 2, air: 2 });
  await expect(page.locator('.situation-panel')).toHaveAttribute('data-air-freshness', 'unavailable');
  for (const kind of ['weather', 'air']) {
    const requests = lab.events.filter(e => e.kind === kind && e.attempt);
    expect(requests[1].atMs - requests[0].atMs).toBeGreaterThanOrEqual(12900);
    expect(requests[1].atMs - requests[0].atMs).toBeLessThan(16000);
    const cancelled = lab.events.filter(e => e.kind === kind && e.outcome);
    expect(cancelled).toHaveLength(2);
    for (let i = 0; i < 2; i++) expect(cancelled[i].atMs - requests[i].atMs).toBeGreaterThanOrEqual(11900);
  }
  await expect(page.locator('.weather-overview')).toContainText('แหล่งข้อมูลตอบช้าเกินไป');
  await usableMap(page);
});

test('LAB C 503 then 200 recovers using the existing one retry', async ({ page, lab }) => {
  lab.plan([503, 200]); await page.goto('./');
  await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/);
  expect(lab.counts).toEqual({ weather: 2, air: 1 });
  await expect(page.locator('.situation-panel')).toHaveAttribute('data-weather-freshness', 'fresh');
  await expect(page.locator('.situation-panel')).not.toHaveAttribute('data-verdict', 'Unknown');
  await expect(page.getByText('โหลดข้อมูลอากาศไม่ได้', { exact: true })).toHaveCount(0);
  await usableMap(page);
});

test('LAB D real deadline then 200 recovers without extending timeout', async ({ page, lab }) => {
  lab.plan(['hang', 200], ['hang', 200]); await page.goto('./');
  await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/, { timeout: 25000 });
  expect(lab.counts).toEqual({ weather: 2, air: 2 });
  for (const kind of ['weather', 'air']) {
    const requests = lab.events.filter(e => e.kind === kind && e.attempt);
    expect(requests[1].atMs - requests[0].atMs).toBeGreaterThanOrEqual(12900);
    expect(requests[1].atMs - requests[0].atMs).toBeLessThan(16000);
  }
  await expect(page.locator('.situation-panel')).toHaveAttribute('data-weather-freshness', 'fresh');
  await expect(page.locator('.situation-panel')).not.toHaveAttribute('data-verdict', 'Unknown');
  await usableMap(page);
});

test('LAB E failed cached refresh retains honesty and usable manual recovery', async ({ page, lab }) => {
  // Only E advances the automatic 10-minute admission clock. B/D use real clocks.
  await page.clock.install(); lab.plan([200, 503, 503, 200]); await page.goto('./');
  await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/);
  await expect(page.locator('.situation-panel')).not.toHaveAttribute('data-verdict', 'Unknown');
  await usableMap(page);
  const original = await page.getByTestId('temperature').innerText();
  const canvas = await page.locator('.maplibregl-canvas').elementHandle();
  const overview = await page.locator('.weather-overview').boundingBox();
  await page.clock.fastForward(601000);
  await expect(page.locator('.situation-panel')).toHaveAttribute('data-weather-freshness', 'refresh-failed');
  await expect(page.locator('.situation-panel')).toHaveAttribute('data-verdict', 'Unknown');
  await expect(page.getByTestId('temperature')).toHaveText(original);
  await expect(page.locator('.overview-freshness')).toContainText('อัปเดตไม่สำเร็จ');
  expect(lab.counts.weather).toBe(3);
  const retry = page.locator('.weather-overview').getByRole('button', { name: 'ลองใหม่', exact: true });
  await expect(retry).toBeVisible();
  const target = await retry.boundingBox(); expect(target!.width).toBeGreaterThanOrEqual(44); expect(target!.height).toBeGreaterThanOrEqual(44);
  const failedOverview = await page.locator('.weather-overview').boundingBox();
  expect(failedOverview!.height).toBe(overview!.height);
  expect(target!.x + target!.width).toBeLessThanOrEqual(375);
  await usableMap(page);
  await page.clock.fastForward(31000); // Respect existing manual cooldown after last attempt.
  await retry.click();
  await expect(page.locator('.situation-panel')).toHaveAttribute('data-weather-freshness', 'fresh');
  await expect(page.locator('.situation-panel')).not.toHaveAttribute('data-verdict', 'Unknown');
  expect(lab.counts.weather).toBe(4);
  expect(await page.evaluate(el => el === document.querySelector('.maplibregl-canvas'), canvas)).toBe(true);
  await expect(retry).toHaveCount(0);
});
