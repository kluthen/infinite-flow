// @vitest-environment node
/**
 * The parts' corpus: every phrase of the four replay-key corpora, regenerated from its key and
 * arranged. The backing's and the guides' parts carry exactly the notes their renderers give, the
 * four accompaniment parts are present and empty, a second render is equal, and the lead facts
 * hold every melody-guide note and tile the phrase with its rests. The v3.2 backing and file
 * corpus's recorded backing is written again from the bass and chords parts, byte for byte.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ARRANGER_VERSION, arrangeAccompaniment } from '@/domain/backing/accompaniment-arranger'
import {
  ACCOMPANIMENT_VOICES,
  BACKING_PART_VELOCITY,
  GUIDE_PART_VELOCITY,
  PART_VOICES,
  type AccompanimentPart,
} from '@/domain/backing/accompaniment-part'
import { renderBacking } from '@/domain/backing/backing-renderer'
import { renderGuide } from '@/domain/backing/guide-renderer'
import { leadFacts } from '@/domain/backing/lead-facts'
import { FOUR_FOUR_METER } from '@/domain/generation/generation-request'
import { addRational, compareRational, makeRational } from '@/domain/time/rational'
import { CORPUS_SESSIONS, SESSION_FILES_DIR } from '../../export/backing-and-files-v32-sessions'
import {
  REPLAY_KEY_CORPUS_FILES,
  corpusArrangerPhrase,
  corpusCaseKeys,
  type CorpusArrangerPhrase,
} from './accompaniment-corpus'

/** Generous timeout: the four corpora regenerate in some seconds on a developer machine. */
const TIMEOUT_MS = 300_000

const SETTINGS = { arrangerVersion: ARRANGER_VERSION } as const

/** A corpus file's phrases, regenerated once and kept for every test that reads them. */
const regenerated = new Map<string, readonly CorpusArrangerPhrase[]>()

/** The phrases of corpus file `file`, regenerated on first use. */
function corpusPhrases(file: string): readonly CorpusArrangerPhrase[] {
  const known = regenerated.get(file)
  if (known !== undefined) return known
  const path = fileURLToPath(new URL(`../../../fixtures/replay-keys/${file}`, import.meta.url))
  const phrases = corpusCaseKeys(JSON.parse(readFileSync(path, 'utf8'))).map(corpusArrangerPhrase)
  regenerated.set(file, phrases)
  return phrases
}

/** A pitched part's notes as the renderers' note shape; throws on a drum note. */
function rendererNotes(part: AccompanimentPart) {
  return part.notes.map((note) => {
    if (note.sound.kind !== 'pitch') throw new Error(`A drum note in the ${part.voice} part.`)
    return { pitch: note.sound.pitch, start: note.start, duration: note.duration }
  })
}

/** Check one corpus phrase's parts against its renderers and its lead facts against its guide. */
function expectPhraseParts({ label, phrase }: CorpusArrangerPhrase): void {
  const parts = arrangeAccompaniment(phrase, SETTINGS)
  expect(arrangeAccompaniment(phrase, SETTINGS), label).toEqual(parts)
  expect(
    parts.map((part) => part.voice),
    label,
  ).toEqual([...ACCOMPANIMENT_VOICES])
  const [bass, chords, melody, rhythm, ...accompaniment] = parts
  const backing = renderBacking(phrase.harmony, FOUR_FOUR_METER)
  const guide = renderGuide(phrase.timeline, phrase.harmony)
  expect(rendererNotes(bass!), label).toEqual(backing.bass)
  expect(rendererNotes(chords!), label).toEqual(backing.chords)
  expect(rendererNotes(melody!), label).toEqual(guide.melody)
  expect(rendererNotes(rhythm!), label).toEqual(guide.rhythm)
  for (const note of [...bass!.notes, ...chords!.notes]) {
    expect(note.velocity, label).toBe(BACKING_PART_VELOCITY)
  }
  for (const note of [...melody!.notes, ...rhythm!.notes]) {
    expect(note.velocity, label).toBe(GUIDE_PART_VELOCITY)
  }
  expect(
    accompaniment.map((part) => [part.voice, part.notes.length]),
    label,
  ).toEqual(PART_VOICES.map((voice) => [voice, 0]))

  const lead = leadFacts(phrase.timeline, phrase.harmony)
  expect(
    lead.notes.map((note) => ({ pitch: note.pitch, start: note.start, duration: note.duration })),
    label,
  ).toEqual(guide.melody)
  const spans = [...lead.notes, ...lead.rests].sort((a, b) => compareRational(a.start, b.start))
  let cursor = makeRational(0, 1)
  for (const span of spans) {
    expect(span.start, label).toEqual(cursor)
    cursor = addRational(span.start, span.duration)
  }
  expect(cursor, label).toEqual(makeRational(phrase.timeline.measures.length, 1))
}

describe('the parts on the replay-key corpora', () => {
  // @test-link [[entity_accompaniment_part]]
  // @test-link [[module_accompaniment_arranger]]
  // @test-link [[rule_parts_deterministic]]
  // @test-link [[rule_part_rests_when_no_note_fits]]
  it.each(REPLAY_KEY_CORPUS_FILES)(
    "carries every %s phrase's backing and guides unchanged, beside four empty parts",
    (file) => {
      const phrases = corpusPhrases(file)
      expect(phrases.length).toBeGreaterThan(80)
      for (const phrase of phrases) expectPhraseParts(phrase)
    },
    TIMEOUT_MS,
  )
})

/** A pitched part note as the backing corpus writes one: pitch, start and length in whole notes. */
function noteText(note: ReturnType<typeof rendererNotes>[number]): string {
  const { start, duration } = note
  return `${note.pitch} at ${start.numerator}/${start.denominator} for ${duration.numerator}/${duration.denominator}`
}

describe('the parts on the v3.2 backing and file corpus', () => {
  // @test-link [[req_session_backing_track]]
  // @test-link [[entity_accompaniment_part]]
  it.each(CORPUS_SESSIONS.map((session) => [session.name, session] as const))(
    "writes %s's recorded backing again from its bass and chords parts",
    (name, session) => {
      const byLabel = new Map(
        corpusPhrases('v3.2-corpus.json').map((phrase) => [phrase.label, phrase]),
      )
      const phrases = session.labels.map((label) => {
        const corpusPhrase = byLabel.get(label)
        if (corpusPhrase === undefined) throw new Error(`No v3.2 corpus case ${label}.`)
        const [bass, chords] = arrangeAccompaniment(corpusPhrase.phrase, SETTINGS)
        return {
          phrase: corpusPhrase.phraseNumber,
          bass: rendererNotes(bass!).map(noteText),
          chords: rendererNotes(chords!).map(noteText),
        }
      })
      const recorded = readFileSync(`${SESSION_FILES_DIR}${name}.backing.json`, 'utf8')
      expect(`${JSON.stringify(phrases, null, 2)}\n`).toBe(recorded)
    },
    TIMEOUT_MS,
  )
})
