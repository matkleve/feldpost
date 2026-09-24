import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4200';

export default defineConfig({
  testDir: './e2e',
  testMatch: /pr129-live-check\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 240_000,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'on',
  },
  projects: [{ name: 'live-check', use: { ...devices['Desktop Chrome'] } }],
});
