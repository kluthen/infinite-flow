/**
 * The `rhythm-mvp-v2` rhythmic-variety mechanism: per (density, level) beat-cell additions, attack
 * bands, and the dominance floor, plus the dominance predicate and the gesture-level prune that
 * replace the retired Mixed density's coverage rule. Every table here is grammar-version-owned,
 * frozen data -- never a tunable configuration.
 */
import { deepFreeze } from '../events/deep-freeze'
import type { NoteDensity, RhythmicVariety } from '../controls/generation-controls'
import type { NominalTerminal, RhythmBar, UnindexedRhythmCandidate } from './rhythm-types'

const n = (durationTicks: number): NominalTerminal => ({ kind: 'note', durationTicks })
const r = (durationTicks: number): NominalTerminal => ({ kind: 'rest', durationTicks })

/** Today's per-density catalogs, in today's order (catalog indices must not move). */
// @spec-link [[module_rhythm_variety_grammar]]
export const BASE_CATALOGS: Readonly<Record<NoteDensity, readonly (readonly NominalTerminal[])[]>> =
  deepFreeze({
    Quarter: [[n(4)], [r(4)]],
    Eighth: [
      [n(2), n(2)],
      [n(2), r(2)],
      [r(2), n(2)],
      [r(2), r(2)],
    ],
    Sixteenth: [
      [n(1), n(1), n(1), n(1)],
      [n(1), n(1), n(1), r(1)],
      [r(1), n(1), n(1), n(1)],
      [n(1), r(1), n(1), r(1)],
      [r(1), n(1), r(1), n(1)],
      [n(1), n(1), r(1), r(1)],
      [r(1), r(1), n(1), n(1)],
      [r(1), r(1), r(1), r(1)],
    ],
  })

/**
 * The extra beat cells `Slightly varied` and `Heavily varied` append after the base catalog for
 * each density; `Strict` adds nothing at any density (§1, feasibility review).
 */
// @spec-link [[module_rhythm_variety_grammar]]
const EXTRA_CATALOGS: Readonly<
  Record<
    NoteDensity,
    Readonly<Record<Exclude<RhythmicVariety, 'Strict'>, readonly (readonly NominalTerminal[])[]>>
  >
> = deepFreeze({
  Quarter: {
    'Slightly varied': [],
    'Heavily varied': [
      [n(2), n(2)],
      [n(2), r(2)],
      [r(2), n(2)],
    ],
  },
  Eighth: {
    'Slightly varied': [[n(4)], [n(3), n(1)]],
    'Heavily varied': [[n(4)], [n(3), n(1)], [n(2), n(1), n(1)], [n(1), n(1), n(2)]],
  },
  Sixteenth: {
    'Slightly varied': [
      [n(2), n(1), n(1)],
      [n(1), n(1), n(2)],
    ],
    'Heavily varied': [
      [n(2), n(1), n(1)],
      [n(1), n(1), n(2)],
      [n(2), n(1), r(1)],
    ],
  },
})

/** Attack band, in attacks per bar, per density and level (§1, feasibility review). */
// @spec-link [[module_rhythm_variety_grammar]]
const ATTACK_BANDS: Readonly<
  Record<NoteDensity, Readonly<Record<RhythmicVariety, readonly [number, number]>>>
> = deepFreeze({
  Quarter: { Strict: [2, 4], 'Slightly varied': [2, 4], 'Heavily varied': [2, 6] },
  Eighth: { Strict: [4, 8], 'Slightly varied': [3, 9], 'Heavily varied': [3, 10] },
  Sixteenth: { Strict: [8, 16], 'Slightly varied': [6, 16], 'Heavily varied': [5, 16] },
})

/** Floor on the selected density value's share of attacks, per level (§2, feasibility review). */
// @spec-link [[module_rhythm_variety_grammar]]
const MIN_SHARE: Readonly<Record<RhythmicVariety, number>> = deepFreeze({
  Strict: 1,
  'Slightly varied': 0.75,
  'Heavily varied': 0.5,
})

const catalogCache = new Map<string, readonly (readonly NominalTerminal[])[]>()

/** The complete beat-cell catalog for one density and variety level, in canonical order. */
// @spec-link [[module_rhythm_variety_grammar]]
export function beatCellCatalog(
  density: NoteDensity,
  variety: RhythmicVariety,
): readonly (readonly NominalTerminal[])[] {
  const key = `${density}|${variety}`
  let hit = catalogCache.get(key)
  if (!hit) {
    hit =
      variety === 'Strict'
        ? BASE_CATALOGS[density]
        : deepFreeze([...BASE_CATALOGS[density], ...EXTRA_CATALOGS[density][variety]])
    catalogCache.set(key, hit)
  }
  return hit
}

/** The attack-count-per-bar band for one density and variety level. */
// @spec-link [[module_rhythm_variety_grammar]]
export function attackBandFor(
  density: NoteDensity,
  variety: RhythmicVariety,
): readonly [number, number] {
  return ATTACK_BANDS[density][variety]
}

/** The selected note density's tick value: q = 4 (Quarter), 2 (Eighth), or 1 (Sixteenth). */
export function densityTicks(density: NoteDensity): number {
  return density === 'Quarter' ? 4 : density === 'Eighth' ? 2 : 1
}

/** The nominal attack share of q: attacks whose nominal value is q, divided by all attacks. */
// @spec-link [[module_rhythm_variety_grammar]]
export function densityShare(bars: readonly RhythmBar[], q: number): number {
  let attacks = 0
  let atQ = 0
  for (const bar of bars)
    for (const event of bar.events) {
      if (event.kind !== 'note' || event.tieContinuation) continue
      attacks += 1
      if (event.nominalDurationTicks === q) atQ += 1
    }
  return attacks === 0 ? 0 : atQ / attacks
}

/**
 * `rhythmic_variety_violation`: the density value's share of attacks is under the level's floor, or
 * the density value is not dominant. Dominance is the most attacks of any nominal value; a tie is
 * allowed only with a shorter value, because the density value then still covers more sounding time.
 */
// @spec-link [[module_rhythm_variety_grammar]]
export function varietyViolated(candidate: UnindexedRhythmCandidate): boolean {
  const q = densityTicks(candidate.input.noteDensity)
  const variety = candidate.input.rhythmicVariety
  if (densityShare(candidate.bars, q) < MIN_SHARE[variety] - 1e-9) return true
  const counts = new Map<number, number>()
  for (const bar of candidate.bars)
    for (const event of bar.events) {
      if (event.kind !== 'note' || event.tieContinuation) continue
      counts.set(event.nominalDurationTicks, (counts.get(event.nominalDurationTicks) ?? 0) + 1)
    }
  const qCount = counts.get(q) ?? 0
  for (const [value, count] of counts)
    if (value !== q && (count > qCount || (count === qCount && value > q))) return true
  return false
}

/**
 * Gesture-level upper bound on the share a candidate derived from this gesture could reach:
 * transforms never change a source cell's duration, answer bars copy the gesture's cells, and a
 * tie can at best turn a multi-cell event's head into its first source cell. If even that
 * optimistic share is under the floor, no candidate from this gesture can pass
 * `rhythmic_variety_violation`, so the expansion can skip it before freezing or validating anything
 * derived from it.
 */
// @spec-link [[module_rhythm_variety_grammar]]
export function gestureCannotReachShare(
  bars: readonly RhythmBar[],
  density: NoteDensity,
  variety: RhythmicVariety,
): boolean {
  const q = densityTicks(density)
  let attacks = 0
  let best = 0
  for (const bar of bars)
    for (const event of bar.events) {
      if (event.kind !== 'note') continue
      attacks += 1
      if (event.nominalDurationTicks === q || event.sourceCells[0]!.durationTicks === q) best += 1
    }
  return attacks > 0 && best / attacks < MIN_SHARE[variety] - 1e-9
}
