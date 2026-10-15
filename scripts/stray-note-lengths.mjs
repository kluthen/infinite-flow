import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { runnerImport } from 'vite'

/**
 * Measurement M1, the stray-note threshold: lists the length in milliseconds of every note of
 * played-notes MIDI files (the app's own export, read through the tests' Standard MIDI File
 * reader and its tempo map) and draws their distribution as a text histogram, so the gap between
 * the very short stray notes and the shortest intended notes can be read off. Each short note is
 * listed with the pitches around it, since a stray note is a different pitch wedged between two
 * intended ones while the fingers move. Tooling only: nothing in the app reads it.
 *
 * usage: node scripts/stray-note-lengths.mjs [--bin <ms>] [--up-to <ms>] [file.mid ...]
 *   with no file, every file of tests/fixtures/stray-notes/
 */

const FIXTURE_DIR = fileURLToPath(new URL('../tests/fixtures/stray-notes', import.meta.url))
const READER_MODULE = fileURLToPath(
  new URL('../tests/unit/export/midi/smf-reader.ts', import.meta.url),
)
/** @type {import('vite').InlineConfig} */
const LOAD_CONFIG = { configFile: false, logLevel: 'silent' }
const BAR_WIDTH = 60
/** The widest silence between two notes of one pitch still read as one held note cut in two. */
const SPLIT_GAP_MS = 60

/**
 * Intent: the options and the files to read, crashing on an unknown flag or a flag with no
 * positive number after it.
 * @param {readonly string[]} args
 * @returns {{ binMs: number, upToMs: number, files: string[] }}
 */
function parseArgs(args) {
  let binMs = 5
  let upToMs = 200
  const files = []
  for (let index = 0; index < args.length; index++) {
    const arg = /** @type {string} */ (args[index])
    if (arg === '--bin' || arg === '--up-to') {
      const value = Number(args[++index])
      if (!Number.isFinite(value) || value <= 0) throw new Error(`${arg} needs a positive number.`)
      if (arg === '--bin') binMs = value
      else upToMs = value
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option ${arg}.`)
    } else {
      files.push(arg)
    }
  }
  if (files.length === 0) {
    const names = readdirSync(FIXTURE_DIR).filter((name) => name.endsWith('.mid'))
    files.push(...names.sort().map((name) => join(FIXTURE_DIR, name)))
  }
  return { binMs, upToMs, files }
}

/**
 * Intent: a function giving the time in milliseconds of a tick of a file, from its division and
 * its tempo map; crashes on a file with no tempo at tick 0, since its first notes would have none.
 * @param {number} division
 * @param {readonly { tick: number, microsecondsPerQuarter: number }[]} tempos
 * @returns {(tick: number) => number}
 */
function tickClock(division, tempos) {
  if (tempos[0]?.tick !== 0) throw new Error('The file has no tempo at tick 0.')
  return (tick) => {
    let ms = 0
    for (let index = 0; index < tempos.length; index++) {
      const tempo = /** @type {{ tick: number, microsecondsPerQuarter: number }} */ (tempos[index])
      if (tempo.tick >= tick) break
      const end = Math.min(tick, tempos[index + 1]?.tick ?? tick)
      ms += ((end - tempo.tick) * tempo.microsecondsPerQuarter) / division / 1000
    }
    return ms
  }
}

/**
 * The functions of the tests' Standard MIDI File reader the script uses.
 * @typedef {object} SmfReader
 * @property {(bytes: Uint8Array) => { division: number, tracks: readonly unknown[] }} readSmf
 * @property {(track: unknown) => { tick: number, microsecondsPerQuarter: number }[]} tempoMap
 * @property {(track: unknown) => { pitch: number, velocity: number, startTick: number, endTick: number }[]} notesOf
 */

/**
 * Intent: load the tests' MIDI reader through Vite, crashing when a function the script uses is
 * missing.
 * @returns {Promise<SmfReader>}
 */
async function loadReader() {
  const { module } = await runnerImport(READER_MODULE, LOAD_CONFIG)
  for (const name of ['readSmf', 'tempoMap', 'notesOf']) {
    if (typeof Reflect.get(/** @type {object} */ (module), name) !== 'function')
      throw new TypeError(`${READER_MODULE} does not export ${name}().`)
  }
  return /** @type {SmfReader} */ (module)
}

/**
 * Intent: every note of one played-notes file with its onset and length in milliseconds, in onset
 * order. The conductor track holds the tempo map; every other track's notes are read.
 * @param {string} path
 * @param {SmfReader} reader
 * @returns {{ pitch: number, velocity: number, onsetMs: number, lengthMs: number }[]}
 */
function fileNotes(path, reader) {
  const smf = reader.readSmf(new Uint8Array(readFileSync(path)))
  const [conductor, ...tracks] = smf.tracks
  if (conductor === undefined) throw new Error(`${path} has no conductor track.`)
  const msAt = tickClock(smf.division, reader.tempoMap(conductor))
  return tracks
    .flatMap((track) => reader.notesOf(track))
    .map((note) => ({
      pitch: note.pitch,
      velocity: note.velocity,
      onsetMs: msAt(note.startTick),
      lengthMs: msAt(note.endTick) - msAt(note.startTick),
    }))
    .sort((a, b) => a.onsetMs - b.onsetMs || a.pitch - b.pitch)
}

/**
 * Intent: print the histogram of note lengths from 0 to `upToMs` in bins of `binMs`, one bar per
 * bin, plus the count of longer notes.
 * @param {readonly number[]} lengths
 * @param {number} binMs
 * @param {number} upToMs
 */
function printHistogram(lengths, binMs, upToMs) {
  const binCount = Math.ceil(upToMs / binMs)
  const counts = Array.from({ length: binCount }, () => 0)
  for (const length of lengths) {
    const bin = Math.floor(length / binMs)
    if (length < upToMs) counts[bin] = (counts[bin] ?? 0) + 1
  }
  const scale = Math.max(1, ...counts) / BAR_WIDTH
  counts.forEach((count, bin) => {
    const range = `${String(bin * binMs).padStart(4)}–${String((bin + 1) * binMs - 1).padEnd(4)} ms`
    console.log(`${range} ${String(count).padStart(4)} ${'#'.repeat(Math.round(count / scale))}`)
  })
  console.log(`  ≥ ${upToMs} ms ${String(lengths.filter((l) => l >= upToMs).length).padStart(4)}`)
}

/**
 * Intent: list every note shorter than `upToMs` of one file in its melodic context: the pitches
 * just before and after it, and `split` when a neighbour of the same pitch sits within
 * `SPLIT_GAP_MS` of it (the controller cutting one held note in two), so a stray in-between note
 * (a different pitch wedged between two notes) can be told from the short half of a split note.
 * @param {readonly { pitch: number, velocity: number, onsetMs: number, lengthMs: number }[]} notes
 * @param {number} upToMs
 */
function printShortNotes(notes, upToMs) {
  notes.forEach((note, index) => {
    if (note.lengthMs >= upToMs) return
    const before = notes[index - 1]
    const after = notes[index + 1]
    const split =
      (before !== undefined &&
        before.pitch === note.pitch &&
        note.onsetMs - (before.onsetMs + before.lengthMs) <= SPLIT_GAP_MS) ||
      (after !== undefined &&
        after.pitch === note.pitch &&
        after.onsetMs - (note.onsetMs + note.lengthMs) <= SPLIT_GAP_MS)
    const at = `${(note.onsetMs / 1000).toFixed(3)} s`.padStart(10)
    const length = `${note.lengthMs.toFixed(1)} ms`.padStart(9)
    const context = `${before?.pitch ?? '·'} → [${note.pitch}] → ${after?.pitch ?? '·'}`
    const velocity = `vel ${String(note.velocity).padStart(3)}`
    console.log(`  ${at}  ${length}  ${velocity}  ${context.padEnd(18)}${split ? ' split' : ''}`)
  })
}

const { binMs, upToMs, files } = parseArgs(process.argv.slice(2))
const reader = await loadReader()
/** @type {number[]} */
const all = []
for (const file of files) {
  const notes = fileNotes(file, reader)
  all.push(...notes.map((note) => note.lengthMs))
  console.log(`\n${basename(file)}: ${notes.length} notes; under ${upToMs} ms:`)
  printShortNotes(notes, upToMs)
}
console.log(`\nAll files, ${all.length} notes, in ${binMs} ms bins:`)
printHistogram(all, binMs, upToMs)
