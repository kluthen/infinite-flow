import { describe, expect, it } from 'vitest'

import type { Collection, PitchClass } from '@/domain/controls/generation-controls'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure, type Measure, type MeasureIndex } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent, type MeasureEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline, type ConcertEventTimeline } from '@/domain/events/timeline'
import { makeRational } from '@/domain/time/rational'
import { makeSeed } from '@/domain/random/seed'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { writtenToConcertTonalCenter } from '@/domain/generation/generation-intent'
import type { InstrumentTransposition } from '@/domain/profile/instrument-profile'
import { BB_TENOR_PROFILE, EB_ALTO_PROFILE } from '@/domain/profile/instrument-profiles'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import {
  NotationInputError,
  type ConcertChordSymbol,
  type Letter,
  type NotationPhraseInput,
  type WrittenNote,
} from '@/domain/notation/written-phrase-types'
import { buildOrchestratorIntent } from '../generation/orchestration/generation-orchestrator-fixture'

const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

/** The three shipped instrument-profile transpositions, exercised in place of the retired notation modes. */
const TRANSPOSITIONS: Record<string, InstrumentTransposition> = {
  Concert: { chromatic: 0, diatonic: 0 },
  'B-flat tenor': { chromatic: 14, diatonic: 8 },
  'E-flat alto': { chromatic: 9, diatonic: 5 },
}
const CONCERT: InstrumentTransposition = TRANSPOSITIONS.Concert!
const TRANSPOSITION_NAMES = Object.keys(TRANSPOSITIONS)

function note(pitch: number, ticks: number, tieContinuation = false): MeasureEvent {
  return makeNoteEvent({
    duration: makeRational(ticks, 16),
    pitch: makeConcertPitch(pitch),
    tieContinuation,
  })
}

function rest(ticks: number): MeasureEvent {
  return makeRestEvent({ duration: makeRational(ticks, 16) })
}

function measure(index: MeasureIndex, events: readonly MeasureEvent[]): Measure {
  return makeMeasure(index, events)
}

/** A four-measure timeline of whole-note tonic attacks at the given concert pitch. */
function wholeNoteTimeline(pitch = 60): ConcertEventTimeline {
  return makeConcertEventTimeline(
    [0, 1, 2, 3].map((i) => measure(i as MeasureIndex, [note(pitch, 16)])),
  )
}

/** One chord symbol at every measure's downbeat, using the given root/suffix/bass. */
function tonicChordEachMeasure(
  root: ConcertChordSymbol['root'] = 0,
  suffix = '',
  bass: ConcertChordSymbol['bass'] = null,
): readonly ConcertChordSymbol[] {
  return [0, 1, 2, 3].map((measureIndex) => ({
    measureIndex: measureIndex as MeasureIndex,
    startTick: 0,
    root,
    suffix,
    bass,
  }))
}

function inputOf(
  timeline: ConcertEventTimeline,
  tonalCenter: PitchClass,
  collection: Collection,
  chords: readonly ConcertChordSymbol[] = tonicChordEachMeasure(),
  transposition: InstrumentTransposition = CONCERT,
): NotationPhraseInput {
  return { timeline, tonalContext: { tonalCenter, collection }, chords, transposition }
}

const C_MAJOR_SINGLE_NOTE = inputOf(wholeNoteTimeline(60), 'C', 'Major')

// @test-link [[rule_notation_display_preserves_phrase]]
describe('transformToWrittenPhrase: chromatic transposition per instrument profile', () => {
  it('renders concert C4 unchanged at concert transposition', () => {
    const phrase = transformToWrittenPhrase(C_MAJOR_SINGLE_NOTE)
    const glyph = phrase.measures[0]!.events[0] as WrittenNote
    expect(glyph.pitch).toEqual({ letter: 'C', alter: 0, octave: 4 })
  })

  it('renders concert C4 as written D5 (major ninth) at the B-flat tenor transposition', () => {
    const phrase = transformToWrittenPhrase({
      ...C_MAJOR_SINGLE_NOTE,
      transposition: TRANSPOSITIONS['B-flat tenor']!,
    })
    const glyph = phrase.measures[0]!.events[0] as WrittenNote
    expect(glyph.pitch).toEqual({ letter: 'D', alter: 0, octave: 5 })
  })

  it('renders concert C4 as written A4 (major sixth) at the E-flat alto transposition', () => {
    const phrase = transformToWrittenPhrase({
      ...C_MAJOR_SINGLE_NOTE,
      transposition: TRANSPOSITIONS['E-flat alto']!,
    })
    const glyph = phrase.measures[0]!.events[0] as WrittenNote
    expect(glyph.pitch).toEqual({ letter: 'A', alter: 0, octave: 4 })
  })

  it('shifts every written letter of a whole scale by each transposition diatonic interval mod 7', () => {
    // C4..C5 ascending diatonic scale as eighth notes filling measure 0 exactly (8 * 2 = 16 ticks).
    const scalePitches = [60, 62, 64, 65, 67, 69, 71, 72]
    const timeline = makeConcertEventTimeline([
      measure(
        0,
        scalePitches.map((pitch) => note(pitch, 2)),
      ),
      measure(1, [note(60, 16)]),
      measure(2, [note(60, 16)]),
      measure(3, [note(60, 16)]),
    ])
    const input = inputOf(timeline, 'C', 'Major')

    for (const name of TRANSPOSITION_NAMES) {
      const transposition = TRANSPOSITIONS[name]!
      const phrase = transformToWrittenPhrase({ ...input, transposition })
      const glyphs = phrase.measures[0]!.events as readonly WrittenNote[]
      const concertLetters = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C']
      glyphs.forEach((glyph, index) => {
        const concertIndex = LETTERS.indexOf(concertLetters[index] as Letter)
        const writtenIndex = LETTERS.indexOf(glyph.pitch.letter)
        const stepDelta = (((writtenIndex - concertIndex) % 7) + 7) % 7
        expect(stepDelta).toBe(transposition.diatonic % 7)
      })
    }
  })
})

// @test-link [[rule_notation_display_preserves_phrase]]
describe('transformToWrittenPhrase: enharmonic minimization', () => {
  it('spells a written C# tonal center with the fewest accidentals, independent of instrument transposition', () => {
    for (const name of TRANSPOSITION_NAMES) {
      const input = inputOf(wholeNoteTimeline(60), 'C#', 'Major', undefined, TRANSPOSITIONS[name]!)
      expect(transformToWrittenPhrase(input).key.tonic).toEqual({ letter: 'D', alter: -1 })
    }
  })

  it('breaks a fewest-accidental tie in favor of the sharp spelling', () => {
    const input = inputOf(wholeNoteTimeline(60), 'F#', 'Major')
    const phrase = transformToWrittenPhrase(input)
    expect(phrase.key.tonic).toEqual({ letter: 'F', alter: 1 })
    expect(phrase.key.signature.accidental).toBe('sharp')
  })

  it('spells every note and chord root inside the key scale, never a shadow enharmonic', () => {
    for (const name of TRANSPOSITION_NAMES) {
      const input = inputOf(
        wholeNoteTimeline(60),
        'C#',
        'Major',
        tonicChordEachMeasure(1),
        TRANSPOSITIONS[name]!,
      )
      const phrase = transformToWrittenPhrase(input)
      for (const measureResult of phrase.measures) {
        for (const chord of measureResult.chords) {
          const inScale = phrase.key.scale.find((degree) => degree.letter === chord.root.letter)
          expect(inScale).toBeDefined()
          expect(inScale!.alter).toBe(chord.root.alter)
        }
      }
    }
  })
})

/**
 * Gate report (specs/versions/v1/gate-execution-report.md §5, spelling risk): written keys whose
 * concert counterpart spells differently must be spelled from the written selection itself, never
 * re-derived from the converted concert tonal center.
 */
// @test-link [[rule_notation_display_preserves_phrase]]
// @test-link [[module_generation_request_construction]]
describe('transformToWrittenPhrase: written/concert spelling divergence', () => {
  it('spells written F# Ionian on the B-flat tenor as F# major (6 sharps), from the written selection', () => {
    // Concert counterpart is E, which would otherwise spell with zero accidentals -- if the
    // signature were wrongly re-derived from concert pitch, this would fail.
    expect(writtenToConcertTonalCenter('F#', BB_TENOR_PROFILE)).toBe('E')

    const input = inputOf(
      wholeNoteTimeline(66),
      'F#',
      'Ionian',
      undefined,
      BB_TENOR_PROFILE.transposition,
    )
    const phrase = transformToWrittenPhrase(input)
    expect(phrase.key.tonic).toEqual({ letter: 'F', alter: 1 })
    expect(phrase.key.signature).toMatchObject({
      accidental: 'sharp',
      count: 6,
      ionianTonic: { letter: 'F', alter: 1 },
    })
  })

  it('spells a written flat-side pitch class (lowest-accidental rule) on the E-flat alto as D-flat major (5 flats)', () => {
    // Written C# (the only spelling PITCH_CLASSES offers for this pitch class) has strictly fewer
    // accidentals spelled as D-flat major (5 flats) than as C# major (7 sharps).
    expect(writtenToConcertTonalCenter('C#', EB_ALTO_PROFILE)).toBe('E')

    const input = inputOf(
      wholeNoteTimeline(61),
      'C#',
      'Major',
      undefined,
      EB_ALTO_PROFILE.transposition,
    )
    const phrase = transformToWrittenPhrase(input)
    expect(phrase.key.tonic).toEqual({ letter: 'D', alter: -1 })
    expect(phrase.key.signature).toMatchObject({
      accidental: 'flat',
      count: 5,
      ionianTonic: { letter: 'D', alter: -1 },
    })
  })
})

// @test-link [[module_notation_display_convention]]
describe('transformToWrittenPhrase: chord symbols', () => {
  it('preserves a slash-bass chord suffix verbatim and respells root/bass in the display key', () => {
    const chords = tonicChordEachMeasure(0, 'maj7', 4)

    for (const name of TRANSPOSITION_NAMES) {
      const input = inputOf(wholeNoteTimeline(60), 'C', 'Major', chords, TRANSPOSITIONS[name]!)
      const phrase = transformToWrittenPhrase(input)
      const chord = phrase.measures[0]!.chords[0]!
      expect(chord.suffix).toBe('maj7')
      expect(chord.bass).not.toBeNull()
      expect(chord.text).toContain('maj7')
      expect(chord.text).toContain('/')
    }
  })

  it.each(['m7b5', 'maj7#11', 'sus4', '7(omit3)'])(
    'preserves the exact suffix string "%s" at every instrument transposition',
    (suffix) => {
      const chords = tonicChordEachMeasure(3, suffix, null)
      for (const name of TRANSPOSITION_NAMES) {
        const input = inputOf(wholeNoteTimeline(60), 'C', 'Major', chords, TRANSPOSITIONS[name]!)
        const phrase = transformToWrittenPhrase(input)
        expect(phrase.measures[0]!.chords[0]!.suffix).toBe(suffix)
        expect(phrase.measures[0]!.chords[0]!.text.endsWith(suffix)).toBe(true)
      }
    },
  )

  it('places a mid-measure chord change at tick 8 and splits a sustained note into tied glyphs', () => {
    const timeline = makeConcertEventTimeline([
      measure(0, [note(60, 4), note(60, 8), note(60, 4)]),
      measure(1, [note(60, 16)]),
      measure(2, [note(60, 16)]),
      measure(3, [note(60, 16)]),
    ])
    // Root-position C major triad at beat 0 for 2 beats, F major from beat 2 through the phrase.
    const spanningChords: readonly ConcertChordSymbol[] = [
      { measureIndex: 0, startTick: 0, root: 0, suffix: '', bass: null },
      { measureIndex: 0, startTick: 8, root: 5, suffix: '', bass: null },
      { measureIndex: 1, startTick: 0, root: 5, suffix: '', bass: null },
      { measureIndex: 2, startTick: 0, root: 5, suffix: '', bass: null },
      { measureIndex: 3, startTick: 0, root: 5, suffix: '', bass: null },
    ]
    const input = inputOf(timeline, 'C', 'Major', spanningChords)
    const phrase = transformToWrittenPhrase(input)

    const measure0Chords = phrase.measures[0]!.chords
    expect(measure0Chords.map((c) => c.startTick)).toEqual([0, 8])

    const middleEventGlyphs = (phrase.measures[0]!.events as readonly WrittenNote[]).filter(
      (event) => event.sourceEventIndex === 1,
    )
    expect(middleEventGlyphs.map((g) => g.startTick)).toEqual([4, 8])
    expect(middleEventGlyphs[0]!.tieToNext).toBe(true)
    expect(middleEventGlyphs[1]!.tieFromPrevious).toBe(true)
  })

  it('restates a bar-spanning harmony at each downbeat it sounds through', () => {
    const timeline = wholeNoteTimeline(60)
    const spanningChords: readonly ConcertChordSymbol[] = [
      { measureIndex: 0, startTick: 0, root: 0, suffix: '', bass: null },
      { measureIndex: 1, startTick: 0, root: 0, suffix: '', bass: null },
      { measureIndex: 2, startTick: 0, root: 0, suffix: '', bass: null },
      { measureIndex: 3, startTick: 0, root: 0, suffix: '', bass: null },
    ]
    const phrase = transformToWrittenPhrase(inputOf(timeline, 'C', 'Major', spanningChords))
    phrase.measures.forEach((measureResult) => {
      expect(measureResult.chords).toHaveLength(1)
      expect(measureResult.chords[0]!.startTick).toBe(0)
    })
  })
})

// @test-link [[module_notation_display_convention]]
describe('transformToWrittenPhrase: displayed accidental measure state', () => {
  it('shows a repeated chromatic note once, a return to diatonic as a natural, then resets next measure', () => {
    const timeline = makeConcertEventTimeline([
      measure(0, [note(61, 4), note(61, 4), note(60, 4), note(60, 4)]),
      measure(1, [note(61, 4), note(61, 4), note(60, 4), note(60, 4)]),
      measure(2, [note(60, 16)]),
      measure(3, [note(60, 16)]),
    ])
    const phrase = transformToWrittenPhrase(inputOf(timeline, 'C', 'Major'))

    const measure0 = phrase.measures[0]!.events as readonly WrittenNote[]
    expect(measure0.map((e) => e.accidental)).toEqual(['sharp', null, 'natural', null])

    const measure1 = phrase.measures[1]!.events as readonly WrittenNote[]
    expect(measure1[0]!.accidental).toBe('sharp')
  })

  it('tracks accidental state per octave independently', () => {
    const timeline = makeConcertEventTimeline([
      measure(0, [note(61, 4), note(73, 4), note(61, 4), note(73, 4)]),
      measure(1, [note(60, 16)]),
      measure(2, [note(60, 16)]),
      measure(3, [note(60, 16)]),
    ])
    const phrase = transformToWrittenPhrase(inputOf(timeline, 'C', 'Major'))
    const events = phrase.measures[0]!.events as readonly WrittenNote[]
    expect(events.map((e) => e.accidental)).toEqual(['sharp', 'sharp', null, null])
    expect(events[0]!.pitch.octave).not.toBe(events[1]!.pitch.octave)
  })

  it('shows no accidental on a tied continuation across the barline, then shows one on a later untied same note', () => {
    const timeline = makeConcertEventTimeline([
      measure(0, [rest(12), note(61, 4)]),
      measure(1, [note(61, 4, true), note(61, 4), rest(8)]),
      measure(2, [note(60, 16)]),
      measure(3, [note(60, 16)]),
    ])
    const phrase = transformToWrittenPhrase(inputOf(timeline, 'C', 'Major'))
    const measure1Notes = phrase.measures[1]!.events.filter(
      (e) => e.kind === 'note',
    ) as WrittenNote[]
    expect(measure1Notes[0]!.tieFromPrevious).toBe(true)
    expect(measure1Notes[0]!.accidental).toBeNull()
    expect(measure1Notes[1]!.tieFromPrevious).toBe(false)
    expect(measure1Notes[1]!.accidental).toBe('sharp')
  })
})

// @test-link [[rule_notation_display_preserves_phrase]]
describe('transformToWrittenPhrase: non-mutation and cross-transposition determinism', () => {
  it('never mutates the input and produces identical output for the same transposition regardless of call order', () => {
    const timeline = wholeNoteTimeline(60)
    const input = inputOf(timeline, 'C', 'Major')
    Object.freeze(input)

    const before = structuredClone({
      timeline: input.timeline,
      tonalContext: input.tonalContext,
      chords: input.chords,
      transposition: input.transposition,
    })

    const order: readonly string[] = [
      'Concert',
      'B-flat tenor',
      'E-flat alto',
      'Concert',
      'E-flat alto',
      'B-flat tenor',
    ]
    const outputsByName = new Map<string, unknown[]>()
    for (const name of order) {
      const phrase = transformToWrittenPhrase({ ...input, transposition: TRANSPOSITIONS[name]! })
      const list = outputsByName.get(name) ?? []
      list.push(structuredClone(phrase))
      outputsByName.set(name, list)
    }

    const after = structuredClone({
      timeline: input.timeline,
      tonalContext: input.tonalContext,
      chords: input.chords,
      transposition: input.transposition,
    })
    expect(after).toEqual(before)
    expect(input.timeline).toBe(timeline)

    for (const snapshots of outputsByName.values()) {
      snapshots.forEach((snapshot) => expect(snapshot).toEqual(snapshots[0]))
    }
  })

  it('returns a fully frozen phrase whose measures and events cannot be mutated', () => {
    const phrase = transformToWrittenPhrase(C_MAJOR_SINGLE_NOTE)
    expect(Object.isFrozen(phrase)).toBe(true)
    expect(Object.isFrozen(phrase.measures)).toBe(true)
    expect(Object.isFrozen(phrase.measures[0])).toBe(true)
    expect(Object.isFrozen(phrase.measures[0]!.events)).toBe(true)
    expect(Object.isFrozen(phrase.measures[0]!.events[0])).toBe(true)
    expect(Object.isFrozen(phrase.key)).toBe(true)
    expect(Object.isFrozen(phrase.key.scale)).toBe(true)
  })
})

// @test-link [[module_notation_display_convention]]
describe('transformToWrittenPhrase: real end-to-end generation', () => {
  const seeds = [makeSeed(7), makeSeed(11), makeSeed(23)]

  it.each(seeds)(
    'renders a real generated phrase (seed %s) with exact tiling at every instrument transposition',
    (seed) => {
      const intent = buildOrchestratorIntent('Middle', seed)

      const outcome = generatePhrase(intent)
      if (outcome.kind !== 'generation_success')
        throw new Error('Expected a successful generation.')

      const outcomeSnapshotBefore = JSON.stringify({
        request: outcome.request,
        result: outcome.result,
        provenance: outcome.provenance,
      })

      const notationInput = notationInputFromOutcome(outcome, intent)

      for (const name of TRANSPOSITION_NAMES) {
        const phrase = transformToWrittenPhrase({
          ...notationInput,
          transposition: TRANSPOSITIONS[name]!,
        })
        phrase.measures.forEach((measureResult, measureIndex) => {
          const totalTicks = measureResult.events.reduce(
            (sum, event) => sum + event.duration.ticks,
            0,
          )
          expect(totalTicks).toBe(16)

          const noteGlyphCount = measureResult.events.filter(
            (event) => event.kind === 'note',
          ).length
          const sourceAttacks = outcome.result.timeline.measures[measureIndex]!.events.filter(
            (event) => event.kind === 'note',
          ).length
          expect(noteGlyphCount).toBeGreaterThanOrEqual(sourceAttacks)
        })
      }

      const outcomeSnapshotAfter = JSON.stringify({
        request: outcome.request,
        result: outcome.result,
        provenance: outcome.provenance,
      })
      expect(outcomeSnapshotAfter).toBe(outcomeSnapshotBefore)
    },
  )
})

// @test-link [[entity_instrument_profile]]
describe('transformToWrittenPhrase: unforeseen instrument transposition', () => {
  it('renders a full phrase for a TEST-ONLY instrument transposition unlike any shipped preset, with no code change outside this test', () => {
    // An open, fabricated chromatic/diatonic pair no shipped preset uses (neither B-flat tenor's
    // 14/8 nor E-flat alto's 9/5): proves the pipeline branches on nothing but the pair's values.
    const testOnlyTransposition: InstrumentTransposition = { chromatic: 21, diatonic: 12 }
    const input = inputOf(
      wholeNoteTimeline(60),
      'C',
      'Major',
      tonicChordEachMeasure(1, 'maj7', 4),
      testOnlyTransposition,
    )
    const phrase = transformToWrittenPhrase(input)

    expect(phrase.transposition).toEqual(testOnlyTransposition)
    phrase.measures.forEach((measureResult) => {
      const totalTicks = measureResult.events.reduce((sum, event) => sum + event.duration.ticks, 0)
      expect(totalTicks).toBe(16)
    })
    const glyph = phrase.measures[0]!.events[0] as WrittenNote
    // written midi = concert 60 + chromatic 21 = 81; concert 60 = C4, so written is written up a
    // major thirteenth-ish interval driven purely by the fabricated transposition pair.
    expect(glyph.pitch.letter).toBeDefined()
    const chord = phrase.measures[0]!.chords[0]!
    expect(chord.suffix).toBe('maj7')
    // The written tonal center is C Ionian regardless of transposition: the key signature is
    // always spelled from the written selection, never re-derived from concert pitch.
    expect(phrase.key.signature.count).toBe(0)
  })

  it('renders a full phrase for a second TEST-ONLY +2/+1 transposition, with no code change outside this test', () => {
    // A second open, fabricated chromatic/diatonic pair no shipped preset uses.
    const testOnlyTransposition: InstrumentTransposition = { chromatic: 2, diatonic: 1 }
    const input = inputOf(
      wholeNoteTimeline(60),
      'C',
      'Ionian',
      tonicChordEachMeasure(1, 'maj7', 4),
      testOnlyTransposition,
    )
    const phrase = transformToWrittenPhrase(input)

    expect(phrase.transposition).toEqual(testOnlyTransposition)
    // written midi = concert 60 + chromatic 2 = 62 = written D4.
    const glyph = phrase.measures[0]!.events[0] as WrittenNote
    expect(glyph.pitch).toEqual({ letter: 'D', alter: 0, octave: 4 })
    const chord = phrase.measures[0]!.chords[0]!
    expect(chord.suffix).toBe('maj7')
    expect(phrase.key.signature.count).toBe(0)
  })
})

// @test-link [[module_notation_display_convention]]
describe('transformToWrittenPhrase: rejections', () => {
  it('rejects an input whose chords do not validate', () => {
    const badInput: NotationPhraseInput = {
      timeline: wholeNoteTimeline(60),
      tonalContext: { tonalCenter: 'C', collection: 'Major' },
      chords: [{ measureIndex: 0, startTick: 4, root: 0, suffix: '', bass: null }],
      transposition: CONCERT,
    }
    expect(() => transformToWrittenPhrase(badInput)).toThrow(NotationInputError)
  })

  it('rejects measure 0 opening with a dangling tie continuation', () => {
    const timeline = makeConcertEventTimeline([
      measure(0, [note(60, 4, true), note(60, 12)]),
      measure(1, [note(60, 16)]),
      measure(2, [note(60, 16)]),
      measure(3, [note(60, 16)]),
    ])
    expect(() => transformToWrittenPhrase(inputOf(timeline, 'C', 'Major'))).toThrow(
      NotationInputError,
    )
  })

  it('rejects a tie continuation whose pitch does not match the end of the previous measure', () => {
    const timeline = makeConcertEventTimeline([
      measure(0, [note(60, 16)]),
      measure(1, [note(62, 4, true), note(62, 12)]),
      measure(2, [note(60, 16)]),
      measure(3, [note(60, 16)]),
    ])
    expect(() => transformToWrittenPhrase(inputOf(timeline, 'C', 'Major'))).toThrow(
      NotationInputError,
    )
  })
})
