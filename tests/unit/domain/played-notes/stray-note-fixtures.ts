/**
 * The M1 recordings as played notes: the five played-notes MIDI files the owner exported from
 * v2.0 on the reference breath controller (`tests/fixtures/stray-notes/`, see
 * docs/midi-tuning.md, "Very short notes (M1)"), read back through the export specs' Standard MIDI
 * File reader into notes with their pitch, velocity, and onset and release in seconds from the
 * file's start, in onset order. Read once; the files never change.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { notesOf, readSmf, tempoMap } from '../../export/midi/smf-reader'

/** One played note of a recording, its times in seconds from the file's start. */
export interface FixtureNote {
  readonly pitch: number
  readonly velocity: number
  readonly onsetAt: number
  readonly releaseAt: number
}

/** One recording: its file name and its notes in onset order. */
export interface StrayNoteFixture {
  readonly name: string
  readonly notes: readonly FixtureNote[]
}

/** From the repository root, where Vitest runs, so the path holds in jsdom specs as in Node ones. */
const FIXTURE_DIR = join(process.cwd(), 'tests/fixtures/stray-notes')

let fixtures: readonly StrayNoteFixture[] | null = null

/**
 * Intent: the seconds of a tick of a file with one tempo, crashing on a file with a tempo change:
 * every v2.0 played-notes file of a session at one tempo has exactly one.
 */
function secondsPerTick(path: string, division: number, track: Parameters<typeof tempoMap>[0]) {
  const tempos = tempoMap(track)
  const [only] = tempos
  if (tempos.length !== 1 || only === undefined || only.tick !== 0)
    throw new Error(`${path}: expected one tempo at tick 0.`)
  return only.microsecondsPerQuarter / division / 1e6
}

/** Intent: one recording's notes, from every track after the conductor track, in onset order. */
function readFixture(name: string): StrayNoteFixture {
  const path = join(FIXTURE_DIR, name)
  const smf = readSmf(new Uint8Array(readFileSync(path)))
  const [conductor, ...tracks] = smf.tracks
  if (conductor === undefined) throw new Error(`${path}: no conductor track.`)
  const tick = secondsPerTick(path, smf.division, conductor)
  const notes = tracks
    .flatMap((track) => notesOf(track))
    .map((note) => ({
      pitch: note.pitch,
      velocity: note.velocity,
      onsetAt: note.startTick * tick,
      releaseAt: note.endTick * tick,
    }))
    .sort((a, b) => a.onsetAt - b.onsetAt || a.pitch - b.pitch)
  return { name, notes }
}

/** Intent: the five M1 recordings, by file name order. */
export function strayNoteFixtures(): readonly StrayNoteFixture[] {
  fixtures ??= readdirSync(FIXTURE_DIR)
    .filter((name) => name.endsWith('.mid'))
    .sort()
    .map(readFixture)
  if (fixtures.length !== 5) throw new Error(`Expected 5 M1 recordings, found ${fixtures.length}.`)
  return fixtures
}

/** Intent: a note's length in seconds. */
export function lengthOf(note: Pick<FixtureNote, 'onsetAt' | 'releaseAt'>): number {
  return note.releaseAt - note.onsetAt
}
