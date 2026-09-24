/**
 * Assembles the explicit NotationPhraseInput a display transform reads: the unchanged concert
 * timeline of a completed generation, its selected tonal context, and the concert chord symbols
 * derived from the harmony candidate that produced it. This module never re-decides harmony or
 * pitch; it only restates the already-planned triads as chord symbols placed on the sixteenth
 * grid and validates the explicit input shape a display transform depends on.
 */
import { deepFreeze } from '../events/deep-freeze'
import type { MeasureIndex } from '../events/measure'
import type { HarmonyCandidate, HarmonyEvent, TriadQuality } from '../harmony/harmony-types'
import type { GenerationIntent } from '../generation/generation-intent'
import type { GenerationOutcome } from '../generation/orchestration/orchestration-types'
import type { GenerationResult } from '../generation/generation-result'
import {
  NotationInputError,
  type ConcertChordSymbol,
  type NotationPhraseInput,
  type NotationTonalContext,
} from './written-phrase-types'

/** The chord-symbol suffix carried by each root-position diatonic triad quality. */
// @spec-link [[module_notation_display_convention]]
export const CHORD_SUFFIX_BY_TRIAD_QUALITY: Readonly<Record<TriadQuality, string>> = deepFreeze({
  major: '',
  minor: 'm',
  diminished: 'dim',
})

/** One harmony event's sounding interval in absolute phrase beats [0, 16). */
interface HarmonyInterval {
  readonly start: number
  readonly end: number
  readonly event: HarmonyEvent
}

/** Intent: build the sorted absolute-beat sounding interval for every harmony event. */
function intervalsOf(harmony: HarmonyCandidate): readonly HarmonyInterval[] {
  return harmony.events
    .map((event) => ({
      start: event.barIndex * 4 + event.startBeat,
      end: event.barIndex * 4 + event.startBeat + event.durationBeats,
      event,
    }))
    .sort((a, b) => a.start - b.start)
}

/**
 * Intent: crash early unless the harmony's sounding intervals tile the phrase's 16 beats exactly
 * — contiguous, no gap, no overlap, starting at 0 and ending at 16.
 */
function assertBeatsTileExactly(intervals: readonly HarmonyInterval[]): void {
  let cursor = 0
  for (const interval of intervals) {
    if (interval.start !== cursor) {
      throw new NotationInputError(
        `Harmony events must tile the phrase's 16 beats with no gap or overlap; expected the ` +
          `next event to start at beat ${cursor}, got ${interval.start}.`,
      )
    }
    cursor = interval.end
  }
  if (cursor !== 16) {
    throw new NotationInputError(
      `Harmony events must tile exactly 16 beats; coverage stopped at beat ${cursor}.`,
    )
  }
}

/** Intent: build one root-position concert chord symbol from a harmony event's sounding triad. */
function chordSymbolFor(
  event: HarmonyEvent,
  measureIndex: MeasureIndex,
  startTick: number,
): ConcertChordSymbol {
  return {
    measureIndex,
    startTick,
    root: event.triad.pitchClasses[0],
    suffix: CHORD_SUFFIX_BY_TRIAD_QUALITY[event.triad.quality],
    bass: null,
  }
}

/**
 * Intent: derive one measure's chord symbols — every harmony event starting inside it, plus a
 * restated downbeat chord (at tick 0) when no event starts exactly on the downbeat, since a
 * harmony spanning bars must still be visible at the top of every measure it sounds through.
 */
function chordsForMeasure(
  intervals: readonly HarmonyInterval[],
  measureIndex: MeasureIndex,
): readonly ConcertChordSymbol[] {
  const rangeStart = measureIndex * 4
  const rangeEnd = rangeStart + 4
  const startingHere = intervals.filter(
    (interval) => interval.start >= rangeStart && interval.start < rangeEnd,
  )
  const hasDownbeat = startingHere.some((interval) => interval.start === rangeStart)

  const chords: ConcertChordSymbol[] = []
  if (!hasDownbeat) {
    const covering = intervals.find(
      (interval) => interval.start < rangeStart && interval.end > rangeStart,
    )
    if (covering === undefined) {
      throw new NotationInputError(`Measure ${measureIndex} would have no chord symbol.`)
    }
    chords.push(chordSymbolFor(covering.event, measureIndex, 0))
  }
  for (const interval of startingHere) {
    chords.push(chordSymbolFor(interval.event, measureIndex, (interval.start - rangeStart) * 4))
  }
  return chords
}

/**
 * Intent: derive the concert chord symbols a harmony candidate implies across all four measures,
 * one per harmony change plus a restated downbeat chord for any measure a bar-spanning harmony
 * continues through. Crashes as a typed NotationInputError when the harmony's events do not tile
 * the phrase's 16 beats exactly, or when a measure would otherwise carry no chord.
 */
// @spec-link [[module_notation_display_convention]]
export function chordSymbolsFromHarmony(harmony: HarmonyCandidate): readonly ConcertChordSymbol[] {
  const intervals = intervalsOf(harmony)
  assertBeatsTileExactly(intervals)

  const chords: ConcertChordSymbol[] = []
  for (let measureIndex = 0; measureIndex < 4; measureIndex += 1) {
    chords.push(...chordsForMeasure(intervals, measureIndex as MeasureIndex))
  }
  return deepFreeze(chords)
}

/**
 * Intent: crash early unless a notation input's chord symbols are strictly ascending by measure
 * then tick, every tick is an integer in [0, 15], every measure index is 0-3, and every measure
 * carries a chord symbol at tick 0 — the explicit shape the display transform depends on.
 */
// @spec-link [[module_notation_display_convention]]
export function validateNotationPhraseInput(input: NotationPhraseInput): void {
  const chords = input.chords
  if (chords.length === 0) {
    throw new NotationInputError('Notation input must carry at least one chord symbol.')
  }

  const measuresWithDownbeat = new Set<number>()
  let previousMeasure = -1
  let previousTick = -1
  for (const chord of chords) {
    if (!Number.isInteger(chord.measureIndex) || chord.measureIndex < 0 || chord.measureIndex > 3) {
      throw new NotationInputError(
        `Chord symbol measure index must be 0-3, got ${chord.measureIndex}.`,
      )
    }
    if (!Number.isInteger(chord.startTick) || chord.startTick < 0 || chord.startTick > 15) {
      throw new NotationInputError(
        `Chord symbol start tick must be an integer in [0, 15], got ${chord.startTick}.`,
      )
    }
    const isAscending =
      chord.measureIndex > previousMeasure ||
      (chord.measureIndex === previousMeasure && chord.startTick > previousTick)
    if (previousMeasure !== -1 && !isAscending) {
      throw new NotationInputError('Chord symbols must be strictly ascending by measure then tick.')
    }
    if (chord.startTick === 0) measuresWithDownbeat.add(chord.measureIndex)
    previousMeasure = chord.measureIndex
    previousTick = chord.startTick
  }

  for (let measureIndex = 0; measureIndex < 4; measureIndex += 1) {
    if (!measuresWithDownbeat.has(measureIndex)) {
      throw new NotationInputError(`Measure ${measureIndex} has no chord symbol at tick 0.`)
    }
  }
}

/** The explicit inputs assembled into one NotationPhraseInput. */
export interface MakeNotationPhraseInputArgs {
  readonly result: GenerationResult
  readonly tonalContext: NotationTonalContext
  readonly harmony: HarmonyCandidate
}

/**
 * Intent: assemble and validate the explicit NotationPhraseInput a display transform reads, from
 * an already-produced GenerationResult, its selected tonal context, and the harmony candidate
 * that produced it. References the result's timeline as-is (it is already deep-frozen by its own
 * constructor) rather than copying or otherwise touching it, and deep-freezes only the new
 * envelope object this function returns.
 */
// @spec-link [[module_notation_display_convention]]
export function makeNotationPhraseInput(input: MakeNotationPhraseInputArgs): NotationPhraseInput {
  const chords = chordSymbolsFromHarmony(input.harmony)
  const phraseInput: NotationPhraseInput = {
    timeline: input.result.timeline,
    tonalContext: input.tonalContext,
    chords,
  }
  validateNotationPhraseInput(phraseInput)
  return deepFreeze(phraseInput)
}

/**
 * Intent: build the NotationPhraseInput for one successful generation outcome, deriving the
 * tonal context from the intent's controls and the chord symbols from the outcome's harmony
 * provenance. Crashes as a typed NotationInputError when the outcome's result was not produced by
 * this intent (a mismatched requestId), since a display transform must never be applied to a
 * result it was not generated for.
 */
// @spec-link [[module_notation_display_convention]]
export function notationInputFromOutcome(
  outcome: Extract<GenerationOutcome, { kind: 'generation_success' }>,
  intent: GenerationIntent,
): NotationPhraseInput {
  if (outcome.result.requestId !== intent.requestId) {
    throw new NotationInputError(
      `Generation result requestId "${outcome.result.requestId}" does not match intent ` +
        `requestId "${intent.requestId}".`,
    )
  }
  return makeNotationPhraseInput({
    result: outcome.result,
    tonalContext: {
      tonalCenter: intent.controls.tonalCenter,
      collection: intent.controls.collection,
    },
    harmony: outcome.provenance.harmony,
  })
}
