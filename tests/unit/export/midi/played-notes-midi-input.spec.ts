import { describe, expect, expectTypeOf, it } from 'vitest'

import { MidiExportError } from '@/export/midi/midi-export-input'
import {
  validatePlayedNotesMidiInput,
  type MidiPlayedNote,
  type PlayedNotesDoodleSection,
  type PlayedNotesMidiInput,
  type PlayedNotesMidiPhrase,
} from '@/export/midi/played-notes-midi-input'
import { phraseLength, playedNote, playedSession } from './played-notes-fixtures'

/** A valid two-phrase session at 100 then 120 BPM from 3 s, one note in each phrase. */
function validSession(): PlayedNotesMidiInput {
  return playedSession(
    3,
    [100, 120],
    [
      [{ pitch: 60, velocity: 80, onset: 0.2, release: 0.6 }],
      [{ pitch: 62, velocity: 90, onset: 1, release: 1.5 }],
    ],
  )
}

/** Intent: the valid session with phrase `index` replaced by what `change` makes of it. */
function withPhrase(
  index: number,
  change: (phrase: PlayedNotesMidiPhrase) => object,
): PlayedNotesMidiInput {
  const phrases = validSession().phrases.map((phrase, position) =>
    position === index ? change(phrase) : phrase,
  )
  return { phrases } as PlayedNotesMidiInput
}

/** Intent: the valid session with phrase `index`'s only note replaced by what `change` makes. */
function withNote(index: number, change: (note: MidiPlayedNote) => object): PlayedNotesMidiInput {
  return withPhrase(index, (phrase) => ({
    ...phrase,
    playedNotes: phrase.playedNotes.map(change),
  }))
}

/** Intent: assert the validator refuses `input` with a MidiExportError. */
function expectRefused(input: unknown): void {
  expect(() => validatePlayedNotesMidiInput(input as PlayedNotesMidiInput)).toThrow(MidiExportError)
}

// @test-link [[req_played_notes_export]]
// @test-link [[rule_export_contents_never_merged]]
describe('validatePlayedNotesMidiInput: only played notes, nothing merged in', () => {
  // @test-link [[rule_export_contents_never_merged]]
  it('has no field that could carry the backing or a generated note', () => {
    expectTypeOf<keyof PlayedNotesMidiInput>().toEqualTypeOf<'phrases' | 'doodle'>()
    expectTypeOf<keyof PlayedNotesDoodleSection>().toEqualTypeOf<
      'measureCount' | 'tempo' | 'startedAt' | 'playedNotes'
    >()
    expectTypeOf<keyof PlayedNotesMidiPhrase>().toEqualTypeOf<
      'number' | 'tempo' | 'startedAt' | 'playedNotes'
    >()
    expectTypeOf<keyof MidiPlayedNote>().toEqualTypeOf<
      'pitch' | 'velocity' | 'onsetAt' | 'releaseAt'
    >()
  })

  // @test-link [[req_played_notes_export]]
  it('accepts a valid session', () => {
    expect(() => validatePlayedNotesMidiInput(validSession())).not.toThrow()
  })

  // @test-link [[rule_export_contents_never_merged]]
  it('refuses a backing or a timeline anywhere in the input', () => {
    expectRefused({ ...validSession(), backing: null })
    expectRefused({ ...validSession(), backing: [] })
    expectRefused(withPhrase(0, (phrase) => ({ ...phrase, timeline: {} })))
    expectRefused(withPhrase(1, (phrase) => ({ ...phrase, backing: [] })))
    expectRefused(withNote(0, (note) => ({ ...note, timeline: {} })))
  })

  // @test-link [[req_played_notes_export]]
  it('refuses a missing field', () => {
    expectRefused({})
    expectRefused(
      withPhrase(0, (phrase) => {
        const { startedAt, ...rest } = phrase
        void startedAt
        return rest
      }),
    )
    expectRefused(
      withNote(1, (note) => {
        const { releaseAt, ...rest } = note
        void releaseAt
        return rest
      }),
    )
  })
})

// @test-link [[req_played_notes_export]]
describe('validatePlayedNotesMidiInput: phrases', () => {
  // @test-link [[req_played_notes_export]]
  it('refuses an empty session and phrases not numbered from 1 up, each above the one before', () => {
    expectRefused({ phrases: [] })
    expectRefused(withPhrase(0, (phrase) => ({ ...phrase, number: 0 })))
    expectRefused(withPhrase(1, (phrase) => ({ ...phrase, number: 1 })))
    expectRefused(withPhrase(1, (phrase) => ({ ...phrase, number: 2.5 })))
    const [one, two] = validSession().phrases
    expectRefused({ phrases: [two, one] })
  })

  // @test-link [[rule_favorites_only_export]]
  it('accepts the session numbers of a favorites-only file, with gaps', () => {
    const [one, two] = validSession().phrases
    expect(() =>
      validatePlayedNotesMidiInput({
        phrases: [
          { ...one!, number: 2 },
          { ...two!, number: 5 },
        ],
      }),
    ).not.toThrow()
  })

  // @test-link [[req_played_notes_export]]
  it('refuses a tempo outside whole numbers from 60 to 240 BPM', () => {
    for (const tempo of [59, 241, 100.5, Number.NaN]) {
      expectRefused(withPhrase(1, (phrase) => ({ ...phrase, tempo })))
    }
  })

  // @test-link [[rule_played_notes_export_unquantized_timing]]
  it('refuses a start that is not finite', () => {
    expectRefused(withPhrase(1, (phrase) => ({ ...phrase, startedAt: Number.POSITIVE_INFINITY })))
  })

  // @test-link [[rule_played_notes_export_unquantized_timing]]
  it('refuses phrases that are not back to back on the audio clock, within 1 ms', () => {
    const end = 3 + phraseLength(100)
    const shifted = (startedAt: number): PlayedNotesMidiInput =>
      withPhrase(1, (phrase) => ({
        ...phrase,
        startedAt,
        playedNotes: phrase.playedNotes.map((note) => ({
          ...note,
          onsetAt: startedAt + 1,
          releaseAt: startedAt + 1.5,
        })),
      }))
    expect(() => validatePlayedNotesMidiInput(shifted(end + 0.0009))).not.toThrow()
    expect(() => validatePlayedNotesMidiInput(shifted(end - 0.0009))).not.toThrow()
    expectRefused(shifted(end + 0.0011))
    expectRefused(shifted(end - 0.0011))
    expectRefused(shifted(end + phraseLength(100)))
  })
})

// @test-link [[req_played_notes_export]]
describe('validatePlayedNotesMidiInput: played notes', () => {
  // @test-link [[req_played_notes_export]]
  it('refuses a pitch or a velocity outside the MIDI ranges', () => {
    for (const pitch of [-1, 128, 60.5]) {
      expectRefused(withNote(0, (note) => ({ ...note, pitch })))
    }
    for (const velocity of [0, 128, 64.5]) {
      expectRefused(withNote(0, (note) => ({ ...note, velocity })))
    }
  })

  // @test-link [[rule_played_notes_export_unquantized_timing]]
  it('refuses a release before its onset and times that are not finite', () => {
    expectRefused(withNote(0, (note) => ({ ...note, releaseAt: note.onsetAt - 0.001 })))
    expectRefused(withNote(0, (note) => ({ ...note, onsetAt: Number.NaN })))
    expectRefused(withNote(1, (note) => ({ ...note, releaseAt: Number.POSITIVE_INFINITY })))
  })

  // @test-link [[rule_played_notes_export_unquantized_timing]]
  it('refuses an onset before its phrase starts or at or after the next phrase starts', () => {
    const nextStart = 3 + phraseLength(100)
    expectRefused(withNote(0, (note) => ({ ...note, onsetAt: 2.999 })))
    expectRefused(withNote(1, (note) => ({ ...note, onsetAt: nextStart - 0.001 })))
    expectRefused(
      withNote(0, (note) => ({ ...note, onsetAt: nextStart, releaseAt: nextStart + 1 })),
    )
    expect(() =>
      validatePlayedNotesMidiInput(
        withNote(0, (note) => ({ ...note, onsetAt: nextStart - 0.001, releaseAt: nextStart + 1 })),
      ),
    ).not.toThrow()
  })

  // @test-link [[req_played_notes_export]]
  it('accepts any later onset in the last phrase, which the history gives every later note', () => {
    const late = withNote(1, (note) => ({ ...note, onsetAt: 100, releaseAt: 101 }))
    expect(() => validatePlayedNotesMidiInput(late)).not.toThrow()
  })

  // @test-link [[req_played_notes_export]]
  it('refuses a session in which nothing was played', () => {
    expectRefused(playedSession(3, [100, 120], [[], []]))
    expectRefused({ phrases: [{ number: 1, tempo: 100, startedAt: 0, playedNotes: [] }] })
    expect(() =>
      validatePlayedNotesMidiInput({
        phrases: [
          { number: 1, tempo: 100, startedAt: 0, playedNotes: [] },
          { number: 2, tempo: 100, startedAt: 9.6, playedNotes: [playedNote(60, 1, 9.6, 9.6)] },
        ],
      }),
    ).not.toThrow()
  })
})

/**
 * Intent: a Jam's doodle section before the valid session: one measure at 120 BPM from 0.5 s, so
 * it ends at 2.5 s and a sixteenth note lasts 0.125 s, one raw note in it.
 */
function validDoodle(): PlayedNotesDoodleSection {
  return { measureCount: 1, tempo: 120, startedAt: 0.5, playedNotes: [playedNote(67, 70, 1, 1.5)] }
}

/** Intent: the valid session opened by `doodle`, the valid doodle unless given. */
function jamSession(doodle: object = validDoodle()): PlayedNotesMidiInput {
  return { ...validSession(), doodle } as PlayedNotesMidiInput
}

/** Intent: the valid Jam session with its doodle's only raw note replaced by what `change` makes. */
function withDoodleNote(change: (note: MidiPlayedNote) => object): PlayedNotesMidiInput {
  const doodle = validDoodle()
  return jamSession({ ...doodle, playedNotes: doodle.playedNotes.map(change) })
}

// @test-link [[rule_jam_exports_open_with_doodle]]
// @test-link [[rule_raw_doodle_notes_are_played_notes]]
describe("validatePlayedNotesMidiInput: a Jam's doodle section", () => {
  // @test-link [[rule_played_notes_export_unquantized_timing]]
  // @test-link [[rule_jam_exports_open_with_doodle]]
  it('in a Jam, refuses an onset before its phrase starts or at or after the next phrase starts', () => {
    const nextStart = 3 + phraseLength(100)
    /** Intent: the valid Jam session with phrase `index`'s only note replaced by `change`'s. */
    const jamWithNote = (index: number, change: (note: MidiPlayedNote) => object) =>
      ({ ...withNote(index, change), doodle: validDoodle() }) as PlayedNotesMidiInput

    expect(() => validatePlayedNotesMidiInput(jamSession())).not.toThrow()
    expectRefused(jamWithNote(0, (note) => ({ ...note, onsetAt: 2.999 })))
    expectRefused(jamWithNote(1, (note) => ({ ...note, onsetAt: nextStart - 0.001 })))
    expectRefused(
      jamWithNote(0, (note) => ({ ...note, onsetAt: nextStart, releaseAt: nextStart + 1 })),
    )
    expect(() =>
      validatePlayedNotesMidiInput(
        jamWithNote(0, (note) => ({
          ...note,
          onsetAt: nextStart - 0.001,
          releaseAt: nextStart + 1,
        })),
      ),
    ).not.toThrow()
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  it('accepts a doodle of 1 to 4 whole measures, and refuses any other measure count', () => {
    for (const measureCount of [1, 2, 3, 4]) {
      expect(() =>
        validatePlayedNotesMidiInput(jamSession({ ...validDoodle(), measureCount })),
      ).not.toThrow()
    }
    for (const measureCount of [0, 5, 1.5, -1, Number.NaN]) {
      expectRefused(jamSession({ ...validDoodle(), measureCount }))
    }
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  it('refuses a doodle tempo outside whole numbers from 60 to 240 BPM, and a start not finite', () => {
    for (const tempo of [59, 241, 100.5, Number.NaN]) {
      expectRefused(jamSession({ ...validDoodle(), tempo }))
    }
    expectRefused(jamSession({ ...validDoodle(), startedAt: Number.NaN }))
    expectRefused(jamSession({ ...validDoodle(), startedAt: Number.NEGATIVE_INFINITY }))
  })

  // @test-link [[rule_export_contents_never_merged]]
  it('refuses an extra or a missing field in the doodle section or its notes', () => {
    expectRefused(jamSession({ ...validDoodle(), notes: [] }))
    expectRefused(jamSession({ ...validDoodle(), backing: null }))
    const { startedAt, ...withoutStart } = validDoodle()
    void startedAt
    expectRefused(jamSession(withoutStart))
    expectRefused(withDoodleNote((note) => ({ ...note, timeline: {} })))
    expectRefused(
      withDoodleNote((note) => {
        const { velocity, ...rest } = note
        void velocity
        return rest
      }),
    )
  })

  // @test-link [[rule_played_notes_export_unquantized_timing]]
  it('refuses a raw note the file cannot hold: pitch, velocity, times not finite, release first', () => {
    expectRefused(withDoodleNote((note) => ({ ...note, pitch: 128 })))
    expectRefused(withDoodleNote((note) => ({ ...note, velocity: 0 })))
    expectRefused(withDoodleNote((note) => ({ ...note, onsetAt: Number.NaN })))
    expectRefused(withDoodleNote((note) => ({ ...note, releaseAt: Number.POSITIVE_INFINITY })))
    expectRefused(withDoodleNote((note) => ({ ...note, releaseAt: note.onsetAt - 0.001 })))
  })

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  // @test-link [[rule_played_notes_export_unquantized_timing]]
  it('accepts an onset up to a sixteenth note before the first barline, and refuses one earlier', () => {
    /** Intent: a check that the valid Jam session with its raw note's onset at `onsetAt` passes. */
    const accepted = (onsetAt: number) => () =>
      validatePlayedNotesMidiInput(withDoodleNote((note) => ({ ...note, onsetAt })))

    expect(accepted(0.375)).not.toThrow()
    expect(accepted(0.5)).not.toThrow()
    expectRefused(withDoodleNote((note) => ({ ...note, onsetAt: 0.3749 })))
    expectRefused(withDoodleNote((note) => ({ ...note, onsetAt: 0.25, releaseAt: 0.3 })))
  })

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it("refuses an onset at or after the section's end, and keeps a release past it", () => {
    expectRefused(withDoodleNote((note) => ({ ...note, onsetAt: 2.5, releaseAt: 2.75 })))
    expectRefused(withDoodleNote((note) => ({ ...note, onsetAt: 3.5, releaseAt: 3.75 })))
    expect(() =>
      validatePlayedNotesMidiInput(
        withDoodleNote((note) => ({ ...note, onsetAt: 2.4999, releaseAt: 6 })),
      ),
    ).not.toThrow()
  })

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it("accepts a Jam whose only played notes are the doodle's, and refuses one with none at all", () => {
    const silent = playedSession(3, [100, 120], [[], []])

    expect(() =>
      validatePlayedNotesMidiInput({ phrases: silent.phrases, doodle: validDoodle() }),
    ).not.toThrow()
    expectRefused({ phrases: silent.phrases, doodle: { ...validDoodle(), playedNotes: [] } })
    expect(() =>
      validatePlayedNotesMidiInput({
        phrases: validSession().phrases,
        doodle: { ...validDoodle(), playedNotes: [] },
      }),
    ).not.toThrow()
  })
})
