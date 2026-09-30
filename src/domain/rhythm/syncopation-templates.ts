/**
 * The finite, canonical v1 syncopation template catalog and the per-bar selector memo it reads.
 * Every selector result of a bar is computed at most once per memo and stored in a small vector
 * indexed by selector kind, so the enumeration needs no string key and the fixed gesture bars are
 * resolved once per gesture rather than once per answer list and pattern.
 */
import { deepFreeze } from '../events/deep-freeze'
import type { NoteDensity, Syncopation } from '../controls/generation-controls'
import type { RhythmBar, RhythmTransformDescriptor } from './rhythm-types'
import { disjoint, displacementCandidates, roles, tieCandidate } from './transform-descriptors'

type Selected = RhythmTransformDescriptor | undefined

const ACTIVE_CASES = ['note_to_note', 'interior_rest'] as const
const ACTIVE_DELTAS = [-2, -1, 1, 2] as const
const OCCASIONAL_SELECTORS = ['note_to_note', 'interior_rest', 'tied_sustain'] as const

/** Two Active phrase patterns × eight displacement selectors, one bit per template. */
const ACTIVE_TEMPLATE_COUNT = 16
const ALL_ACTIVE_TEMPLATES = 0xffff

/** The shared frozen role list of every selector-built (syncopation-only) displacement. */
const SYNCOPATION_ROLES = roles(false, true)

/** One bar's Active displacement selector results. */
export interface ActiveSelectors {
  readonly tie: Selected
  /** Slot `caseIndex * 4 + deltaIndex` over `ACTIVE_CASES` × `ACTIVE_DELTAS`, canonical order. */
  readonly displacements: readonly Selected[]
  /** Bit k is set exactly when `displacements[k]` exists. */
  readonly displacementBits: number
}

/** One bar's selector vectors, each filled on first use by its syncopation level. */
export interface BarSelectors {
  active?: ActiveSelectors
  occasional?: readonly Selected[]
}

/**
 * Per-bar memo of the pure syncopation selectors for one rhythm expansion, keyed by the immutable
 * bar object. No selector requires the density grid, so no result depends on the density and the
 * bar alone is the key. A gesture's bars, and every answer bar an answer list leaves untouched, are
 * the same objects across that gesture's answer lists, so each selector runs once per bar instead
 * of once per template. Weakly keyed, so a bar no candidate retains is freed.
 */
// @spec-link [[mechanic_syncopation_enumeration]]
export type SyncopationSelectorMemo = WeakMap<RhythmBar, BarSelectors>

/** The memo entry of one bar, created empty on first use. */
function barSelectors(memo: SyncopationSelectorMemo, bar: RhythmBar): BarSelectors {
  let entry = memo.get(bar)
  if (!entry) {
    entry = {}
    memo.set(bar, entry)
  }
  return entry
}

/** The bar's Active selectors: the tie over beats 2-4 and each (case, delta) displacement. */
function activeSelectors(
  memo: SyncopationSelectorMemo,
  bar: RhythmBar,
  density: NoteDensity,
): ActiveSelectors {
  const entry = barSelectors(memo, bar)
  if (entry.active) return entry.active
  const displacements: Selected[] = []
  let displacementBits = 0
  for (const displacement of ACTIVE_CASES)
    for (const delta of ACTIVE_DELTAS) {
      const selected = displacementCandidates(
        bar,
        density,
        displacement,
        [delta],
        SYNCOPATION_ROLES,
        false,
      )[0]
      if (selected) displacementBits |= 1 << displacements.length
      displacements.push(selected)
    }
  entry.active = { tie: tieCandidate(bar, [4, 8, 12]), displacements, displacementBits }
  return entry.active
}

/** The bar's Occasional selectors, indexed like `OCCASIONAL_SELECTORS`. */
function occasionalSelectors(
  memo: SyncopationSelectorMemo,
  bar: RhythmBar,
  density: NoteDensity,
): readonly Selected[] {
  const entry = barSelectors(memo, bar)
  entry.occasional ??= OCCASIONAL_SELECTORS.map((selector) =>
    selector === 'tied_sustain'
      ? tieCandidate(bar, [8])
      : displacementCandidates(bar, density, selector, [2], SYNCOPATION_ROLES, false)[0],
  )
  return entry.occasional
}

/** Whether the bar at `position` takes the tie in the Active template `bit` (pattern = bit >> 3). */
function activeTakesTie(position: number, bit: number): boolean {
  return (position % 2 === 0) === bit < 8
}

/**
 * Bit `pattern * 8 + caseIndex * 4 + deltaIndex` is set when every given bar, read at its array
 * position, has the selector that Active template needs. Bits ascend in canonical template order.
 * Any legal Active template of a phrase is a set bit of this mask over its four bars, so a zero
 * mask over any prefix (such as the two gesture bars) proves that no template exists.
 */
// @spec-link [[mechanic_syncopation_enumeration]]
export function activeTemplateMask(
  bars: readonly RhythmBar[],
  density: NoteDensity,
  memo: SyncopationSelectorMemo,
): number {
  let mask = ALL_ACTIVE_TEMPLATES
  for (let position = 0; position < bars.length && mask !== 0; position += 1) {
    const selectors = activeSelectors(memo, bars[position]!, density)
    const tieBits = selectors.tie ? 0xff : 0
    mask &=
      position % 2 === 0
        ? tieBits | (selectors.displacementBits << 8)
        : selectors.displacementBits | (tieBits << 8)
  }
  return mask
}

/** Active templates: both phrase patterns × each (case, delta), skipping impossible ones by mask. */
function* activeTemplates(
  bars: readonly RhythmBar[],
  density: NoteDensity,
  memo: SyncopationSelectorMemo,
): IterableIterator<readonly RhythmTransformDescriptor[]> {
  const mask = activeTemplateMask(bars, density, memo)
  for (let bit = 0; bit < ACTIVE_TEMPLATE_COUNT; bit += 1) {
    if ((mask & (1 << bit)) === 0) continue
    const template = bars.map((bar, position) => {
      const selectors = activeSelectors(memo, bar, density)
      return (activeTakesTie(position, bit) ? selectors.tie : selectors.displacements[bit & 7])!
    })
    if (disjoint(template)) yield template
  }
}

const barSetsByLength = new Map<number, readonly (readonly number[])[]>()

/** Every one- and two-bar position set of a phrase, by cardinality then lexicographic order. */
function barSetsOf(length: number): readonly (readonly number[])[] {
  let barSets = barSetsByLength.get(length)
  if (!barSets) {
    const positions = Array.from({ length }, (_, index) => index)
    barSets = deepFreeze([
      ...positions.map((index) => [index]),
      ...positions.flatMap((left) => positions.slice(left + 1).map((right) => [left, right])),
    ])
    barSetsByLength.set(length, barSets)
  }
  return barSets
}

/**
 * Occasional templates: cardinality, lexicographic bar set, then shared selector. A bar set that
 * misses a dual-role answer bar admits no selector, so it is skipped before the selector loop.
 */
function* occasionalTemplates(
  bars: readonly RhythmBar[],
  density: NoteDensity,
  coalesced: readonly RhythmTransformDescriptor[],
  memo: SyncopationSelectorMemo,
): IterableIterator<readonly RhythmTransformDescriptor[]> {
  const dualByBar = new Map(
    coalesced
      .filter(
        (descriptor) =>
          descriptor.roles.length === 2 &&
          descriptor.roles[0] === 'answer' &&
          descriptor.roles[1] === 'syncopation',
      )
      .map((descriptor) => [descriptor.barIndex, descriptor] as const),
  )
  if (dualByBar.size !== coalesced.length) return
  const dualBars = [...dualByBar.keys()]
  for (const barSet of barSetsOf(bars.length)) {
    if (dualBars.some((barIndex) => !barSet.includes(barIndex))) continue
    for (const [selectorIndex, selector] of OCCASIONAL_SELECTORS.entries()) {
      const template = barSet.map((index) => {
        const dual = dualByBar.get(index as 0 | 1 | 2 | 3)
        if (dual)
          return dual.case === selector && (selector === 'tied_sustain' || dual.delta === 2)
            ? undefined
            : null
        return occasionalSelectors(memo, bars[index]!, density)[selectorIndex]
      })
      if (
        template.every(
          (descriptor, index) =>
            descriptor !== null &&
            (descriptor !== undefined || dualByBar.has(barSet[index]! as 0 | 1 | 2 | 3)),
        )
      )
        yield template.filter(
          (descriptor): descriptor is RhythmTransformDescriptor => descriptor !== undefined,
        )
    }
  }
}

/** The single, empty Straight template. */
const STRAIGHT_TEMPLATE: readonly RhythmTransformDescriptor[] = deepFreeze([])

/**
 * The canonical v1 syncopation template lists without freezing them, for the rhythm planner, which
 * never publishes a template list (a candidate records a fresh transform list; the descriptors in
 * a template are frozen when built). Same lists in the same order as
 * `enumerateSyncopationTemplates`.
 */
// @spec-link [[mechanic_syncopation_enumeration]]
export function* syncopationTemplateLists(
  bars: readonly RhythmBar[],
  density: NoteDensity,
  syncopation: Syncopation,
  coalesced: readonly RhythmTransformDescriptor[],
  memo: SyncopationSelectorMemo,
): IterableIterator<readonly RhythmTransformDescriptor[]> {
  if (syncopation === 'Straight') {
    yield STRAIGHT_TEMPLATE
    return
  }
  if (syncopation === 'Occasional offbeats') {
    yield* occasionalTemplates(bars, density, coalesced, memo)
    return
  }
  if (bars.length !== 4) return
  yield* activeTemplates(bars, density, memo)
}

/**
 * Enumerate the finite, canonical v1 syncopation template catalog as immutable lists. Pass one
 * `memo` across the calls of a single expansion to share selector results between answer lists.
 */
// @spec-link [[mechanic_syncopation_enumeration]]
export function* enumerateSyncopationTemplates(
  bars: readonly RhythmBar[],
  density: NoteDensity,
  syncopation: Syncopation,
  coalesced: readonly RhythmTransformDescriptor[] = [],
  memo: SyncopationSelectorMemo = new WeakMap(),
): IterableIterator<readonly RhythmTransformDescriptor[]> {
  for (const template of syncopationTemplateLists(bars, density, syncopation, coalesced, memo))
    yield deepFreeze(template)
}
