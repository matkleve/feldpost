import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      heic2any: fileURLToPath(new URL('./src/test/mocks/heic2any.mock.ts', import.meta.url)),
    },
  },
  test: {
    // Unit tests live under src/. Without this, vitest's default glob also
    // picks up e2e/*.spec.ts, which are Playwright tests (playwright.config.ts
    // testDir: './e2e') and fail on import with "Playwright Test did not
    // expect test() to be called here."
    include: ['src/**/*.spec.ts'],
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: ['src/test/vitest.setup.ts'],
  },
});
