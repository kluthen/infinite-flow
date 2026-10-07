import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * A separate, manual-only Vitest config for the full look-ahead deadline sweep: plain node
 * environment, only `tests/sweep/**`, one file at a time so the attempts it times do not compete
 * for the machine, and long timeouts since one run plays every supported rhythm setting with each
 * seed at three tempos with the real generator. Its result depends on the machine: run it on an
 * idle one. Never part of `npm run quality` or `npm run test:unit`; run explicitly via
 * `npm run test:sweep`. The default reporter is fixed so the `SWEEP-SKIPS` lines the sweep prints
 * reach its log whoever runs it (an AI agent's environment otherwise picks a reporter that hides
 * the console output of passing tests).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/sweep/**/*.spec.ts'],
    fileParallelism: false,
    reporters: ['default'],
    testTimeout: 1_800_000,
  },
})
