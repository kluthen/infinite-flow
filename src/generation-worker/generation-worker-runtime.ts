/**
 * The generation Worker's cooperative runtime: answers every generate request synchronously as it
 * arrives, and builds a prewarmed setting's rhythm domain into the memo in budgeted slices between
 * messages, so a generate request waits for at most about one slice. Its clock, slice scheduler,
 * memo and generator are injected, so it runs in plain Vitest with a fake clock and a manual
 * scheduler; the Worker entry supplies the real ones.
 */

import {
  SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO,
  type CanonicalRhythmDomainBuildJob,
  type CanonicalRhythmDomainMemo,
} from '../domain/generation/orchestration/canonical-rhythm-domain'
import { generatePhrase } from '../domain/generation/orchestration/generation-orchestrator'
import { beginRhythmDomainPrewarm } from '../domain/generation/orchestration/rhythm-domain-prewarm'
import { handleGenerationWorkerRequest, type GeneratePhraseFn } from './generation-worker-handler'
import {
  parseGenerationWorkerInboundMessage,
  type GenerationWorkerResponse,
} from './generation-worker-protocol'

/** The default time budget of one prewarm slice, in milliseconds. */
export const DEFAULT_PREWARM_SLICE_BUDGET_MS = 8

/** The runtime's injected collaborators. */
export interface GenerationWorkerRuntimeDeps {
  /** A monotonic clock in milliseconds. */
  readonly now: () => number
  /** Runs `run` once, later, after the current message; called with at most one slice pending. */
  readonly scheduleSlice: (run: () => void) => void
  /** The time budget of one prewarm slice; defaults to DEFAULT_PREWARM_SLICE_BUDGET_MS. */
  readonly sliceBudgetMs?: number
  /** The memo prewarms fill and generation reads; defaults to the shared memo. */
  readonly memo?: CanonicalRhythmDomainMemo
  /** The phrase generator; defaults to `generatePhrase` over `memo`. */
  readonly generate?: GeneratePhraseFn
}

/** The Worker-facing surface: one call per inbound message, a response only for a generate. */
export interface GenerationWorkerRuntime {
  handleMessage(data: unknown): GenerationWorkerResponse | undefined
}

/**
 * Intent: create one Worker runtime. Every inbound message is parsed first (a malformed one
 * throws). A generate request is answered at once through the pure handler. A prewarm begins (or
 * resumes) its setting's memo build job, makes it the current job and ensures exactly one slice is
 * scheduled; a prewarm of an already-memoized setting, or of one whose harmony has no plan, drops
 * the current job, which the memo has already cancelled. Each slice runs the current job until the
 * budget is spent, then schedules the next slice until the job completes. An exception inside a
 * slice cancels and drops the job and is rethrown, so the Worker fails loudly.
 */
// @spec-link [[module_generation_worker_protocol]]
export function createGenerationWorkerRuntime(
  deps: GenerationWorkerRuntimeDeps,
): GenerationWorkerRuntime {
  const { now, scheduleSlice } = deps
  const budget = deps.sliceBudgetMs ?? DEFAULT_PREWARM_SLICE_BUDGET_MS
  const memo = deps.memo ?? SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO
  const generate: GeneratePhraseFn =
    deps.generate ?? ((intent) => generatePhrase(intent, { rhythmDomainMemo: memo }))
  let current: CanonicalRhythmDomainBuildJob | undefined
  let sliceScheduled = false

  /** Intent: schedule the next slice unless one is already outstanding. */
  function ensureSliceScheduled(): void {
    if (sliceScheduled) return
    sliceScheduled = true
    scheduleSlice(runScheduledSlice)
  }

  /** Intent: run the current job for one budgeted slice, then reschedule or clear it. */
  function runScheduledSlice(): void {
    sliceScheduled = false
    const job = current
    if (job === undefined) return
    const deadline = now() + budget
    let done: boolean
    try {
      done = job.runSlice(() => now() >= deadline)
    } catch (error) {
      job.cancel()
      current = undefined
      throw error
    }
    if (done) current = undefined
    else ensureSliceScheduled()
  }

  function handleMessage(data: unknown): GenerationWorkerResponse | undefined {
    const message = parseGenerationWorkerInboundMessage(data)
    if (message.type === 'generate') return handleGenerationWorkerRequest(message, generate)
    current = beginRhythmDomainPrewarm(message.intent, memo)
    if (current !== undefined) ensureSliceScheduled()
    return undefined
  }

  return { handleMessage }
}
