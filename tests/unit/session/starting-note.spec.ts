/**
 * The starting note: phrase 1's first attacked note, matched at its exact concert pitch and named
 * in the instrument profile's written pitch, spelled as the staff shows it, with its octave.
 */

import { describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { MeasureIndex } from '@/domain/events/measure'
import type { ConcertEventTimeline } from '@/domain/events/timeline'
import type { PitchClass, Collection } from '@/domain/controls/generation-controls'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import {
  BB_TENOR_PROFILE,
  C_KEYBOARD_PROFILE,
  EB_ALTO_PROFILE,
} from '@/domain/profile/instrument-profiles'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import type { ConcertChordSymbol, WrittenPhrase } from '@/domain/notation/written-phrase-types'
import {
  isStartingNote,
  StartingNoteError,
  startingNoteOf,
  type StartingNote,
} from '@/session/starting-note'
import { phraseFromBars } from '../domain/acknowledgement/acknowledgement-fixtures'

/** Four quarter notes in every bar: the first attack opens measure 0. */
const QUARTERS = ['q q q q', 'q q q q', 'q q q q', 'q q q q'] as const

/** Intent: one C major chord at every downbeat, the minimum the display transform accepts. */
function downbeatChords(): readonly ConcertChordSymbol[] {
  return [0, 1, 2, 3].map((measureIndex) => ({
    measureIndex: measureIndex as MeasureIndex,
    startTick: 0,
    root: 0 as const,
    suffix: '',
    bass: null,
  }))
}

/** Intent: the written phrase the staff shows for a concert timeline under a profile and key. */
function writtenOf(
  timeline: ConcertEventTimeline,
  profile: InstrumentProfile,
  tonalCenter: PitchClass = 'C',
  collection: Collection = 'Major',
): WrittenPhrase {
  return transformToWrittenPhrase({
    timeline,
    tonalContext: { tonalCenter, collection },
    chords: downbeatChords(),
    transposition: profile.transposition,
    concertRange: profile.concertRange,
    clef: BUILT_IN_INSTRUMENT_CLEF,
  })
}

/** Intent: the starting note of a quarter-note phrase whose first pitch is `firstPitch`. */
function startingNoteFor(
  firstPitch: number,
  profile: InstrumentProfile,
  tonalCenter: PitchClass = 'C',
  collection: Collection = 'Major',
): StartingNote {
  const timeline = phraseFromBars(QUARTERS, [firstPitch, firstPitch + 2])
  return startingNoteOf(timeline, writtenOf(timeline, profile, tonalCenter, collection))
}

// @test-link [[rule_midi_starting_note]]
// @test-link [[rule_starting_note_named]]
describe('startingNoteOf', () => {
  // @test-link [[rule_midi_starting_note]]
  // @test-link [[rule_starting_note_named]]
  it('names the C keyboard first note at concert pitch', () => {
    const starting = startingNoteFor(60, C_KEYBOARD_PROFILE)
    expect(starting).toEqual({
      identity: { phraseNumber: 1, measureIndex: 0, eventIndex: 0 },
      concertPitch: 60,
      label: 'C4',
    })
    expect(Object.isFrozen(starting)).toBe(true)
  })

  // @test-link [[rule_starting_note_named]]
  it('names the B♭ tenor saxophone first note in its written pitch, a major ninth up', () => {
    expect(startingNoteFor(58, BB_TENOR_PROFILE)).toMatchObject({ concertPitch: 58, label: 'C5' })
    expect(startingNoteFor(56, BB_TENOR_PROFILE, 'F')).toMatchObject({
      concertPitch: 56,
      label: 'B♭4',
    })
  })

  // @test-link [[rule_starting_note_named]]
  it('names the E♭ alto saxophone first note in its written pitch, a major sixth up', () => {
    expect(startingNoteFor(60, EB_ALTO_PROFILE)).toMatchObject({ concertPitch: 60, label: 'A4' })
    expect(startingNoteFor(63, EB_ALTO_PROFILE)).toMatchObject({ concertPitch: 63, label: 'C5' })
  })

  // @test-link [[rule_midi_starting_note]]
  it('skips a leading rest: the starting note is the first attack after it', () => {
    const timeline = phraseFromBars(['r:q q q q', 'q q q q', 'q q q q', 'q q q q'], [64])
    const starting = startingNoteOf(timeline, writtenOf(timeline, C_KEYBOARD_PROFILE))
    expect(starting.identity).toEqual({ phraseNumber: 1, measureIndex: 0, eventIndex: 1 })
    expect(starting.label).toBe('E4')
  })

  // @test-link [[rule_midi_starting_note]]
  it('skips a whole first measure of rest', () => {
    const timeline = phraseFromBars(['r:w', 'r:e e q h', 'q q q q', 'q q q q'], [67])
    const starting = startingNoteOf(timeline, writtenOf(timeline, C_KEYBOARD_PROFILE))
    expect(starting.identity).toEqual({ phraseNumber: 1, measureIndex: 1, eventIndex: 1 })
    expect(starting).toMatchObject({ concertPitch: 67, label: 'G4' })
  })

  // @test-link [[rule_starting_note_named]]
  it('spells a sharp and a flat with their Unicode signs, as the staff does', () => {
    expect(startingNoteFor(61, C_KEYBOARD_PROFILE).label).toBe('C♯4')
    expect(startingNoteFor(70, C_KEYBOARD_PROFILE, 'F').label).toBe('B♭4')
  })

  // @test-link [[rule_starting_note_named]]
  it('takes the staff spelling of an in-key note, E♯ in F♯ major', () => {
    expect(startingNoteFor(65, C_KEYBOARD_PROFILE, 'F#').label).toBe('E♯4')
  })

  // @test-link [[rule_starting_note_named]]
  it('changes the octave number between B and C, octave 4 starting on middle C', () => {
    expect(startingNoteFor(59, C_KEYBOARD_PROFILE).label).toBe('B3')
    expect(startingNoteFor(60, C_KEYBOARD_PROFILE).label).toBe('C4')
    expect(startingNoteFor(57, BB_TENOR_PROFILE).label).toBe('B4')
    expect(startingNoteFor(58, BB_TENOR_PROFILE).label).toBe('C5')
  })

  // @test-link [[rule_midi_starting_note]]
  it('throws on a phrase with no attacked note', () => {
    const silent = phraseFromBars(['r:w', 'r:w', 'r:w', 'r:w'])
    expect(() => startingNoteOf(silent, writtenOf(silent, C_KEYBOARD_PROFILE))).toThrow(
      StartingNoteError,
    )
  })

  // @test-link [[rule_starting_note_named]]
  it('throws when the written phrase is not the one the timeline shows', () => {
    const timeline = phraseFromBars(QUARTERS, [60])
    const other = phraseFromBars(QUARTERS, [62])
    expect(() => startingNoteOf(timeline, writtenOf(other, C_KEYBOARD_PROFILE))).toThrow(
      StartingNoteError,
    )
    const shifted = phraseFromBars(['r:q q q q', 'q q q q', 'q q q q', 'q q q q'], [60])
    expect(() => startingNoteOf(timeline, writtenOf(shifted, C_KEYBOARD_PROFILE))).toThrow(
      StartingNoteError,
    )
  })
})

// @test-link [[rule_midi_starting_note]]
// @test-link [[module_session_starting_note]]
describe('isStartingNote', () => {
  const starting = startingNoteFor(60, C_KEYBOARD_PROFILE)

  // @test-link [[rule_midi_starting_note]]
  it('accepts only the exact concert pitch, octave included', () => {
    expect(isStartingNote({ pitch: makeConcertPitch(60) }, starting)).toBe(true)
    expect(isStartingNote({ pitch: makeConcertPitch(72) }, starting)).toBe(false)
    expect(isStartingNote({ pitch: makeConcertPitch(48) }, starting)).toBe(false)
    expect(isStartingNote({ pitch: makeConcertPitch(61) }, starting)).toBe(false)
    expect(isStartingNote({ pitch: makeConcertPitch(59) }, starting)).toBe(false)
  })
})
