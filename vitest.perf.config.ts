import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * A separate, manual-only Vitest config for the Step 9 latency harness: plain node environment
 * (no jsdom), only `tests/perf/**`, and long timeouts since one run walks the full 144-setting
 * rhythm control catalog including its worst-case grammar expansion. Never part of `npm run
 * quality`; run explicitly via `npm run measure:latency`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/perf/**/*.perf.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
