import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { encodeGeneratedNotesMusicXml } from '@/export/musicxml/musicxml-encoder'
import {
  bbTenorTempoChangeSession,
  cKeyboardSession,
  ebAltoKeyChangeSession,
} from './musicxml-session-fixtures'

/** Read one golden file: the literal, reviewed bytes the encoder must produce. */
function golden(name: string): string {
  return readFileSync(`tests/fixtures/musicxml/golden/${name}`, 'utf8')
}

// @test-link [[rule_generated_notes_musicxml_export]]
// @test-link [[req_session_export]]
describe('MusicXML golden files', () => {
  it('encodes the C keyboard session (no transpose element, two-chord measures) byte for byte', () => {
    expect(encodeGeneratedNotesMusicXml(cKeyboardSession())).toBe(golden('c-keyboard.v1.musicxml'))
  })

  it('encodes the B-flat tenor session with a tempo change byte for byte', () => {
    expect(encodeGeneratedNotesMusicXml(bbTenorTempoChangeSession())).toBe(
      golden('bb-tenor-tempo-change.v1.musicxml'),
    )
  })

  it('encodes the E-flat alto session with a key change byte for byte', () => {
    expect(encodeGeneratedNotesMusicXml(ebAltoKeyChangeSession())).toBe(
      golden('eb-alto-key-change.v1.musicxml'),
    )
  })
})
