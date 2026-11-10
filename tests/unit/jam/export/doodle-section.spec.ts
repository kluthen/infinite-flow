/**
 * The doodle section a Jam's export files open with, built from the Jam part's doodle and the
 * session's phrase 1: for the MIDI file, the quantized doodle's notes at concert pitch, their
 * starts and lengths in whole notes from the doodle's first barline; for the MusicXML file, the
 * doodle written as the review engraves it (the instrument's written pitch, phrase 1's key, its
 * clef); both at the doodle's capture tempo, as many measures as the doodle. The raw notes played
 * during the doodle never reach it.
 */
import { OFF_CHORD_FAMILIES } from '@/domain/chords/chord-families'
import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { DoodleMeasureCount, QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import type { WrittenMeasure, WrittenNote } from '@/domain/notation/written-phrase-types'
import { BB_TENOR_PROFILE, C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import { makeSeed } from '@/domain/random/seed'
import { makeRational } from '@/domain/time/rational'
import { doodleEngravingContext, doodleWrittenPhrase } from '@/jam/doodle-engraving'
import { exportDoodleSection } from '@/jam/export/doodle-section'
import type { RecordedPlayedNote, ReviewedPhrase } from '@/session/session-history'
import type { SessionDoodle } from '@/session/session-history-played-notes'
import {
  RAW_DOODLE_NOTES,
  jamHistory,
  reviewedJamPart,
} from '../../components/workspace/reviewed-jam-part-fixture'
import { doodleOf } from '../doodle-builders'

/** Phrase 1 of the Jam-style session on the C keyboard, as the review reads it. */
function keyboardPhraseOne(): Pick<ReviewedPhrase, 'intent' | 'clef'> {
  return jamHistory(false).phrases()[0]!
}

/** Intent: phrase 1 of a Jam on the B-flat tenor saxophone, written D major, in treble clef. */
function tenorPhraseOne(): Pick<ReviewedPhrase, 'intent' | 'clef'> {
  const intent = createGenerationIntent({
    requestId: makeRequestId('phrase-1'),
    seed: makeSeed(1),
    controls: makeGenerationControls({
      tempo: 90,
      tonalCenter: 'D',
      collection: 'Major',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Settled',
      noteDensity: 'Quarter',
      rhythmicVariety: 'Strict',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'bb-tenor',
    }),
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    chordFamilies: OFF_CHORD_FAMILIES,
  })
  return { intent, clef: 'treble' }
}

/** Intent: a Jam part's doodle: `doodle` captured at `captureTempo`, with the given raw notes. */
function sessionDoodle(
  doodle: QuantizedDoodle,
  captureTempo: number,
  playedNotes: readonly RecordedPlayedNote[] = RAW_DOODLE_NOTES,
): SessionDoodle {
  return {
    doodle,
    captureTempo,
    firstBarlineAt: 1.25,
    endBarlineAt: 1.25 + (doodle.measureCount * 4 * 60) / captureTempo,
    playedNotes,
  }
}

/** Intent: the notes (not rests) of every measure of a written phrase, in order. */
function writtenNotes(measures: readonly WrittenMeasure[]): WrittenNote[] {
  return measures.flatMap((measure) =>
    measure.events.filter((event): event is WrittenNote => event.kind === 'note'),
  )
}

// @test-link [[rule_jam_exports_open_with_doodle]]
describe('exportDoodleSection: the MIDI section', () => {
  // @test-link [[rule_jam_exports_open_with_doodle]]
  it('holds the quantized doodle at concert pitch, in whole notes from its first barline', () => {
    const doodle = doodleOf(2, [
      [0, 4, 62],
      [4, 2, 64],
      [8, 6, 67],
      [18, 10, 60],
    ])

    const { midi } = exportDoodleSection(sessionDoodle(doodle, 96), keyboardPhraseOne())

    expect(midi).toEqual({
      measureCount: 2,
      tempo: 96,
      notes: [
        { pitch: makeConcertPitch(62), start: makeRational(0, 1), duration: makeRational(1, 4) },
        { pitch: makeConcertPitch(64), start: makeRational(1, 4), duration: makeRational(1, 8) },
        { pitch: makeConcertPitch(67), start: makeRational(1, 2), duration: makeRational(3, 8) },
        { pitch: makeConcertPitch(60), start: makeRational(9, 8), duration: makeRational(5, 8) },
      ],
    })
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  // @test-link [[rule_jam_exports_line_up]]
  it.each<DoodleMeasureCount>([1, 2, 4])(
    'carries the measure count and the capture tempo of a %i-measure doodle',
    (measureCount) => {
      const doodle = doodleOf(measureCount, [[0, 16 * measureCount, 55]])

      const section = exportDoodleSection(sessionDoodle(doodle, 132), keyboardPhraseOne())

      expect(section.midi.measureCount).toBe(measureCount)
      expect(section.midi.tempo).toBe(132)
      expect(section.midi.notes).toEqual([
        {
          pitch: makeConcertPitch(55),
          start: makeRational(0, 1),
          duration: makeRational(measureCount, 1),
        },
      ])
      expect(section.musicXml.measureCount).toBe(measureCount)
      expect(section.musicXml.tempo).toBe(132)
    },
  )

  // @test-link [[rule_jam_exports_open_with_doodle]]
  it('keeps concert pitch for a B-flat instrument', () => {
    const doodle = doodleOf(1, [[0, 8, 48]])

    const { midi } = exportDoodleSection(sessionDoodle(doodle, 100), tenorPhraseOne())

    expect(midi.notes.map((note) => note.pitch)).toEqual([makeConcertPitch(48)])
  })
})

// @test-link [[rule_jam_exports_open_with_doodle]]
describe('exportDoodleSection: the MusicXML section', () => {
  // @test-link [[rule_jam_exports_open_with_doodle]]
  it("writes the doodle as the review engraves it in phrase 1's context, at its capture tempo", () => {
    const part = reviewedJamPart()
    const phraseOne = keyboardPhraseOne()

    const { musicXml } = exportDoodleSection(part.doodle, phraseOne)

    expect(musicXml).toEqual({
      measureCount: part.doodle.doodle.measureCount,
      writtenPhrase: doodleWrittenPhrase(part.doodle.doodle, doodleEngravingContext(phraseOne)),
      tempo: part.doodle.captureTempo,
    })
    expect(musicXml.writtenPhrase.transposition).toEqual(C_KEYBOARD_PROFILE.transposition)
    expect(musicXml.writtenPhrase.measures.flatMap((measure) => measure.chords)).toEqual([])
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  it("writes a B-flat instrument's doodle in its written pitch and phrase 1's written key", () => {
    const doodle = doodleOf(2, [
      [0, 8, 48],
      [16, 8, 54],
    ])
    const phraseOne = tenorPhraseOne()

    const { musicXml } = exportDoodleSection(sessionDoodle(doodle, 100), phraseOne)

    expect(musicXml.writtenPhrase).toEqual(
      doodleWrittenPhrase(doodle, doodleEngravingContext(phraseOne)),
    )
    expect(musicXml.writtenPhrase.transposition).toEqual(BB_TENOR_PROFILE.transposition)
    expect(musicXml.writtenPhrase.key.signature).toMatchObject({ accidental: 'sharp', count: 2 })
    // Concert C3 and F#3, written a major ninth above: D4 and G#4.
    expect(writtenNotes(musicXml.writtenPhrase.measures).map((note) => note.pitch)).toEqual([
      { letter: 'D', alter: 0, octave: 4 },
      { letter: 'G', alter: 1, octave: 4 },
    ])
  })
})

// @test-link [[rule_jam_exports_open_with_doodle]]
// @test-link [[rule_export_contents_never_merged]]
describe('exportDoodleSection: what it is built from', () => {
  // @test-link [[rule_jam_exports_open_with_doodle]]
  // @test-link [[rule_export_contents_never_merged]]
  it('gives the same section whatever raw notes were played during the doodle', () => {
    const phraseOne = keyboardPhraseOne()
    const other: readonly RecordedPlayedNote[] = [
      { pitch: makeConcertPitch(90), velocity: 11, onsetAt: 1.5, releaseAt: 1.75 },
      { pitch: makeConcertPitch(91), velocity: 127, onsetAt: 2, releaseAt: 3 },
    ]

    const withRaw = exportDoodleSection(reviewedJamPart().doodle, phraseOne)

    expect(exportDoodleSection(reviewedJamPart([]).doodle, phraseOne)).toEqual(withRaw)
    expect(exportDoodleSection(reviewedJamPart(other).doodle, phraseOne)).toEqual(withRaw)
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  it('gives the same frozen section for the same doodle and phrase 1', () => {
    const phraseOne = keyboardPhraseOne()

    const first = exportDoodleSection(reviewedJamPart().doodle, phraseOne)

    expect(exportDoodleSection(reviewedJamPart().doodle, phraseOne)).toEqual(first)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first.midi.notes)).toBe(true)
  })
})
