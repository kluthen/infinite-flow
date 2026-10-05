/**
 * The production per-session generation result adapter: wraps the Step 7 orchestration outcome
 * into the session's injected `generate` seam (crash-early on failure, no fallback result), and
 * maps the domain profile-switch policy onto the session's typed retain/regenerate decision.
 */

import { type GenerationIntent } from '@/domain/generation/generation-intent'
import {
  type GenerationFailureCode,
  type GenerationOutcome,
} from '@/domain/generation/orchestration/orchestration-types'

/** The real per-session generation result: the successful outcome plus the intent that produced it. */
// @spec-link [[service_idle_generation_session]]
export interface WorkspaceSessionResult {
  readonly outcome: Extract<GenerationOutcome, { kind: 'generation_success' }>
  readonly intent: GenerationIntent
}

/** Typed failure surfaced by the workspace `generate` seam when orchestration could not produce a phrase. */
// @spec-link [[service_idle_generation_session]]
export class GenerationFailedError extends Error {
  readonly code: GenerationFailureCode

  constructor(code: GenerationFailureCode) {
    super(`Generation failed: ${code}`)
    this.name = 'GenerationFailedError'
    this.code = code
  }
}

/**
 * Intent: adapt a raw Step 7 `GenerationOutcome` producer into the session's injected `generate`
 * seam. A successful outcome becomes the session's `WorkspaceSessionResult`; a failure crashes
 * early as a typed `GenerationFailedError` carrying the orchestration's failure code, rather than
 * defaulting to an empty or partial result.
 */
// @spec-link [[service_idle_generation_session]]
export function createWorkspaceGenerate(
  generateOutcome: (intent: GenerationIntent) => Promise<GenerationOutcome>,
): (intent: GenerationIntent) => Promise<WorkspaceSessionResult> {
  return async function workspaceGenerate(
    intent: GenerationIntent,
  ): Promise<WorkspaceSessionResult> {
    const outcome = await generateOutcome(intent)
    if (outcome.kind === 'generation_failure') {
      throw new GenerationFailedError(outcome.code)
    }
    return { outcome, intent }
  }
}
