import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * A separate, manual-only Vitest config for measurement M3, the my-instrument range sweep: plain
 * node environment, only `tests/sweep-my-instrument/**`, and a long timeout since one run
 * generates every supported rhythm setting with two seeds for each swept range with the real
 * generator. Never part of `npm run quality`, `npm run test:unit` or `npm run test:sweep`; run
 * explicitly via `npm run sweep:my-instrument`. The default reporter is fixed so the table the
 * sweep prints reaches its log whoever runs it.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/sweep-my-instrument/**/*.spec.ts'],
    fileParallelism: false,
    reporters: ['default'],
    testTimeout: 1_800_000,
  },
})
