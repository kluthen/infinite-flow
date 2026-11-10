/**
 * The sessions of the v3.2 backing and file corpus and what each renders to: a sample of the v3.2
 * replay-key corpus's sessions (tests/fixtures/replay-keys/v3.2-corpus.json), each a run of its
 * cases in order. Every phrase is regenerated from its stored `ifk4.` key, recorded as the
 * session history records a phrase (its number, outcome, intent, tempo and clef, no played note),
 * and the session gives four files: the backing's rendered notes (bass and chords, per phrase),
 * the generated-notes MusicXML file and both generated-notes MIDI files, the backing track left
 * out and put in, a Jam's files opening with its doodle. The recording script writes them to
 * tests/fixtures/sessions/v3.2-backing-and-files/ on the code v3.2 shipped; the corpus spec
 * renders and encodes each again and compares bytes. Test plumbing: nothing in the app reads it.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { renderBacking } from '@/domain/backing/backing-renderer'
import type { BackingNote } from '@/domain/backing/backing-renderer'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { FOUR_FOUR_METER } from '@/domain/generation/generation-request'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import {
  WHOLE_SESSION,
  type ExportableHistory,
  type ExportDoodleSection,
} from '@/export/export-file'
import { buildGeneratedNotesFile, type GeneratedNotesRequest } from '@/export/generated-notes-file'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import { exportDoodleSection } from '@/jam/export/doodle-section'
import type { ReviewedPhrase } from '@/session/session-history'

import { readDoodleFile } from '../jam/doodle-set'

/** The directory holding the corpus's files. */
export const SESSION_FILES_DIR = fileURLToPath(
  new URL('../../fixtures/sessions/v3.2-backing-and-files/', import.meta.url),
)

/** The phrase corpus the sessions' phrases come from. */
const PHRASE_CORPUS_PATH = fileURLToPath(
  new URL('../../fixtures/replay-keys/v3.2-corpus.json', import.meta.url),
)

/** The doodle set's directory. */
const DOODLES_DIR = fileURLToPath(new URL('../../fixtures/doodles/', import.meta.url))

/** The epoch milliseconds every session started at; only the file name reads it. */
const STARTED_AT_MS = Date.UTC(2026, 10, 9, 12, 0, 0)

/** Seconds between two phrase starts on the audio clock; no file of the corpus reads it. */
const PHRASE_SPACING_SECONDS = 8

/** A Jam session's doodle: its name in the doodle set and the tempo it was captured at. */
interface CorpusDoodle {
  readonly name: string
  readonly captureTempo: number
}

/** One corpus session: its name, its instrument's clef, its phrases' labels and a Jam's doodle. */
export interface CorpusSession {
  readonly name: string
  readonly clef: InstrumentClef
  readonly labels: readonly string[]
  readonly doodle?: CorpusDoodle
}

/** Intent: the labels of an instrument's levels1 chain, phrases 1 to 3. */
function chainLabels(instrument: string): readonly string[] {
  return [1, 2, 3].map((phrase) => `${instrument}-levels1-chain-p${phrase}`)
}

/**
 * The sample: every instrument's carry-in chain (my baritone's in the bass clef), a key change
 * with a carried null harmony, a rhythm lock session (locked, changed, forced bend) and a Jam
 * opening with its doodle, its lock on.
 */
export const CORPUS_SESSIONS: readonly CorpusSession[] = [
  { name: 'c-keyboard-chain', clef: 'treble', labels: chainLabels('c-keyboard') },
  { name: 'bb-tenor-chain', clef: 'treble', labels: chainLabels('bb-tenor') },
  { name: 'eb-alto-chain', clef: 'treble', labels: chainLabels('eb-alto') },
  { name: 'my-horn-chain', clef: 'treble', labels: chainLabels('my-horn') },
  { name: 'my-baritone-chain', clef: 'bass', labels: chainLabels('my-baritone') },
  {
    name: 'c-keyboard-key-change',
    clef: 'treble',
    labels: ['c-keyboard-levels0-key-change-p1', 'c-keyboard-levels0-key-change-p2'],
  },
  {
    name: 'my-baritone-lock',
    clef: 'bass',
    labels: [
      'my-baritone-lock-p1',
      'my-baritone-lock-p2-locked',
      'my-baritone-lock-p3-changed',
      'my-baritone-lock-p4-forced-bend',
    ],
  },
  {
    name: 'c-keyboard-jam',
    clef: 'treble',
    labels: [
      'c-keyboard-jam-eighth-offbeats-close-rung1-p1',
      'c-keyboard-jam-eighth-offbeats-close-p2-locked',
      'c-keyboard-jam-eighth-offbeats-close-p3-locked',
    ],
    doodle: { name: 'eighth-offbeats', captureTempo: 110 },
  },
]

/** One file of a session: its name in the corpus directory and its bytes. */
export interface SessionFile {
  readonly name: string
  readonly bytes: Uint8Array
}

/** Intent: every stored replay key of the phrase corpus, by label. */
function corpusKeys(): ReadonlyMap<string, string> {
  const corpus = JSON.parse(readFileSync(PHRASE_CORPUS_PATH, 'utf8')) as {
    readonly cases: readonly { readonly label: string; readonly key: string }[]
  }
  return new Map(corpus.cases.map((corpusCase) => [corpusCase.label, corpusCase.key]))
}

/** Intent: one phrase of a session, regenerated from its key and recorded as the history does. */
function recordedPhrase(
  keys: ReadonlyMap<string, string>,
  label: string,
  index: number,
  clef: InstrumentClef,
): ReviewedPhrase {
  const key = keys.get(label)
  if (key === undefined) throw new Error(`The v3.2 phrase corpus holds no case ${label}.`)
  const { intent, phraseNumber } = decodePhraseReplayKey(key)
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') {
    throw new Error(`Corpus case ${label} no longer generates: ${outcome.code}.`)
  }
  return {
    phraseNumber,
    startedAt: index * PHRASE_SPACING_SECONDS,
    outcome,
    intent,
    tempo: intent.controls.tempo,
    playedNotes: [],
    clef,
  }
}

/** Intent: a Jam session's doodle section, written for its phrase 1, or null for any other. */
function doodleSection(
  session: CorpusSession,
  phraseOne: ReviewedPhrase,
): ExportDoodleSection | null {
  if (session.doodle === undefined) return null
  const { quantized } = readDoodleFile(`${DOODLES_DIR}${session.doodle.name}.json`)
  const barSeconds = (4 * 60) / session.doodle.captureTempo
  return exportDoodleSection(
    {
      doodle: quantized,
      captureTempo: session.doodle.captureTempo,
      firstBarlineAt: 0,
      endBarlineAt: quantized.measureCount * barSeconds,
      playedNotes: [],
    },
    phraseOne,
  )
}

/** Intent: a rendered backing note as one readable line: pitch, start and length in whole notes. */
function noteText(note: BackingNote): string {
  const { start, duration } = note
  return `${note.pitch} at ${start.numerator}/${start.denominator} for ${duration.numerator}/${duration.denominator}`
}

/**
 * Intent: the backing's rendered notes of every phrase, as the audio transport renders them in
 * 4/4: a JSON text, one phrase per entry, its bass and its chords one note per line.
 */
function backingText(records: readonly ReviewedPhrase[]): string {
  const phrases = records.map((record) => {
    const { bass, chords } = renderBacking(
      record.outcome.provenance.harmony.events,
      FOUR_FOUR_METER,
    )
    return { phrase: record.phraseNumber, bass: bass.map(noteText), chords: chords.map(noteText) }
  })
  return `${JSON.stringify(phrases, null, 2)}\n`
}

/** The three generated-notes files every session gives, by their name's suffix. */
const FILE_REQUESTS: readonly (readonly [string, GeneratedNotesRequest])[] = [
  ['.musicxml', { format: 'musicxml', backingTrack: false }],
  ['.mid', { format: 'midi', backingTrack: false }],
  ['-with-backing.mid', { format: 'midi', backingTrack: true }],
]

/**
 * Intent: the four files of one session, rendered and encoded now from the phrase corpus's keys:
 * `<name>.backing.json`, `<name>.musicxml`, `<name>.mid` and `<name>-with-backing.mid`.
 */
export function corpusSessionFiles(session: CorpusSession): readonly SessionFile[] {
  const keys = corpusKeys()
  const records = session.labels.map((label, index) =>
    recordedPhrase(keys, label, index, session.clef),
  )
  const history: ExportableHistory = {
    /** Intent: the session's recorded phrases, in order. */
    phrases: () => records,
    startedAt: STARTED_AT_MS,
  }
  const doodle = doodleSection(session, records[0]!)
  return [
    { name: `${session.name}.backing.json`, bytes: new TextEncoder().encode(backingText(records)) },
    ...FILE_REQUESTS.map(([suffix, request]) => ({
      name: `${session.name}${suffix}`,
      bytes: buildGeneratedNotesFile(history, request, WHOLE_SESSION, doodle).bytes,
    })),
  ]
}
