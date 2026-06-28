import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Standalone test config (no app plugins needed — the engine is pure TS).
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
