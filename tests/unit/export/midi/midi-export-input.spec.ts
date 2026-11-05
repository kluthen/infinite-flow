import { describe, expect, expectTypeOf, it } from 'vitest'

import { makeConcertPitch, type ConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline } from '@/domain/events/timeline'
import { makeRational } from '@/domain/time/rational'
import { encodeGeneratedNotesMidi } from '@/export/midi/midi-encoder'
import {
  MidiExportError,
  type GeneratedNotesMidiInput,
  type MidiBackingNote,
  type MidiBackingPhrase,
  type MidiDoodleSection,
  type MidiSessionPhrase,
} from '@/export/midi/midi-export-input'
import { midiPhrase, plainBacking, plainTimeline } from './midi-session-fixtures'

function session(tempos: readonly number[]): MidiSessionPhrase[] {
  return tempos.map((tempo, index) => midiPhrase(index + 1, plainTimeline(), tempo))
}

/** A one-phrase session whose backing is exactly `notes`. */
function withBackingNotes(notes: readonly MidiBackingNote[]): GeneratedNotesMidiInput {
  return { phrases: session([90]), backing: [{ number: 1, notes }] }
}

/** A backing note from quarter-note positions, with the pitch unchecked (cast from a number). */
function rawNote(pitch: number, startQuarters: number, quarters: number): MidiBackingNote {
  return {
    pitch: pitch as ConcertPitch,
    start: makeRational(startQuarters, 4),
    duration: makeRational(quarters, 4),
  }
}

// @test-link [[rule_generated_notes_midi_export]]
// @test-link [[rule_export_contents_never_merged]]
describe('encodeGeneratedNotesMidi: input contract, no played notes', () => {
  it('has no field that could carry a played note', () => {
    expectTypeOf<keyof GeneratedNotesMidiInput>().toEqualTypeOf<'phrases' | 'backing' | 'doodle'>()
    expectTypeOf<keyof MidiDoodleSection>().toEqualTypeOf<'measureCount' | 'tempo' | 'notes'>()
    expectTypeOf<keyof MidiSessionPhrase>().toEqualTypeOf<'number' | 'timeline' | 'tempo'>()
    expectTypeOf<keyof MidiBackingPhrase>().toEqualTypeOf<'number' | 'notes'>()
    expectTypeOf<keyof MidiBackingNote>().toEqualTypeOf<'pitch' | 'start' | 'duration'>()
  })

  it('rejects an input, a phrase, a backing phrase or a backing note that carries more', () => {
    const played = { playedNotes: [] }
    const base: GeneratedNotesMidiInput = { phrases: session([90]), backing: null }
    const cases: unknown[] = [
      { ...base, ...played },
      { ...base, phrases: [{ ...base.phrases[0]!, ...played }] },
      { ...base, backing: [{ number: 1, notes: [], ...played }] },
      withBackingNotes([{ ...rawNote(36, 0, 4), velocity: 100 } as MidiBackingNote]),
    ]
    for (const input of cases) {
      expect(() => encodeGeneratedNotesMidi(input as GeneratedNotesMidiInput)).toThrow(
        MidiExportError,
      )
    }
  })
})

// @test-link [[rule_generated_notes_midi_export]]
// @test-link [[req_session_export]]
describe('encodeGeneratedNotesMidi: input contract, the session', () => {
  it('rejects an empty session', () => {
    expect(() => encodeGeneratedNotesMidi({ phrases: [], backing: null })).toThrow(MidiExportError)
  })

  it('rejects phrase numbers that are not whole numbers from 1 up, each above the one before', () => {
    for (const numbers of [[0], [1.5], [2, 1], [1, 1], [2, 5, 4]]) {
      const phrases = numbers.map((number) => midiPhrase(number, plainTimeline(), 90))
      expect(() => encodeGeneratedNotesMidi({ phrases, backing: null })).toThrow(MidiExportError)
    }
  })

  // @test-link [[rule_favorites_only_export]]
  it('accepts the session numbers of a favorites-only file, with gaps', () => {
    for (const numbers of [[2], [1, 3], [2, 5, 6]]) {
      const phrases = numbers.map((number) => midiPhrase(number, plainTimeline(), 90))
      expect(() => encodeGeneratedNotesMidi({ phrases, backing: null })).not.toThrow()
    }
  })

  it('rejects a tempo that is not a whole number from 60 to 240 BPM', () => {
    for (const tempo of [59, 241, 0, -90, 90.5, Number.NaN]) {
      expect(() => encodeGeneratedNotesMidi({ phrases: session([tempo]), backing: null })).toThrow(
        MidiExportError,
      )
    }
  })

  it('rejects a tie continuation with no note of its pitch to hold', () => {
    const whole = makeRational(1, 1)
    const half = makeRational(1, 2)
    const held = (pitch: number, tieContinuation: boolean) =>
      makeNoteEvent({ duration: half, pitch: makeConcertPitch(pitch), tieContinuation })
    const plain = (index: number) =>
      makeMeasure(index, [
        makeNoteEvent({ duration: whole, pitch: makeConcertPitch(60), tieContinuation: false }),
      ])
    for (const opening of [
      [makeRestEvent({ duration: half }), held(60, true)],
      [held(62, false), held(60, true)],
    ]) {
      const timeline = makeConcertEventTimeline([
        plain(0),
        makeMeasure(1, opening),
        plain(2),
        plain(3),
      ])
      expect(() =>
        encodeGeneratedNotesMidi({ phrases: [midiPhrase(1, timeline, 90)], backing: null }),
      ).toThrow(MidiExportError)
    }
  })

  it('accepts the slowest and the fastest tempo', () => {
    expect(() =>
      encodeGeneratedNotesMidi({ phrases: session([60, 240]), backing: null }),
    ).not.toThrow()
  })
})

// @test-link [[rule_generated_notes_midi_export]]
describe('encodeGeneratedNotesMidi: input contract, the backing', () => {
  it('rejects a backing that does not hold exactly one entry per phrase, numbered alike', () => {
    const phrases = session([90, 90])
    const backings: MidiBackingPhrase[][] = [
      [],
      [{ number: 1, notes: plainBacking() }],
      [
        { number: 2, notes: plainBacking() },
        { number: 1, notes: plainBacking() },
      ],
      [
        { number: 1, notes: plainBacking() },
        { number: 2, notes: plainBacking() },
        { number: 3, notes: plainBacking() },
      ],
    ]
    for (const backing of backings) {
      expect(() => encodeGeneratedNotesMidi({ phrases, backing })).toThrow(MidiExportError)
    }
  })

  // @test-link [[rule_favorites_only_export]]
  it('accepts a favorites-only backing numbered as its phrases, and refuses one numbered otherwise', () => {
    const phrases = [midiPhrase(2, plainTimeline(), 90), midiPhrase(5, plainTimeline(), 90)]
    const numbered = (first: number, second: number): MidiBackingPhrase[] => [
      { number: first, notes: plainBacking() },
      { number: second, notes: plainBacking() },
    ]

    expect(() => encodeGeneratedNotesMidi({ phrases, backing: numbered(2, 5) })).not.toThrow()
    expect(() => encodeGeneratedNotesMidi({ phrases, backing: numbered(1, 2) })).toThrow(
      MidiExportError,
    )
  })

  it('accepts a phrase whose backing has no note', () => {
    expect(() => encodeGeneratedNotesMidi(withBackingNotes([]))).not.toThrow()
  })

  it('rejects a backing pitch that is not a whole number from 0 to 127', () => {
    for (const pitch of [-1, 128, 60.5]) {
      expect(() => encodeGeneratedNotesMidi(withBackingNotes([rawNote(pitch, 0, 1)]))).toThrow(
        MidiExportError,
      )
    }
  })

  it('rejects a backing note that starts before its phrase or ends after it', () => {
    for (const note of [rawNote(36, -1, 2), rawNote(36, 15, 2), rawNote(36, 16, 1)]) {
      expect(() => encodeGeneratedNotesMidi(withBackingNotes([note]))).toThrow(MidiExportError)
    }
  })

  it('accepts a backing note that ends exactly at the end of its phrase', () => {
    expect(() => encodeGeneratedNotesMidi(withBackingNotes([rawNote(36, 12, 4)]))).not.toThrow()
  })

  it('rejects a backing note with no length', () => {
    const silent = { ...rawNote(36, 0, 1), duration: makeRational(0, 1) }
    expect(() => encodeGeneratedNotesMidi(withBackingNotes([silent]))).toThrow(MidiExportError)
  })

  it('rejects a backing time that falls between two MIDI ticks', () => {
    const offGrid = { ...rawNote(36, 0, 1), start: makeRational(1, 7) }
    expect(() => encodeGeneratedNotesMidi(withBackingNotes([offGrid]))).toThrow(MidiExportError)
  })

  it('rejects two backing notes of the same pitch that overlap', () => {
    expect(() =>
      encodeGeneratedNotesMidi(withBackingNotes([rawNote(48, 0, 2), rawNote(48, 1, 2)])),
    ).toThrow(MidiExportError)
  })

  it('accepts a backing note that starts where the same pitch ends', () => {
    const notes = [rawNote(48, 0, 2), rawNote(48, 2, 2)]
    expect(() => encodeGeneratedNotesMidi(withBackingNotes(notes))).not.toThrow()
  })
})

/** A Jam's doodle section of `measureCount` measures at 100 BPM holding exactly `notes`. */
function doodleOf(
  measureCount: number,
  notes: readonly MidiBackingNote[] = [rawNote(62, 0, 1)],
): MidiDoodleSection {
  return { measureCount, tempo: 100, notes }
}

/** A one-phrase Jam input opening with `doodle`. */
function withDoodle(doodle: MidiDoodleSection): GeneratedNotesMidiInput {
  return { phrases: session([90]), backing: null, doodle }
}

// @test-link [[rule_jam_exports_open_with_doodle]]
// @test-link [[rule_export_contents_never_merged]]
describe('encodeGeneratedNotesMidi: input contract, the doodle', () => {
  // @test-link [[rule_jam_exports_open_with_doodle]]
  it('accepts a doodle of 1 to 4 measures, a note ending exactly at its last barline', () => {
    for (const measureCount of [1, 2, 3, 4]) {
      const notes = [rawNote(62, 0, 1), rawNote(64, 4 * measureCount - 2, 2)]
      expect(() =>
        encodeGeneratedNotesMidi(withDoodle(doodleOf(measureCount, notes))),
      ).not.toThrow()
    }
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  it('rejects a doodle that is not 1 to 4 whole measures', () => {
    for (const measureCount of [0, 5, 1.5, -1]) {
      expect(() => encodeGeneratedNotesMidi(withDoodle(doodleOf(measureCount)))).toThrow(
        MidiExportError,
      )
    }
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  it('rejects a doodle tempo that is not a whole number from 60 to 240 BPM', () => {
    for (const tempo of [59, 241, 90.5]) {
      expect(() => encodeGeneratedNotesMidi(withDoodle({ ...doodleOf(2), tempo }))).toThrow(
        MidiExportError,
      )
    }
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  // @test-link [[rule_export_contents_never_merged]]
  it('rejects a doodle section or a doodle note that carries more', () => {
    const played = { playedNotes: [] }
    const cases: unknown[] = [
      withDoodle({ ...doodleOf(2), ...played } as MidiDoodleSection),
      withDoodle(doodleOf(2, [{ ...rawNote(62, 0, 1), velocity: 100 } as MidiBackingNote])),
    ]
    for (const input of cases) {
      expect(() => encodeGeneratedNotesMidi(input as GeneratedNotesMidiInput)).toThrow(
        MidiExportError,
      )
    }
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  it('rejects a doodle note that starts before the doodle or runs past its last barline', () => {
    for (const note of [rawNote(62, -1, 2), rawNote(62, 3, 2), rawNote(62, 4, 1)]) {
      expect(() => encodeGeneratedNotesMidi(withDoodle(doodleOf(1, [note])))).toThrow(
        MidiExportError,
      )
    }
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  it('rejects a doodle pitch outside 0 to 127, a note with no length, or two overlapping notes of one pitch', () => {
    const silent = { ...rawNote(62, 0, 1), duration: makeRational(0, 1) }
    for (const notes of [[rawNote(128, 0, 1)], [silent], [rawNote(62, 0, 2), rawNote(62, 1, 2)]]) {
      expect(() => encodeGeneratedNotesMidi(withDoodle(doodleOf(2, notes)))).toThrow(
        MidiExportError,
      )
    }
  })

  // @test-link [[rule_generated_notes_midi_export]]
  it('still rejects an unknown extra field on an input without a doodle', () => {
    const input = { phrases: session([90]), backing: null, doodleNotes: [] }
    expect(() => encodeGeneratedNotesMidi(input as GeneratedNotesMidiInput)).toThrow(
      MidiExportError,
    )
  })
})
