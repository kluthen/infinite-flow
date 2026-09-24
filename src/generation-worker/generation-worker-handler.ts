/**
 * The pure worker-side message handler: parse one untrusted request envelope, run exactly one
 * `generatePhrase` orchestration operation for it, and return one typed response envelope. Never
 * touches `self`/`postMessage` directly, so it can be exercised in a plain Vitest environment
 * without a real Worker.
 */

import { generatePhrase } from '../domain/generation/orchestration/generation-orchestrator'
import {
  parseGenerationWorkerRequest,
  type GenerationWorkerResponse,
} from './generation-worker-protocol'

/**
 * Intent: handle one raw worker message end to end. A malformed request throws (crashing the
 * worker loudly, per parseGenerationWorkerRequest) rather than invent a correlation id for a
 * response. Once the request parses, any exception `generatePhrase` throws is caught and reported
 * as a typed `crash` response carrying the underlying error's name/message, never swallowed.
 */
// @spec-link [[service_generation_orchestration]]
export function handleGenerationWorkerMessage(data: unknown): GenerationWorkerResponse {
  const request = parseGenerationWorkerRequest(data)
  try {
    const outcome = generatePhrase(request.intent)
    return { type: 'outcome', id: request.id, outcome }
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error))
    return { type: 'crash', id: request.id, name: failure.name, message: failure.message }
  }
}
