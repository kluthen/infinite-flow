/**
 * Building the steering block from the doodle: when a doodle ends (and for a kept doodle), the
 * quantized doodle and Jam's drift become the one steering block a Jam's requests carry (master
 * spec C5.9, C8), so the generator receives plain data and never the doodle, the drift or Jam.
 * The target rhythm lays the doodle's measures over a phrase's four, each written as its starts
 * as heard: a note start where each note starts and a rest start where each of its rests starts,
 * the rests read by doodleMeasureRests, the same reading the silence density counts. The drift
 * gives the band and the strength; the moves are the doodle's own, read by the generator's own
 * melodicMoveBetween so both sides read a move the same way. The block holds no pitch. Pure,
 * whole numbers only (no division); part of Jam's code (src/jam/), loaded on demand.
 */
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import {
  makeSteeringBlock,
  type MelodicMove,
  type SteeringBand,
  type SteeringBlock,
  type SteeringStart,
  type SteeringStrength,
} from '@/domain/generation/steering-block'
import { melodicMoveBetween } from '@/domain/generation/steering/pitch-steering'
import { TICKS_PER_BAR } from '@/domain/time/ticks'

import { doodleMeasureRests } from './doodle-rhythm-reading'

/** Jam's drift positions, closest first: how far a Jam's phrases may wander from the doodle. */
// @spec-link [[rule_jam_drift_positions]]
export const JAM_DRIFTS = ['Close', 'Near', 'Free'] as const

/** One of Jam's drift positions. */
// @spec-link [[rule_jam_drift_positions]]
export type JamDrift = (typeof JAM_DRIFTS)[number]

/** What a drift position steers with: the target rhythm's band and the moves' strength. */
// @spec-link [[rule_jam_drift_positions]]
export interface DriftSteering {
  readonly band: SteeringBand
  readonly strength: SteeringStrength
}

/** Each drift position's band and strength (C8): Close, Near, then Free, which steers nothing. */
const DRIFT_STEERING: Readonly<Record<JamDrift, DriftSteering>> = {
  Close: { band: 'close', strength: 'size-and-direction' },
  Near: { band: 'near', strength: 'direction' },
  Free: { band: 'unbounded', strength: 'none' },
}

/**
 * Which doodle measure (from 0) each of a phrase's four measures takes: a one-measure doodle four
 * times, two measures twice, three as 1, 2, 3, 1, four as they are.
 */
const OVERLAYS: Readonly<Record<QuantizedDoodle['measureCount'], readonly number[]>> = {
  1: [0, 0, 0, 0],
  2: [0, 1, 0, 1],
  3: [0, 1, 2, 0],
  4: [0, 1, 2, 3],
}

/** Intent: the band and the strength a drift position gives the steering block. */
// @spec-link [[rule_jam_drift_positions]]
// @spec-link [[module_steering_block_builder]]
export function driftSteering(drift: JamDrift): DriftSteering {
  return DRIFT_STEERING[drift]
}

/**
 * Intent: the doodle measure (from 0) each of the phrase's four measures takes, in phrase order.
 */
// @spec-link [[rule_jam_rhythm_ordered_by_doodle]]
// @spec-link [[module_steering_block_builder]]
export function doodleOverlay(measureCount: QuantizedDoodle['measureCount']): readonly number[] {
  return OVERLAYS[measureCount]
}

/**
 * Intent: one doodle measure's starts as heard (`measureIndex` from 0), in increasing tick from
 * the measure's start: a note start where each note starting in it starts, and a rest start where
 * each of its rests starts (doodleMeasureRests). A note held across the barline starts nothing, so
 * a measure may hold no start; a measure opening in a silence that holds a rest at tick 0 starts
 * with a rest; each silence holds at most one rest, so two rest starts never follow each other.
 */
// @spec-link [[rule_jam_steering_block]]
// @spec-link [[entity_steering_block]]
// @spec-link [[module_steering_block_builder]]
export function doodleMeasureStarts(
  doodle: QuantizedDoodle,
  measureIndex: number,
): readonly SteeringStart[] {
  const from = measureIndex * TICKS_PER_BAR
  const notes: SteeringStart[] = doodle.notes
    .filter((note) => note.startTick >= from && note.startTick < from + TICKS_PER_BAR)
    .map((note) => ({ tick: note.startTick - from, kind: 'note' }))
  const rests: SteeringStart[] = doodleMeasureRests(doodle, measureIndex).map((rest) => ({
    tick: rest.startTick,
    kind: 'rest',
  }))
  return [...notes, ...rests].sort((a, b) => a.tick - b.tick)
}

/**
 * Intent: the doodle's moves between neighbouring notes, in the doodle's order: the same note, or
 * up or down by a step (1–2 half steps), a skip (3–4) or a leap (5 or more), read by the
 * generator's own melodicMoveBetween. No pitch is kept.
 */
// @spec-link [[rule_jam_melody_follows_doodle_moves]]
// @spec-link [[module_steering_block_builder]]
export function doodleMoves(doodle: QuantizedDoodle): readonly MelodicMove[] {
  const { notes } = doodle
  return notes.slice(1).map((note, index) => melodicMoveBetween(notes[index]!.pitch, note.pitch))
}

/**
 * Intent: the steering block of a quantized doodle under a drift position: the target rhythm (the
 * doodle's measures laid over the phrase's four, each as its starts as heard, with the drift's
 * band) and the doodle's moves in order with the drift's strength, built through makeSteeringBlock
 * so it passes the generation worker's checks. Holds nothing else of the doodle, the drift or the
 * tempo.
 */
// @spec-link [[rule_jam_steering_block]]
// @spec-link [[entity_steering_block]]
// @spec-link [[module_steering_block_builder]]
export function buildSteeringBlock(doodle: QuantizedDoodle, drift: JamDrift): SteeringBlock {
  const { band, strength } = driftSteering(drift)
  return makeSteeringBlock({
    targetRhythm: {
      measures: doodleOverlay(doodle.measureCount).map((measureIndex) =>
        doodleMeasureStarts(doodle, measureIndex),
      ),
      band,
    },
    moves: doodleMoves(doodle),
    strength,
  })
}
