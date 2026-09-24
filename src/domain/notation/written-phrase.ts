/**
 * The pure written-phrase display transform: turns one explicit NotationPhraseInput plus a
 * selected NotationMode into a WrittenPhrase carrying every engraving decision (spelling, key
 * signature, displayed accidentals, notated durations, ties, beam groups, chord-symbol
 * placement). Never mutates its input and never re-decides harmony or pitch — it only re-renders
 * the already-planned concert phrase for one display convention, deterministically and
 * independently of any other convention's rendering of the same input.
 */
import { PITCH_CLASSES } from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'
import type { ConcertEventTimeline } from '../events/timeline'
import type { Measure, MeasureIndex } from '../events/measure'
import type { PitchClassNumber } from '../harmony/harmony-types'
import {
  DISPLAY_TRANSPOSITIONS,
  type DisplayTransposition,
  type NotationMode,
} from './notation-mode'
import { validateNotationPhraseInput } from './notation-input'
import {
  pitchClassText,
  spellMidiInKey,
  spellPitchClassInKey,
  spellWrittenKey,
} from './pitch-spelling'
import { beamGroupsFor, segmentMeasure, type RhythmSegment } from './rhythm-notation'
import { createAccidentalState, nextDisplayedAccidental } from './written-accidentals'
import {
  NotationInputError,
  type ConcertChordSymbol,
  type NotationPhraseInput,
  type WrittenChordSymbol,
  type WrittenEvent,
  type WrittenKey,
  type WrittenMeasure,
  type WrittenNote,
  type WrittenPhrase,
  type WrittenRest,
} from './written-phrase-types'

/** Intent: normalize any integer pitch class into the closed 0..11 PitchClassNumber range. */
function pcMod12(value: number): PitchClassNumber {
  return (((value % 12) + 12) % 12) as PitchClassNumber
}

/**
 * Intent: crash early unless a measure's tie-continuation opening is resolvable across the
 * barline: measure 0 may never open with a tie continuation, and any later measure's opening tie
 * continuation must follow a note of the same concert pitch at the end of the previous measure.
 */
function assertCrossMeasureTieResolvable(
  timeline: ConcertEventTimeline,
  measureIndex: MeasureIndex,
): void {
  const firstEvent = timeline.measures[measureIndex].events[0]!
  const opensWithTie = firstEvent.kind === 'note' && firstEvent.tieContinuation
  if (!opensWithTie) return

  if (measureIndex === 0) {
    throw new NotationInputError('Measure 0 may not open with a tie continuation.')
  }
  const previousMeasure = timeline.measures[measureIndex - 1]!
  const previousLastEvent = previousMeasure.events[previousMeasure.events.length - 1]!
  if (previousLastEvent.kind !== 'note' || previousLastEvent.pitch !== firstEvent.pitch) {
    throw new NotationInputError(
      `Measure ${measureIndex} opens with a tie continuation that does not follow the same ` +
        `concert pitch at the end of measure ${measureIndex - 1}.`,
    )
  }
}

/** Intent: report whether the measure right after `measureIndex` opens with a tie continuation. */
function nextMeasureStartsWithTie(
  timeline: ConcertEventTimeline,
  measureIndex: MeasureIndex,
): boolean {
  if (measureIndex === 3) return false
  const nextFirstEvent = timeline.measures[measureIndex + 1]!.events[0]!
  return nextFirstEvent.kind === 'note' && nextFirstEvent.tieContinuation
}

/** Intent: the chord-symbol start ticks of one measure, the forced rhythm-segmentation boundaries. */
function forcedBoundariesFor(
  chords: readonly ConcertChordSymbol[],
  measureIndex: MeasureIndex,
): readonly number[] {
  return chords
    .filter((chord) => chord.measureIndex === measureIndex)
    .map((chord) => chord.startTick)
}

/**
 * Intent: render one measure's rhythm segments into written glyphs, spelling each note's written
 * pitch in the display key and deciding its displayed accidental from fresh per-measure state.
 */
function buildWrittenEvents(
  measure: Measure,
  segments: readonly RhythmSegment[],
  key: WrittenKey,
  transposition: DisplayTransposition,
): readonly WrittenEvent[] {
  const accidentalState = createAccidentalState()

  return segments.map((segment): WrittenEvent => {
    if (segment.kind === 'rest') {
      const rest: WrittenRest = {
        kind: 'rest',
        startTick: segment.startTick,
        duration: segment.duration,
        sourceEventIndex: segment.sourceEventIndex,
      }
      return rest
    }

    const sourceEvent = measure.events[segment.sourceEventIndex]!
    if (sourceEvent.kind !== 'note') {
      throw new NotationInputError(
        `Rhythm segment at tick ${segment.startTick} claims a note but its source event is a rest.`,
      )
    }
    const writtenMidi = sourceEvent.pitch + transposition.chromatic
    const pitch = spellMidiInKey(writtenMidi, key)
    const accidental = nextDisplayedAccidental(accidentalState, pitch, key, segment.tieFromPrevious)

    const note: WrittenNote = {
      kind: 'note',
      startTick: segment.startTick,
      duration: segment.duration,
      pitch,
      accidental,
      tieFromPrevious: segment.tieFromPrevious,
      tieToNext: segment.tieToNext,
      sourceEventIndex: segment.sourceEventIndex,
    }
    return note
  })
}

/** Intent: respell one concert chord symbol's root and optional bass in the display key. */
function respellChord(
  chord: ConcertChordSymbol,
  transposition: DisplayTransposition,
  key: WrittenKey,
): WrittenChordSymbol {
  const root = spellPitchClassInKey(pcMod12(chord.root + transposition.chromatic), key)
  const bass =
    chord.bass === null
      ? null
      : spellPitchClassInKey(pcMod12(chord.bass + transposition.chromatic), key)
  const text = `${pitchClassText(root)}${chord.suffix}${bass === null ? '' : `/${pitchClassText(bass)}`}`
  return { startTick: chord.startTick, root, suffix: chord.suffix, bass, text }
}

/**
 * Intent: crash early unless every chord symbol in a rendered measure lands on an actual glyph
 * start tick, the placement guarantee `WrittenMeasure` documents.
 */
function assertChordsAlignToGlyphs(
  events: readonly WrittenEvent[],
  chords: readonly WrittenChordSymbol[],
  measureIndex: MeasureIndex,
): void {
  const glyphStarts = new Set(events.map((event) => event.startTick))
  for (const chord of chords) {
    if (!glyphStarts.has(chord.startTick)) {
      throw new NotationInputError(
        `Measure ${measureIndex} chord symbol at tick ${chord.startTick} does not align with any ` +
          'notated glyph start.',
      )
    }
  }
}

/** Intent: render one measure of the phrase into its written glyphs, beam groups, and chords. */
function buildWrittenMeasure(
  input: NotationPhraseInput,
  measureIndex: MeasureIndex,
  transposition: DisplayTransposition,
  key: WrittenKey,
): WrittenMeasure {
  assertCrossMeasureTieResolvable(input.timeline, measureIndex)

  const measure = input.timeline.measures[measureIndex]
  const forcedBoundaryTicks = forcedBoundariesFor(input.chords, measureIndex)
  const nextTie = nextMeasureStartsWithTie(input.timeline, measureIndex)
  const segments = segmentMeasure(measure, forcedBoundaryTicks, nextTie)

  const events = buildWrittenEvents(measure, segments, key, transposition)
  const beamGroups = beamGroupsFor(segments)
  const chords = input.chords
    .filter((chord) => chord.measureIndex === measureIndex)
    .map((chord) => respellChord(chord, transposition, key))

  assertChordsAlignToGlyphs(events, chords, measureIndex)

  return deepFreeze({ index: measureIndex, events, beamGroups, chords })
}

/**
 * Intent: transform one explicit NotationPhraseInput into the WrittenPhrase for one display
 * convention. Pure: reads only its inputs, never mutates the input timeline or chords, and
 * returns a brand-new deep-frozen value every call, so rendering the same input in every mode (in
 * any order, any number of times) never affects any other mode's rendering.
 */
// @spec-link [[module_notation_display_convention]]
// @spec-link [[rule_notation_display_preserves_phrase]]
export function transformToWrittenPhrase(
  input: NotationPhraseInput,
  mode: NotationMode,
): WrittenPhrase {
  validateNotationPhraseInput(input)

  const transposition = DISPLAY_TRANSPOSITIONS[mode]
  const writtenTonicPc = pcMod12(
    PITCH_CLASSES.indexOf(input.tonalContext.tonalCenter) + transposition.chromatic,
  )
  const key = spellWrittenKey(writtenTonicPc, input.tonalContext.collection)

  const [first, second, third, fourth] = [0, 1, 2, 3].map((index) =>
    buildWrittenMeasure(input, index as MeasureIndex, transposition, key),
  ) as [WrittenMeasure, WrittenMeasure, WrittenMeasure, WrittenMeasure]
  const measures: readonly [WrittenMeasure, WrittenMeasure, WrittenMeasure, WrittenMeasure] = [
    first,
    second,
    third,
    fourth,
  ]

  return deepFreeze({
    mode,
    transposition,
    clef: 'treble',
    timeSignature: { beats: 4, beatValue: 4 },
    key,
    measures,
  })
}
