/**
 * Batch rhythm tie-key hashing: computes, for a whole materialized rhythm candidate list and one
 * seed, exactly the keys `rhythmTieKey` gives per candidate, without building a concatenated
 * string per candidate. The versioned prefix is hashed once per call and its FNV-1a state is
 * continued over each identity. Identities are visited in a lexicographic order precomputed once
 * per list; each one resumes from the FNV state checkpointed (every CHECKPOINT_SPAN characters) on
 * the prefix it shares with the identity visited before it. The visiting order only changes how
 * keys are computed: every key is stored at its candidate's input position.
 */

import { FNV_OFFSET_BASIS_32, fnv1a32Resume } from '../../random/hash32'
import { encodeSeed, type Seed } from '../../random/seed'
import type { RhythmCandidate, RhythmGrammarVersion } from '../../rhythm/rhythm-types'

// Characters between two consecutive checkpointed FNV states of the identity being hashed.
const CHECKPOINT_SPAN = 64
// Characters per coarse block when measuring a shared prefix, before refining by CHECKPOINT_SPAN.
const COARSE_SPAN = CHECKPOINT_SPAN * 8

/**
 * Per-list precomputation, independent of the seed: the lexicographic visiting order of the
 * identities (as input positions), for each visited identity the number of whole CHECKPOINT_SPAN
 * blocks of its longest common prefix with the one visited before it (floor(lcp / span), 0 for the
 * first), the longest identity length, and the list's single grammar version (undefined only for
 * an empty list).
 */
// @spec-link [[module_ranked_candidate_ordering]]
export interface RhythmTieKeyPlan {
  readonly grammarVersion: RhythmGrammarVersion | undefined
  readonly visitOrder: Uint32Array
  readonly sharedCheckpoints: Uint32Array
  readonly maxIdentityLength: number
}

/** Typed failure for a candidate list whose candidates do not share one grammar version. */
// @spec-link [[module_ranked_candidate_ordering]]
export class MixedRhythmGrammarVersionError extends Error {
  readonly kind = 'MixedRhythmGrammarVersionError' as const

  constructor(message: string) {
    super(message)
    this.name = 'MixedRhythmGrammarVersionError'
  }
}

// Plans of frozen candidate lists (the canonical-domain memo's lists), so a plan lives and dies
// with the memo entry that holds its list.
const planCache = new WeakMap<readonly RhythmCandidate[], RhythmTieKeyPlan>()

/**
 * Intent: return the single grammar version every candidate carries, crashing on a mixed list
 * (the batch hashes one prefix per call, so it cannot serve two grammar versions at once).
 */
function singleGrammarVersion(
  candidates: readonly RhythmCandidate[],
): RhythmGrammarVersion | undefined {
  const first = candidates[0]?.grammarVersion
  for (const candidate of candidates) {
    if (candidate.grammarVersion !== first) {
      throw new MixedRhythmGrammarVersionError(
        `Rhythm candidates mix grammar versions "${first}" and "${candidate.grammarVersion}".`,
      )
    }
  }
  return first
}

/**
 * Intent: advance `from` by whole `span`-sized blocks while both strings carry the same UTF-16
 * code units over the block, comparing each block as one substring equality (much faster than a
 * per-character loop on long identities).
 */
function extendSharedBlocks(left: string, right: string, from: number, span: number): number {
  const limit = Math.min(left.length, right.length)
  let length = from
  while (
    length + span <= limit &&
    left.substring(length, length + span) === right.substring(length, length + span)
  ) {
    length += span
  }
  return length
}

/**
 * Intent: count the whole CHECKPOINT_SPAN blocks two strings share from their start, i.e.
 * floor(lcp / CHECKPOINT_SPAN), measuring coarse blocks first and then refining.
 */
function sharedCheckpointCount(left: string, right: string): number {
  const coarse = extendSharedBlocks(left, right, 0, COARSE_SPAN)
  return extendSharedBlocks(left, right, coarse, CHECKPOINT_SPAN) / CHECKPOINT_SPAN
}

/**
 * Intent: precompute the seed-independent visiting plan of one candidate list: positions sorted
 * by identity in UTF-16 code-unit order, and each visited identity's shared checkpoint count with
 * its predecessor in that order.
 */
// @spec-link [[module_ranked_candidate_ordering]]
export function buildRhythmTieKeyPlan(candidates: readonly RhythmCandidate[]): RhythmTieKeyPlan {
  const grammarVersion = singleGrammarVersion(candidates)
  const visitOrder = Uint32Array.from(candidates, (_, position) => position).sort((left, right) => {
    const leftIdentity = candidates[left]!.identity
    const rightIdentity = candidates[right]!.identity
    if (leftIdentity < rightIdentity) return -1
    return leftIdentity > rightIdentity ? 1 : 0
  })
  const sharedCheckpoints = new Uint32Array(candidates.length)
  let maxIdentityLength = 0
  for (let rank = 0; rank < visitOrder.length; rank += 1) {
    const identity = candidates[visitOrder[rank]!]!.identity
    maxIdentityLength = Math.max(maxIdentityLength, identity.length)
    if (rank > 0) {
      const previous = candidates[visitOrder[rank - 1]!]!.identity
      sharedCheckpoints[rank] = sharedCheckpointCount(previous, identity)
    }
  }
  return { grammarVersion, visitOrder, sharedCheckpoints, maxIdentityLength }
}

/**
 * Intent: return the plan of a candidate list, caching it only when the list and every candidate
 * are frozen (so no identity can change under the cached plan); a mutable list gets a fresh plan
 * each call, with the same keys.
 */
function planFor(candidates: readonly RhythmCandidate[]): RhythmTieKeyPlan {
  const cached = planCache.get(candidates)
  if (cached !== undefined) return cached
  const plan = buildRhythmTieKeyPlan(candidates)
  if (Object.isFrozen(candidates) && candidates.every((candidate) => Object.isFrozen(candidate))) {
    planCache.set(candidates, plan)
  }
  return plan
}

/**
 * Intent: compute every candidate's rhythm tie key for one seed, bit-identical to `rhythmTieKey`,
 * returned by input position. Hashes `infinite-flow/rhythm-tie/v1|<seed>|<grammar version>|` once,
 * then walks the plan's visiting order, resuming each identity from the checkpoint indexed by its
 * shared checkpoint count with the identity visited before it, and checkpointing its state every
 * CHECKPOINT_SPAN characters.
 */
// @spec-link [[module_ranked_candidate_ordering]]
export function computeRhythmTieKeys(
  candidates: readonly RhythmCandidate[],
  seed: Seed,
): Uint32Array {
  const plan = planFor(candidates)
  const keys = new Uint32Array(candidates.length)
  if (plan.grammarVersion === undefined) return keys
  const prefix = `infinite-flow/rhythm-tie/v1|${encodeSeed(seed)}|${plan.grammarVersion}|`
  // checkpoints[k] = FNV state after the prefix and the first k * CHECKPOINT_SPAN identity chars.
  const checkpoints = new Uint32Array(Math.floor(plan.maxIdentityLength / CHECKPOINT_SPAN) + 1)
  checkpoints[0] = fnv1a32Resume(FNV_OFFSET_BASIS_32, prefix, 0, prefix.length)
  for (let rank = 0; rank < plan.visitOrder.length; rank += 1) {
    const position = plan.visitOrder[rank]!
    const identity = candidates[position]!.identity
    let checkpoint = plan.sharedCheckpoints[rank]!
    let state = checkpoints[checkpoint]!
    let offset = checkpoint * CHECKPOINT_SPAN
    while (offset + CHECKPOINT_SPAN <= identity.length) {
      state = fnv1a32Resume(state, identity, offset, offset + CHECKPOINT_SPAN)
      offset += CHECKPOINT_SPAN
      checkpoint += 1
      checkpoints[checkpoint] = state
    }
    keys[position] = fnv1a32Resume(state, identity, offset, identity.length)
  }
  return keys
}
