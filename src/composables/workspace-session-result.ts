/**
 * The production per-session generation result adapter: wraps the Step 7 orchestration outcome
 * into the session's injected `generate` seam (crash-early on failure, no fallback result), and
 * maps the domain profile-switch policy onto the session's typed retain/regenerate decision.
 */

import { type GenerationControls } from '@/domain/controls/generation-controls'
import { type GenerationIntent, getInstrumentProfile } from '@/domain/generation/generation-intent'
import { evaluateProfileSwitch } from '@/domain/generation/profile-switch'
import {
  type GenerationFailureCode,
  type GenerationOutcome,
} from '@/domain/generation/orchestration/orchestration-types'
import { type Seed } from '@/domain/random/seed'
import { type SessionProfileSwitchDecision } from './generation-session-profile-switch'

/** The real per-session generation result: the successful outcome plus the intent that produced it. */
// @spec-link [[service_workspace_session_flow]]
export interface WorkspaceSessionResult {
  readonly outcome: Extract<GenerationOutcome, { kind: 'generation_success' }>
  readonly intent: GenerationIntent
}

/** Typed failure surfaced by the workspace `generate` seam when orchestration could not produce a phrase. */
// @spec-link [[service_workspace_session_flow]]
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
// @spec-link [[service_workspace_session_flow]]
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

/**
 * Intent: adapt the domain `evaluateProfileSwitch` policy to the session's profile-switch seam,
 * reading the unchanged concert timeline, the current register selection, the existing seed, and
 * the newly resolved instrument profile straight off the prior workspace result and the caller's
 * next controls.
 */
// @spec-link [[rule_profile_switch_validates_phrase]]
export function evaluateWorkspaceProfileSwitch(
  result: WorkspaceSessionResult,
  nextControls: GenerationControls,
  freshSeed: Seed,
): SessionProfileSwitchDecision {
  const decision = evaluateProfileSwitch({
    timeline: result.outcome.result.timeline,
    currentRegister: nextControls.register,
    existingSeed: result.intent.seed,
    newProfile: getInstrumentProfile(nextControls.instrumentProfileId),
    freshSeed,
  })

  if (decision.kind === 'retain') return { kind: 'retain' }
  return { kind: 'regenerate', seed: decision.seed }
}
