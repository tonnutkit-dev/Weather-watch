import { defineConfig } from '@playwright/test';
const baseURL = process.env.WW_E2E_BASE_URL;
if (baseURL !== 'https://weather-watch-v03-p0-owner-qa-ton.tonnutkit.chatgpt.site/') throw new Error('Owner QA must target the new isolated HTTPS site');
export default defineConfig({
  testDir: '.', testMatch: 'deployed.spec.ts', timeout: 90000, workers: 1, retries: 1,
  outputDir: 'test-results', reporter: [['list'], ['html', { outputFolder: 'browser-report', open: 'never' }]],
  use: { baseURL, browserName: 'chromium', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
