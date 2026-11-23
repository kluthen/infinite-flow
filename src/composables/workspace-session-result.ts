/**
 * The production per-session generation result adapter: wraps the Step 7 orchestration outcome
 * into the session's injected `generate` seam (crash-early on failure, no fallback result), with
 * the settings each request was built from, and joins a generated phrase published as phrase 1
 * with the session seed drawn for it.
 */

import { type GenerationIntent } from '@/domain/generation/generation-intent'
import {
  type GenerationFailureCode,
  type GenerationOutcome,
} from '@/domain/generation/orchestration/orchestration-types'

import type { Seed } from '@/domain/random/seed'
import type { IdlePhraseSettings } from '@/session/idle-phrase-settings'

/**
 * One generated Idle phrase: the successful outcome plus the intent that produced it and the
 * settings that intent was built from.
 */
// @spec-link [[service_idle_generation_session]]
export interface WorkspaceGeneratedPhrase {
  readonly outcome: Extract<GenerationOutcome, { kind: 'generation_success' }>
  readonly intent: GenerationIntent
  readonly settings: IdlePhraseSettings
}

/**
 * The real per-session generation result: a generated phrase published as the Idle phrase 1, with
 * the session seed drawn for it, from which a session started on it derives every later seed.
 */
// @spec-link [[service_idle_generation_session]]
// @spec-link [[module_session_seed_plan]]
export interface WorkspaceSessionResult extends WorkspaceGeneratedPhrase {
  readonly sessionSeed: Seed
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
 * Adapt a raw Step 7 `GenerationOutcome` producer into the session's injected `generate`
 * seam. A successful outcome becomes a `WorkspaceGeneratedPhrase` with the settings `chosen` read
 * as the request is posted, the very moment its intent was built from them; a failure crashes
 * early as a typed `GenerationFailedError` carrying the orchestration's failure code, rather than
 * defaulting to an empty or partial result.
 */
// @spec-link [[service_idle_generation_session]]
export function createWorkspaceGenerate(
  generateOutcome: (intent: GenerationIntent) => Promise<GenerationOutcome>,
  chosen: () => IdlePhraseSettings,
): (intent: GenerationIntent) => Promise<WorkspaceGeneratedPhrase> {
  return async function workspaceGenerate(
    intent: GenerationIntent,
  ): Promise<WorkspaceGeneratedPhrase> {
    const settings = chosen()
    const outcome = await generateOutcome(intent)
    if (outcome.kind === 'generation_failure') {
      throw new GenerationFailedError(outcome.code)
    }
    return { outcome, intent, settings }
  }
}

/**
 * The Idle result a generated phrase is published as: the same outcome, intent and
 * settings, with the session seed the Idle session drew for this phrase 1.
 */
// @spec-link [[module_session_seed_plan]]
export function withSessionSeed(
  generated: WorkspaceGeneratedPhrase,
  sessionSeed: Seed,
): WorkspaceSessionResult {
  const { outcome, intent, settings } = generated
  return { outcome, intent, settings, sessionSeed }
}
