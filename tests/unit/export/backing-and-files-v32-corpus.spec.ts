// @vitest-environment node
/**
 * The v3.2 backing and file corpus (tests/fixtures/sessions/v3.2-backing-and-files/): for a sample
 * of the v3.2 replay-key corpus's sessions (every instrument's carry-in chain, a key change, a
 * rhythm lock session and a Jam opening with its doodle), the backing's rendered notes, the
 * generated-notes MusicXML file and both generated-notes MIDI files, recorded on the code v3.2.0
 * shipped. This spec regenerates each session's phrases from their stored keys, renders and
 * encodes each file again and compares bytes, so a change to a v3.2 session's backing (its bass,
 * its root-position triads) or to its files turns it red, and so does a stored file changed by
 * hand. The files are read only; only the recording script writes them.
 */

import { readdirSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  CORPUS_SESSIONS,
  corpusSessionFiles,
  SESSION_FILES_DIR,
  type CorpusSession,
  type SessionFile,
} from './backing-and-files-v32-sessions'

/** Generous timeout: each session regenerates three or four phrases. */
const TIMEOUT_MS = 120_000

/** Intent: one stored file's bytes. */
function stored(name: string): Buffer {
  return readFileSync(`${SESSION_FILES_DIR}${name}`)
}

/** Intent: the stored files of the corpus, the README aside. */
function storedNames(): readonly string[] {
  return readdirSync(SESSION_FILES_DIR)
    .filter((name) => name !== 'README.md')
    .sort()
}

/** Each session's files, rendered once and shared by the tests that compare them. */
const RENDERED = new Map<string, readonly SessionFile[]>()

/** Intent: the file a session renders under the given suffix, failing when it renders none. */
function fileOf(session: CorpusSession, suffix: string): SessionFile {
  const files = RENDERED.get(session.name) ?? corpusSessionFiles(session)
  RENDERED.set(session.name, files)
  const file = files.find((entry) => entry.name === `${session.name}${suffix}`)
  if (file === undefined) throw new Error(`Session ${session.name} renders no ${suffix} file.`)
  return file
}

describe('v3.2 backing and file corpus recorded on v3.2.0', () => {
  it('holds exactly the four files of every sampled session', () => {
    const expected = CORPUS_SESSIONS.flatMap((session) =>
      ['.backing.json', '.musicxml', '.mid', '-with-backing.mid'].map(
        (suffix) => `${session.name}${suffix}`,
      ),
    ).sort()
    expect(storedNames()).toEqual(expected)
  })

  // @test-link [[req_session_backing_track]]
  it.each(CORPUS_SESSIONS.map((session) => [session.name, session] as const))(
    "renders %s's backing to the stored notes",
    (_name, session) => {
      const file = fileOf(session, '.backing.json')
      expect(Buffer.from(file.bytes).equals(stored(file.name)), file.name).toBe(true)
    },
    TIMEOUT_MS,
  )

  // @test-link [[rule_generated_notes_musicxml_export]]
  it.each(CORPUS_SESSIONS.map((session) => [session.name, session] as const))(
    "encodes %s's MusicXML file byte for byte",
    (_name, session) => {
      const file = fileOf(session, '.musicxml')
      expect(Buffer.from(file.bytes).equals(stored(file.name)), file.name).toBe(true)
    },
    TIMEOUT_MS,
  )

  // @test-link [[rule_generated_notes_midi_export]]
  it.each(CORPUS_SESSIONS.map((session) => [session.name, session] as const))(
    "encodes %s's MIDI files, backing out and in, byte for byte",
    (_name, session) => {
      for (const suffix of ['.mid', '-with-backing.mid']) {
        const file = fileOf(session, suffix)
        expect(Buffer.from(file.bytes).equals(stored(file.name)), file.name).toBe(true)
      }
    },
    TIMEOUT_MS,
  )
})
