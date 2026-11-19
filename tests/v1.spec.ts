import { test, expect } from "@playwright/test";
import { labProviders } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 } });

test.describe("LAB fixtures · map-first UI", () => {
  test("390px layout: map fills the screen, chip on top, dock in thumb zone, nothing overflows", async ({ page }) => {
    await labProviders(page);
    await page.goto("./");
    await expect(page.getByTestId("temperature")).toHaveText(/\d+°C/);
    const map = await page.locator(".map-canvas").boundingBox();
    expect(map).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });
    const chip = (await page.locator(".ww-now").boundingBox())!;
    const dock = (await page.locator(".ww-dock").boundingBox())!;
    expect(chip.y).toBeLessThan(80);
    expect(dock.y + dock.height).toBeGreaterThan(844 * 0.75); // thumb zone
    expect(chip.y + chip.height).toBeLessThan(dock.y);
    // The map stays mostly visible: floating UI covers less than half of the screen.
    expect(chip.height + dock.height + 54).toBeLessThan(844 / 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await expect(page.locator(".ww-now .ww-headline")).not.toBeEmpty();
  });

  test("sheet is closed by default and opens/closes", async ({ page }) => {
    await labProviders(page);
    await page.goto("./");
    await expect(page.getByTestId("temperature")).toBeVisible();
    const sheet = page.getByLabel("รายละเอียดอากาศ");
    await expect(sheet).toHaveAttribute("data-open", "false");
    await expect(page.getByText("24 ชั่วโมงถัดไป")).toBeHidden();
    await page.getByRole("button", { name: "เปิดรายละเอียด" }).click();
    await expect(sheet).toHaveAttribute("data-open", "true");
    await expect(page.getByText("24 ชั่วโมงถัดไป")).toBeVisible();
    // Location + temperature appear once: the chip steps away while the sheet is open.
    await expect(page.locator(".ww-now")).toHaveCSS("opacity", "0");
    await expect(page.locator(".ww-chart")).toBeVisible();
    await page.getByRole("button", { name: "ปิดรายละเอียด" }).click();
    await expect(sheet).toHaveAttribute("data-open", "false");
  });

  test("details sheet: labeled 24 h chart, AQ breakdown, 16 days with expand, sources", async ({ page }) => {
    await labProviders(page);
    await page.goto("./");
    await expect(page.getByTestId("temperature")).toBeVisible();
    await page.getByRole("button", { name: "เปิดรายละเอียด" }).click();
    const sheet = page.getByLabel("รายละเอียดอากาศ");
    await expect(sheet.locator(".ww-hourly-heads > div")).toHaveCount(24);
    await expect(sheet.locator(".ww-pt-label")).toHaveCount(24); // every hour labeled
    await expect(sheet.getByText("พอใช้ คนที่ไวต่อฝุ่นควรสังเกตอาการ")).toBeVisible(); // Bangkok AQI 81
    await expect(sheet.locator(".ww-aq-bars > div")).toHaveCount(12);
    const days = sheet.locator(".ww-day");
    await expect(days).toHaveCount(16);
    await days.nth(1).click();
    await expect(sheet.getByText(/ฝนรวม .* มม\./)).toBeVisible();
    await sheet.getByRole("button", { name: "แหล่งข้อมูล" }).first().click();
    const panel = page.getByRole("dialog", { name: "แหล่งข้อมูล" });
    await expect(panel.locator(".ww-src")).toHaveCount(5); // weather, forecast, air, radar, alerts/flood
    await expect(panel.getByText(/ไม่สามารถสรุปว่าไม่มีน้ำท่วม/)).toBeVisible();
    await expect(panel.getByText("แบบจำลอง").first()).toBeVisible();
    const box = (await panel.boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(844 * 0.52);
  });

  test("layer switch changes map layer and bottom companion", async ({ page }) => {
    await labProviders(page);
    await page.goto("./");
    await expect(page.getByTestId("temperature")).toBeVisible();
    const canvas = page.locator(".map-canvas");
    await expect(canvas).toHaveAttribute("data-weather-layer", "false");
    await page.getByRole("radio", { name: "อุณหภูมิ" }).click();
    await expect(canvas).toHaveAttribute("data-weather-layer", "true");
    await expect(page.getByLabel("ควบคุมเรดาร์ย้อนหลัง")).toHaveCount(0);
    await page.getByRole("radio", { name: "ฝุ่น" }).click();
    await expect(canvas).toHaveAttribute("data-air-layer", "true");
    await expect(page.getByLabel("US AQI ที่จุดเลือก · แบบจำลอง CAMS")).toBeVisible();
    await page.getByRole("radio", { name: "เรดาร์" }).click();
    await expect(page.getByLabel("ควบคุมเรดาร์ย้อนหลัง")).toBeVisible();
  });

  test("radar play/pause advances frames", async ({ page }) => {
    await labProviders(page);
    await page.goto("./");
    const play = page.getByRole("button", { name: "เล่นเรดาร์ย้อนหลัง" });
    await expect(play).toBeEnabled({ timeout: 15000 });
    const before = await page.getByTestId("radar-time").getAttribute("datetime");
    await play.click();
    const pause = page.getByRole("button", { name: "หยุดเรดาร์" });
    await expect(pause).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.getByTestId("radar-time").getAttribute("datetime"), { timeout: 15000 }).not.toBe(before);
    await pause.click();
    await expect(page.getByRole("button", { name: "เล่นเรดาร์ย้อนหลัง" })).toHaveAttribute("aria-pressed", "false");
  });

  test("radar info panel stays compact: ≤ ~50% height, button visible, chip uncovered, no clocks in the dock", async ({ page }) => {
    await labProviders(page);
    await page.goto("./");
    await expect(page.getByRole("button", { name: "เล่นเรดาร์ย้อนหลัง" })).toBeEnabled({ timeout: 15000 });
    await expect(page.getByLabel("ควบคุมเรดาร์ย้อนหลัง")).not.toContainText(/\d{1,2}:\d{2}/);
    await page.getByRole("button", { name: "รายละเอียดเรดาร์" }).click();
    const panel = page.getByRole("dialog", { name: "เกี่ยวกับเรดาร์" });
    const box = (await panel.boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(844 * 0.52);
    const chip = (await page.locator(".ww-now").boundingBox())!;
    expect(box.y).toBeGreaterThan(chip.y + chip.height);
    const button = (await page.getByRole("button", { name: "รีเฟรชเรดาร์" }).boundingBox())!;
    expect(button.y + button.height).toBeLessThanOrEqual(box.y + box.height);
    expect(button.y).toBeGreaterThanOrEqual(box.y);
    await page.getByRole("button", { name: "รีเฟรชเรดาร์" }).click({ trial: true, timeout: 3000 }); // fails if anything covers it
    await expect(panel.getByText("พื้นที่ว่าง ≠ ไม่มีฝน อาจอยู่นอกการครอบคลุม")).toBeVisible();
    await expect(panel.getByText("รายละเอียดเพิ่ม")).toBeVisible();
  });

  test("weather error state offers retry and recovers", async ({ page }) => {
    await labProviders(page, { weather: "fail" });
    await page.clock.install();
    await page.goto("./");
    await page.clock.runFor(60_000); // initial load: three failed attempts (unchanged policy)
    await expect(page.getByText("โหลดข้อมูลอากาศไม่ได้")).toBeVisible();
    await page.getByRole("button", { name: "ลองใหม่" }).click();
    await expect(page.getByTestId("temperature")).toHaveText(/\d+°C/);
  });
});

test("LIVE smoke: real providers show a temperature (provider latency is a known risk)", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByTestId("temperature")).toHaveText(/\d+°C/, { timeout: 45000 });
});
