import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * A separate, manual-only Vitest config for the measurement sweeps of `tests/sweep/`: the
 * `*.measure.ts` harnesses (the figure census, M1, and the cost guard, M2) and the figure census's
 * own tests, in a plain node environment, one file at a time so a measurement never competes with
 * another for the machine, with long timeouts since one sweep generates thousands of phrases with
 * the real generator. `vitest.sweep.config.ts` never runs the harnesses: they are not `*.spec.ts`
 * files. Never part of `npm run quality` or `npm run test:unit`; run explicitly via
 * `npm run measure:figures` or `npm run measure:cost`. The default reporter is fixed so the
 * `FIGURE-CENSUS` and `COST-GUARD` lines a sweep prints reach its log whoever runs it (an AI
 * agent's environment otherwise picks a reporter that hides the console output of passing tests).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/sweep/**/*.measure.ts', 'tests/sweep/figure-census.spec.ts'],
    fileParallelism: false,
    reporters: ['default'],
    testTimeout: 7_200_000,
  },
})
