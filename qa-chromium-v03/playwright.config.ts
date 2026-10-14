import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// The test file owns an exhaustive context route: only loopback assets continue.
// No existing LIVE test/config is imported, and no public URL override is accepted.
export default defineConfig({
  testDir: '.', testMatch: 'failure-handling.spec.ts', workers: 1, retries: 0,
  timeout: 60000, expect: { timeout: 10000 },
  reporter: [['list'], ['json', { outputFile: 'qa-chromium-v03/results/summary.json' }]],
  outputDir: 'qa-chromium-v03/results/browser',
  use: {
    baseURL: 'http://127.0.0.1:4173/Weather-watch/', viewport: { width: 375, height: 667 },
    isMobile: true, hasTouch: true, serviceWorkers: 'block',
    // Only redacted structured LAB events are retained; no headers/bodies/HAR.
    trace: 'off', screenshot: 'off',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/Weather-watch/', reuseExistingServer: false,
  },
});
