// @vitest-environment node
/**
 * The parts' corpus: every phrase of the four replay-key corpora, regenerated from its key, and a
 * seeded supplement of seventh-chord phrases (the replay-key corpora hold none), arranged. The
 * backing's and the guides' parts carry exactly the notes their renderers give; the Thirds and
 * Counter-melody parts hold every rule of master spec §6.3 and §6.4 as an invariant, Thirds
 * sounding only while a lead note sounds (§6.6); Fills and Drums stay empty until their rules are
 * built; a second render is equal; the lead facts hold every melody-guide note and tile the phrase
 * with its rests. A coverage check shows what the corpus reaches: every window of every built-in
 * and my instrument, Varying, sevenths and triads, chromatic lead notes, parallel skips and holds.
 * The v3.2 backing and file corpus's recorded backing is written again from the bass and chords
 * parts, byte for byte.
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
  seventhChordArrangerPhrases,
  type CorpusArrangerPhrase,
} from './accompaniment-corpus'
import {
  expectCounterMelodyInvariants,
  type CounterMelodyCounts,
} from './counter-melody-invariants'
import { expectThirdsInvariants, type ThirdsCounts } from './relation-part-invariants'

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

/** The cache key of the seventh-chord supplement beside the corpus files. */
const SUPPLEMENT = 'seventh-chord supplement'

/** The seventh-chord supplement's phrases, generated on first use. */
function supplementPhrases(): readonly CorpusArrangerPhrase[] {
  const known = regenerated.get(SUPPLEMENT)
  if (known !== undefined) return known
  const phrases = seventhChordArrangerPhrases()
  regenerated.set(SUPPLEMENT, phrases)
  return phrases
}

/** What one phrase's relation-part checks counted. */
interface PhraseTally {
  readonly label: string
  readonly phrase: CorpusArrangerPhrase['phrase']
  readonly thirds: ThirdsCounts
  readonly counterMelody: CounterMelodyCounts
}

/** Each checked corpus phrase's tally, so the coverage check reuses the checks' work. */
const tallies = new WeakMap<CorpusArrangerPhrase, PhraseTally>()

/** A pitched part's notes as the renderers' note shape; throws on a drum note. */
function rendererNotes(part: AccompanimentPart) {
  return part.notes.map((note) => {
    if (note.sound.kind !== 'pitch') throw new Error(`A drum note in the ${part.voice} part.`)
    return { pitch: note.sound.pitch, start: note.start, duration: note.duration }
  })
}

/**
 * Check one corpus phrase's parts against its renderers and the relation parts' rules, and its
 * lead facts against its guide; returns what the relation parts' checks counted.
 */
function expectPhraseParts(corpusPhrase: CorpusArrangerPhrase): PhraseTally {
  const { label, phrase } = corpusPhrase
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
  const [thirds, counterMelody, ...unbuilt] = accompaniment
  expect(
    accompaniment.map((part) => part.voice),
    label,
  ).toEqual([...PART_VOICES])
  expect(
    unbuilt.map((part) => [part.voice, part.notes.length]),
    `${label}: fills and drums stay empty until built`,
  ).toEqual([
    ['fills', 0],
    ['drums', 0],
  ])

  const lead = leadFacts(phrase.timeline, phrase.harmony)
  const tally = {
    label,
    phrase,
    thirds: expectThirdsInvariants(phrase, lead, thirds!.notes, label),
    counterMelody: expectCounterMelodyInvariants(phrase, lead, counterMelody!.notes, label),
  }
  tallies.set(corpusPhrase, tally)
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
  return tally
}

/** A checked phrase's tally: the one its check recorded, or a fresh check's. */
function tallyOf(corpusPhrase: CorpusArrangerPhrase): PhraseTally {
  return tallies.get(corpusPhrase) ?? expectPhraseParts(corpusPhrase)
}

describe('the parts on the replay-key corpora', () => {
  // @test-link [[entity_accompaniment_part]]
  // @test-link [[module_accompaniment_arranger]]
  // @test-link [[rule_parts_deterministic]]
  // @test-link [[rule_part_rests_when_no_note_fits]]
  // @test-link [[req_highlighting_part]]
  // @test-link [[rule_highlighting_part_doubled_notes]]
  // @test-link [[rule_highlighting_part_pitch]]
  // @test-link [[rule_highlighting_part_floor]]
  // @test-link [[req_contrasting_part]]
  // @test-link [[rule_contrasting_part_lane]]
  // @test-link [[rule_contrasting_part_guide_tones]]
  // @test-link [[rule_contrasting_part_voice_leading]]
  // @test-link [[rule_contrasting_part_timing]]
  // @test-link [[rule_at_most_two_relation_parts]]
  it.each(REPLAY_KEY_CORPUS_FILES)(
    "carries every %s phrase's backing and guides unchanged, its Thirds and Counter-melody by their rules",
    (file) => {
      const phrases = corpusPhrases(file)
      expect(phrases.length).toBeGreaterThan(80)
      for (const phrase of phrases) expectPhraseParts(phrase)
    },
    TIMEOUT_MS,
  )
})

describe('the parts on the seventh-chord supplement', () => {
  // @test-link [[entity_accompaniment_part]]
  // @test-link [[module_accompaniment_arranger]]
  // @test-link [[rule_parts_deterministic]]
  // @test-link [[rule_part_rests_when_no_note_fits]]
  // @test-link [[rule_parts_read_chord_as_written]]
  // @test-link [[req_highlighting_part]]
  // @test-link [[rule_highlighting_part_doubled_notes]]
  // @test-link [[rule_highlighting_part_pitch]]
  // @test-link [[rule_highlighting_part_floor]]
  // @test-link [[req_contrasting_part]]
  // @test-link [[rule_contrasting_part_lane]]
  // @test-link [[rule_contrasting_part_guide_tones]]
  // @test-link [[rule_contrasting_part_voice_leading]]
  // @test-link [[rule_contrasting_part_timing]]
  // @test-link [[rule_at_most_two_relation_parts]]
  it(
    "carries every seventh-chord phrase's backing and guides unchanged, its Thirds and Counter-melody by their rules",
    () => {
      const phrases = supplementPhrases()
      expect(phrases).toHaveLength(40)
      for (const { label, phrase } of phrases) {
        expect(
          phrase.harmony.some((event) => event.seventh !== undefined),
          `${label} holds a seventh chord`,
        ).toBe(true)
      }
      for (const phrase of phrases) expectPhraseParts(phrase)
    },
    TIMEOUT_MS,
  )
})

/** The instrument label of a supplement phrase, read from `seventh-<instrument>-<register>-s<seed>`. */
function supplementInstrument(label: string): string {
  const match = /^seventh-(.+)-(Low|Middle|High|Varying)-s\d+$/.exec(label)
  if (match === null) throw new Error(`Not a supplement label: ${label}.`)
  return match[1]!
}

/**
 * How many pitches the Counter-melody's lane holds: 13 beside a Low or Middle window; below a High
 * one, from 15 to 3 half steps under its bottom but never under MIDI 48, so possibly none. A lane
 * of 12 or more holds every pitch class, so every chord has a candidate in it.
 */
function laneWidth(window: CorpusArrangerPhrase['phrase']['window']): number {
  if (window.register !== 'High') return 13
  return window.range.minMidi - 3 - Math.max(48, window.range.minMidi - 15) + 1
}

/** The sum of one count over the tallies. */
function total(tallied: readonly PhraseTally[], count: (tally: PhraseTally) => number): number {
  return tallied.reduce((sum, tally) => sum + count(tally), 0)
}

describe('what the parts corpus covers', () => {
  // @test-link [[rule_highlighting_part_doubled_notes]]
  // @test-link [[rule_contrasting_part_lane]]
  // @test-link [[rule_contrasting_part_voice_leading]]
  // @test-link [[rule_part_rests_when_no_note_fits]]
  it(
    'reaches every window of every instrument, sevenths and triads, chromatic notes, skips and holds',
    () => {
      const supplement = supplementPhrases()
      const corpus = [...REPLAY_KEY_CORPUS_FILES.flatMap(corpusPhrases), ...supplement]
      const tallied = corpus.map(tallyOf)

      const windows = new Set(
        supplement.map(
          ({ label, phrase }) => `${supplementInstrument(label)} ${phrase.window.register}`,
        ),
      )
      for (const instrument of ['c-keyboard', 'bb-tenor', 'eb-alto', 'my-horn', 'my-baritone']) {
        for (const register of ['Low', 'Middle', 'High']) {
          expect(windows, 'window covered').toContain(`${instrument} ${register}`)
        }
      }
      expect(supplement.some(({ label }) => label.includes('-Varying-'))).toBe(true)

      const hasSeventh = (tally: PhraseTally) =>
        tally.phrase.harmony.some((event) => event.seventh !== undefined)
      expect(tallied.some(hasSeventh), 'phrases with seventh chords').toBe(true)
      expect(
        tallied.some((tally) => !hasSeventh(tally)),
        'phrases of triads only',
      ).toBe(true)

      expect(total(tallied, (tally) => tally.thirds.chromaticLeftOut)).toBeGreaterThan(0)
      expect(total(tallied, (tally) => tally.counterMelody.parallelSkips)).toBeGreaterThan(0)
      expect(total(tallied, (tally) => tally.counterMelody.holds)).toBeGreaterThan(0)

      const withThirds = tallied.filter((tally) => tally.thirds.doubled > 0)
      expect(withThirds.length / tallied.length, 'phrases with Thirds').toBeGreaterThan(0.85)
      for (const tally of tallied) {
        const lane = laneWidth(tally.phrase.window)
        expect(tally.counterMelody.emptyLane, `${tally.label}: empty lane`).toBe(lane < 1)
        if (lane >= 12) {
          expect(tally.counterMelody.notes, `${tally.label}: counter-melody`).toBeGreaterThan(0)
        }
      }
      const baritoneHigh = tallied.find((tally) => tally.label === 'seventh-my-baritone-High-s7')
      expect(baritoneHigh?.phrase.window.range.minMidi).toBe(49)
      expect(baritoneHigh?.counterMelody).toEqual({
        notes: 0,
        holds: 0,
        parallelSkips: 0,
        emptyLane: true,
      })
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
