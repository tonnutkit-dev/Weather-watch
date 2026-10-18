import { defineConfig } from '@playwright/test';
import base from '../qa-smooth-v03/playwright.config';
export default defineConfig({ ...base, testDir: '../qa-smooth-v03', testMatch: 'renderer.spec.ts',
  reporter: [['list'], ['html', { outputFolder: 'browser-report', open: 'never' }]], outputDir: 'test-results' });
