import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { encodeGeneratedNotesMidi } from '@/export/midi/midi-encoder'
import {
  referenceSessionWithBacking,
  referenceSessionWithoutBacking,
} from './midi-session-fixtures'

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
