import { test, expect } from "@playwright/test";
// Real integration spec. No mock provider data or screenshot art.
test("live map/weather and appearance/location integrity", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("temperature")).toBeVisible({ timeout: 30000 });
  await expect(page.locator("[data-map-status=ready]")).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole("button", { name: "การแสดงผลและตั้งค่า" }).click();
  await page.getByRole("button", { name: "มืด", exact: true }).click();
  await page.getByRole("button", { name: "ปิด", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
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
test("mobile states and no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("temperature")).toBeVisible({ timeout: 30000 });
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
});
test("offline error is meaningful", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByTestId("temperature")).toBeVisible({ timeout: 30000 });
  await context.setOffline(true);
  await expect(
    page.getByText("ไม่มีการเชื่อมต่ออินเทอร์เน็ต", { exact: false }),
  ).toBeVisible();
  await context.setOffline(false);
});
