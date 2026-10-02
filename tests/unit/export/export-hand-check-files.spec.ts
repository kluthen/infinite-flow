/**
 * The hand-check files under tests/fixtures/export-hand-check/: the generated-notes files of one
 * seeded session, recorded through the real session runner, for opening by hand in MuseScore (one
 * MusicXML file per instrument template) and in a MIDI tool (the MIDI file with the backing off and
 * on). This spec rebuilds every file with `buildGeneratedNotesFile` and asserts the committed bytes
 * are identical, so the files checked by hand are exactly what the app downloads. Run it with
 * UPDATE_EXPORT_HAND_CHECK=1 to rewrite the files instead. The three MusicXML files are also
 * validated against the MusicXML 4.0 schema with xmllint, offline.
 */

import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import { buildGeneratedNotesFile, type GeneratedNotesRequest } from '@/export/generated-notes-file'
import type { SessionHistory } from '@/session/session-history'
import { idlePhraseOne, recordRunnerSession } from '../session/history-recording'
import { sessionSettings } from '../session/session-harness'

const HAND_CHECK_DIRECTORY = resolve('tests/fixtures/export-hand-check')
const SCHEMA_DIRECTORY = `${resolve('tests/fixtures/musicxml/schema')}/`
const UPDATE = process.env['UPDATE_EXPORT_HAND_CHECK'] === '1'

/** The recorded session every file comes from; the README records the same values. */
const PHRASE_ONE_SEED = 2026
const FIRST_SEED = 9100
const PHRASE_COUNT = 6
const TONAL_CENTER = 'F'
const TEMPO = 100
const MIDI_INSTRUMENT: InstrumentProfileId = 'c-keyboard'

/** One hand-check file: its name, the session's instrument and the export request. */
interface HandCheckFile {
  readonly name: string
  readonly instrumentProfileId: InstrumentProfileId
  readonly request: GeneratedNotesRequest
}

const HAND_CHECK_FILES: readonly HandCheckFile[] = [
  {
    name: 'b-flat-tenor-saxophone.musicxml',
    instrumentProfileId: 'bb-tenor',
    request: { format: 'musicxml', backingTrack: false },
  },
  {
    name: 'e-flat-alto-saxophone.musicxml',
    instrumentProfileId: 'eb-alto',
    request: { format: 'musicxml', backingTrack: false },
  },
  {
    name: 'c-keyboard.musicxml',
    instrumentProfileId: 'c-keyboard',
    request: { format: 'musicxml', backingTrack: false },
  },
  {
    name: 'generated.mid',
    instrumentProfileId: MIDI_INSTRUMENT,
    request: { format: 'midi', backingTrack: false },
  },
  {
    name: 'generated-with-backing.mid',
    instrumentProfileId: MIDI_INSTRUMENT,
    request: { format: 'midi', backingTrack: true },
  },
]

/** Intent: the hand-check session for one instrument, recorded through the session runner. */
function handCheckSession(instrumentProfileId: InstrumentProfileId): Promise<SessionHistory> {
  const settings = sessionSettings({
    tempo: TEMPO,
    tonalCenter: TONAL_CENTER,
    noteDensity: 'Eighth',
    instrumentProfileId,
  })
  return recordRunnerSession({
    settings,
    phraseOne: idlePhraseOne(settings, PHRASE_ONE_SEED),
    firstSeed: FIRST_SEED,
    phraseCount: PHRASE_COUNT,
  })
}

/**
 * Intent: validate one document against the vendored MusicXML 4.0 schema with xmllint, offline.
 * A missing xmllint fails the test instead of skipping it.
 */
function validateMusicXml(xml: string): { status: number | null; output: string } {
  const result = spawnSync(
    'xmllint',
    ['--noout', '--nonet', '--schema', `${SCHEMA_DIRECTORY}musicxml.xsd`, '-'],
    {
      input: xml,
      encoding: 'utf8',
      env: { ...process.env, XML_CATALOG_FILES: `${SCHEMA_DIRECTORY}catalog.xml` },
    },
  )
  if (result.error !== undefined) {
    throw new Error(
      `xmllint could not run (is libxml2's xmllint installed?): ${result.error.message}`,
    )
  }
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

// @test-link [[req_session_export]]
// @test-link [[rule_generated_notes_musicxml_export]]
// @test-link [[rule_generated_notes_midi_export]]
describe('the export hand-check files', () => {
  // @test-link [[req_session_export]]
  it.each(HAND_CHECK_FILES.map((file) => [file.name, file] as const))(
    '%s is byte-identical to the file the app builds',
    async (_name, file) => {
      const history = await handCheckSession(file.instrumentProfileId)
      const built = buildGeneratedNotesFile(history, file.request)
      const path = `${HAND_CHECK_DIRECTORY}/${file.name}`
      if (UPDATE) writeFileSync(path, built.bytes)

      expect(history.phrases()).toHaveLength(PHRASE_COUNT)
      // Compared as Node buffers: the encoder's UTF-8 bytes come from another realm's Uint8Array.
      expect(Buffer.from(built.bytes).equals(readFileSync(path)), file.name).toBe(true)
    },
  )

  // @test-link [[rule_generated_notes_musicxml_export]]
  it.each(
    HAND_CHECK_FILES.filter((file) => file.request.format === 'musicxml').map((file) => file.name),
  )('%s validates against the MusicXML 4.0 schema', (name) => {
    const result = validateMusicXml(readFileSync(`${HAND_CHECK_DIRECTORY}/${name}`, 'utf8'))

    expect(result.output).toBe('- validates\n')
    expect(result.status).toBe(0)
  })
})
