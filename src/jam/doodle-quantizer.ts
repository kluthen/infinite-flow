/**
 * The doodle quantizer: turns a capture's raw notes, as played on the audio clock, into the
 * quantized doodle, once, with whole-number arithmetic, so the same notes always give the same
 * doodle. Every time (the grid origin, each onset and each release) is converted once to whole
 * microseconds by toMicroseconds; everything after that conversion is integer arithmetic, and the
 * one division is floorDiv's exact integer division. The capture decides where the doodle ends
 * (C5.4's end by silence or by length); the quantizer only applies that end. Pure: no clock, no
 * storage. Nothing outside src/jam/ imports this module (enforced by ESLint).
 */

import {
  DOODLE_MAX_MEASURES,
  makeQuantizedDoodle,
  type QuantizedDoodle,
} from '../domain/doodle/quantized-doodle'
import { type ConcertPitch } from '../domain/events/concert-pitch'
import { type TimedNote, withoutVeryShortNotes } from '../domain/played-notes/stray-notes'
import { TICKS_PER_BAR } from '../domain/time/ticks'

/**
 * A raw played note of the doodle: its onset and release on the audio clock, in seconds, and its
 * concert pitch, stored as received (a session's recorded played note fits it).
 */
// @spec-link [[module_doodle_quantizer]]
export interface RawDoodleNote extends TimedNote {
  readonly pitch: ConcertPitch
}

/** The grid the doodle is quantized to. */
// @spec-link [[module_doodle_quantizer]]
export interface DoodleGrid {
  /** Audio-clock seconds of the first beat after the count-in: grid tick 0. */
  readonly gridOriginAt: number
  /** The capture tempo, a whole number of BPM. */
  readonly tempoBpm: number
}

/**
 * A finished capture: the grid, the raw notes played and the grid measure index (0 is the measure
 * starting at the grid origin) of the barline at which the capture ended the doodle (exclusive).
 */
// @spec-link [[module_doodle_quantizer]]
export interface DoodleCapture extends DoodleGrid {
  readonly notes: readonly RawDoodleNote[]
  readonly endMeasure: number
}

/** Microseconds in one second: the one conversion's scale. */
const MICROSECONDS_PER_SECOND = 1_000_000

/** A tick lasts this many microseconds divided by the tempo in BPM (60 s / BPM / 4 sixteenths). */
const TICK_MICROSECONDS_TIMES_BPM = 15_000_000

/** A snapped note, in grid ticks: its start, its end (exclusive) and its concert pitch. */
interface SnappedNote {
  readonly start: number
  readonly end: number
  readonly pitch: ConcertPitch
}

/**
 * Intent: the one conversion of an audio-clock time, in seconds, to whole microseconds; a time
 * that is not finite, or too large to stay an exact integer, is refused.
 */
function toMicroseconds(seconds: number, what: string): number {
  if (!Number.isFinite(seconds)) {
    throw new Error(`Doodle capture: ${what} must be a finite time, got ${seconds}.`)
  }
  const micros = Math.round(seconds * MICROSECONDS_PER_SECOND)
  if (!Number.isSafeInteger(micros)) {
    throw new Error(`Doodle capture: ${what} (${seconds} s) is too large to quantize exactly.`)
  }
  return micros
}

/**
 * Intent: exact integer division rounded toward minus infinity: the remainder is taken first, so
 * the one division left divides exactly. Both operands must be safe integers, the divisor positive.
 */
function floorDiv(dividend: number, divisor: number): number {
  if (!Number.isSafeInteger(dividend) || !Number.isSafeInteger(divisor) || divisor <= 0) {
    throw new Error(`Doodle quantizer: cannot divide ${dividend} by ${divisor} exactly.`)
  }
  const remainder = ((dividend % divisor) + divisor) % divisor
  return (dividend - remainder) / divisor
}

/** Intent: the capture tempo, refused unless it is a positive whole number of BPM. */
function checkedTempo(tempoBpm: number): number {
  if (!Number.isSafeInteger(tempoBpm) || tempoBpm <= 0) {
    throw new Error(`Doodle capture tempo must be a positive whole number of BPM, got ${tempoBpm}.`)
  }
  return tempoBpm
}

/**
 * Intent: the grid tick nearest a time, both in microseconds, a tie going to the later tick. A tick
 * lasts 15_000_000 / tempo microseconds, so the nearest tick is floor((2 t tempo + 15_000_000) /
 * 30_000_000), t the time from the origin.
 */
function tickAtMicroseconds(atMicros: number, originMicros: number, tempoBpm: number): number {
  const fromOrigin = atMicros - originMicros
  return floorDiv(
    2 * fromOrigin * tempoBpm + TICK_MICROSECONDS_TIMES_BPM,
    2 * TICK_MICROSECONDS_TIMES_BPM,
  )
}

/**
 * Intent: the grid tick (relative to the grid origin, negative in the count-in) nearest a time on
 * the audio clock, a tie going to the later tick.
 */
// @spec-link [[module_doodle_quantizer]]
// @spec-link [[rule_doodle_quantized_to_sixteenths]]
export function snappedTickOf(at: number, grid: DoodleGrid): number {
  const tempoBpm = checkedTempo(grid.tempoBpm)
  return tickAtMicroseconds(
    toMicroseconds(at, 'the time'),
    toMicroseconds(grid.gridOriginAt, 'the grid origin'),
    tempoBpm,
  )
}

/**
 * Intent: the grid measure index a snapped start tick falls in (16 ticks a measure; a negative
 * tick gives a negative measure, the count-in). A tick that is not a whole number is refused.
 */
// @spec-link [[module_doodle_quantizer]]
// @spec-link [[rule_doodle_capture_start]]
export function doodleMeasureOf(snappedStart: number): number {
  if (!Number.isSafeInteger(snappedStart)) {
    throw new Error(`A snapped start must be an integer tick, got ${snappedStart}.`)
  }
  return floorDiv(snappedStart, TICKS_PER_BAR)
}

/** Intent: refuse a raw note whose times are not finite or that releases before its onset. */
function checkRawNote(note: RawDoodleNote, position: number): void {
  if (!Number.isFinite(note.onsetAt) || !Number.isFinite(note.releaseAt)) {
    throw new Error(
      `Doodle capture: note ${position} must have a finite onset and release, got ` +
        `${note.onsetAt} and ${note.releaseAt}.`,
    )
  }
  if (note.releaseAt < note.onsetAt) {
    throw new Error(
      `Doodle capture: note ${position} releases before its onset (${note.releaseAt} < ` +
        `${note.onsetAt}).`,
    )
  }
}

/**
 * Intent: order snapped notes by start, then the longer first, then the higher first: on one
 * tick, the note that stays comes first, and equal notes are identical, so any input order gives
 * the same result.
 */
function lineOrder(first: SnappedNote, second: SnappedNote): number {
  if (first.start !== second.start) return first.start - second.start
  const firstLength = first.end - first.start
  const secondLength = second.end - second.start
  if (firstLength !== secondLength) return secondLength - firstLength
  return second.pitch - first.pitch
}

/**
 * Intent: one line from notes inside the doodle: notes on one tick keep the longer, then the
 * higher; then a later start ends the earlier note.
 */
function oneLine(notes: readonly SnappedNote[]): SnappedNote[] {
  const sorted = [...notes].sort(lineOrder)
  const onePerTick = sorted.filter(
    (note, position) => position === 0 || sorted[position - 1]?.start !== note.start,
  )
  return onePerTick.map((note, position) => {
    const next = onePerTick[position + 1]
    return next === undefined ? note : { ...note, end: Math.min(note.end, next.start) }
  })
}

/**
 * Intent: the capture's raw notes as one quantized doodle. In order: very short notes are left
 * out (so one never starts, extends or shapes the doodle); each start and end snaps to the nearest
 * tick, a note keeping at least one tick; notes snapped before the grid origin (the count-in) and
 * notes starting at or after the end barline are dropped; the doodle starts at the measure holding
 * its first note, rests included, and spans 1 to 4 measures up to the end barline; a note past the
 * end is cut at it; notes on one tick keep the longer, then the higher; a later start ends the
 * earlier note; ticks are counted from the doodle's first measure. A capture left with no note, or
 * spanning more than four measures, is refused. The same notes, in any order, give the same doodle.
 */
// @spec-link [[module_doodle_quantizer]]
// @spec-link [[rule_doodle_quantized_to_sixteenths]]
// @spec-link [[rule_doodle_capture_start]]
// @spec-link [[rule_doodle_is_one_line]]
// @spec-link [[rule_stray_notes_filtered_on_reading]]
export function quantizeDoodle(capture: DoodleCapture): QuantizedDoodle {
  const tempoBpm = checkedTempo(capture.tempoBpm)
  if (!Number.isSafeInteger(capture.endMeasure)) {
    throw new Error(`Doodle capture: endMeasure must be an integer, got ${capture.endMeasure}.`)
  }
  capture.notes.forEach(checkRawNote)
  const originMicros = toMicroseconds(capture.gridOriginAt, 'the grid origin')
  const endTick = capture.endMeasure * TICKS_PER_BAR

  const snapped = withoutVeryShortNotes(capture.notes).map((note): SnappedNote => {
    const onsetMicros = toMicroseconds(note.onsetAt, 'a note onset')
    const releaseMicros = toMicroseconds(note.releaseAt, 'a note release')
    const start = tickAtMicroseconds(onsetMicros, originMicros, tempoBpm)
    const end = tickAtMicroseconds(releaseMicros, originMicros, tempoBpm)
    return { start, end: Math.max(end, start + 1), pitch: note.pitch }
  })
  const inDoodle = snapped.filter((note) => note.start >= 0 && note.start < endTick)
  if (inDoodle.length === 0) {
    throw new Error('Doodle capture holds no doodle note: there is no doodle to quantize.')
  }

  const firstStart = inDoodle.reduce((earliest, note) => Math.min(earliest, note.start), endTick)
  const firstMeasure = doodleMeasureOf(firstStart)
  const measureCount = capture.endMeasure - firstMeasure
  if (measureCount < 1 || measureCount > DOODLE_MAX_MEASURES) {
    throw new Error(
      `Doodle capture spans ${measureCount} measures; a doodle spans 1 to ${DOODLE_MAX_MEASURES}.`,
    )
  }

  const cut = inDoodle.map((note) => ({ ...note, end: Math.min(note.end, endTick) }))
  const firstTick = firstMeasure * TICKS_PER_BAR
  return makeQuantizedDoodle({
    measureCount,
    notes: oneLine(cut).map((note) => ({
      startTick: note.start - firstTick,
      lengthTicks: note.end - note.start,
      pitch: note.pitch,
    })),
  })
}
