import { defineConfig } from "@playwright/test";
const deployedUrl = process.env.WW_E2E_BASE_URL;
export default defineConfig({
  testDir: "tests",
  timeout: 60000,
  workers: 1,
  // One retry for intermittent public-provider timeouts; failures/traces remain reported.
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: deployedUrl || "http://127.0.0.1:4173/Weather-watch/",
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: deployedUrl
    ? undefined
    : {
        command: "npm run preview -- --host 127.0.0.1 --port 4173",
        url: "http://127.0.0.1:4173/Weather-watch/",
        reuseExistingServer: !process.env.CI,
      },
});
