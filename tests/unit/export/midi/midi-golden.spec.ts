import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { encodeGeneratedNotesMidi } from '@/export/midi/midi-encoder'
import { encodePlayedNotesMidi } from '@/export/midi/played-notes-midi-encoder'
import {
  referenceSessionWithBacking,
  referenceSessionWithoutBacking,
} from './midi-session-fixtures'
import { REFERENCE_PLAYED_NOTES, referencePlayedSession } from './played-notes-fixtures'
import { metaTexts, notesOf, readSmf, tempoMap } from './smf-reader'

/** Read one golden file: the literal, reviewed bytes the encoder must produce. */
function golden(name: string): Uint8Array {
  return new Uint8Array(readFileSync(`tests/fixtures/midi/golden/${name}`))
}

// @test-link [[rule_generated_notes_midi_export]]
// @test-link [[req_session_export]]
describe('MIDI golden files', () => {
  it('encodes the reference session, backing off, byte for byte', () => {
    expect(encodeGeneratedNotesMidi(referenceSessionWithoutBacking())).toEqual(
      golden('reference-session.v1.mid'),
    )
  })

  it('encodes the reference session, backing on, byte for byte', () => {
    expect(encodeGeneratedNotesMidi(referenceSessionWithBacking())).toEqual(
      golden('reference-session-backing.v1.mid'),
    )
  })
})

// @test-link [[req_played_notes_export]]
// @test-link [[rule_played_notes_export_aligns_with_generated_midi]]
describe('MIDI golden file: played notes', () => {
  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_played_notes_export_aligns_with_generated_midi]]
  it('encodes the reference played session byte for byte', () => {
    expect(encodePlayedNotesMidi(referencePlayedSession())).toEqual(
      golden('reference-session-played.v1.mid'),
    )
  })

  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_played_notes_export_aligns_with_generated_midi]]
  it('holds the reference tempo map, markers and played notes, read back', () => {
    const file = readSmf(golden('reference-session-played.v1.mid'))

    expect([file.format, file.division, file.tracks.length]).toEqual([1, 960, 2])
    expect(tempoMap(file.tracks[0]!)).toEqual([
      { tick: 0, microsecondsPerQuarter: 666667 },
      { tick: 15360, microsecondsPerQuarter: 500000 },
    ])
    expect(metaTexts(file.tracks[0]!, 0x06)).toEqual([
      { tick: 0, text: 'Phrase 1' },
      { tick: 15360, text: 'Phrase 2' },
      { tick: 30720, text: 'Phrase 3' },
    ])
    expect(metaTexts(file.tracks[1]!, 0x03)).toEqual([{ tick: 0, text: 'Played notes' }])
    expect(
      notesOf(file.tracks[1]!).map((note) => [
        note.channel,
        note.pitch,
        note.velocity,
        note.startTick,
        note.endTick,
      ]),
    ).toEqual(REFERENCE_PLAYED_NOTES)
    expect(file.tracks.map((track) => track.at(-1)!.tick)).toEqual([46080, 46080])
  })
})
