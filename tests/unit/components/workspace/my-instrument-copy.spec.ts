/**
 * The My instrument sheet's words: note names in the one spelling, the transposition's value,
 * interval name and example note, the range's refusals in note names and the staff-reach note.
 */
import { describe, expect, it } from 'vitest'

import {
  intervalNameText,
  noteName,
  rangeRefusalLines,
  soundingC4Name,
  staffReachNote,
  transpositionNoteText,
  transpositionValueA11yText,
  transpositionValueText,
} from '@/components/workspace/my-instrument-copy'

/** The MIDI note of a note name in the sheet's spelling, for readable cases. */
const NOTE: Record<string, number> = {
  E0: 16,
  B1: 35,
  C2: 36,
  E1: 28,
  E2: 40,
  E3: 52,
  B3: 59,
  C4: 60,
  F3: 53,
  'C♯5': 73,
  E5: 76,
  F5: 77,
  C7: 96,
  'C♯7': 97,
}

/** Intent: a written range from two note names. */
function range(lowest: string, highest: string) {
  return { minMidi: NOTE[lowest]!, maxMidi: NOTE[highest]! }
}

// @test-link [[rule_my_instrument_transposition_named_interval]]
describe('the transposition, in words', () => {
  // @test-link [[rule_my_instrument_transposition_named_interval]]
  it.each([
    [
      -14,
      '14 lower',
      'A major ninth lower (an octave and a major second): a written C4 sounds as B♭2.',
    ],
    [-9, '9 lower', 'A major sixth lower: a written C4 sounds as E♭3.'],
    [0, 'Same', 'No transposition: a written C4 sounds as C4.'],
    [-12, '12 lower', 'One octave lower: a written C4 sounds as C3.'],
    [6, '6 higher', 'An augmented fourth higher: a written C4 sounds as F♯4.'],
    [1, '1 higher', 'A minor second higher: a written C4 sounds as D♭4.'],
    [-6, '6 lower', 'An augmented fourth lower: a written C4 sounds as G♭3.'],
    [-11, '11 lower', 'A major seventh lower: a written C4 sounds as D♭3.'],
    [
      13,
      '13 higher',
      'A minor ninth higher (an octave and a minor second): a written C4 sounds as D♭5.',
    ],
    [-24, '24 lower', 'Two octaves lower: a written C4 sounds as C2.'],
    [-26, '26 lower', 'Two octaves and a major second lower: a written C4 sounds as B♭1.'],
  ])('at %i: shows "%s" and "%s"', (count, value, note) => {
    expect(transpositionValueText(count)).toBe(value)
    expect(transpositionNoteText(count)).toBe(note)
  })

  // @test-link [[rule_my_instrument_transposition_named_interval]]
  it('names every count from 0 to 30 in each direction with no double accidental', () => {
    for (let size = 0; size <= 30; size++) {
      for (const count of [size, -size]) {
        expect(intervalNameText(count)).not.toBe('')
        expect(soundingC4Name(count)).toMatch(/^[A-G][♯♭]?-?\d$/)
      }
    }
  })

  // @test-link [[rule_my_instrument_transposition_named_interval]]
  it.each([
    [-14, '14 semitones lower, a major ninth'],
    [0, 'Same pitch'],
    [9, '9 semitones higher, a major sixth'],
    [-12, '12 semitones lower, one octave'],
  ])('announces %i as "%s"', (count, text) => {
    expect(transpositionValueA11yText(count)).toBe(text)
  })
})

// @test-link [[rule_my_instrument_range_limits]]
describe('the range, in note names', () => {
  // @test-link [[rule_my_instrument_range_limits]]
  it('names notes in the one spelling, with the octave number going up at each C', () => {
    expect([60, 61, 63, 66, 68, 70, 71, 72, 35, 16].map(noteName)).toEqual([
      'C4',
      'C♯4',
      'E♭4',
      'F♯4',
      'A♭4',
      'B♭4',
      'B4',
      'C5',
      'B1',
      'E0',
    ])
  })

  // @test-link [[rule_my_instrument_range_limits]]
  it.each([
    [
      'treble',
      range('B1', 'B3'),
      'In treble clef, the range must stay between C2 and C7. B1 is too low. It fits in bass clef.',
    ],
    [
      'treble',
      range('C♯5', 'C♯7'),
      'In treble clef, the range must stay between C2 and C7. C♯7 is too high.',
    ],
    [
      'bass',
      range('F3', 'F5'),
      'In bass clef, the range must stay between E0 and E5. F5 is too high. It fits in treble clef.',
    ],
    [
      'bass',
      { minMidi: 15, maxMidi: 77 },
      'In bass clef, the range must stay between E0 and E5. E♭0 is too low and F5 too high.',
    ],
  ] as const)('refuses in %s clef with its bound in note names', (clef, written, line) => {
    expect(rangeRefusalLines(written, clef)).toEqual([line])
  })

  // @test-link [[rule_my_instrument_range_limits]]
  it('accepts its clef bound itself, both ends included', () => {
    expect(rangeRefusalLines(range('C2', 'C7'), 'treble')).toEqual([])
    expect(rangeRefusalLines(range('E0', 'E5'), 'bass')).toEqual([])
  })

  // @test-link [[rule_my_instrument_range_limits]]
  it('refuses a span under two octaves, and a lowest note above the highest, span first', () => {
    expect(rangeRefusalLines({ minMidi: 60, maxMidi: 83 }, 'treble')).toEqual([
      'The range needs at least two octaves (24 semitones) between its lowest and highest notes. It has 23.',
    ])
    expect(rangeRefusalLines({ minMidi: 70, maxMidi: 60 }, 'treble')).toEqual([
      'The range needs at least two octaves (24 semitones) between its lowest and highest notes. Its lowest note is above its highest.',
    ])
    expect(rangeRefusalLines({ minMidi: 30, maxMidi: 40 }, 'treble')).toEqual([
      'The range needs at least two octaves (24 semitones) between its lowest and highest notes. It has 10.',
      'In treble clef, the range must stay between C2 and C7. F♯1 is too low. It fits in bass clef.',
    ])
  })
})

// @test-link [[module_notation_layout_preflight]]
describe('the staff-reach note', () => {
  // @test-link [[module_notation_layout_preflight]]
  it('says nothing for a range the built-in instruments already reach', () => {
    expect(staffReachNote({ minMidi: 60, maxMidi: 84 }, 'treble')).toBeNull()
  })

  // @test-link [[module_notation_layout_preflight]]
  it('warns of a taller staff in treble clef, and says bass clef would not need it', () => {
    expect(staffReachNote(range('C2', 'C4'), 'treble')).toBe(
      "In treble clef, this range makes the staff taller for every instrument, and it may no longer fit a phone's screen. In bass clef, it would not.",
    )
    expect(staffReachNote(range('C2', 'C4'), 'bass')).toBeNull()
  })
})
