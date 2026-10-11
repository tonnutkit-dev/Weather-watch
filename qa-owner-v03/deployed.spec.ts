import { test, expect, type Page } from '@playwright/test';
const approved = '4b3548fa49abd9475547fc6e8336a1b854ad6952';
async function snapshot(page: Page) {
  return page.evaluate(() => ({
    title: document.title,
    temperature: document.querySelector('[data-testid="temperature"]')?.textContent,
    weatherFreshness: document.querySelector('.situation-panel')?.getAttribute('data-weather-freshness'),
    airFreshness: document.querySelector('.situation-panel')?.getAttribute('data-air-freshness'),
    verdict: document.querySelector('.situation-panel')?.getAttribute('data-verdict'),
    selectedTime: document.querySelector('[data-testid="radar-time"]')?.textContent,
    radarStatus: document.querySelector('[data-testid="radar-presentation"]')?.getAttribute('data-status'),
    displayedFrame: document.querySelector('.map-canvas')?.getAttribute('data-radar-displayed-frame'),
    mapEngine: document.querySelector('.map-canvas')?.getAttribute('data-map-engine'),
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
}
async function appearance(page: Page, dark: boolean) {
  await page.getByRole('button', { name: 'การแสดงผลและตั้งค่า', exact: true }).click();
  await page.getByRole('button', { name: dark ? 'มืด' : 'สว่าง', exact: true }).click();
  await page.getByRole('button', { name: 'ปิด', exact: true }).click();
  await expect(page.locator('.map-canvas')).toHaveAttribute('data-theme', dark ? 'dark' : 'light', { timeout: 30000 });
}
for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
  test.describe(`${viewport.width} owner HTTPS QA`, () => {
    test.use({ viewport, hasTouch: viewport.width < 760, isMobile: viewport.width < 760 });
    test('live providers, qualified radar, sheet, theme and location', async ({ page, request }, info) => {
      const pageErrors: string[] = [], consoleErrors: string[] = [], assetErrors: string[] = [];
      let realRadarImages = 0;
      page.on('pageerror', e => pageErrors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('response', r => {
        const url = new URL(r.url());
        if (url.origin === new URL(info.project.use.baseURL!).origin && r.status() >= 400) assetErrors.push(`${r.status()} ${url.pathname}`);
        if (url.hostname.endsWith('rainviewer.com') && url.pathname.includes('/radar/') && url.pathname.endsWith('.png') && r.ok()) realRadarImages++;
      });
      const release = await request.get('release.json'); expect(release.status()).toBe(200);
      expect(await release.json()).toMatchObject({ commit: approved, base: '/', channel: 'isolated-owner-qa', diagnosticFixturesIncluded: false });
      const response = await page.goto('./'); expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle('Weather Watch V0.3 P0 · Isolated Owner QA');
      await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/, { timeout: 45000 });
      await expect(page.locator('.map-canvas')).toHaveAttribute('data-map-status', 'ready', { timeout: 30000 });
      await expect(page.locator('.map-canvas')).toHaveAttribute('data-map-engine', 'maplibre');
      await expect.poll(() => realRadarImages, { timeout: 40000 }).toBeGreaterThan(0);
      await expect(page.getByTestId('radar-time')).toContainText('เลือก');
      await expect(page.getByTestId('radar-presentation')).toHaveAttribute('data-status', /pending|unverified|failed/);
      expect((await snapshot(page)).displayedFrame).toBe('');
      await info.attach(`${viewport.width}-light`, { body: await page.screenshot(), contentType: 'image/png' });
      const before = await page.locator('.map-canvas').getAttribute('data-radar-frame');
      await page.getByRole('button', { name: 'เล่นเรดาร์ย้อนหลัง', exact: true }).click();
      await expect.poll(() => page.locator('.map-canvas').getAttribute('data-radar-frame'), { timeout: 20000 }).not.toBe(before);
      await page.getByRole('button', { name: 'หยุดเรดาร์', exact: true }).click();
      if (viewport.width < 760) {
        await page.getByRole('button', { name: 'ขยายแผง', exact: true }).click(); await expect(page.locator('.sheet-half')).toBeVisible();
        await page.getByRole('button', { name: 'ขยายแผง', exact: true }).click(); await expect(page.locator('.sheet-expanded')).toBeVisible();
        await page.getByRole('button', { name: 'ยุบแผง', exact: true }).click();
        await page.getByRole('button', { name: 'ยุบแผง', exact: true }).click(); await expect(page.locator('.sheet-collapsed')).toBeVisible();
      }
      await appearance(page, true);
      await info.attach(`${viewport.width}-dark`, { body: await page.screenshot(), contentType: 'image/png' });
      await appearance(page, false);
      const cityResponse = page.waitForResponse(r => r.url().startsWith('https://api.open-meteo.com/v1/forecast') && new URL(r.url()).searchParams.get('latitude') === '34.2658', { timeout: 45000 });
      await page.getByRole('button', { name: 'ค้นหาตำแหน่ง', exact: true }).click();
      await page.locator('.secondary-locations summary').click();
      await page.locator('.china-options button').filter({ hasText: 'ซีอาน' }).click();
      expect((await cityResponse).status()).toBe(200);
      await expect(page.getByRole('heading', { name: 'ซีอาน', exact: true })).toBeVisible();
      await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/, { timeout: 45000 });
      await expect(page.getByTestId('radar-time')).toContainText('เลือก');
      const state = await snapshot(page); expect(state.overflow).toBe(false);
      await expect(page.locator('.maplibregl-ctrl-attrib')).toBeInViewport({ ratio: 1 });
      await info.attach('live-state-and-errors', { body: Buffer.from(JSON.stringify({ approved, viewport, state, realRadarImages, pageErrors, consoleErrors, assetErrors }, null, 2)), contentType: 'application/json' });
      expect(pageErrors).toEqual([]); expect(consoleErrors).toEqual([]); expect(assetErrors).toEqual([]);
    });
  });
}
test('source expiry and Unknown using real loaded readings and simulated offline elapsed time', async ({ page, context }, info) => {
  await page.clock.install({ time: new Date() });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.getByTestId('temperature')).toHaveText(/\d+°C/, { timeout: 45000 });
  await expect(page.locator('.situation-panel')).toHaveAttribute('data-air-freshness', /fresh|cached/, { timeout: 45000 });
  await expect(page.locator('.map-canvas')).toHaveAttribute('data-map-status', 'ready', { timeout: 30000 });
  const before = await snapshot(page);
  await context.setOffline(true);
  await page.clock.fastForward(10860001);
  await expect(page.locator('.situation-panel')).toHaveAttribute('data-weather-freshness', 'expired');
  await expect(page.locator('.situation-panel')).toHaveAttribute('data-air-freshness', 'expired');
  await expect(page.locator('.situation-panel')).toHaveAttribute('data-verdict', 'Unknown');
  await expect(page.getByText('ข้อมูลหมดอายุ · ยังประเมินไม่ได้', { exact: false }).first()).toBeVisible();
  const after = await snapshot(page); expect(after.temperature).toBe(before.temperature);
  await expect(page.locator('.map-canvas')).toHaveAttribute('data-map-status', 'ready');
  await info.attach('simulated-elapsed-time-real-source-readings', { body: Buffer.from(JSON.stringify({ note: 'Test-only browser clock advance; initial readings from live providers, no fabricated values or radar fixture pixels', before, after }, null, 2)), contentType: 'application/json' });
  await info.attach('expired-offline-mobile', { body: await page.screenshot(), contentType: 'image/png' });
});
