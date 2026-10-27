// @vitest-environment node
/**
 * Jam's side of the empty system: the key signature it carries for Jam's written key and
 * collection, spelled as a phrase's is, for each of the nine collections in two keys (one with no
 * accidentals, one with some), and the staff it is drawn on for the selected instrument: treble
 * clef and the profile's written range for a built-in, my instrument's own clef and range. The
 * expected signatures come from music theory: a mode shares the key signature of the major key
 * (its Ionian) whose scale holds the same notes.
 */
import { describe, expect, it } from 'vitest'

import type { Collection, PitchClass } from '@/domain/controls/generation-controls'
import type { Letter } from '@/domain/notation/written-phrase-types'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import {
  emptySystemStaffOf,
  jamInstrumentRangeInClef,
  jamKeySignature,
} from '@/jam/empty-system-engraving'

/** One expected key signature: the key and collection, then the signature theory gives them. */
interface SignatureCase {
  readonly name: string
  readonly tonalCenter: PitchClass
  readonly collection: Collection
  readonly accidental: 'sharp' | 'flat' | null
  readonly letters: readonly Letter[]
  /** The major key sharing the signature: its tonic letter and alteration. */
  readonly ionian: { readonly letter: Letter; readonly alter: -1 | 0 | 1 }
}

const C_MAJOR_SIGNATURE = {
  accidental: null,
  letters: [],
  ionian: { letter: 'C', alter: 0 },
} as const

/** The nine collections on white-key tonics: every one shares C major's signature, no accidental. */
const NO_ACCIDENTAL_CASES: readonly SignatureCase[] = [
  { name: 'C major', tonalCenter: 'C', collection: 'Major', ...C_MAJOR_SIGNATURE },
  { name: 'A minor', tonalCenter: 'A', collection: 'Minor', ...C_MAJOR_SIGNATURE },
  { name: 'C Ionian', tonalCenter: 'C', collection: 'Ionian', ...C_MAJOR_SIGNATURE },
  { name: 'D Dorian', tonalCenter: 'D', collection: 'Dorian', ...C_MAJOR_SIGNATURE },
  { name: 'E Phrygian', tonalCenter: 'E', collection: 'Phrygian', ...C_MAJOR_SIGNATURE },
  { name: 'F Lydian', tonalCenter: 'F', collection: 'Lydian', ...C_MAJOR_SIGNATURE },
  { name: 'G Mixolydian', tonalCenter: 'G', collection: 'Mixolydian', ...C_MAJOR_SIGNATURE },
  { name: 'A Aeolian', tonalCenter: 'A', collection: 'Aeolian', ...C_MAJOR_SIGNATURE },
  { name: 'B Locrian', tonalCenter: 'B', collection: 'Locrian', ...C_MAJOR_SIGNATURE },
]

/**
 * The nine collections in a second key each, with accidentals. Sharps are added in the order F C G
 * D A E B, flats in the order B E A D G C F. A written key the controls name as a sharp (A#) is
 * spelled with the fewest accidentals: B-flat (two flats) rather than A-sharp (ten sharps).
 */
const ACCIDENTAL_CASES: readonly SignatureCase[] = [
  {
    name: 'D major: two sharps, F# and C#',
    tonalCenter: 'D',
    collection: 'Major',
    accidental: 'sharp',
    letters: ['F', 'C'],
    ionian: { letter: 'D', alter: 0 },
  },
  {
    name: 'C minor: three flats, Bb Eb Ab, as E-flat major',
    tonalCenter: 'C',
    collection: 'Minor',
    accidental: 'flat',
    letters: ['B', 'E', 'A'],
    ionian: { letter: 'E', alter: -1 },
  },
  {
    name: 'B-flat Ionian (written key A#): two flats, Bb and Eb',
    tonalCenter: 'A#',
    collection: 'Ionian',
    accidental: 'flat',
    letters: ['B', 'E'],
    ionian: { letter: 'B', alter: -1 },
  },
  {
    name: 'E Dorian: two sharps, as D major',
    tonalCenter: 'E',
    collection: 'Dorian',
    accidental: 'sharp',
    letters: ['F', 'C'],
    ionian: { letter: 'D', alter: 0 },
  },
  {
    name: 'B Phrygian: one sharp, as G major',
    tonalCenter: 'B',
    collection: 'Phrygian',
    accidental: 'sharp',
    letters: ['F'],
    ionian: { letter: 'G', alter: 0 },
  },
  {
    name: 'B-flat Lydian (written key A#): one flat, as F major',
    tonalCenter: 'A#',
    collection: 'Lydian',
    accidental: 'flat',
    letters: ['B'],
    ionian: { letter: 'F', alter: 0 },
  },
  {
    name: 'D Mixolydian: one sharp, as G major',
    tonalCenter: 'D',
    collection: 'Mixolydian',
    accidental: 'sharp',
    letters: ['F'],
    ionian: { letter: 'G', alter: 0 },
  },
  {
    name: 'F# Aeolian: three sharps, as A major',
    tonalCenter: 'F#',
    collection: 'Aeolian',
    accidental: 'sharp',
    letters: ['F', 'C', 'G'],
    ionian: { letter: 'A', alter: 0 },
  },
  {
    name: 'E Locrian: one flat, as F major',
    tonalCenter: 'E',
    collection: 'Locrian',
    accidental: 'flat',
    letters: ['B'],
    ionian: { letter: 'F', alter: 0 },
  },
]

// @test-link [[rule_jam_idle_shows_no_phrase]]
describe("the empty system's key signature", () => {
  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it.each([...NO_ACCIDENTAL_CASES, ...ACCIDENTAL_CASES])(
    '$name',
    ({ tonalCenter, collection, accidental, letters, ionian }) => {
      const signature = jamKeySignature(tonalCenter, collection)
      expect(signature.accidental).toBe(accidental)
      expect(signature.count).toBe(letters.length)
      expect(signature.letters).toEqual(letters)
      expect(signature.ionianTonic).toEqual(ionian)
    },
  )
})

/** My instrument in bass clef, written C2 to C4 (MIDI 36 to 60), sounding an octave lower. */
const MY_BASS = makeMyInstrument({
  template: 'c-keyboard',
  name: 'My bass',
  clef: 'bass',
  writtenRange: { minMidi: 36, maxMidi: 60 },
  transposition: { octaves: 1, semitones: 0, direction: 'lower' },
})

/** My instrument in treble clef, written C3 to C6 (MIDI 48 to 84), sounding a minor third lower. */
const MY_TREBLE = makeMyInstrument({
  template: 'c-keyboard',
  name: 'My horn in A',
  clef: 'treble',
  writtenRange: { minMidi: 48, maxMidi: 84 },
  transposition: { octaves: 0, semitones: 3, direction: 'lower' },
})

// @test-link [[rule_jam_idle_shows_no_phrase]]
describe("the empty system's staff for the selected instrument", () => {
  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it.each([
    // The C MIDI keyboard is written as it sounds, C3 to C5.
    { id: 'c-keyboard', minMidi: 48, maxMidi: 72 },
    // The saxophones are written C4 to C6: the tenor a major ninth, the alto a major sixth above.
    { id: 'bb-tenor', minMidi: 60, maxMidi: 84 },
    { id: 'eb-alto', minMidi: 60, maxMidi: 84 },
  ] as const)('draws the $id built-in in treble clef, at its written range', (expected) => {
    expect(jamInstrumentRangeInClef(expected.id, MY_BASS)).toEqual({
      writtenRange: { minMidi: expected.minMidi, maxMidi: expected.maxMidi },
      clef: 'treble',
    })
  })

  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it('draws my instrument in its own clef and written range, bass or treble', () => {
    expect(jamInstrumentRangeInClef('my-instrument', MY_BASS)).toEqual({
      writtenRange: { minMidi: 36, maxMidi: 60 },
      clef: 'bass',
    })
    expect(jamInstrumentRangeInClef('my-instrument', MY_TREBLE)).toEqual({
      writtenRange: { minMidi: 48, maxMidi: 84 },
      clef: 'treble',
    })
  })

  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it('refuses my instrument named when none exists, a selection that never outlives it', () => {
    expect(() => jamInstrumentRangeInClef('my-instrument', null)).toThrow(/does not exist/)
  })

  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it("gives the engraver the instrument's staff with the key's signature", () => {
    const staff = emptySystemStaffOf({
      tonalCenter: 'E',
      collection: 'Dorian',
      instrumentProfileId: 'my-instrument',
      myInstrument: MY_BASS,
    })
    expect(staff.rangeInClef).toEqual({ writtenRange: { minMidi: 36, maxMidi: 60 }, clef: 'bass' })
    expect(staff.signature).toEqual(jamKeySignature('E', 'Dorian'))
  })
})
