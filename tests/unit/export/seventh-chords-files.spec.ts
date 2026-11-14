/**
 * The generated-notes files of sessions generated with the Seventh chords level, two ways.
 *
 * - No file carries the level: at every level, real phrases are recorded as the session history
 *   records them and all three generated-notes files are built (MusicXML, MIDI with the backing
 *   off and on). No file holds a level id or a label of the control, and the same records with
 *   the level set back to off give the same bytes: a file depends on the phrase, never on the
 *   level it was generated at.
 * - The hand-check session for hand check H4: a C MIDI keyboard session in C major, generated at
 *   the strongest level, whose MusicXML holds Cmaj7, Dm7, G7 and Bm7♭5. No single collection
 *   plans all four (the Major plans have no vii, the Ionian plans no V), so phrase 1 is generated
 *   in C Major and phrase 2 in C Ionian, both written as concert C on the keyboard.
 *
 * Set SEVENTH_CHORDS_HAND_CHECK_DIR to a directory to have this spec write the H4 files there,
 * `seventh-chords.musicxml` and `seventh-chords-with-backing.mid`, the exact bytes the app
 * downloads, for opening by hand in a notation program and a MIDI tool. They are never committed.
 * The MusicXML file is also validated against the MusicXML 4.0 schema with xmllint, offline.
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import {
  CHORD_FAMILY_LEVEL_IDS,
  OFF_CHORD_FAMILIES,
  type ChordFamilyLevel,
} from '@/domain/chords/chord-families'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { chordTones, type HarmonyEvent } from '@/domain/harmony/harmony-types'
import type { ExportableHistory } from '@/export/export-file'
import { buildGeneratedNotesFile, type GeneratedNotesRequest } from '@/export/generated-notes-file'
import type { ReviewedPhrase } from '@/session/session-history'
import { buildIntent } from '../domain/generation/carry-in/carry-in-fixture'
import { notesOf, readSmf } from './midi/smf-reader'

const SCHEMA_DIRECTORY = `${resolve('tests/fixtures/musicxml/schema')}/`
const HAND_CHECK_DIRECTORY = process.env['SEVENTH_CHORDS_HAND_CHECK_DIR']

/** The epoch milliseconds every session started at; only the file name reads it. */
const STARTED_AT_MS = Date.UTC(2026, 10, 13, 12, 0, 0)

/** Seconds between two phrase starts on the audio clock; no generated-notes file reads it. */
const PHRASE_SPACING_SECONDS = 8

/** MIDI ticks in a beat (a quarter note) and in a four-measure phrase. */
const TICKS_PER_BEAT = 960
const TICKS_PER_PHRASE = 16 * TICKS_PER_BEAT

/** The three generated-notes files a session gives. */
const FILE_REQUESTS: readonly GeneratedNotesRequest[] = [
  { format: 'musicxml', backingTrack: false },
  { format: 'midi', backingTrack: false },
  { format: 'midi', backingTrack: true },
]

/** One phrase to generate: its seed and the controls it differs from the base controls by. */
interface PlannedPhrase {
  readonly seed: number
  readonly controls: Partial<GenerationControls>
}

/** Intent: generate the planned phrases at a level and record them as the session history does. */
function recordedSession(
  phrases: readonly PlannedPhrase[],
  level: ChordFamilyLevel,
  label: string,
): readonly ReviewedPhrase[] {
  return phrases.map(({ seed, controls }, index) => {
    const intent = buildIntent({
      controls,
      seed,
      label,
      chordFamilies: { 'seventh-chords': level },
    })
    const outcome = generatePhrase(intent)
    if (outcome.kind !== 'generation_success') {
      throw new Error(`Seed ${seed} at ${level} no longer generates: ${outcome.code}.`)
    }
    return {
      phraseNumber: index + 1,
      startedAt: index * PHRASE_SPACING_SECONDS,
      outcome,
      intent,
      tempo: intent.controls.tempo,
      playedNotes: [],
      clef: 'treble',
    }
  })
}

/** Intent: a history holding exactly the given records. */
function historyOf(records: readonly ReviewedPhrase[]): ExportableHistory {
  return { phrases: () => records, startedAt: STARTED_AT_MS }
}

/** Intent: the bytes of every generated-notes file of a session, in FILE_REQUESTS order. */
function sessionFiles(records: readonly ReviewedPhrase[]): readonly Uint8Array[] {
  return FILE_REQUESTS.map((request) => buildGeneratedNotesFile(historyOf(records), request).bytes)
}

/** Intent: whether any harmony event of the records is in seventh form. */
function holdsSeventh(records: readonly ReviewedPhrase[]): boolean {
  return records.some((record) =>
    record.outcome.provenance.harmony.events.some((event) => event.seventh !== undefined),
  )
}

/** A MusicXML kind element printing a seventh chord's suffix. */
const SEVENTH_KIND = /<kind text="(maj7|m7|7|m7♭5)">/u

/**
 * The level ids and the control's labels in the spec (Seventh chords; Sometimes, Often, Always),
 * lower-cased for a case-insensitive scan. Off is left out: those three letters can occur in any
 * binary MIDI data.
 */
const LEVEL_NEEDLES: readonly string[] = [
  'sometimes',
  'favored',
  'stronglyfavored',
  'seventh-chords',
  'seventh chords',
  'often',
  'always',
]

/** Intent: the file's bytes read one byte per character, lower-cased, for a byte scan. */
function scannableText(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('latin1').toLowerCase()
}

/** The phrases of each scanned session: C keyboard written C, B-flat tenor written D. */
const SCANNED_SESSIONS: readonly (readonly [string, readonly PlannedPhrase[]])[] = [
  [
    'C keyboard',
    [1, 2, 3].map((seed) => ({
      seed,
      controls: { tonalCenter: 'C', collection: 'Major', harmonicMotion: 'Active diatonic' },
    })),
  ],
  [
    'B-flat tenor',
    [4, 5, 6].map((seed) => ({
      seed,
      controls: {
        tonalCenter: 'C',
        collection: 'Major',
        harmonicMotion: 'Active diatonic',
        instrumentProfileId: 'bb-tenor',
      },
    })),
  ],
]

// @test-link [[rule_no_export_carries_seventh_chords_level]]
describe('no file carries the Seventh chords level', () => {
  // @test-link [[rule_no_export_carries_seventh_chords_level]]
  it.each(CHORD_FAMILY_LEVEL_IDS.map((level) => [level] as const))(
    'at %s, the files hold no level id or label and are the files of the same phrases at off',
    (level) => {
      for (const [name, phrases] of SCANNED_SESSIONS) {
        const records = recordedSession(phrases, level, 'level-scan')
        const files = sessionFiles(records)

        if (level !== 'off') {
          expect(holdsSeventh(records), `${name}: a phrase in seventh form`).toBe(true)
          expect(new TextDecoder().decode(files[0]), `${name}: a seventh symbol`).toMatch(
            SEVENTH_KIND,
          )
        }
        for (const [index, bytes] of files.entries()) {
          const text = scannableText(bytes)
          for (const needle of LEVEL_NEEDLES) {
            expect(text.includes(needle), `${name}, file ${index}: "${needle}"`).toBe(false)
          }
        }
        const atOff = records.map((record) => ({
          ...record,
          intent: { ...record.intent, chordFamilies: OFF_CHORD_FAMILIES },
        }))
        for (const [index, bytes] of sessionFiles(atOff).entries()) {
          // Compared as Node buffers: the encoder's bytes come from another realm's Uint8Array.
          expect(
            Buffer.from(bytes).equals(Buffer.from(files[index]!)),
            `${name}, file ${index}`,
          ).toBe(true)
        }
      }
    },
  )
})

/**
 * The H4 session: the base controls (C MIDI keyboard, 90 BPM) in C at Active diatonic motion,
 * phrase 1 in C Major (Cmaj7, Dm7, G7 for two measures), phrase 2 in C Ionian (Cmaj7, Dm7, Bm7♭5,
 * Cmaj7), each generated on its own seed with no carry-in, at the strongest level.
 */
const HAND_CHECK_PHRASES: readonly PlannedPhrase[] = [
  {
    seed: 1,
    controls: { tonalCenter: 'C', collection: 'Major', harmonicMotion: 'Active diatonic' },
  },
  {
    seed: 2,
    controls: { tonalCenter: 'C', collection: 'Ionian', harmonicMotion: 'Active diatonic' },
  },
]

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

/** Intent: the text of an element's first descendant matching a selector, empty when none. */
function text(element: Element, selector: string): string {
  return element.querySelector(selector)?.textContent ?? ''
}

/** Intent: every chord symbol of a MusicXML file as "<measure>:<root>:<kind>:<printed suffix>". */
function chordSymbols(xml: string): string[] {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  expect(document.getElementsByTagName('parsererror')).toHaveLength(0)
  return Array.from(document.querySelectorAll('harmony')).map(
    (harmony) =>
      `${harmony.closest('measure')!.getAttribute('number')}:` +
      `${text(harmony, 'root-step')}${text(harmony, 'root-alter')}:${text(harmony, 'kind')}:` +
      `${harmony.querySelector('kind')!.getAttribute('text')}`,
  )
}

/** Intent: the harmony event of a phrase holding a beat counted from the phrase's start. */
function eventHolding(events: readonly HarmonyEvent[], beat: number): HarmonyEvent {
  const found = events.find((event) => {
    const start = event.barIndex * 4 + event.startBeat
    return start <= beat && beat < start + event.durationBeats
  })
  if (found === undefined) throw new Error(`No harmony event holds beat ${beat}.`)
  return found
}

// @test-link [[rule_generated_notes_musicxml_export]]
// @test-link [[rule_generated_notes_midi_export]]
describe('the seventh-chords hand-check session (H4)', () => {
  let records: readonly ReviewedPhrase[]
  let musicXml: Uint8Array
  let midiWithBacking: Uint8Array

  beforeAll(() => {
    records = recordedSession(HAND_CHECK_PHRASES, 'stronglyFavored', 'hand-check')
    const history = historyOf(records)
    musicXml = buildGeneratedNotesFile(history, { format: 'musicxml', backingTrack: false }).bytes
    midiWithBacking = buildGeneratedNotesFile(history, { format: 'midi', backingTrack: true }).bytes
    if (HAND_CHECK_DIRECTORY !== undefined && HAND_CHECK_DIRECTORY !== '') {
      mkdirSync(HAND_CHECK_DIRECTORY, { recursive: true })
      writeFileSync(resolve(HAND_CHECK_DIRECTORY, 'seventh-chords.musicxml'), musicXml)
      writeFileSync(
        resolve(HAND_CHECK_DIRECTORY, 'seventh-chords-with-backing.mid'),
        midiWithBacking,
      )
    }
  })

  // @test-link [[rule_generated_notes_musicxml_export]]
  it('writes Cmaj7, Dm7, G7 and Bm7♭5 with their MusicXML kinds, in concert pitch', () => {
    expect(chordSymbols(new TextDecoder().decode(musicXml))).toEqual([
      '1:C:major-seventh:maj7',
      '2:D:minor-seventh:m7',
      '3:G:dominant:7',
      '4:G:dominant:7',
      '5:C:major-seventh:maj7',
      '6:D:minor-seventh:m7',
      '7:B:half-diminished:m7♭5',
      '8:C:major-seventh:maj7',
    ])
  })

  // @test-link [[rule_generated_notes_musicxml_export]]
  it('validates against the MusicXML 4.0 schema', () => {
    const result = validateMusicXml(new TextDecoder().decode(musicXml))

    expect(result.output).toBe('- validates\n')
    expect(result.status).toBe(0)
  })

  // @test-link [[rule_generated_notes_midi_export]]
  it("holds the backing's four-note chord, the symbol's tones, wherever the symbol is a seventh", () => {
    const backing = notesOf(readSmf(midiWithBacking).tracks[2]!)
    const chordAttacks = new Map<number, number[]>()
    for (const { pitch, startTick } of backing.filter((note) => note.pitch >= 48)) {
      chordAttacks.set(startTick, [...(chordAttacks.get(startTick) ?? []), pitch])
    }
    expect(chordAttacks.size).toBeGreaterThanOrEqual(4 * records.length)
    for (const [startTick, pitches] of chordAttacks) {
      const record = records[Math.floor(startTick / TICKS_PER_PHRASE)]!
      const beat = (startTick % TICKS_PER_PHRASE) / TICKS_PER_BEAT
      const event = eventHolding(record.outcome.provenance.harmony.events, beat)
      expect(event.seventh, `the chord at tick ${startTick}`).toBeDefined()
      expect(pitches, `the chord at tick ${startTick}`).toHaveLength(4)
      expect(pitches.map((pitch) => pitch % 12).sort((a, b) => a - b)).toEqual(
        [...chordTones(event)].sort((a, b) => a - b),
      )
    }
  })
})
