import { test, expect, type Page, type TestInfo } from '@playwright/test';
const directions = ['a', 'b', 'c'] as const;
const mobile = [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }];
async function ready(page: Page, direction: string, theme: string) {
    await page.goto(`prototype.html?direction=${direction}&theme=${theme}`);
    await expect(page.locator('[data-map-status="ready"]')).toBeVisible({ timeout: 40000 });
    await expect(page.getByTestId('primary-temperature')).toHaveText('31°');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
}
async function capture(page: Page, info: TestInfo, name: string) { await info.attach(name, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' }); }
async function geometry(page: Page) {
    return page.evaluate(() => {
        const rect = (selector: string) => { const e = document.querySelector<HTMLElement>(selector); if (!e || getComputedStyle(e).display === 'none' || !e.getClientRects().length)
            return null; return e.getBoundingClientRect().toJSON(); };
        return { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth,
            header: rect('.app-header'), weather: rect('.weather-overview'), map: rect('.map-pane'), sheet: rect('.situation-sheet'), tools: rect('.map-tools'), radar: rect('.radar-strip'), temperature: rect('.temperature'), condition: rect('.condition-line'), attribution: rect('.maplibregl-ctrl-attrib'), slider: rect('.radar-timeline input'), sheetScroll: rect('.sheet-scroll') };
    });
}
function collision(a: {
    x: number;
    y: number;
    width: number;
    height: number;
} | null, b: typeof a) { return !!a && !!b && Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1; }
async function composition(page: Page) {
    const g = await geometry(page);
    expect(g.documentWidth).toBeLessThanOrEqual(g.width);
    expect(g.temperature).not.toBeNull();
    expect(g.condition).not.toBeNull();
    if (g.temperature)
        expect(g.temperature.y + g.temperature.height).toBeLessThanOrEqual(g.height);
    if (g.condition)
        expect(g.condition.y + g.condition.height).toBeLessThanOrEqual(g.height);
    expect(collision(g.tools, g.sheet)).toBe(false);
    expect(collision(g.tools, g.radar)).toBe(false);
    expect(collision(g.radar, g.sheet)).toBe(false);
    expect(g.attribution).not.toBeNull();
    expect(collision(g.attribution, g.sheet)).toBe(false);
    if (g.radar && g.slider) {
        expect(g.slider.y + g.slider.height).toBeLessThanOrEqual(g.radar.y + g.radar.height);
        expect(g.slider.x + g.slider.width).toBeLessThanOrEqual(g.radar.x + g.radar.width);
    }
    await expect(page.locator('.study-notice')).toContainText('ข้อมูลอากาศและฝนเป็นตัวอย่าง');
    return g;
}
for (const direction of directions) {
    test.describe(`Direction ${direction.toUpperCase()} mobile`, () => {
        test.use({ hasTouch: true, isMobile: true });
        for (const size of mobile)
            test(`${size.width}x${size.height} light/dark and three sheet states`, async ({ page }, info) => {
                test.setTimeout(120000);
                await page.setViewportSize(size);
                const errors: string[] = [];
                page.on('pageerror', e => errors.push(e.message));
                const matrix = [];
                for (const theme of ['light', 'dark']) {
                    await ready(page, direction, theme);
                    for (const state of ['collapsed', 'half', 'expanded']) {
                        if (state !== 'collapsed')
                            await page.getByRole('button', { name: 'ขยายแผง', exact: true }).click();
                        await expect(page.locator('.prototype')).toHaveClass(new RegExp(`sheet-${state}`));
                        const g = await composition(page);
                        matrix.push({ direction, theme, state, ...g });
                        await capture(page, info, `${direction}-mobile-${size.width}-${theme}-${state}`);
                        if (state === 'collapsed' && g.map)
                            expect(g.map.height).toBeGreaterThan(size.height * .32);
                        if (state !== 'collapsed')
                            await expect(page.locator('.radar-strip')).toBeHidden();
                        if (state === 'expanded') {
                            await page.locator('.sheet-scroll').evaluate(e => { e.scrollTop = e.scrollHeight; });
                            await expect(page.locator('.trust-note')).toBeInViewport({ ratio: .5 });
                        }
                    }
                }
                expect(errors).toEqual([]);
                await info.attach(`${direction}-${size.width}-geometry`, { body: Buffer.from(JSON.stringify({ matrix, runtimeErrors: errors }, null, 2)), contentType: 'application/json' });
            });
    });
    for (const size of [{ name: 'tablet', width: 820, height: 1180 }, { name: 'desktop', width: 1440, height: 1000 }])
        test(`${direction} ${size.name}: light/dark and readable details`, async ({ page }, info) => {
            test.setTimeout(120000);
            await page.setViewportSize(size);
            const errors: string[] = [];
            page.on('pageerror', e => errors.push(e.message));
            const matrix = [];
            for (const theme of ['light', 'dark']) {
                await ready(page, direction, theme);
                matrix.push({ direction, theme, ...await composition(page) });
                await capture(page, info, `${direction}-${size.name}-${theme}`);
                await page.getByRole('button', { name: 'ขยายแผง', exact: true }).click();
                await page.getByRole('button', { name: 'ขยายแผง', exact: true }).click();
                await page.getByRole('button', { name: 'รายวัน', exact: true }).click();
                await expect(page.locator('.daily-list')).toBeVisible();
                await page.locator('.sheet-scroll').evaluate(e => { e.scrollTop = e.scrollHeight; });
                await expect(page.locator('.air-card')).toBeInViewport({ ratio: .35 });
                await capture(page, info, `${direction}-${size.name}-${theme}-details`);
            }
            expect(errors).toEqual([]);
            await info.attach(`${direction}-${size.name}-geometry`, { body: Buffer.from(JSON.stringify({ matrix, runtimeErrors: errors }, null, 2)), contentType: 'application/json' });
        });
    test(`${direction} controls, location, theme, keyboard, dialog and demo playback`, async ({ page }, info) => {
        test.setTimeout(120000);
        await page.setViewportSize({ width: 390, height: 844 });
        await ready(page, direction, 'light');
        await page.getByRole('button', { name: 'เล่นภาพตัวอย่าง' }).click();
        await expect(page.locator('.radar-timeline time')).not.toHaveText('14:20');
        await page.getByRole('button', { name: 'หยุดภาพตัวอย่าง' }).click();
        await page.getByRole('button', { name: 'รายละเอียดภาพฝนตัวอย่าง' }).click();
        await expect(page.getByRole('dialog')).toContainText('ไม่ใช่เรดาร์ย้อนหลังหรือ Nowcast');
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).not.toBeVisible();
        await expect(page.getByRole('button', { name: 'รายละเอียดภาพฝนตัวอย่าง' })).toBeFocused();
        await page.getByRole('button', { name: 'ชั้นข้อมูล', exact: true }).click();
        await page.getByRole('button', { name: /ฝนตัวอย่าง/ }).click();
        await expect(page.locator('.map-scene')).toHaveAttribute('data-rain-visible', 'false');
        await page.getByRole('button', { name: 'ชั้นข้อมูล', exact: true }).click();
        const before = Number(await page.locator('.map-scene').getAttribute('data-map-zoom'));
        await page.locator('.maplibregl-canvas').focus();
        await page.keyboard.press('+');
        await expect.poll(async () => Number(await page.locator('.map-scene').getAttribute('data-map-zoom'))).toBeGreaterThan(before);
        await page.getByRole('button', { name: 'กลับไปยังสถานที่ที่เลือก' }).click();
        await expect.poll(async () => Number(await page.locator('.map-scene').getAttribute('data-map-zoom'))).toBeCloseTo(6.8, 1);
        await page.getByRole('button', { name: 'เลือกสถานที่', exact: true }).click();
        await page.getByRole('button', { name: /ซีอาน/ }).click();
        await expect(page.getByRole('heading', { name: 'ซีอาน', exact: true })).toBeVisible();
        await expect(page.locator('[data-map-status="ready"]')).toBeVisible();
        await expect(page.getByTestId('primary-temperature')).toHaveText('31°');
        await page.getByRole('button', { name: 'การแสดงผล', exact: true }).click();
        await page.getByRole('button', { name: 'มืด', exact: true }).click();
        await page.getByRole('button', { name: 'ปิด', exact: true }).click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        await expect(page.getByRole('heading', { name: 'ซีอาน', exact: true })).toBeVisible();
        await page.reload();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        await page.getByRole('button', { name: 'การแสดงผล', exact: true }).click();
        await page.getByRole('button', { name: 'ตามอุปกรณ์', exact: true }).click();
        await page.getByRole('button', { name: 'ปิด', exact: true }).click();
        await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        expect(await page.locator('.situation-sheet').evaluate(e => getComputedStyle(e).transitionDuration)).toBe('0s');
        await info.attach(`${direction}-interactions`, { body: Buffer.from(JSON.stringify({ locationSwitch: true, themePersistence: true, systemTheme: true, reducedMotion: true, mapKeyboardZoom: true, recenter: true, layers: true, demoPlayback: true, dialogFocusReturn: true })), contentType: 'application/json' });
    });
}
test('comparison gallery: three real views side by side in light/dark', async ({ page }, info) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1390, height: 1310 });
    await page.goto('./');
    for (const theme of ['light', 'dark']) {
        if (theme === 'dark')
            await page.getByRole('button', { name: 'Dark', exact: true }).click();
        for (const frame of page.frames().filter(f => f.parentFrame()))
            await expect(frame.locator('[data-map-status="ready"]')).toBeVisible({ timeout: 40000 });
        await page.evaluate(() => document.fonts.ready);
        await capture(page, info, `comparison-${theme}`);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1390);
});
test('offline map failure remains honest and controls reachable', async ({ page }) => {
    await page.route('https://tiles.openfreemap.org/**', route => route.abort('failed'));
    await page.goto('prototype.html?direction=c&theme=light');
    await expect(page.locator('.map-state')).toContainText('โหลดแผนที่ไม่ได้');
    await expect(page.getByTestId('primary-temperature')).toHaveText('31°');
    await page.getByRole('button', { name: 'การแสดงผล', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
});
