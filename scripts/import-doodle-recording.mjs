import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { runnerImport } from 'vite'

/**
 * Turns one doodle the owner played on his Travel Sax into a new file of the v3.2 doodle set
 * (`tests/fixtures/doodles/`, see docs/testing.md, "The doodle set (v3.2)"). It reads a v3.0
 * played-notes export (a type 1 Standard MIDI File at 960 ticks per quarter note: a conductor
 * track with the tempo map and one "Phrase n" marker per phrase, then the played notes,
 * unquantized), through the tests' Standard MIDI File reader.
 *
 * The doodle is taken from the start of one phrase: the grid origin is that phrase's marker, in
 * seconds from the file's start (the first beat of the phrase is grid tick 0, as the first beat
 * after Jam's count-in is), and the notes keep their times from the file's start. The tempo is the
 * tempo map's at that marker. The notes read are those starting from one tick before the marker
 * (a note played a little early onto beat 1 still snaps onto it) up to the end barline. The
 * doodle spans `--measures` measures from the marker; by default, up to the last of the phrase's
 * four measures in which a note starts, so trailing silent measures are left out. The quantized
 * doodle and the computable traits come from the app's own quantizer and the doodle set's trait
 * code, loaded through Vite; the hand-judged traits (density, aimedAt, listeningMeasure) and the
 * description are written as null, which the doodle set's loader refuses until they are filled.
 * Never overwrites a file. Tooling only: nothing in the app reads it.
 *
 * usage: node scripts/import-doodle-recording.mjs <played.mid> --name <name> [--phrase <n>]
 *        [--measures <1-4>] [--out <dir>]
 */

const USAGE =
  'usage: node scripts/import-doodle-recording.mjs <played.mid> --name <name> [--phrase <n>] ' +
  '[--measures <1-4>] [--out <dir>]'

/**
 * Intent: a path relative to this script as an absolute file path.
 * @param {string} path
 * @returns {string}
 */
function fromHere(path) {
  return fileURLToPath(new URL(path, import.meta.url))
}

const DOODLE_SET_DIR = fromHere('../tests/fixtures/doodles')
const READER_MODULE = fromHere('../tests/unit/export/midi/smf-reader.ts')
const QUANTIZER_MODULE = fromHere('../src/jam/doodle-quantizer.ts')
const TRAITS_MODULE = fromHere('../tests/unit/jam/doodle-traits.ts')
/** @type {import('vite').InlineConfig} */
const LOAD_CONFIG = { configFile: false, logLevel: 'silent' }

/** The meta event type of a marker, and the text the export gives each phrase's marker. */
const MARKER_META_TYPE = 0x06
const PHRASE_MARKER = /^Phrase (\d+)$/
const MAX_MEASURES = 4
const TICKS_PER_MEASURE = 16
const MICROSECONDS_PER_MINUTE = 60_000_000
/** A grid tick (a sixteenth note) lasts this many seconds times the tempo in BPM. */
const TICK_SECONDS_TIMES_BPM = 15
/** Seconds are written to the microsecond: the quantizer's own resolution. */
const SECONDS_DECIMALS = 6
/** A doodle name: lowercase words joined by hyphens, which is also its file name. */
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * @typedef {{ tick: number, microsecondsPerQuarter: number }} TempoChange
 * @typedef {{ pitch: number, startTick: number, endTick: number }} SmfNote
 * @typedef {object} SmfReader
 * @property {(bytes: Uint8Array) => { division: number, tracks: readonly unknown[] }} readSmf
 * @property {(track: unknown) => TempoChange[]} tempoMap
 * @property {(track: unknown, type: number) => { tick: number, text: string }[]} metaTexts
 * @property {(track: unknown) => SmfNote[]} notesOf
 * @typedef {{ onsetAt: number, releaseAt: number, pitch: number }} RawNote
 * @typedef {{ gridOriginAt: number, tempoBpm: number, endMeasure: number, notes: RawNote[] }} Capture
 * @typedef {{ measureCount: number, notes: readonly { startTick: number, lengthTicks: number, pitch: number }[] }} Quantized
 * @typedef {object} Quantizer
 * @property {(capture: Capture) => Quantized} quantizeDoodle
 * @property {(at: number, grid: { gridOriginAt: number, tempoBpm: number }) => number} snappedTickOf
 * @typedef {object} Traits
 * @property {(capture: Capture, quantized: Quantized) => ComputedTraits} computedTraits
 * @typedef {{ measureCount: number, noteCount: number, leaping: boolean, oneNote: boolean, chord: boolean, graceNote: boolean, strayNote: boolean, lastNote: string, noteDensity: string | null }} ComputedTraits
 * @typedef {{ file: string, name: string, phrase: number | null, measures: number | null, out: string }} Options
 */

/**
 * Intent: the options, crashing on a missing file or name, an unknown flag, a flag with no value,
 * a phrase that is not a whole number from 1, or a measure count outside 1 to 4.
 * @param {readonly string[]} args
 * @returns {Options}
 */
function parseArgs(args) {
  /** @type {Record<string, string>} */
  const flags = {}
  const files = []
  for (let index = 0; index < args.length; index++) {
    const arg = /** @type {string} */ (args[index])
    if (!arg.startsWith('--')) {
      files.push(arg)
      continue
    }
    if (!['--name', '--phrase', '--measures', '--out'].includes(arg)) {
      throw new Error(`Unknown option ${arg}.`)
    }
    const value = args[++index]
    if (value === undefined) throw new Error(`${arg} needs a value.`)
    flags[arg.slice(2)] = value
  }
  const [file, ...extra] = files
  if (file === undefined || extra.length > 0) throw new Error('Give exactly one played-notes file.')
  const name = flags.name
  if (name === undefined || !NAME_PATTERN.test(name)) {
    throw new Error('--name needs lowercase words joined by hyphens, such as "slow-arch".')
  }
  return {
    file,
    name,
    phrase: flags.phrase === undefined ? null : wholeNumber(flags.phrase, '--phrase', 1, Infinity),
    measures:
      flags.measures === undefined
        ? null
        : wholeNumber(flags.measures, '--measures', 1, MAX_MEASURES),
    out: flags.out ?? DOODLE_SET_DIR,
  }
}

/**
 * Intent: a flag's value as a whole number from `min` to `max`, crashing otherwise.
 * @param {string} text
 * @param {string} flag
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function wholeNumber(text, flag, min, max) {
  const value = Number(text)
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(
      `${flag} needs a whole number from ${min}${max === Infinity ? '' : ` to ${max}`}.`,
    )
  }
  return value
}

/**
 * Intent: load a module through Vite, crashing when a function the script uses is missing.
 * @template T
 * @param {string} path
 * @param {readonly string[]} names
 * @returns {Promise<T>}
 */
async function loadModule(path, names) {
  const { module } = await runnerImport(path, LOAD_CONFIG)
  for (const name of names) {
    if (typeof Reflect.get(/** @type {object} */ (module), name) !== 'function') {
      throw new TypeError(`${path} does not export ${name}().`)
    }
  }
  return /** @type {T} */ (module)
}

/**
 * Intent: a function giving the seconds from the file's start of a MIDI tick, from the file's
 * division and tempo map; crashes on a file with no tempo at tick 0.
 * @param {number} division
 * @param {readonly TempoChange[]} tempos
 * @returns {(tick: number) => number}
 */
function tickClock(division, tempos) {
  if (tempos[0]?.tick !== 0) throw new Error('The file has no tempo at tick 0.')
  return (tick) => {
    let seconds = 0
    tempos.forEach((tempo, index) => {
      if (tempo.tick >= tick) return
      const end = Math.min(tick, tempos[index + 1]?.tick ?? tick)
      seconds += ((end - tempo.tick) * tempo.microsecondsPerQuarter) / division / 1e6
    })
    return seconds
  }
}

/**
 * Intent: the phrase marker the doodle starts at: the one numbered `phrase`, or the file's first;
 * crashes when the file has no such marker.
 * @param {readonly { tick: number, text: string }[]} markers
 * @param {number | null} phrase
 * @returns {{ tick: number, number: number }}
 */
function phraseMarker(markers, phrase) {
  const phrases = markers.flatMap(({ tick, text }) => {
    const match = PHRASE_MARKER.exec(text)
    return match === null ? [] : [{ tick, number: Number(match[1]) }]
  })
  const found = phrase === null ? phrases[0] : phrases.find((each) => each.number === phrase)
  if (found === undefined) {
    const numbers = phrases.map((each) => each.number).join(', ') || 'none'
    throw new Error(`The file has no marker "Phrase ${phrase ?? 'n'}" (phrases: ${numbers}).`)
  }
  return found
}

/**
 * Intent: the tempo in force at a tick, as a whole number of BPM, crashing on a tempo the app
 * could not have played (the export writes whole BPM, rounded to the microsecond).
 * @param {readonly TempoChange[]} tempos
 * @param {number} tick
 * @returns {number}
 */
function bpmAt(tempos, tick) {
  const tempo = tempos.filter((each) => each.tick <= tick).pop()
  if (tempo === undefined) throw new Error(`No tempo is in force at tick ${tick}.`)
  const bpm = Math.round(MICROSECONDS_PER_MINUTE / tempo.microsecondsPerQuarter)
  if (Math.round(MICROSECONDS_PER_MINUTE / bpm) !== tempo.microsecondsPerQuarter) {
    throw new Error(`The tempo at tick ${tick} is not a whole number of BPM.`)
  }
  return bpm
}

/**
 * Intent: the capture of the doodle at the chosen phrase: its grid origin and tempo, and every
 * played note starting from one tick before the marker up to the phrase's end, in seconds from
 * the file's start, before the end barline is chosen.
 * @param {string} file
 * @param {number | null} phrase
 * @param {SmfReader} reader
 * @returns {{ phraseNumber: number, gridOriginAt: number, tempoBpm: number, notes: RawNote[] }}
 */
function readRecording(file, phrase, reader) {
  const smf = reader.readSmf(new Uint8Array(readFileSync(file)))
  const [conductor, ...tracks] = smf.tracks
  if (conductor === undefined) throw new Error(`${file} has no conductor track.`)
  const tempos = reader.tempoMap(conductor)
  const secondsAt = tickClock(smf.division, tempos)
  const marker = phraseMarker(reader.metaTexts(conductor, MARKER_META_TYPE), phrase)
  const tempoBpm = bpmAt(tempos, marker.tick)
  const gridOriginAt = secondsAt(marker.tick)
  const tickSeconds = TICK_SECONDS_TIMES_BPM / tempoBpm
  const phraseEnd = gridOriginAt + MAX_MEASURES * TICKS_PER_MEASURE * tickSeconds
  const notes = tracks
    .flatMap((track) => reader.notesOf(track))
    .map((note) => ({
      onsetAt: microsecondSeconds(secondsAt(note.startTick)),
      releaseAt: microsecondSeconds(secondsAt(note.endTick)),
      pitch: note.pitch,
    }))
    .filter((note) => note.onsetAt >= gridOriginAt - tickSeconds && note.onsetAt < phraseEnd)
    .sort((a, b) => a.onsetAt - b.onsetAt || a.pitch - b.pitch)
  if (notes.length === 0) throw new Error(`Phrase ${marker.number} holds no played note.`)
  return {
    phraseNumber: marker.number,
    gridOriginAt: microsecondSeconds(gridOriginAt),
    tempoBpm,
    notes,
  }
}

/**
 * Intent: a time in seconds rounded to the microsecond, the quantizer's resolution.
 * @param {number} seconds
 * @returns {number}
 */
function microsecondSeconds(seconds) {
  return Number(seconds.toFixed(SECONDS_DECIMALS))
}

/**
 * Intent: the end barline's measure index: the one asked for, or else the barline after the last
 * of the phrase's measures in which a note starts once snapped (very short notes included: the
 * quantizer filters them, and a doodle cut short by one is checked by eye).
 * @param {{ gridOriginAt: number, tempoBpm: number, notes: readonly RawNote[] }} recording
 * @param {number | null} measures
 * @param {Quantizer} quantizer
 * @returns {number}
 */
function endMeasureOf(recording, measures, quantizer) {
  if (measures !== null) return measures
  const lastStart = Math.max(
    ...recording.notes.map((note) => quantizer.snappedTickOf(note.onsetAt, recording)),
  )
  return Math.min(MAX_MEASURES, Math.floor(lastStart / TICKS_PER_MEASURE) + 1)
}

/**
 * Intent: an object as one line of JSON with a space after each colon and comma, the layout the
 * doodle files use for their notes.
 * @param {Record<string, unknown>} value
 * @returns {string}
 */
function inlineJson(value) {
  const fields = Object.entries(value).map(
    ([key, field]) => `${JSON.stringify(key)}: ${JSON.stringify(field)}`,
  )
  return `{ ${fields.join(', ')} }`
}

/**
 * Intent: the new doodle file's text, laid out as the hand-written files are: the hand-judged
 * traits and the description null, a note asking to fill them with the computed note density.
 * @param {string} name
 * @param {number} phraseNumber
 * @param {Capture} capture
 * @param {Quantized} quantized
 * @param {ComputedTraits} computed
 * @returns {string}
 */
function fixtureText(name, phraseNumber, capture, quantized, computed) {
  const head = {
    name,
    source: 'travel-sax',
    description: null,
    traits: {
      measureCount: computed.measureCount,
      noteCount: computed.noteCount,
      density: null,
      leaping: computed.leaping,
      oneNote: computed.oneNote,
      chord: computed.chord,
      graceNote: computed.graceNote,
      strayNote: computed.strayNote,
      lastNote: computed.lastNote,
      aimedAt: null,
      listeningMeasure: null,
      notes:
        `Recorded on the Travel Sax, phrase ${phraseNumber} of a played-notes export. To do: ` +
        'write the description; fill density, listeningMeasure and aimedAt (the four values ' +
        `C5.16.1's rules give; its noteDensity is ${JSON.stringify(computed.noteDensity)}), then replace ` +
        'this text with what the doodle shows.',
    },
  }
  /**
   * Intent: a list of notes, one indented line each, as the doodle files lay them out.
   * @param {readonly Record<string, unknown>[]} notes
   * @returns {string}
   */
  function noteLines(notes) {
    return notes.map((note) => `      ${inlineJson(note)}`).join(',\n')
  }
  return [
    '{',
    ...Object.entries(head).map(
      ([key, value]) =>
        `  ${JSON.stringify(key)}: ${JSON.stringify(value, null, 2).replace(/\n/g, '\n  ')},`,
    ),
    '  "capture": {',
    `    "gridOriginAt": ${capture.gridOriginAt},`,
    `    "tempoBpm": ${capture.tempoBpm},`,
    `    "endMeasure": ${capture.endMeasure},`,
    '    "notes": [',
    noteLines(capture.notes),
    '    ]',
    '  },',
    '  "quantized": {',
    `    "measureCount": ${quantized.measureCount},`,
    '    "notes": [',
    noteLines(quantized.notes),
    '    ]',
    '  }',
    '}',
    '',
  ].join('\n')
}

/**
 * Intent: import one recording as a new doodle file and say where it went and what is left to
 * fill; crashes rather than overwrite an existing file.
 * @returns {Promise<void>}
 */
async function main() {
  const options = parseArgs(process.argv.slice(2))
  const path = join(options.out, `${options.name}.json`)
  if (existsSync(path)) throw new Error(`${path} already exists; choose another --name.`)
  /** @type {SmfReader} */
  const reader = await loadModule(READER_MODULE, ['readSmf', 'tempoMap', 'metaTexts', 'notesOf'])
  /** @type {Quantizer} */
  const quantizer = await loadModule(QUANTIZER_MODULE, ['quantizeDoodle', 'snappedTickOf'])
  /** @type {Traits} */
  const traits = await loadModule(TRAITS_MODULE, ['computedTraits'])
  const { phraseNumber, ...recording } = readRecording(options.file, options.phrase, reader)
  const endMeasure = endMeasureOf(recording, options.measures, quantizer)
  const endAt =
    recording.gridOriginAt +
    (endMeasure * TICKS_PER_MEASURE * TICK_SECONDS_TIMES_BPM) / recording.tempoBpm
  /** @type {Capture} */
  const capture = {
    ...recording,
    endMeasure,
    notes: recording.notes.filter((note) => note.onsetAt < endAt),
  }
  const quantized = quantizer.quantizeDoodle(capture)
  const computed = traits.computedTraits(capture, quantized)
  writeFileSync(path, fixtureText(options.name, phraseNumber, capture, quantized, computed), {
    flag: 'wx',
  })
  console.log(
    `Wrote ${path}: phrase ${phraseNumber}, ${capture.tempoBpm} BPM, ${quantized.measureCount} ` +
      `measure(s), ${quantized.notes.length} note(s). Fill the null fields, then run ` +
      '`npx vitest run tests/unit/jam/doodle-set.spec.ts`.',
  )
}

try {
  await main()
} catch (error) {
  process.stderr.write(
    `import-doodle-recording: ${error instanceof Error ? error.message : String(error)}\n${USAGE}\n`,
  )
  process.exitCode = 1
}
