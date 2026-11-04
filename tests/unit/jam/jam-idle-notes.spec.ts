// @vitest-environment node
/**
 * Jam's Idle note routing: the home note of Jam's written key for each built-in instrument, with
 * its octave and its concert pitch, in C Ionian, keys whose tonic is sharp or flat and keys with a
 * sharp or flat signature; the rule for two octaves equally near the middle of the written range;
 * my instrument with a transposition; and what a played note means. The expected notes come from
 * music theory and the instruments' written ranges, never from the code: the keyboard writes C3 to
 * C5 (MIDI 48 to 72, middle C4 = 60) at concert pitch; both saxophones write C4 to C6 (60 to 84,
 * middle C5 = 72), the tenor sounding a major ninth (14 semitones) lower and the alto a major sixth
 * (9 semitones) lower. Octave 4 starts on middle C. With a doodle kept, the starting note is the
 * first note of phrase 1 written from it, read here from that phrase's own timeline.
 */
import { describe, expect, it } from 'vitest'

import type { Collection, PitchClass } from '@/domain/controls/generation-controls'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import {
  createJamIdleNotes,
  jamHomeNote,
  type JamIdleNotesDependencies,
  type JamInstrument,
  type JamKeptPhraseOne,
} from '@/jam/jam-idle-notes'
import { phraseOneFor, sessionSettings } from '../session/session-harness'

const KEYBOARD: JamInstrument = { instrumentProfileId: 'c-keyboard', myInstrument: null }
const TENOR: JamInstrument = { instrumentProfileId: 'bb-tenor', myInstrument: null }
const ALTO: JamInstrument = { instrumentProfileId: 'eb-alto', myInstrument: null }

/** One expected home note: the key, the instrument, then the note theory gives. */
interface HomeNoteCase {
  readonly key: string
  readonly writtenKey: PitchClass
  readonly collection: Collection
  readonly instrument: string
  readonly profile: JamInstrument
  readonly label: string
  readonly writtenMidi: number
  readonly concertPitch: number
}

/** Intent: the three built-ins' home notes for one key: written MIDI on the keyboard and saxes. */
function forEachBuiltIn(
  key: string,
  writtenKey: PitchClass,
  collection: Collection,
  notes: {
    readonly keyboard: readonly [string, number]
    readonly saxophones: readonly [string, number]
  },
): HomeNoteCase[] {
  const [keyboardLabel, keyboardMidi] = notes.keyboard
  const [saxLabel, saxMidi] = notes.saxophones
  return [
    {
      key,
      writtenKey,
      collection,
      instrument: 'C MIDI keyboard',
      profile: KEYBOARD,
      label: keyboardLabel,
      writtenMidi: keyboardMidi,
      concertPitch: keyboardMidi,
    },
    {
      key,
      writtenKey,
      collection,
      instrument: 'B-flat tenor saxophone',
      profile: TENOR,
      label: saxLabel,
      writtenMidi: saxMidi,
      concertPitch: saxMidi - 14,
    },
    {
      key,
      writtenKey,
      collection,
      instrument: 'E-flat alto saxophone',
      profile: ALTO,
      label: saxLabel,
      writtenMidi: saxMidi,
      concertPitch: saxMidi - 9,
    },
  ]
}

const HOME_NOTE_CASES: readonly HomeNoteCase[] = [
  // C is the middle itself on the keyboard (C4) and on the saxophones (C5).
  ...forEachBuiltIn('C Ionian', 'C', 'Ionian', { keyboard: ['C4', 60], saxophones: ['C5', 72] }),
  // G major, one sharp: G3 is 5 below C4, G4 7 above; G4 is 5 below C5.
  ...forEachBuiltIn('G major', 'G', 'Major', { keyboard: ['G3', 55], saxophones: ['G4', 67] }),
  // C♯ minor, four sharps: its tonic is spelled C♯, one above the middle.
  ...forEachBuiltIn('C♯ minor', 'C#', 'Minor', { keyboard: ['C♯4', 61], saxophones: ['C♯5', 73] }),
  // D minor, one flat: D4 is 2 above C4.
  ...forEachBuiltIn('D minor', 'D', 'Minor', { keyboard: ['D4', 62], saxophones: ['D5', 74] }),
  // B♭ major, two flats: the tonic is spelled B♭ (not A♯), 2 below the middle.
  ...forEachBuiltIn('B♭ major', 'A#', 'Major', {
    keyboard: ['B♭3', 58],
    saxophones: ['B♭4', 70],
  }),
]

// @test-link [[rule_jam_starting_note_is_home_note]]
// @test-link [[module_jam_idle_notes]]
describe('jamHomeNote', () => {
  // @test-link [[rule_jam_starting_note_is_home_note]]
  it.each(HOME_NOTE_CASES)(
    "names $key's home note on the $instrument as $label",
    ({ writtenKey, collection, profile, label, writtenMidi, concertPitch }) => {
      expect(jamHomeNote(writtenKey, collection, profile)).toEqual({
        label,
        writtenMidi,
        concertPitch,
      })
    },
  )

  // @test-link [[rule_jam_starting_note_is_home_note]]
  it('takes the lower octave when two are equally near the middle of the written range', () => {
    // F♯ is six semitones from C either way: F♯3 and F♯4 are equally near C4, F♯4 and F♯5 C5.
    expect(jamHomeNote('F#', 'Major', KEYBOARD)).toEqual({
      label: 'F♯3',
      writtenMidi: 54,
      concertPitch: 54,
    })
    expect(jamHomeNote('F#', 'Major', TENOR)).toEqual({
      label: 'F♯4',
      writtenMidi: 66,
      concertPitch: 52,
    })
    expect(jamHomeNote('F#', 'Major', ALTO)).toEqual({
      label: 'F♯4',
      writtenMidi: 66,
      concertPitch: 57,
    })
  })

  // @test-link [[rule_jam_starting_note_is_home_note]]
  it("reads my instrument's own written range and transposition", () => {
    // A horn in F: written E3 to E6 (52 to 88, middle B♭4 = 70), sounding a perfect fifth lower.
    const horn = makeMyInstrument({
      template: 'c-keyboard',
      name: 'My horn in F',
      clef: 'treble',
      writtenRange: { minMidi: 52, maxMidi: 88 },
      transposition: { octaves: 0, semitones: 7, direction: 'lower' },
    })
    const mine: JamInstrument = { instrumentProfileId: 'my-instrument', myInstrument: horn }
    // D major: D5 is 4 above B♭4, D4 8 below; written D5 sounds G4 (67).
    expect(jamHomeNote('D', 'Major', mine)).toEqual({
      label: 'D5',
      writtenMidi: 74,
      concertPitch: 67,
    })
    // E♭ major ('D#', three flats): E♭5 is 5 above B♭4, E♭4 7 below; it sounds A♭4 (68).
    expect(jamHomeNote('D#', 'Major', mine)).toEqual({
      label: 'E♭5',
      writtenMidi: 75,
      concertPitch: 68,
    })
  })
})

/** Intent: Jam's Idle note routing in G major on the keyboard, the conditions set by the test. */
function routing(conditions: { canStart: boolean; pageAwaitsClick: boolean }) {
  const deps: JamIdleNotesDependencies = {
    writtenKey: () => 'G',
    collection: () => 'Major',
    instrument: () => KEYBOARD,
    canStart: () => conditions.canStart,
    pageAwaitsClick: () => conditions.pageAwaitsClick,
    doodleKept: () => false,
    keptPhraseOne: () => null,
  }
  return createJamIdleNotes(deps)
}

// @test-link [[module_jam_idle_notes]]
// @test-link [[rule_jam_start_conditions]]
describe('createJamIdleNotes', () => {
  // @test-link [[module_jam_idle_notes]]
  it('names the home note while a fresh Jam could start, and only its exact pitch starts', () => {
    const notes = routing({ canStart: true, pageAwaitsClick: false })

    expect(notes.startingNote()).toEqual({ label: 'G3', writtenMidi: 55, concertPitch: 55 })
    expect(notes.awaitsClick()).toBe(false)
    expect(notes.meaningOf(55)).toBe('start')
    expect(notes.meaningOf(67), 'G in another octave').toBe('ignored')
    expect(notes.meaningOf(43), 'G in another octave').toBe('ignored')
    expect(notes.meaningOf(60), 'another note').toBe('ignored')
  })

  // @test-link [[rule_jam_start_conditions]]
  it('names no note and starts nothing while a fresh Jam cannot start', () => {
    const conditions = { canStart: false, pageAwaitsClick: false }
    const notes = routing(conditions)

    expect(notes.startingNote()).toBeNull()
    expect(notes.awaitsClick()).toBe(false)
    expect(notes.meaningOf(55)).toBe('ignored')

    conditions.canStart = true
    expect(notes.startingNote()?.label).toBe('G3')
    expect(notes.meaningOf(55)).toBe('start')
  })

  // @test-link [[module_jam_idle_notes]]
  it("names the note but starts nothing until the page's first click, tap or key press", () => {
    const conditions = { canStart: true, pageAwaitsClick: true }
    const notes = routing(conditions)

    expect(notes.startingNote()?.label).toBe('G3')
    expect(notes.awaitsClick()).toBe(true)
    expect(notes.meaningOf(55)).toBe('ignored')

    conditions.pageAwaitsClick = false
    expect(notes.awaitsClick()).toBe(false)
    expect(notes.meaningOf(55)).toBe('start')
  })
})

/** Phrase 1 written from a kept doodle, as Jam mode's Idle would show it: a real phrase, drawn. */
function keptPhraseOne(): JamKeptPhraseOne {
  const { intent, outcome } = phraseOneFor(sessionSettings())
  const written = transformToWrittenPhrase(
    notationInputFromOutcome(outcome, intent, BUILT_IN_INSTRUMENT_CLEF),
  )
  return { timeline: outcome.result.timeline, written }
}

/** Intent: phrase 1's first attacked note, read from its timeline: its pitch and where it is. */
function firstNoteOf(phrase: JamKeptPhraseOne) {
  for (const measure of phrase.timeline.measures) {
    const eventIndex = measure.events.findIndex((event) => event.kind === 'note')
    const event = measure.events[eventIndex]
    if (event?.kind === 'note')
      return { pitch: event.pitch, measureIndex: measure.measureIndex, eventIndex }
  }
  throw new Error('phrase 1 has no note')
}

/** Intent: Jam's Idle note routing with a doodle kept, its phrase 1 shown or not, as the test sets. */
function keptRouting(conditions: { canStart: boolean; phrase: JamKeptPhraseOne | null }) {
  return createJamIdleNotes({
    writtenKey: () => 'G',
    collection: () => 'Major',
    instrument: () => KEYBOARD,
    canStart: () => conditions.canStart,
    pageAwaitsClick: () => false,
    doodleKept: () => true,
    keptPhraseOne: () => conditions.phrase,
  })
}

// @test-link [[module_jam_idle_notes]]
// @test-link [[rule_held_doodle_phrase_one_at_idle]]
describe('createJamIdleNotes with a doodle kept', () => {
  // @test-link [[module_jam_idle_notes]]
  it("names phrase 1's first note, marked on the staff, and only its exact pitch starts", () => {
    const phrase = keptPhraseOne()
    const first = firstNoteOf(phrase)
    const notes = keptRouting({ canStart: true, phrase })

    const starting = notes.startingNote()
    expect(starting?.concertPitch).toBe(first.pitch)
    expect(starting?.identity).toEqual({
      phraseNumber: 1,
      measureIndex: first.measureIndex,
      eventIndex: first.eventIndex,
    })
    expect(starting?.writtenMidi).toBe(first.pitch + phrase.written.transposition.chromatic)
    expect(notes.meaningOf(first.pitch)).toBe('start')
    expect(notes.meaningOf(first.pitch + 12), 'another octave').toBe('ignored')
    expect(notes.meaningOf(first.pitch - 1), 'another note').toBe('ignored')
  })

  // @test-link [[module_jam_idle_notes]]
  it('names no note, never the home note, while phrase 1 is not shown or a Jam cannot start', () => {
    const conditions: { canStart: boolean; phrase: JamKeptPhraseOne | null } = {
      canStart: true,
      phrase: null,
    }
    const notes = keptRouting(conditions)
    expect(notes.startingNote()).toBeNull()
    expect(notes.meaningOf(jamHomeNote('G', 'Major', KEYBOARD).concertPitch)).toBe('ignored')

    conditions.phrase = keptPhraseOne()
    conditions.canStart = false
    expect(notes.startingNote()).toBeNull()
    expect(notes.meaningOf(firstNoteOf(conditions.phrase).pitch)).toBe('ignored')
  })
})
