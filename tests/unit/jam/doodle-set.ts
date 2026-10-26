/**
 * The v3.2 doodle set: hand-written doodles (and, later, the owner's Travel Sax recordings) kept as
 * one JSON file each in `tests/fixtures/doodles/`, read by the doodle set's spec (which joins them
 * to the quantizer's tests), the Jam sweep, the listening-check render script and the tests of the
 * doodle-to-controls mapping. Each file holds a raw capture as played on the audio clock, the
 * quantized doodle written by hand from the rules of C5.5 (never by running the quantizer), and
 * the doodle's traits: the computable ones, which the spec checks, and the hand-judged ones
 * (density, the control values C5.16.1 gives, whether its first measure is a listening rhythm).
 * The loader checks every file's shape and crashes with the file's name on a malformed one. It
 * imports by relative path and reads with node:fs from this file's own location, so the render
 * script can load it through Vite's runnerImport without the app's alias. Test tooling: nothing in
 * the app reads it.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  NOTE_DENSITIES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  type NoteDensity,
  type RhythmicVariety,
  type SilenceDensity,
  type Syncopation,
} from '../../../src/domain/controls/generation-controls'
import {
  parseQuantizedDoodle,
  type DoodleMeasureCount,
  type QuantizedDoodle,
} from '../../../src/domain/doodle/quantized-doodle'
import { parseConcertPitch, type ConcertPitch } from '../../../src/domain/events/concert-pitch'
import type { DoodleCapture, RawDoodleNote } from '../../../src/jam/doodle-quantizer'

/** The directory holding one JSON file per doodle, found from this file's own location. */
export const DOODLE_SET_DIR = fileURLToPath(new URL('../../fixtures/doodles/', import.meta.url))

/** Where a doodle comes from: written by hand, or recorded by the owner on his Travel Sax. */
export const DOODLE_SOURCES = ['hand-written', 'travel-sax'] as const
export type DoodleSource = (typeof DOODLE_SOURCES)[number]

/** How full the doodle sounds, judged by ear: few notes and much silence, or sixteenth notes. */
export const DOODLE_DENSITIES = ['sparse', 'moderate', 'busy'] as const
export type DoodleDensity = (typeof DOODLE_DENSITIES)[number]

/**
 * Where the doodle's last note lies for the C MIDI keyboard profile: inside one of its register
 * windows, outside them but inside its range, or outside its range (48 to 72).
 */
export const LAST_NOTE_PLACES = ['inside-windows', 'outside-windows', 'outside-range'] as const
export type LastNotePlace = (typeof LAST_NOTE_PLACES)[number]

/**
 * The rhythm control values C5.16.1's rules give for the doodle, before the supported-combination
 * step; null where the doodle cannot show the control (fewer than two notes, or fewer than three
 * for rhythmic variety).
 */
export interface DoodleAim {
  readonly noteDensity: NoteDensity | null
  readonly rhythmicVariety: RhythmicVariety | null
  readonly syncopation: Syncopation | null
  readonly silenceDensity: SilenceDensity | null
}

/**
 * The doodle's traits. Computable, and checked by the spec: measureCount, noteCount (of the
 * quantized doodle), leaping (two neighbouring notes 7 or more half steps apart), oneNote, chord
 * (two raw notes sounding together for at least a tick), graceNote (a raw note dropped because it
 * snaps onto the tick of a longer note played just after it), strayNote (a raw note under the
 * very-short-note threshold), lastNote and aimedAt.noteDensity. Judged by hand: density, the rest
 * of aimedAt and listeningMeasure (the first measure makes a clear, distinct rhythm for the
 * owner's listening check).
 */
export interface DoodleTraits {
  readonly measureCount: DoodleMeasureCount
  readonly noteCount: number
  readonly density: DoodleDensity
  readonly leaping: boolean
  readonly oneNote: boolean
  readonly chord: boolean
  readonly graceNote: boolean
  readonly strayNote: boolean
  readonly lastNote: LastNotePlace
  readonly aimedAt: DoodleAim
  readonly listeningMeasure: boolean
  readonly notes?: string
}

/** One doodle of the set, as read from its file. */
export interface DoodleFixture {
  readonly name: string
  readonly source: DoodleSource
  readonly description: string
  readonly traits: DoodleTraits
  readonly capture: DoodleCapture
  readonly quantized: QuantizedDoodle
}

/** An untrusted JSON object being read. */
type JsonRecord = Readonly<Record<string, unknown>>

const FIXTURE_KEYS = ['name', 'source', 'description', 'traits', 'capture', 'quantized']
const TRAIT_KEYS = [
  'measureCount',
  'noteCount',
  'density',
  'leaping',
  'oneNote',
  'chord',
  'graceNote',
  'strayNote',
  'lastNote',
  'aimedAt',
  'listeningMeasure',
]
const AIM_KEYS = ['noteDensity', 'rhythmicVariety', 'syncopation', 'silenceDensity']
const CAPTURE_KEYS = ['gridOriginAt', 'tempoBpm', 'endMeasure', 'notes']
const RAW_NOTE_KEYS = ['onsetAt', 'releaseAt', 'pitch']

/** The hint added when a recording's hand-judged traits are still null. */
const FILL_HINT = 'fill the hand-judged traits (see docs/testing.md, "The doodle set (v3.2)")'

/**
 * Intent: an untrusted value as a JSON object holding exactly the required keys, plus any of the
 * optional ones; anything else crashes, naming the file and the place in it.
 */
function exactObject(
  value: unknown,
  required: readonly string[],
  where: string,
  optional: readonly string[] = [],
): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${where} must be a JSON object.`)
  }
  const keys = Object.keys(value)
  const unknown = keys.find((key) => !required.includes(key) && !optional.includes(key))
  if (unknown !== undefined) throw new Error(`${where} has an unknown field "${unknown}".`)
  const missing = required.find((key) => !keys.includes(key))
  if (missing !== undefined) throw new Error(`${where} is missing its field "${missing}".`)
  return value as JsonRecord
}

/** Intent: the message of a caught error, which may not be an Error. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Intent: a field that must be a non-empty string; a null one asks for the hand-judged traits. */
function textField(record: JsonRecord, key: string, where: string): string {
  const value = record[key]
  if (value === null) throw new Error(`${where}.${key} is null: ${FILL_HINT}.`)
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${where}.${key} must be a non-empty string.`)
  }
  return value
}

/** Intent: a field that must be a finite number. */
function numberField(record: JsonRecord, key: string, where: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${where}.${key} must be a finite number.`)
  }
  return value
}

/** Intent: a field that must be a boolean; a null one asks for the hand-judged traits. */
function booleanField(record: JsonRecord, key: string, where: string): boolean {
  const value = record[key]
  if (value === null) throw new Error(`${where}.${key} is null: ${FILL_HINT}.`)
  if (typeof value !== 'boolean') throw new Error(`${where}.${key} must be true or false.`)
  return value
}

/** Intent: a field that must be one of the given strings; a null one asks for the hand traits. */
function oneOf<T extends string>(
  record: JsonRecord,
  key: string,
  values: readonly T[],
  where: string,
): T {
  const value = record[key]
  if (value === null) throw new Error(`${where}.${key} is null: ${FILL_HINT}.`)
  const found = values.find((candidate) => candidate === value)
  if (found === undefined) {
    throw new Error(`${where}.${key} must be one of ${values.join(', ')}, got ${String(value)}.`)
  }
  return found
}

/** Intent: a field that must be one of the given strings or null (a control not shown). */
function oneOfOrNull<T extends string>(
  record: JsonRecord,
  key: string,
  values: readonly T[],
  where: string,
): T | null {
  return record[key] === null ? null : oneOf(record, key, values, where)
}

/** Intent: the measureCount trait: a doodle spans 1 to 4 measures. */
function measureCountField(record: JsonRecord, where: string): DoodleMeasureCount {
  const value = record.measureCount
  if (value !== 1 && value !== 2 && value !== 3 && value !== 4) {
    throw new Error(`${where}.measureCount must be 1, 2, 3 or 4, got ${String(value)}.`)
  }
  return value
}

/** Intent: the control values C5.16.1 gives; a null aimedAt asks for the hand-judged traits. */
function readAim(value: unknown, where: string): DoodleAim {
  if (value === null) throw new Error(`${where} is null: ${FILL_HINT}.`)
  const aim = exactObject(value, AIM_KEYS, where)
  return {
    noteDensity: oneOfOrNull(aim, 'noteDensity', NOTE_DENSITIES, where),
    rhythmicVariety: oneOfOrNull(aim, 'rhythmicVariety', RHYTHMIC_VARIETIES, where),
    syncopation: oneOfOrNull(aim, 'syncopation', SYNCOPATIONS, where),
    silenceDensity: oneOfOrNull(aim, 'silenceDensity', SILENCE_DENSITIES, where),
  }
}

/** Intent: the traits of one file, every field checked; the free-text notes are optional. */
function readTraits(value: unknown, where: string): DoodleTraits {
  const traits = exactObject(value, TRAIT_KEYS, where, ['notes'])
  const notes = traits.notes === undefined ? {} : { notes: textField(traits, 'notes', where) }
  const noteCount = numberField(traits, 'noteCount', where)
  if (!Number.isSafeInteger(noteCount) || noteCount < 1) {
    throw new Error(`${where}.noteCount must be a whole number of notes, at least 1.`)
  }
  return {
    measureCount: measureCountField(traits, where),
    noteCount,
    density: oneOf(traits, 'density', DOODLE_DENSITIES, where),
    leaping: booleanField(traits, 'leaping', where),
    oneNote: booleanField(traits, 'oneNote', where),
    chord: booleanField(traits, 'chord', where),
    graceNote: booleanField(traits, 'graceNote', where),
    strayNote: booleanField(traits, 'strayNote', where),
    lastNote: oneOf(traits, 'lastNote', LAST_NOTE_PLACES, where),
    aimedAt: readAim(traits.aimedAt, `${where}.aimedAt`),
    listeningMeasure: booleanField(traits, 'listeningMeasure', where),
    ...notes,
  }
}

/** Intent: a field that must be a concert pitch (a whole MIDI note number, 0 to 127). */
function pitchField(record: JsonRecord, where: string): ConcertPitch {
  try {
    return parseConcertPitch(record.pitch)
  } catch (error) {
    throw new Error(`${where}.pitch: ${messageOf(error)}`, { cause: error })
  }
}

/** Intent: one raw played note of the capture: finite onset and release, a concert pitch. */
function readRawNote(value: unknown, where: string): RawDoodleNote {
  const note = exactObject(value, RAW_NOTE_KEYS, where)
  return {
    onsetAt: numberField(note, 'onsetAt', where),
    releaseAt: numberField(note, 'releaseAt', where),
    pitch: pitchField(note, where),
  }
}

/**
 * Intent: the capture of one file: the grid origin, a whole positive tempo, the end measure and
 * at least one raw note. Whether it quantizes is the spec's to check, not the loader's.
 */
function readCapture(value: unknown, where: string): DoodleCapture {
  const capture = exactObject(value, CAPTURE_KEYS, where)
  const tempoBpm = numberField(capture, 'tempoBpm', where)
  const endMeasure = numberField(capture, 'endMeasure', where)
  if (!Number.isSafeInteger(tempoBpm) || tempoBpm <= 0) {
    throw new Error(`${where}.tempoBpm must be a positive whole number of BPM.`)
  }
  if (!Number.isSafeInteger(endMeasure) || endMeasure < 1) {
    throw new Error(`${where}.endMeasure must be a whole measure index, at least 1.`)
  }
  const notes = capture.notes
  if (!Array.isArray(notes) || notes.length === 0) {
    throw new Error(`${where}.notes must be a non-empty array.`)
  }
  return {
    gridOriginAt: numberField(capture, 'gridOriginAt', where),
    tempoBpm,
    endMeasure,
    notes: notes.map((note: unknown, index) => readRawNote(note, `${where}.notes[${index}]`)),
  }
}

/** Intent: the quantized doodle of one file, through the app's own parser for untrusted doodles. */
function readQuantized(value: unknown, where: string): QuantizedDoodle {
  try {
    return parseQuantizedDoodle(value)
  } catch (error) {
    throw new Error(`${where}: ${messageOf(error)}`, { cause: error })
  }
}

/**
 * Intent: one doodle file read and checked: its name must match the file name, its source be
 * hand-written or travel-sax, and every part have its exact shape. Crashes, naming the file.
 */
export function readDoodleFile(path: string): DoodleFixture {
  const fileName = path.split(/[\\/]/).pop() ?? path
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`${fileName} is not valid JSON: ${messageOf(error)}`, { cause: error })
  }
  const fixture = exactObject(parsed, FIXTURE_KEYS, fileName)
  const name = textField(fixture, 'name', fileName)
  if (`${name}.json` !== fileName) {
    throw new Error(`${fileName}: name "${name}" must match the file name.`)
  }
  return {
    name,
    source: oneOf(fixture, 'source', DOODLE_SOURCES, fileName),
    description: textField(fixture, 'description', fileName),
    traits: readTraits(fixture.traits, `${fileName}.traits`),
    capture: readCapture(fixture.capture, `${fileName}.capture`),
    quantized: readQuantized(fixture.quantized, `${fileName}.quantized`),
  }
}

/**
 * Intent: every doodle of the set, read from its directory, sorted by name. Crashes on a
 * malformed file or an empty directory, so a broken set never passes for a smaller one.
 */
export function loadDoodleSet(directory: string = DOODLE_SET_DIR): readonly DoodleFixture[] {
  const files = readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .sort()
  if (files.length === 0) throw new Error(`No doodle file in ${directory}.`)
  return files.map((file) => readDoodleFile(join(directory, file)))
}
