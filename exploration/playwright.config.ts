import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
    testDir: 'tests', timeout: 60000, workers: 1, retries: 1,
    reporter: [['list'], ['html', { open: 'never', outputFolder: fileURLToPath(new URL('./playwright-report', import.meta.url)) }]],
    use: { baseURL: 'http://127.0.0.1:4174/', browserName: 'chromium', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
    outputDir: fileURLToPath(new URL('./test-results', import.meta.url)),
    webServer: { cwd: fileURLToPath(new URL('../', import.meta.url)), command: 'npx vite preview --config vite.exploration.config.ts --host 127.0.0.1 --port 4174', url: 'http://127.0.0.1:4174/', reuseExistingServer: false },
});
