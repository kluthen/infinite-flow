/**
 * The doodles of the key and mode suggestion's tests: the research note's worked example and its
 * variations (docs/music/key-and-mode-estimation.md, "Worked example"), written from their pitches
 * and lengths in beats, and a pair's name as the tests write it ("D Dorian"). Test plumbing:
 * nothing in the app reads it.
 */
import { PITCH_CLASSES } from '@/domain/controls/generation-controls'
import {
  makeQuantizedDoodle,
  type DoodleMeasureCount,
  type QuantizedDoodle,
} from '@/domain/doodle/quantized-doodle'
import type { KeyModePair } from '@/jam/key-suggestion/key-suggestion-scores'

/** One note of a worked example: its concert pitch and its length in beats. */
export type BeatNote = readonly [pitch: number, beats: number]

/** The research note's worked example: D E F G A C A D, the last D held two beats. */
export const WORKED_EXAMPLE: readonly BeatNote[] = [
  [62, 1],
  [64, 0.5],
  [65, 0.5],
  [67, 1],
  [69, 1],
  [72, 0.5],
  [69, 0.5],
  [62, 2],
]

/** The worked example ending on E instead of D, the last note still held two beats. */
export const ENDING_ON_E: readonly BeatNote[] = [...WORKED_EXAMPLE.slice(0, 7), [64, 2]]

/** The harmonic-minor variation: A B C D E F G-sharp A. */
export const HARMONIC_MINOR: readonly BeatNote[] = [
  [57, 1],
  [59, 0.5],
  [60, 0.5],
  [62, 0.5],
  [64, 1],
  [65, 0.5],
  [68, 0.5],
  [69, 2],
]

/** The bluesy variation: C E F F-sharp G B-flat C. */
export const BLUESY: readonly BeatNote[] = [
  [60, 1],
  [64, 0.5],
  [65, 0.5],
  [66, 0.5],
  [67, 1],
  [70, 0.5],
  [72, 2],
]

/** Ticks per beat (a tick is a sixteenth note). */
const TICKS_PER_BEAT = 4

/**
 * Intent: a doodle of the given notes played back to back from `offsetTick`; an offset of one
 * tick starts no note on beat 1 or 3, as the research note's figures (without the strong-beat
 * weight) assume.
 */
export function beatsDoodle(notes: readonly BeatNote[], offsetTick = 0): QuantizedDoodle {
  let tick = offsetTick
  const placed = notes.map(([pitch, beats]) => {
    const lengthTicks = beats * TICKS_PER_BEAT
    const note = { startTick: tick, lengthTicks, pitch }
    tick += lengthTicks
    return note
  })
  const measureCount = Math.ceil(tick / 16) as DoodleMeasureCount
  return makeQuantizedDoodle({ measureCount, notes: placed })
}

/** Intent: a doodle from `[start, length, pitch]` tuples, in as few measures as it needs. */
export function tickDoodle(
  notes: readonly (readonly [startTick: number, lengthTicks: number, pitch: number])[],
): QuantizedDoodle {
  const end = Math.max(...notes.map(([start, length]) => start + length))
  return makeQuantizedDoodle({
    measureCount: Math.ceil(end / 16) as DoodleMeasureCount,
    notes: notes.map(([startTick, lengthTicks, pitch]) => ({ startTick, lengthTicks, pitch })),
  })
}

/** Intent: a pair's name as the tests write it, its home note in concert pitch: "D Dorian". */
export function pairName(pair: KeyModePair): string {
  return `${PITCH_CLASSES[pair.homeNote]} ${pair.mode}`
}
