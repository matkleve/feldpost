import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      heic2any: fileURLToPath(new URL('./src/test/mocks/heic2any.mock.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: ['src/test/vitest.setup.ts'],
  },
});
