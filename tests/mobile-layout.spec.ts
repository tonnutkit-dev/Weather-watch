import { test, expect, type Page } from "@playwright/test";
// Real browser/live-provider checks; no fabricated product values or mocked weather.
const sizes = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];
async function geometry(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el || getComputedStyle(el).display === "none") return null;
      const r = el.getBoundingClientRect();
      return r.width && r.height ? r.toJSON() : null;
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      overflow: document.documentElement.scrollWidth > innerWidth,
      map: rect(".map-section"),
      sheet: rect(".situation-panel"),
      toolbar: rect(".map-toolbar"),
      radar: rect(".radar-controls"),
      attribution: rect(".maplibregl-ctrl-attrib"),
      temperature: rect('[data-testid="temperature"]'),
      condition: rect('[data-testid="weather-condition"]'),
      summary: rect(".summary-message"),
      slider: rect('.radar-controls input[type="range"]'),
      scrollLeft: document.querySelector(".panel-scroll")?.scrollLeft ?? 0,
    };
  });
}
function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: typeof a,
) {
  return (
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 &&
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1
  );
}
async function theme(page: Page, mode: "light" | "dark") {
  await page.getByRole("button", { name: "การแสดงผลและตั้งค่า" }).click();
  await page
    .getByRole("button", {
      name: mode === "dark" ? "มืด" : "สว่าง",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "ปิด", exact: true }).click();
  await expect(page.locator(".map-canvas")).toHaveAttribute(
    "data-theme",
    mode,
    { timeout: 30000 },
  );
}
test.describe("Mobile V0.2 composition", () => {
  test.use({ hasTouch: true, isMobile: true });
  for (const size of sizes) {
    test(`${size.width}×${size.height}: all sheet states, light/dark, controls and map`, async ({
      page,
      context,
    }, info) => {
      await page.setViewportSize(size);
      await page.goto("./");
      await expect(page.getByTestId("temperature")).toHaveText(/\d+°C/, {
        timeout: 30000,
      });
      await expect(page.locator('[data-map-status="ready"]')).toBeVisible({
        timeout: 30000,
      });
      await expect(page.locator(".map-canvas")).toHaveAttribute(
        "data-map-engine",
        "maplibre",
      );
      await expect(page.locator(".map-canvas")).toHaveAttribute(
        "data-weather-layer",
        "false",
      );
      await expect(page.locator(".region-bar")).toBeHidden();
      await expect(page.locator(".map-heading")).toBeHidden();
      await expect(page.locator(".map-layer-chips")).toBeHidden();
      await expect(page.locator(".radar-legend")).toHaveCount(0);
      const measurements: unknown[] = [];
      for (const mode of ["light", "dark"] as const) {
        if (mode === "dark") await theme(page, mode);
        for (const state of ["collapsed", "half", "expanded"] as const) {
          if (state !== "collapsed")
            await page
              .getByRole("button", { name: "ขยายแผง", exact: true })
              .click();
          await expect(page.locator(`.sheet-${state}`)).toBeVisible();
          await info.attach(`mobile-${size.width}-${mode}-${state}`, {
            body: await page.screenshot({ animations: "disabled" }),
            contentType: "image/png",
          });
          const g = await geometry(page);
          measurements.push({ mode, state, ...g });
          expect(g.overflow).toBe(false);
          expect(g.scrollLeft).toBe(0);
          await expect(page.getByTestId("temperature")).toBeInViewport({
            ratio: 1,
          });
          await expect(page.getByTestId("weather-condition")).toBeInViewport({
            ratio: 1,
          });
          await expect(page.locator(".maplibregl-ctrl-attrib")).toBeInViewport({
            ratio: 1,
          });
          expect(g.attribution!.y + g.attribution!.height).toBeLessThanOrEqual(
            g.sheet!.y + 1,
          );
          const overlays = [g.toolbar, g.radar, g.sheet, g.attribution].filter(
            (x) => x !== null,
          );
          for (let i = 0; i < overlays.length; i++)
            for (let j = i + 1; j < overlays.length; j++)
              expect(
                overlaps(overlays[i]!, overlays[j]!),
                `${mode}/${state}: overlays ${i} and ${j}`,
              ).toBe(false);
          if (state === "collapsed") {
            expect(g.sheet!.height).toBeGreaterThanOrEqual(130);
            expect(g.sheet!.height).toBeLessThanOrEqual(160);
            expect(g.radar!.height).toBeGreaterThanOrEqual(64);
            expect(g.radar!.height).toBeLessThanOrEqual(88);
            expect(
              g.radar!.y - (g.toolbar!.y + g.toolbar!.height),
            ).toBeGreaterThan(220);
            await expect(page.locator(".summary-message")).toBeInViewport({
              ratio: 1,
            });
            await expect(
              page.getByRole("slider", { name: "เฟรมเรดาร์ย้อนหลัง" }),
            ).toBeInViewport({ ratio: 1 });
          } else {
            expect(g.radar).toBeNull();
            expect(g.map!.height - g.sheet!.height).toBeGreaterThanOrEqual(129);
          }
        }
        // Scroll expanded content, then collapse. Default primary summary must return.
        await page.locator(".panel-scroll").evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        await expect(page.locator(".data-footer")).toBeInViewport();
        await page.getByRole("button", { name: "ยุบแผง", exact: true }).click();
        await page.getByRole("button", { name: "ยุบแผง", exact: true }).click();
        await expect(page.getByTestId("temperature")).toBeInViewport({
          ratio: 1,
        });
      }
      await info.attach(`mobile-${size.width}-geometry`, {
        body: Buffer.from(JSON.stringify(measurements, null, 2)),
        contentType: "application/json",
      });
      const canvas = page.locator(".maplibregl-canvas");
      const map = page.locator(".map-canvas");
      const beforeZoom = await map.getAttribute("data-map-zoom");
      // Actual Chromium touch pinch, independent of hidden zoom buttons.
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.synthesizePinchGesture", {
        x: 140,
        y: 230,
        scaleFactor: 1.4,
        gestureSourceType: "touch",
        relativeSpeed: 300,
      });
      await cdp.detach();
      await expect
        .poll(() => map.getAttribute("data-map-zoom"), { timeout: 10000 })
        .not.toBe(beforeZoom);
      const afterPinch = await map.getAttribute("data-map-zoom");
      await canvas.focus();
      await page.keyboard.press("Equal");
      await expect
        .poll(() => map.getAttribute("data-map-zoom"), { timeout: 10000 })
        .not.toBe(afterPinch);
      const beforePan = await map.getAttribute("data-map-center");
      await page.mouse.move(120, 230);
      await page.mouse.down();
      await page.mouse.move(200, 260, { steps: 8 });
      await page.mouse.up();
      await expect
        .poll(() => map.getAttribute("data-map-center"), { timeout: 10000 })
        .not.toBe(beforePan);
      await page
        .getByRole("button", { name: "กลับไปยังตำแหน่งที่เลือก" })
        .click();
      await expect
        .poll(() => map.getAttribute("data-map-center"), { timeout: 10000 })
        .toBe("13.7563,100.5018");
      await page.getByRole("button", { name: "รายละเอียดเรดาร์" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "ปิด", exact: true }),
      ).toBeInViewport({ ratio: 1 });
      await expect(
        page.getByText("ภาพที่เลือก", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "รีเฟรชเรดาร์", exact: true })
        .click();
      await page.getByRole("button", { name: "ปิด", exact: true }).click();
      await page.getByRole("button", { name: "เลือกชั้นข้อมูล" }).click();
      await page.getByRole("checkbox", { name: /AQI จุดนี้/ }).check();
      await page.getByRole("button", { name: "ปิด", exact: true }).click();
      await expect(map).toHaveAttribute("data-air-layer", "true");
      await page
        .getByRole("button", { name: "ค้นหาตำแหน่ง", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "ใช้ตำแหน่งของฉัน" }),
      ).toBeInViewport({ ratio: 1 });
      await page.locator(".secondary-locations summary").click();
      await page.getByRole("button", { name: /ซีอาน.*Xi/ }).click();
      await expect(
        page.getByRole("heading", { name: "ซีอาน", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "ค้นหาตำแหน่ง", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "ค้นหาตำแหน่ง", exact: true })
        .fill("เชียงใหม่");
      await page.getByRole("button", { name: /เชียงใหม่.*Chiang Mai/ }).click();
      await expect(
        page.getByRole("heading", { name: "เชียงใหม่", exact: true }),
      ).toBeVisible();
    });
  }
});
test("tablet layout retains map, forecast, geography and both themes", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("./");
  await expect(page.getByTestId("temperature")).toHaveText(/\d+°C/, {
    timeout: 30000,
  });
  await expect(page.locator('[data-map-status="ready"]')).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator(".region-bar")).toBeVisible();
  for (const mode of ["light", "dark"] as const) {
    if (mode === "dark") await theme(page, mode);
    await info.attach(`tablet-${mode}`, {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".maplibregl-ctrl-attrib")).toBeInViewport({
      ratio: 1,
    });
  }
  await page.getByRole("button", { name: "พยากรณ์", exact: true }).click();
  await expect(page.locator(".forecast-section")).toBeVisible();
  await info.attach("tablet-forecast", {
    body: await page.screenshot({ animations: "disabled" }),
    contentType: "image/png",
  });
});
