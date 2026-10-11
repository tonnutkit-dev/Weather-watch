import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: 'tests', timeout: 60000, workers: 1, retries: 1,
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'exploration/playwright-report' }]],
    use: { baseURL: 'http://127.0.0.1:4174/', browserName: 'chromium', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
    outputDir: 'exploration/test-results',
    webServer: { command: 'npx vite preview --config vite.exploration.config.ts --host 127.0.0.1 --port 4174', url: 'http://127.0.0.1:4174/', reuseExistingServer: false },
});
