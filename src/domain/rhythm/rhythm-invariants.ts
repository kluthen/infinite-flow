/**
 * Candidate predicates shared by the rhythm validator and the enumeration prefilter. Each one is
 * the exact test the validator applies for one validation code, so a candidate the prefilter
 * rejects is one the validator would also reject.
 */

import type { RhythmBar, UnindexedRhythmCandidate } from './rhythm-types'

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
export function lacksMetricalAnchor(bar: RhythmBar): boolean {
  return !bar.events.some(
    (event) => event.kind === 'note' && (event.startTick === 0 || event.startTick === 8),
  )
}

/**
 * Whether the bars' nominal source cells include the 1-, 2- and 4-tick duration classes that
 * Mixed density requires. Transforms move boundaries but never change a source cell's duration,
 * and answer bars copy the gesture's cells, so a gesture's own bars already decide this for
 * every phrase derived from it.
 */
// @spec-link [[module_rhythm_domain_validation]]
export function coversMixedDurationClasses(bars: readonly RhythmBar[]): boolean {
  const durations = new Set<number>()
  for (const bar of bars)
    for (const event of bar.events)
      for (const cell of event.sourceCells) durations.add(cell.durationTicks)
  return [1, 2, 4].every((duration) => durations.has(duration))
}

/**
 * `active_anchor_ratio_violation`: under Active displacement, the phrase needs an offbeat
 * displaced attack and a realized tied sustain, and no bar may carry more syncopation events than
 * sounding beat-1/beat-3 anchors.
 */
// @spec-link [[module_rhythm_domain_validation]]
export function activeAnchorRatioViolated(candidate: UnindexedRhythmCandidate): boolean {
  if (candidate.input.syncopation !== 'Active displacement') return false
  const syncopated = candidate.transforms.filter((descriptor) =>
    descriptor.roles.includes('syncopation'),
  )
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
      candidate.bars[descriptor.barIndex]?.events.some(
        (event) => event.tieContinuation && event.tieChainId === descriptor.tieChainId,
      ),
  )
  return (
    !hasOffbeatDisplacedAttack ||
    !hasTiedSustain ||
    candidate.bars.some((bar) => {
      const anchors = bar.events.filter(
        (event) =>
          event.kind === 'note' &&
          !event.tieContinuation &&
          (event.startTick === 0 || event.startTick === 8),
      ).length
      const syncopatedEvents = syncopated.filter(
        (descriptor) => descriptor.barIndex === bar.barIndex,
      ).length
      return anchors < syncopatedEvents
    })
  )
}

/**
 * The enumeration prefilter: true only when `validateRhythmCandidate` would certainly report a
 * failure (metrical anchor, Mixed coverage, active anchor ratio, or answer variation), so the
 * caller can skip freezing, validation, and identity work for that candidate. False means the
 * full validator decides.
 */
// @spec-link [[module_rhythm_domain_validation]]
// @spec-link [[api_rhythm_domain_expansion]]
export function quickRejectRhythmCandidate(candidate: UnindexedRhythmCandidate): boolean {
  if (candidate.bars.some(lacksMetricalAnchor)) return true
  if (candidate.input.noteDensity === 'Mixed' && !coversMixedDurationClasses(candidate.bars))
    return true
  if (activeAnchorRatioViolated(candidate)) return true
  return (
    candidate.bars.length === 4 &&
    canonicalEndingSignature(candidate.bars[1]!) === canonicalEndingSignature(candidate.bars[3]!)
  )
}
