/**
 * The rhythm change draw: whether a phrase under locked bars makes one allowed rhythm change, and
 * which of its rhythm candidates carry it. Whether is a hash tie key of its own (FNV-1a over a
 * versioned prefix and the phrase's seed) kept when it falls under the share, with whole-number
 * operations only and no pseudorandom stream, so no other draw or order shifts it. Which are the
 * candidates whose written bars differ from the locked bars by exactly one change of an allowed
 * kind, every kind pooled, in seeded order; they are looked up among the candidates sharing the
 * locked bars' other measures, grouped once per domain, never by comparing the whole domain with
 * the locked bars. The rhythm lock's order walks them first (`rhythm-lock-order.ts`).
 */

import { deepFreeze } from '../events/deep-freeze'
import type { LockedRhythmMeasure, RhythmChangeKind } from '../generation/request-rhythm-lock'
import { fnv1a32 } from '../random/hash32'
import { encodeSeed, type Seed } from '../random/seed'
import { barsKeyedDomainOf, rhythmBarKey, type WrittenMeasure } from './rhythm-bars'
import { rhythmChangeBetween } from './rhythm-change-kinds'
import type { RhythmCandidate } from './rhythm-types'

/** The versioned tie-key prefix the draw hashes before the phrase's seed. */
// @spec-link [[module_rhythm_change_draw]]
export const RHYTHM_CHANGE_TIE_KEY_PREFIX = 'infinite-flow/rhythm-change/v1'

/** The shares are whole numerators over 2 to this power: the top bits of the hash are drawn. */
// @spec-link [[module_rhythm_change_draw]]
// @spec-link [[rule_rhythm_change_share]]
export const RHYTHM_CHANGE_SHARE_BITS = 16

/** A phrase's share of drawing a change: 1 in 4 (16,384 over 2^16). */
// @spec-link [[rule_rhythm_change_share]]
export const RHYTHM_CHANGE_SHARE = 16_384

/** A tenser phrase's share of drawing a change: 1 in 2 (32,768 over 2^16). */
// @spec-link [[rule_rhythm_change_share]]
export const TENSER_RHYTHM_CHANGE_SHARE = 32_768

/** The width of the hash, in bits. */
const HASH_BITS = 32

/** One candidate carrying a change, with the kind of the change it makes. */
// @spec-link [[module_rhythm_change_draw]]
export interface RhythmChangeCandidate {
  readonly rhythm: RhythmCandidate
  readonly kind: RhythmChangeKind
}

/**
 * One phrase's draw: no change, or a change with its candidates in seeded order (empty when no
 * candidate exists, and the phrase keeps the locked rhythm).
 */
// @spec-link [[module_rhythm_change_draw]]
export type RhythmChangeDraw =
  | { readonly changes: false }
  | { readonly changes: true; readonly candidates: readonly RhythmChangeCandidate[] }

/** What the candidates are looked up from. */
export interface RhythmChangeLookupInput {
  /** The phrase's whole rhythm domain in domain order, frozen (the canonical domain memo's list). */
  readonly domain: readonly RhythmCandidate[]
  /** The same candidates in the phrase's seeded order. */
  readonly seeded: readonly RhythmCandidate[]
  /** The request's locked bars. */
  readonly lockedBars: readonly LockedRhythmMeasure[]
  /** The request's allowed changes. */
  readonly allowedChanges: readonly RhythmChangeKind[]
}

/** What one phrase's draw is made from: the lookup's inputs, the seed and the tenser flag. */
export interface RhythmChangeDrawInput extends RhythmChangeLookupInput {
  readonly seed: Seed
  readonly tenserPhrase: boolean
}

/** The measures a single-measure change may touch. */
const MEASURES = [0, 1, 2, 3] as const

/** The gesture and answer measures a repeated change touches together. */
const REPEATED_PAIRS = [
  [0, 2],
  [1, 3],
] as const

/** The draw of a phrase that makes no change, shared. */
const NO_CHANGE: RhythmChangeDraw = deepFreeze({ changes: false })

/** No candidate, shared. */
const NO_CANDIDATES: readonly RhythmChangeCandidate[] = deepFreeze([])

/**
 * Intent: the hash tie key of the draw: FNV-1a 32-bit over the versioned prefix and the seed's
 * documented string encoding, unsigned.
 */
// @spec-link [[module_rhythm_change_draw]]
// @spec-link [[module_named_stream_pseudorandomness]]
export function rhythmChangeHash(seed: Seed): number {
  return fnv1a32(`${RHYTHM_CHANGE_TIE_KEY_PREFIX}|${encodeSeed(seed)}`) >>> 0
}

/**
 * Intent: whether a phrase draws a change: when the top 16 bits of its tie key fall under the
 * share, 1 in 4, or 1 in 2 on a tenser phrase. Reads nothing but the seed and the flag.
 */
// @spec-link [[module_rhythm_change_draw]]
// @spec-link [[rule_rhythm_change_share]]
export function isRhythmChangeDrawn(seed: Seed, tenserPhrase: boolean): boolean {
  const share = tenserPhrase ? TENSER_RHYTHM_CHANGE_SHARE : RHYTHM_CHANGE_SHARE
  return rhythmChangeHash(seed) >>> (HASH_BITS - RHYTHM_CHANGE_SHARE_BITS) < share
}

/**
 * Intent: the lookup keys of a rhythm, from its four measure keys: for each measure, the other
 * three (a change inside that measure keeps them); for each gesture and answer pair, the other two
 * (a repeated change keeps them). A measure key is never empty, so the blank marks the free place.
 */
function lookupKeys(measureKeys: readonly string[]): readonly string[] {
  const keys: string[] = []
  for (const free of MEASURES)
    keys.push(`${free}:${measureKeys.map((key, index) => (index === free ? '' : key)).join('|')}`)
  for (const [gesture, answer] of REPEATED_PAIRS)
    keys.push(
      `r${gesture}:` +
        measureKeys
          .map((key, index) => (index === gesture || index === answer ? '' : key))
          .join('|'),
    )
  return keys
}

/** Each domain's bar keys by lookup key, by the frozen candidate list they were grouped from. */
const changeIndexes = new WeakMap<
  readonly RhythmCandidate[],
  ReadonlyMap<string, readonly string[]>
>()

/**
 * Intent: a domain's bar keys grouped by lookup key, built on first use and then shared; one
 * entry per distinct bar key, so candidates written alike are grouped once. The list must be
 * frozen, as the canonical domain memo's lists are.
 */
function changeIndexOf(domain: readonly RhythmCandidate[]): ReadonlyMap<string, readonly string[]> {
  const cached = changeIndexes.get(domain)
  if (cached) return cached
  const groups = new Map<string, string[]>()
  for (const barKey of barsKeyedDomainOf(domain).byKey.keys())
    for (const lookup of lookupKeys(barKey.split('|'))) {
      const group = groups.get(lookup)
      if (group) group.push(barKey)
      else groups.set(lookup, [barKey])
    }
  const index = new Map<string, readonly string[]>()
  for (const [lookup, group] of groups) index.set(lookup, Object.freeze(group))
  changeIndexes.set(domain, index)
  return index
}

/**
 * Intent: the candidates whose written bars differ from the locked bars by exactly one change of
 * an allowed kind, always measured from the locked bars, every allowed kind pooled, in seeded
 * order. Each bar key sharing the locked bars' other measures is compared once, and candidates
 * written alike come together. Locked bars missing from the domain are matched by their bars.
 */
// @spec-link [[module_rhythm_change_draw]]
// @spec-link [[rule_allowed_rhythm_changes]]
// @spec-link [[rule_rhythm_change_kinds]]
// @spec-link [[rule_rhythm_change_lasts_one_phrase]]
export function rhythmChangeCandidates(
  input: RhythmChangeLookupInput,
): readonly RhythmChangeCandidate[] {
  if (input.allowedChanges.length === 0) return NO_CANDIDATES
  const keyed = barsKeyedDomainOf(input.domain)
  const index = changeIndexOf(input.domain)
  const locked: readonly WrittenMeasure[] = input.lockedBars.map((events, barIndex) => ({
    barIndex,
    events,
  }))
  const lockedKey = rhythmBarKey(locked)
  const compared = new Set<string>([lockedKey])
  const kindByKey = new Map<string, RhythmChangeKind>()
  for (const lookup of lookupKeys(lockedKey.split('|')))
    for (const barKey of index.get(lookup) ?? []) {
      if (compared.has(barKey)) continue
      compared.add(barKey)
      const written = keyed.byKey.get(barKey)![0]!
      const change = rhythmChangeBetween(locked, written.bars)
      if (change && input.allowedChanges.includes(change.kind)) kindByKey.set(barKey, change.kind)
    }
  if (kindByKey.size === 0) return NO_CANDIDATES
  const candidates: RhythmChangeCandidate[] = []
  for (const rhythm of input.seeded) {
    const kind = kindByKey.get(keyed.keys[rhythm.candidateIndex]!)
    if (kind !== undefined) candidates.push(Object.freeze({ rhythm, kind }))
  }
  return Object.freeze(candidates)
}

/**
 * Intent: one phrase's draw. None without an allowed kind (nor, at the caller, without locked
 * bars); otherwise no change, or a change with its candidates in seeded order, possibly none.
 */
// @spec-link [[module_rhythm_change_draw]]
// @spec-link [[rule_allowed_rhythm_changes]]
// @spec-link [[rule_rhythm_change_share]]
export function drawRhythmChange(input: RhythmChangeDrawInput): RhythmChangeDraw | undefined {
  if (input.allowedChanges.length === 0) return undefined
  if (!isRhythmChangeDrawn(input.seed, input.tenserPhrase)) return NO_CHANGE
  return Object.freeze({ changes: true, candidates: rhythmChangeCandidates(input) })
}
