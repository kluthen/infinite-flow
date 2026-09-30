/**
 * Candidate predicates shared by the rhythm validator and the enumeration prefilter. Each one is
 * the exact test the validator applies for one validation code, so a candidate the prefilter
 * rejects is one the validator would also reject.
 */

import type { NoteDensity, RhythmicVariety } from '../controls/generation-controls'
import type { RhythmBar, RhythmTransformDescriptor, UnindexedRhythmCandidate } from './rhythm-types'
import { attackBandFor, varietyViolated } from './rhythm-variety'

/** Whether two source-cell addresses name the same bar, beat, and cell. */
// @spec-link [[module_rhythm_domain_validation]]
export function sameAddress(
  left: { readonly barIndex: number; readonly beatIndex: number; readonly cellIndex: number },
  right: { readonly barIndex: number; readonly beatIndex: number; readonly cellIndex: number },
): boolean {
  return (
    left.barIndex === right.barIndex &&
    left.beatIndex === right.beatIndex &&
    left.cellIndex === right.cellIndex
  )
}

/** The answer-ending policy deliberately ignores variation before the final ending unit. */
// @spec-link [[module_rhythm_domain_validation]]
export function canonicalEndingSignature(bar: RhythmBar): string {
  const sourceCells = bar.events.flatMap((event) => event.sourceCells)
  let finalCellIndex = -1
  for (let index = sourceCells.length - 1; index >= 0; index -= 1) {
    if (sourceCells[index]!.kind === 'note') {
      finalCellIndex = index
      break
    }
  }
  const finalCell = sourceCells[finalCellIndex]
  if (!finalCell) return 'no_final_non_rest_cell'
  const renderedIndex = bar.events.findIndex((event) =>
    event.sourceCells.some((cell) => sameAddress(cell.address, finalCell.address)),
  )
  const rendered = bar.events[renderedIndex]
  if (!rendered) return 'missing_rendered_final_non_rest_cell'
  return JSON.stringify({
    finalNonRest: {
      source: { kind: finalCell.kind, durationTicks: finalCell.durationTicks },
      rendered: {
        kind: rendered.kind,
        startTick: rendered.startTick,
        durationTicks: rendered.durationTicks,
        tieChainId: rendered.tieChainId,
        tieContinuation: rendered.tieContinuation ?? false,
      },
    },
    trailingRests: {
      source: sourceCells.slice(finalCellIndex + 1).map((cell) => ({
        kind: cell.kind,
        durationTicks: cell.durationTicks,
      })),
      rendered: bar.events.slice(renderedIndex + 1).map((event) => ({
        kind: event.kind,
        durationTicks: event.durationTicks,
      })),
    },
  })
}

/** `metrical_anchor_missing`: no note starts on beat 1 or beat 3 of the bar. */
// @spec-link [[module_rhythm_domain_validation]]
// @spec-link [[rule_preserve_metrical_anchor]]
export function lacksMetricalAnchor(bar: RhythmBar): boolean {
  return !bar.events.some(
    (event) => event.kind === 'note' && (event.startTick === 0 || event.startTick === 8),
  )
}

/** Sounding beat-1/beat-3 anchors of one bar: note attacks, not tie continuations, at tick 0 or 8. */
// @spec-link [[module_rhythm_domain_validation]]
export function soundingAnchorCount(bar: RhythmBar): number {
  let anchors = 0
  for (const event of bar.events)
    if (
      event.kind === 'note' &&
      !event.tieContinuation &&
      (event.startTick === 0 || event.startTick === 8)
    )
      anchors += 1
  return anchors
}

/** The bar's attacks: start ticks of its note events that are not tie continuations, in order. */
// @spec-link [[module_rhythm_domain_validation]]
// @spec-link [[api_rhythm_domain_expansion]]
export function attackTicks(bar: RhythmBar): readonly number[] {
  const ticks: number[] = []
  for (const event of bar.events)
    if (event.kind === 'note' && !event.tieContinuation) ticks.push(event.startTick)
  return ticks
}

/** `density_attack_band_violation` for one bar: its attack count lies outside the level's band. */
// @spec-link [[module_rhythm_domain_validation]]
// @spec-link [[api_rhythm_domain_expansion]]
export function attackBandViolated(
  bar: RhythmBar,
  density: NoteDensity,
  variety: RhythmicVariety,
): boolean {
  const attacks = attackTicks(bar).length
  const [minimum, maximum] = attackBandFor(density, variety)
  return attacks < minimum || attacks > maximum
}

/**
 * `answer_similarity_violation` on a four-bar phrase: the answer bars 3-4 must repeat at least
 * max(2, half, rounded up) of the gesture bars 1-2's attacks at the same tick of the matching bar.
 * `attackTicksOf` must equal `attackTicks`, so the enumeration can pass cached per-bar values.
 * Any other bar count is a caller bug and throws.
 */
// @spec-link [[module_rhythm_domain_validation]]
// @spec-link [[api_rhythm_domain_expansion]]
export function answerSimilarityViolatedBy(
  bars: readonly RhythmBar[],
  attackTicksOf: (bar: RhythmBar) => readonly number[],
): boolean {
  if (bars.length !== 4) throw new RangeError('answer similarity needs exactly four bars')
  let gestureAttacks = 0
  let shared = 0
  for (const halfBarIndex of [0, 1]) {
    const answer = attackTicksOf(bars[halfBarIndex + 2]!)
    for (const tick of attackTicksOf(bars[halfBarIndex]!)) {
      gestureAttacks += 1
      if (answer.includes(tick)) shared += 1
    }
  }
  return shared < Math.max(2, Math.ceil(gestureAttacks / 2))
}

/**
 * `active_anchor_ratio_violation`: under Active displacement, the phrase needs an offbeat
 * displaced attack and a realized tied sustain, and no bar may carry more syncopation events than
 * sounding beat-1/beat-3 anchors.
 */
// @spec-link [[module_rhythm_domain_validation]]
export function activeAnchorRatioViolated(candidate: UnindexedRhythmCandidate): boolean {
  if (candidate.input.syncopation !== 'Active displacement') return false
  return activeAnchorRatioViolatedBy(
    candidate.bars,
    candidate.transforms.filter((descriptor) => descriptor.roles.includes('syncopation')),
    soundingAnchorCount,
  )
}

/**
 * The Active displacement anchor-ratio test on its parts: the phrase bars, the descriptors carrying
 * the syncopation role (in any order), and a per-bar anchor count equal to `soundingAnchorCount`,
 * so the enumeration can run it from cached per-bar facts before it assembles a candidate.
 */
// @spec-link [[module_rhythm_domain_validation]]
export function activeAnchorRatioViolatedBy(
  bars: readonly RhythmBar[],
  syncopated: readonly RhythmTransformDescriptor[],
  anchorsOf: (bar: RhythmBar) => number,
): boolean {
  const hasOffbeatDisplacedAttack = syncopated.some((descriptor) => {
    if (descriptor.case === 'tied_sustain') return false
    const attackTick =
      descriptor.case === 'interior_rest'
        ? descriptor.transformedBoundaries[1]
        : descriptor.transformedBoundaries[0]
    return attackTick !== undefined && attackTick % 4 !== 0
  })
  const hasTiedSustain = syncopated.some(
    (descriptor) =>
      descriptor.case === 'tied_sustain' &&
      bars[descriptor.barIndex]?.events.some(
        (event) => event.tieContinuation && event.tieChainId === descriptor.tieChainId,
      ),
  )
  return (
    !hasOffbeatDisplacedAttack ||
    !hasTiedSustain ||
    bars.some((bar) => {
      const syncopatedEvents = syncopated.filter(
        (descriptor) => descriptor.barIndex === bar.barIndex,
      ).length
      return anchorsOf(bar) < syncopatedEvents
    })
  )
}

/**
 * The enumeration prefilter: true only when `validateRhythmCandidate` would certainly report a
 * failure (metrical anchor, rhythmic-variety dominance, active anchor ratio, or answer variation),
 * so the caller can skip freezing, validation, and identity work for that candidate. False means
 * the full validator decides.
 */
// @spec-link [[module_rhythm_domain_validation]]
// @spec-link [[api_rhythm_domain_expansion]]
// @spec-link [[module_rhythm_variety_grammar]]
export function quickRejectRhythmCandidate(candidate: UnindexedRhythmCandidate): boolean {
  if (candidate.bars.some(lacksMetricalAnchor)) return true
  if (varietyViolated(candidate)) return true
  if (activeAnchorRatioViolated(candidate)) return true
  return (
    candidate.bars.length === 4 &&
    canonicalEndingSignature(candidate.bars[1]!) === canonicalEndingSignature(candidate.bars[3]!)
  )
}
