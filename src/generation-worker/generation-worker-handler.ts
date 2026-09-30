/**
 * The pure worker-side request handler: run exactly one phrase-generation operation for one
 * parsed request and shape it into one typed response envelope. Never touches
 * `self`/`postMessage` directly, so it can be exercised in a plain Vitest environment without a
 * real Worker.
 */

import type { GenerationIntent } from '../domain/generation/generation-intent'
import { generatePhrase } from '../domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '../domain/generation/orchestration/orchestration-types'
import {
  parseGenerationWorkerRequest,
  type GenerationWorkerRequest,
  type GenerationWorkerResponse,
} from './generation-worker-protocol'

/** The phrase-generation dependency the handler calls for one parsed request. */
export type GeneratePhraseFn = (intent: GenerationIntent) => GenerationOutcome

/**
 * Intent: answer one already-parsed generate request with exactly one response. Any exception
 * `generate` throws is caught and reported as a typed `crash` response carrying the underlying
 * error's name/message, never swallowed. Performs no parsing of its own.
 */
// @spec-link [[module_generation_worker_protocol]]
export function handleGenerationWorkerRequest(
  request: GenerationWorkerRequest,
  generate: GeneratePhraseFn = generatePhrase,
): GenerationWorkerResponse {
  try {
    const outcome = generate(request.intent)
    return { type: 'outcome', id: request.id, outcome }
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error))
    return { type: 'crash', id: request.id, name: failure.name, message: failure.message }
  }
}

/**
 * Intent: handle one raw generate message end to end with the default generator: parse it, then
 * answer it through `handleGenerationWorkerRequest`. A malformed request throws (crashing the
 * worker loudly, per parseGenerationWorkerRequest) rather than invent a correlation id for a
 * response.
 */
// @spec-link [[module_generation_worker_protocol]]
export function handleGenerationWorkerMessage(data: unknown): GenerationWorkerResponse {
  return handleGenerationWorkerRequest(parseGenerationWorkerRequest(data))
}
