/**
 * Step 9 memo for the seed-independent canonical rhythm domain: `makeRhythmCandidateDomain`'s
 * full expansion depends only on the five rhythm-relevant controls (note density, rhythmic
 * variety, silence density, syncopation, tension arc) plus the grammar version, never on the seed,
 * yet the finite v2 control catalog carries only 3 x 3 x 3 x 3 x 4 = 324 distinct rhythm settings
 * per grammar version. Every repeated generation/regeneration against one of those 324 settings
 * can therefore reuse one already-materialized candidate list instead of re-running the expensive
 * Step 6 enumeration. An entry is built either synchronously by a lookup miss or as a resumable,
 * cancellable build job (the Worker's prewarm of the setting in use); both run the same steps and
 * store an identical entry. The memo never evicts: its entry count is bounded by that finite
 * catalog, but its bytes are not small (the largest entries weigh tens of MiB each: about 37 MiB
 * for the slowest setting and 49 MiB for the largest), so a long session that visits many large
 * settings keeps them all resident.
 */

import { deepFreeze } from '../../events/deep-freeze'
import {
  createRhythmDomainBuilder,
  isNoLegalRhythmPlan,
  normalizeRhythmExpansionInput,
  type RhythmDomainBuilder,
} from '../../rhythm/rhythm-planner'
import type {
  NoLegalRhythmPlan,
  NormalizedRhythmExpansionInput,
  RhythmCandidate,
  RhythmExpansionInput,
  RhythmGrammarVersion,
} from '../../rhythm/rhythm-types'

/**
 * The seed-independent canonical rhythm domain for one normalized rhythm setting: either the
 * typed no-plan result (memoized as-is) or the complete, already-materialized candidate list in
 * canonical iterator order, deep-frozen so no consumer can mutate the shared memoized instance.
 */
// @spec-link [[entity_rhythm_candidate_domain]]
export type CanonicalRhythmDomain =
  | NoLegalRhythmPlan
  | {
      readonly kind: 'canonical_rhythm_domain'
      readonly grammarVersion: RhythmGrammarVersion
      readonly input: NormalizedRhythmExpansionInput
      readonly candidates: readonly RhythmCandidate[]
    }

/** Intent: build the memo key string from a normalized rhythm-expansion input's identity fields. */
// @spec-link [[module_rhythm_variety_grammar]]
function memoKey(input: NormalizedRhythmExpansionInput): string {
  return `${input.grammarVersion}|${input.noteDensity}|${input.rhythmicVariety}|${input.silenceDensity}|${input.syncopation}|${input.tensionArc}`
}

/** A resumable, cancellable background build of one canonical rhythm domain memo entry. */
// @spec-link [[entity_rhythm_candidate_domain]]
export interface CanonicalRhythmDomainBuildJob {
  readonly key: string
  /**
   * Does work steps until the entry is complete (returns true, entry stored in the memo) or
   * `shouldYield()` returns true between two steps (returns false). At least one step runs per
   * call; a call on an already completed job does nothing and returns true.
   */
  runSlice(shouldYield: () => boolean): boolean
  /**
   * Discards unfinished work; no memo entry is written; later runSlice calls throw. A no-op on an
   * already completed (or failed) job, whose entry stays memoized (or was never written).
   */
  cancel(): void
}

/** Creates the resumable stepped build of one normalized setting's complete rhythm domain. */
// @spec-link [[entity_rhythm_candidate_domain]]
export type RhythmDomainBuilderFactory = (
  input: NormalizedRhythmExpansionInput,
) => RhythmDomainBuilder

/**
 * The lifecycle of one build job: in progress, completed with its stored entry, cancelled, or
 * failed (a step threw; its partial work was discarded and no entry was written).
 */
type BuildState =
  | { readonly status: 'running'; readonly builder: RhythmDomainBuilder }
  | { readonly status: 'completed' }
  | { readonly status: 'cancelled' }
  | { readonly status: 'failed' }

/**
 * Intent: advance one build by exactly one work step, which is at most one gesture unit of the
 * planner's stepped build (the fast pass, then the exact re-run of a pass that found nothing); the
 * step that completes it returns the typed no-plan result as-is, or deep-freezes the complete
 * candidate list, in canonical iterator order, into the domain. Undefined while unfinished.
 */
// @spec-link [[entity_rhythm_candidate_domain]]
function advanceBuild(
  input: NormalizedRhythmExpansionInput,
  builder: RhythmDomainBuilder,
): CanonicalRhythmDomain | undefined {
  if (!builder.step()) return undefined
  const result = builder.result()
  if (isNoLegalRhythmPlan(result)) return result
  return deepFreeze({
    kind: 'canonical_rhythm_domain' as const,
    grammarVersion: input.grammarVersion,
    input,
    candidates: result.candidates,
  })
}

/**
 * Intent: advance one build step by step until it completes (its domain) or `shouldYield()`
 * returns true between two steps (undefined).
 */
// @spec-link [[entity_rhythm_candidate_domain]]
function advanceUntilYield(
  input: NormalizedRhythmExpansionInput,
  builder: RhythmDomainBuilder,
  shouldYield: () => boolean,
): CanonicalRhythmDomain | undefined {
  for (;;) {
    const domain = advanceBuild(input, builder)
    if (domain !== undefined || shouldYield()) return domain
  }
}

/** The memo-side hooks one build job reports its end through. */
interface BuildJobHooks {
  readonly onComplete: (domain: CanonicalRhythmDomain) => void
  /** The job ended without an entry: cancelled, or failed because a step threw. */
  readonly onDiscard: () => void
}

/**
 * Intent: create a build job for one normalized setting that advances step by step through
 * `advanceBuild` and hands the finished entry to `hooks.onComplete` exactly once. A synchronous
 * build is this same job run once with `shouldYield = () => false`. A step that throws fails the
 * job for good (its partially built, now unusable builder is dropped, no entry is ever stored for
 * it, `hooks.onDiscard` runs) and the exception is rethrown; later runSlice calls throw too.
 */
// @spec-link [[entity_rhythm_candidate_domain]]
function createBuildJob(
  key: string,
  input: NormalizedRhythmExpansionInput,
  createBuilder: RhythmDomainBuilderFactory,
  hooks: BuildJobHooks,
): CanonicalRhythmDomainBuildJob {
  let state: BuildState = { status: 'running', builder: createBuilder(input) }

  function runSlice(shouldYield: () => boolean): boolean {
    if (state.status === 'cancelled')
      throw new Error(`Canonical rhythm domain build ${key} was cancelled.`)
    if (state.status === 'failed')
      throw new Error(`Canonical rhythm domain build ${key} failed; it cannot resume.`)
    if (state.status === 'completed') return true
    let domain: CanonicalRhythmDomain | undefined
    try {
      domain = advanceUntilYield(input, state.builder, shouldYield)
    } catch (error) {
      state = { status: 'failed' }
      hooks.onDiscard()
      throw error
    }
    if (domain === undefined) return false
    state = { status: 'completed' }
    hooks.onComplete(domain)
    return true
  }

  function cancel(): void {
    if (state.status !== 'running') return
    state = { status: 'cancelled' }
    hooks.onDiscard()
  }

  return { key, runSlice, cancel }
}

/**
 * One memo instance's public interface: a keyed lookup, the start of a resumable build job for one
 * setting, the discard of the unfinished job, and the number of settings it has filled.
 */
export interface CanonicalRhythmDomainMemo {
  readonly lookup: (input: RhythmExpansionInput) => CanonicalRhythmDomain
  readonly beginBuild: (input: RhythmExpansionInput) => CanonicalRhythmDomainBuildJob | undefined
  /** Cancels the unfinished build job, whatever its setting, discarding its work; else a no-op. */
  readonly discardPendingBuild: () => void
  readonly size: () => number
}

/**
 * Intent: create a fresh, empty canonical-rhythm-domain memo keyed by grammar version and the five
 * rhythm-relevant controls of the NORMALIZED input. A lookup miss builds the domain exactly once
 * (or memoizes the typed no-plan result) and stores it, first finishing synchronously an
 * unfinished build job of the same setting; a hit returns the exact same frozen instance without
 * touching the grammar again. `beginBuild` starts (or returns) the one unfinished resumable job,
 * cancelling an unfinished job of another setting; `discardPendingBuild` cancels it outright. A
 * build that throws stores nothing and releases the unfinished-job slot. Every build runs on a
 * builder from `createBuilder` (the planner's stepped builder by default). Entries are only ever
 * added by a lookup or a completed build job, never evicted; their count is bounded by the finite
 * 324-setting-per-grammar-version control catalog, their bytes are not (see the file header).
 */
// @spec-link [[api_rhythm_domain_expansion]]
export function createCanonicalRhythmDomainMemo(
  createBuilder: RhythmDomainBuilderFactory = createRhythmDomainBuilder,
): CanonicalRhythmDomainMemo {
  const store = new Map<string, CanonicalRhythmDomain>()
  let pending: CanonicalRhythmDomainBuildJob | undefined

  /** Intent: a build job for one setting whose end stores the entry and releases `pending`. */
  function newJob(
    key: string,
    input: NormalizedRhythmExpansionInput,
  ): CanonicalRhythmDomainBuildJob {
    const job = createBuildJob(key, input, createBuilder, {
      onComplete: (domain) => {
        if (store.has(key)) throw new Error(`Canonical rhythm domain ${key} was built twice.`)
        store.set(key, domain)
        if (pending === job) pending = undefined
      },
      onDiscard: () => {
        if (pending === job) pending = undefined
      },
    })
    return job
  }

  /** Intent: the stored entry of one key, which a just-completed build must have written. */
  function stored(key: string): CanonicalRhythmDomain {
    const domain = store.get(key)
    if (domain === undefined) throw new Error(`Canonical rhythm domain ${key} was not stored.`)
    return domain
  }

  function lookup(input: RhythmExpansionInput): CanonicalRhythmDomain {
    const normalized = normalizeRhythmExpansionInput(input)
    const key = memoKey(normalized)
    const existing = store.get(key)
    if (existing !== undefined) return existing
    const job = pending?.key === key ? pending : newJob(key, normalized)
    job.runSlice(() => false)
    return stored(key)
  }

  function beginBuild(input: RhythmExpansionInput): CanonicalRhythmDomainBuildJob | undefined {
    const normalized = normalizeRhythmExpansionInput(input)
    const key = memoKey(normalized)
    if (pending?.key === key) return pending
    pending?.cancel()
    if (store.has(key)) return undefined
    pending = newJob(key, normalized)
    return pending
  }

  function discardPendingBuild(): void {
    pending?.cancel()
  }

  function size(): number {
    return store.size
  }

  return { lookup, beginBuild, discardPendingBuild, size }
}

/**
 * Intent: the shared, module-level canonical-rhythm-domain memo instance `generatePhrase` reuses
 * by default across every call in one process, so repeated generations/regenerations against the
 * same rhythm setting skip the expensive Step 6 enumeration.
 */
// @spec-link [[api_rhythm_domain_expansion]]
export const SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO: CanonicalRhythmDomainMemo =
  createCanonicalRhythmDomainMemo()
