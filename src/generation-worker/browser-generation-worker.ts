/**
 * The real browser `Worker`-backed `GenerationWorkerPort`, using the Vite-recognized
 * `new Worker(new URL(...), { type: 'module' })` pattern so the worker entry is built as its own
 * bundle chunk.
 */

import type { GenerationWorkerPort } from './generation-worker-client'

/** Intent: create one real module Worker running ./generation.worker.ts as a GenerationWorkerPort. */
// @spec-link [[service_workspace_session_runner_factory]]
export function createBrowserGenerationWorker(): GenerationWorkerPort {
  return new Worker(new URL('./generation.worker.ts', import.meta.url), { type: 'module' })
}
