/**
 * What the transposition check's `Use this for my instrument` would save, and the words of its
 * confirmation (screens/controller-connection/handoff.md, States: Use for my instrument; flows:
 * the action is absent when the result would sound outside the MIDI note range).
 */
import { describe, expect, it } from 'vitest'

import {
  useForMyInstrument,
  useForMyInstrumentCopy,
} from '@/components/controller-connection/check-for-my-instrument'
import {
  checkWrittenNote,
  expectedConcertPitch,
} from '@/domain/controller-check/transposition-check'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import { BB_TENOR_PROFILE, C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import { makeMyInstrument } from '@/domain/profile/my-instrument'

/** Intent: the pitch a controller `offset` semitones off sends for the profile's check note. */
function sent(profile: InstrumentProfile, offset: number): number {
  return expectedConcertPitch(profile, checkWrittenNote(profile)) + offset
}

/** A bass-clef my instrument made from the alto, written E1 to E3, sounding 9 semitones lower. */
const LOW_ALTO = makeMyInstrument({
  template: 'eb-alto',
  name: 'Low alto',
  clef: 'bass',
  writtenRange: { minMidi: 28, maxMidi: 52 },
  transposition: { octaves: 0, semitones: 9, direction: 'lower' },
})

// @test-link [[rule_transposition_check_sets_my_instrument]]
describe('useForMyInstrument', () => {
  it('offers nothing on a match', () => {
    expect(useForMyInstrument(BB_TENOR_PROFILE, null, sent(BB_TENOR_PROFILE, 0))).toBeNull()
  })

  it('with none yet, makes it from the selected built-in: named My instrument, treble clef, its written range', () => {
    // The tenor checked, the controller 2 semitones higher than the tenor expects.
    const use = useForMyInstrument(BB_TENOR_PROFILE, null, sent(BB_TENOR_PROFILE, 2))

    expect(use?.start).toBe('none')
    expect(use?.templateName).toBe('B-flat tenor saxophone')
    expect(use?.instrument).toMatchObject({
      template: 'bb-tenor',
      name: 'My instrument',
      clef: 'treble',
      writtenRange: { minMidi: 60, maxMidi: 84 },
      // The written C5 asked for, sent as C5 - 12: one octave lower.
      transposition: { octaves: 1, semitones: 0, direction: 'lower' },
    })
  })

  it('with one not selected, keeps its name, range, clef and template, the transposition from the built-in checked', () => {
    // The keyboard checked, the controller 3 semitones higher: written C4 sent as E-flat 4.
    const use = useForMyInstrument(C_KEYBOARD_PROFILE, LOW_ALTO, sent(C_KEYBOARD_PROFILE, 3))

    expect(use?.start).toBe('not-selected')
    expect(use?.instrument).toMatchObject({
      template: 'eb-alto',
      name: 'Low alto',
      clef: 'bass',
      writtenRange: LOW_ALTO.writtenRange,
      transposition: { octaves: 0, semitones: 3, direction: 'higher' },
    })
  })

  it('with it selected, keeps its range and clef and moves its transposition by the offset', () => {
    // My instrument checked: 9 lower, the controller 2 semitones lower than it expects.
    const use = useForMyInstrument(LOW_ALTO.profile, LOW_ALTO, sent(LOW_ALTO.profile, -2))

    expect(use?.start).toBe('selected')
    expect(use?.instrument.writtenRange).toEqual(LOW_ALTO.writtenRange)
    expect(use?.instrument.clef).toBe('bass')
    expect(use?.instrument.transposition).toEqual({
      octaves: 0,
      semitones: 11,
      direction: 'lower',
    })
  })

  it('offers nothing when the result would sound outside MIDI notes 0 to 127', () => {
    // Tenor, written C4 to C6: 60 semitones higher sounds up to 130; 50 lower down to -4.
    expect(useForMyInstrument(BB_TENOR_PROFILE, null, sent(BB_TENOR_PROFILE, 60))).toBeNull()
    expect(useForMyInstrument(BB_TENOR_PROFILE, null, sent(BB_TENOR_PROFILE, -50))).toBeNull()
    // Right at the edge it is still offered: 57 higher sounds up to 127.
    expect(useForMyInstrument(BB_TENOR_PROFILE, null, sent(BB_TENOR_PROFILE, 57))).not.toBeNull()
  })

  it('refuses my instrument checked while none is given', () => {
    expect(() => useForMyInstrument(LOW_ALTO.profile, null, sent(LOW_ALTO.profile, 2))).toThrow(
      /my instrument/,
    )
  })
})

// @test-link [[rule_transposition_check_sets_my_instrument]]
describe('useForMyInstrumentCopy', () => {
  it('the worked example: none yet, the tenor, a controller sending the written note', () => {
    const use = useForMyInstrument(BB_TENOR_PROFILE, null, sent(BB_TENOR_PROFILE, 14))
    if (use === null) throw new Error('expected the action to be offered')

    expect(useForMyInstrumentCopy(use)).toEqual({
      paragraphs: [
        'No transposition: a written C4 will sound as C4.',
        "My instrument will be made from the B-flat tenor saxophone profile, named My instrument, in treble clef, with that profile's range: C4 to C6 in written notes.",
      ],
      hint: 'You can change it later with Edit my instrument.',
    })
  })

  it('one not selected keeps its range and clef and becomes the selected instrument', () => {
    const use = useForMyInstrument(C_KEYBOARD_PROFILE, LOW_ALTO, sent(C_KEYBOARD_PROFILE, -14))
    if (use === null) throw new Error('expected the action to be offered')

    expect(useForMyInstrumentCopy(use)).toEqual({
      paragraphs: [
        'A major ninth lower (an octave and a major second): a written C4 will sound as B♭2.',
        'Low alto keeps its range, E1 to E3 in written notes, and its clef, and becomes the selected instrument.',
      ],
      hint: null,
    })
  })

  it('the selected one keeps its range and clef', () => {
    const use = useForMyInstrument(LOW_ALTO.profile, LOW_ALTO, sent(LOW_ALTO.profile, -3))
    if (use === null) throw new Error('expected the action to be offered')

    expect(useForMyInstrumentCopy(use)).toEqual({
      paragraphs: [
        'One octave lower: a written C4 will sound as C3.',
        'Low alto keeps its range, E1 to E3 in written notes, and its clef.',
      ],
      hint: null,
    })
  })
})
