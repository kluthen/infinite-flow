/**
 * The generation worker entry point. Keeps its long-lived rhythm-domain memo alive in module
 * scope for the worker's whole lifetime by registering exactly one `message` listener that
 * delegates every request to the pure handler and posts back its response.
 */

import { handleGenerationWorkerMessage } from './generation-worker-handler'

/** Intent: run exactly one orchestration operation per incoming message and post its response back. */
// @spec-link [[module_generation_worker_protocol]]
self.addEventListener('message', (event: MessageEvent<unknown>) => {
  const response = handleGenerationWorkerMessage(event.data)
  self.postMessage(response)
})
