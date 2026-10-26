/**
 * The doodle set's computable traits, worked out from a doodle's raw capture and its quantized
 * form: the ones the doodle set's spec checks against each file's hand-written traits, and the
 * ones the recording import script fills in for a new Travel Sax doodle. The last note's place is
 * read against the C MIDI keyboard profile's register windows, derived by the app's own window
 * derivation; the note density follows C5.16.1's note-density rule. Imports by relative path, so
 * the import script can load it through Vite's runnerImport. Test tooling: nothing in the app
 * reads it.
 */
import type { NoteDensity } from '../../../src/domain/controls/generation-controls'
import type {
  DoodleMeasureCount,
  QuantizedDoodle,
} from '../../../src/domain/doodle/quantized-doodle'
import { C_KEYBOARD_PROFILE } from '../../../src/domain/profile/instrument-profiles'
import { registerWindowContainsPitch } from '../../../src/domain/profile/register-window'
import { deriveRegisterWindowCandidates } from '../../../src/domain/profile/register-window-derivation'
import { isVeryShortNote } from '../../../src/domain/played-notes/stray-notes'
import { TICKS_PER_BAR } from '../../../src/domain/time/ticks'
import {
  snappedTickOf,
  type DoodleCapture,
  type RawDoodleNote,
} from '../../../src/jam/doodle-quantizer'
import type { LastNotePlace } from './doodle-set'

/** The traits of a doodle that need no judgement: what the import script fills in. */
export interface ComputedDoodleTraits {
  readonly measureCount: DoodleMeasureCount
  readonly noteCount: number
  readonly leaping: boolean
  readonly oneNote: boolean
  readonly chord: boolean
  readonly graceNote: boolean
  readonly strayNote: boolean
  readonly lastNote: LastNotePlace
  readonly noteDensity: NoteDensity | null
}

/** The narrowest move, in half steps, between neighbouring notes that makes a doodle leaping. */
const LEAP_HALF_STEPS = 7

/** A tick lasts this many seconds times the tempo in BPM: 60 s / 4 sixteenths a beat. */
const TICK_SECONDS_TIMES_BPM = 15

/** The C MIDI keyboard profile's register windows (Low, Middle, High), from the app's derivation. */
export const C_KEYBOARD_WINDOWS = deriveRegisterWindowCandidates(
  C_KEYBOARD_PROFILE.concertRange,
  C_KEYBOARD_PROFILE.registerWindows,
)

/**
 * Intent: where a last note lies for the C MIDI keyboard profile: inside one of its register
 * windows, else outside its range (48 to 72), else outside the windows but inside the range.
 */
export function lastNotePlace(pitch: number): LastNotePlace {
  if (C_KEYBOARD_WINDOWS.some(({ window }) => registerWindowContainsPitch(window, pitch))) {
    return 'inside-windows'
  }
  const range = C_KEYBOARD_PROFILE.concertRange
  return pitch < range.minMidi || pitch > range.maxMidi ? 'outside-range' : 'outside-windows'
}

/** Intent: whether two neighbouring notes of the doodle lie 7 or more half steps apart. */
export function isLeaping(doodle: QuantizedDoodle): boolean {
  return doodle.notes.some((note, index) => {
    const next = doodle.notes[index + 1]
    return next !== undefined && Math.abs(next.pitch - note.pitch) >= LEAP_HALF_STEPS
  })
}

/** Intent: the capture's notes that are not very short: the ones the quantizer reads. */
function heardNotes(capture: DoodleCapture): RawDoodleNote[] {
  return capture.notes.filter((note) => !isVeryShortNote(note))
}

/**
 * Intent: whether two raw notes (not very short) sound together for at least one tick: a chord or
 * overlapping notes, not the fraction of a tick by which a legato note outlasts the next onset.
 */
export function holdsChord(capture: DoodleCapture): boolean {
  const tickSeconds = TICK_SECONDS_TIMES_BPM / capture.tempoBpm
  const notes = heardNotes(capture)
  return notes.some((first, index) =>
    notes.slice(index + 1).some((second) => {
      const together =
        Math.min(first.releaseAt, second.releaseAt) - Math.max(first.onsetAt, second.onsetAt)
      return together >= tickSeconds
    }),
  )
}

/** Intent: a raw note's snapped start and length, in grid ticks, as the quantizer snaps it. */
function snapped(note: RawDoodleNote, capture: DoodleCapture): { start: number; length: number } {
  const start = snappedTickOf(note.onsetAt, capture)
  const end = Math.max(snappedTickOf(note.releaseAt, capture), start + 1)
  return { start, length: end - start }
}

/**
 * Intent: whether the capture holds a grace note: a raw note (not very short) that snaps onto the
 * same tick as a longer note played after it, so the quantizer keeps the longer one.
 */
export function dropsGraceNote(capture: DoodleCapture): boolean {
  const notes = heardNotes(capture).map((note) => ({ note, ...snapped(note, capture) }))
  return notes.some((grace) =>
    notes.some(
      (main) =>
        main.start === grace.start &&
        main.length > grace.length &&
        main.note.onsetAt > grace.note.onsetAt,
    ),
  )
}

/** Intent: whether the capture holds a raw note under the very-short-note threshold. */
export function holdsStrayNote(capture: DoodleCapture): boolean {
  return capture.notes.some(isVeryShortNote)
}

/**
 * Intent: the note density C5.16.1 reads from the doodle: Sixteenth when 4 × (starts at an odd
 * position) ≥ n, else Eighth when 4 × (starts at a position not divisible by 4) ≥ n, else
 * Quarter; null (not shown) for fewer than two notes. A position is a start in its measure.
 */
export function shownNoteDensity(doodle: QuantizedDoodle): NoteDensity | null {
  const count = doodle.notes.length
  if (count < 2) return null
  const positions = doodle.notes.map((note) => note.startTick % TICKS_PER_BAR)
  if (4 * positions.filter((position) => position % 2 !== 0).length >= count) return 'Sixteenth'
  if (4 * positions.filter((position) => position % 4 !== 0).length >= count) return 'Eighth'
  return 'Quarter'
}

/** Intent: every computable trait of a doodle, from its capture and its quantized form. */
export function computedTraits(
  capture: DoodleCapture,
  quantized: QuantizedDoodle,
): ComputedDoodleTraits {
  const last = quantized.notes[quantized.notes.length - 1]
  if (last === undefined) throw new Error('A quantized doodle holds at least one note.')
  return {
    measureCount: quantized.measureCount,
    noteCount: quantized.notes.length,
    leaping: isLeaping(quantized),
    oneNote: quantized.notes.length === 1,
    chord: holdsChord(capture),
    graceNote: dropsGraceNote(capture),
    strayNote: holdsStrayNote(capture),
    lastNote: lastNotePlace(last.pitch),
    noteDensity: shownNoteDensity(quantized),
  }
}
