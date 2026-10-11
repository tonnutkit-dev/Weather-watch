import { test, expect } from "@playwright/test";
// Real integration spec. No mock provider data or screenshot art.
test("live map/weather and appearance/location integrity", async ({
  page,
}, testInfo) => {
  await page.goto("./");
  await expect(page.getByTestId("temperature")).toBeVisible({ timeout: 30000 });
  await expect(page.locator("[data-map-status=ready]")).toBeVisible({
    timeout: 30000,
  });
  await testInfo.attach("desktop-light", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.getByRole("button", { name: "การแสดงผลและตั้งค่า" }).click();
  await page.getByRole("button", { name: "มืด", exact: true }).click();
  await page.getByRole("button", { name: "ปิด", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await testInfo.attach("desktop-dark", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await expect(
    page.getByRole("heading", { name: "กรุงเทพมหานคร", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "🇨🇳 ซีอาน", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ซีอาน", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("temperature")).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("heading", { name: "ซีอาน", exact: true }),
  ).toBeVisible();
});
test("mobile states and no horizontal overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.getByTestId("temperature")).toBeVisible({ timeout: 30000 });
  await expect(page.locator("[data-map-status=ready]")).toBeVisible({
    timeout: 30000,
  });
  await testInfo.attach("mobile-light", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.getByRole("button", { name: "ขยายแผง", exact: true }).click();
  await expect(page.locator(".sheet-half")).toBeVisible();
  await page.getByRole("button", { name: "ขยายแผง", exact: true }).click();
  await expect(page.locator(".sheet-expanded")).toBeVisible();
  await page.getByRole("button", { name: "ยุบแผง", exact: true }).click();
  await expect(page.locator(".sheet-half")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "การแสดงผลและตั้งค่า" }).click();
  await page.getByRole("button", { name: "มืด", exact: true }).click();
  await page.getByRole("button", { name: "ปิด", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await testInfo.attach("mobile-dark", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});
test("subdirectory assets, real radar imagery and playback", async ({
  page,
}, testInfo) => {
  const failures: string[] = [],
    errors: string[] = [],
    consoleErrors: string[] = [];
  let radarImages = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (response) => {
    const u = new URL(response.url());
    if (
      u.origin === new URL(testInfo.project.use.baseURL!).origin &&
      response.status() >= 400
    )
      failures.push(`${response.status()} ${u.pathname}`);
    if (
      u.hostname.endsWith("rainviewer.com") &&
      u.pathname.includes("/radar/") &&
      u.pathname.endsWith(".png") &&
      response.ok()
    )
      radarImages++;
  });
  await page.goto("./");
  await expect(page.getByTestId("temperature")).toHaveText(/\d+°C/, {
    timeout: 30000,
  });
  await expect(page.locator("[data-map-status=ready]")).toBeVisible({
    timeout: 30000,
  });
  await expect.poll(() => radarImages, { timeout: 40000 }).toBeGreaterThan(0);
  const frame = page.locator(".map-canvas");
  const originalZoom = await frame.getAttribute("data-map-zoom");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(() => frame.getAttribute("data-map-zoom"), { timeout: 10000 })
    .not.toBe(originalZoom);
  const originalFrame = await frame.getAttribute("data-radar-frame");
  const temperature = await page.getByTestId("temperature").innerText();
  await page
    .getByRole("button", { name: "เล่นเรดาร์ย้อนหลัง", exact: true })
    .click();
  await expect
    .poll(() => frame.getAttribute("data-radar-frame"), { timeout: 20000 })
    .not.toBe(originalFrame);
  await page.getByRole("button", { name: "หยุดเรดาร์", exact: true }).click();
  await expect(page.getByTestId("temperature")).toHaveText(temperature);
  await testInfo.attach("radar-map", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await testInfo.attach("runtime-errors", {
    body: Buffer.from(
      JSON.stringify({ failures, errors, consoleErrors, radarImages }, null, 2),
    ),
    contentType: "application/json",
  });
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
});
test("provider connection failure preserves independent map", async ({
  page,
}) => {
  await page.route("https://api.open-meteo.com/**", (route) =>
    route.abort("internetdisconnected"),
  );
  await page.goto("./");
  await expect(
    page.getByRole("alert").filter({ hasText: "โหลดข้อมูลอากาศไม่ได้" }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator("[data-map-status=ready]")).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: "การแสดงผลและตั้งค่า" }),
  ).toBeEnabled();
});
test("offline error is meaningful", async ({ page, context }) => {
  await page.goto("./");
  // Offline indication must work even when a provider is already slow/unavailable.
  // Other integration cases independently require actual successful weather data.
  await expect(
    page.getByRole("heading", { name: "กรุงเทพมหานคร", exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await expect(
    page.getByText("ไม่มีการเชื่อมต่ออินเทอร์เน็ต", { exact: false }),
  ).toBeVisible();
  await context.setOffline(false);
});
