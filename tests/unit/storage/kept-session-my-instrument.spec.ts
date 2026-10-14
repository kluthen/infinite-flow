/**
 * A session played with my instrument, kept and read back: the body holds the clef the history
 * recorded for every phrase, never one looked up from my instrument as it is now, and the profile
 * as data, so the decoded session draws and exports in the clef it was played in; its MusicXML
 * from the decoded session is the live history's, byte for byte, with a bass clef.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { buildGeneratedNotesFile } from '@/export/generated-notes-file'
import type { SessionHistory } from '@/session/session-history'
import {
  decodeKeptSession,
  encodeKeptSession,
  type KeptPhrase,
  type KeptSession,
  type KeptSessionFacts,
  type KeptSessionRecords,
} from '@/storage/records/kept-session-record'
import { lowHorn, recordedMyInstrumentSession } from '../session/my-instrument-session'
import { APP_VERSION, storedRecords } from './kept-session-fixtures'

/** The facts of a kept session with one favorite and its played notes not kept. */
const FACTS: KeptSessionFacts = {
  pinned: false,
  favorites: [2],
  comment: '',
  playedNotesKept: false,
}

/** Intent: the session the stored records decode to, failing unless they read as current. */
function decoded(records: KeptSessionRecords): KeptSession {
  const reading = decodeKeptSession(storedRecords(records))
  if (reading.reading !== 'current')
    throw new Error(`Expected a current session, got ${reading.reading}.`)
  return reading.value
}

/** Intent: the decoded session as the exports read a history. */
function exportable(session: KeptSession): Parameters<typeof buildGeneratedNotesFile>[0] {
  const { phrases } = session
  return { phrases: (): readonly KeptPhrase[] => phrases, startedAt: session.summary.startedAt }
}

/** Intent: the MusicXML file's text, built from a history-shaped value. */
function musicXmlOf(history: Parameters<typeof buildGeneratedNotesFile>[0]): string {
  const file = buildGeneratedNotesFile(history, { format: 'musicxml', backingTrack: false })
  return new TextDecoder().decode(file.bytes)
}

// @test-link [[module_kept_session_codec]]
// @test-link [[rule_kept_session_content]]
describe('a session played with my instrument in bass clef, kept', () => {
  let history: SessionHistory
  let records: KeptSessionRecords

  beforeAll(async () => {
    history = await recordedMyInstrumentSession(lowHorn('bass'), 3)
    records = encodeKeptSession(history, FACTS, APP_VERSION)
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[req_my_instrument]]
  it('encodes the bass clef on every phrase of the body, from the history', () => {
    expect(records.body.phrases.map((phrase) => phrase.clef)).toEqual(['bass', 'bass', 'bass'])
    expect(records.summary.instrument).toEqual({ id: 'my-instrument', displayName: 'My low horn' })
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[rule_kept_session_content]]
  it('decodes with its profile and the bass clef on every phrase, whatever clef my instrument has now', () => {
    const treble = lowHorn('treble')
    expect(treble.profile).toStrictEqual(lowHorn('bass').profile)

    const session = decoded(records)
    expect(session.phrases.map((phrase) => phrase.clef)).toEqual(['bass', 'bass', 'bass'])
    for (const phrase of session.phrases)
      expect(phrase.intent.instrumentProfile).toStrictEqual(lowHorn('bass').profile)
    expect(session.summary.instrument).toEqual({ id: 'my-instrument', displayName: 'My low horn' })
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[rule_generated_notes_musicxml_export]]
  it('exports the MusicXML of the live history, byte for byte, with a bass clef', () => {
    const xml = musicXmlOf(exportable(decoded(records)))
    expect(xml).toBe(musicXmlOf(history))
    expect(xml).toContain('<sign>F</sign>')
    expect(xml).not.toContain('<sign>G</sign>')
  })

  // @test-link [[module_kept_session_codec]]
  it('keeps the treble clef for the same instrument played in treble clef', async () => {
    const trebleHistory = await recordedMyInstrumentSession(lowHorn('treble'), 2)
    const session = decoded(encodeKeptSession(trebleHistory, FACTS, APP_VERSION))

    expect(session.phrases.map((phrase) => phrase.clef)).toEqual(['treble', 'treble'])
  })
})
