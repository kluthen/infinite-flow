/**
 * The Drums (foundation) part of a phrase's accompaniment: one fixed groove, the same in every
 * measure of the phrase. Kick on beats 1 and 3, snare on beats 2 and 4, closed hi-hat on every
 * eighth, each note an eighth long. It reads nothing from the phrase, draws nothing at random and
 * starts at the phrase's start, so it never counts in.
 */

import { FOUR_FOUR_METER, PHRASE_MEASURE_COUNT } from '../generation/generation-request-envelope'
import { makeRational, type Rational } from '../time/rational'
import { makePartNote, type DrumSound, type PartNote } from './accompaniment-part'

/** The velocity of each drum sound; the hi-hat is louder on the beat than off it. */
// @spec-link [[req_drum_part]]
export const DRUM_VELOCITIES = {
  kick: 100,
  snare: 90,
  hiHatOnBeat: 70,
  hiHatOffBeat: 50,
} as const

/** The length of every drum note: an eighth, in whole notes. */
// @spec-link [[req_drum_part]]
export const DRUM_NOTE_LENGTH: Rational = makeRational(1, 8)

const EIGHTHS_PER_WHOLE_NOTE = 8
const EIGHTHS_PER_BEAT = EIGHTHS_PER_WHOLE_NOTE / FOUR_FOUR_METER.beatUnit
const EIGHTHS_PER_MEASURE = FOUR_FOUR_METER.beatsPerMeasure * EIGHTHS_PER_BEAT
/** Beats 1 and 3 of a measure, counted from 0. */
const KICK_BEATS: readonly number[] = [0, 2]
/** Beats 2 and 4 of a measure, counted from 0. */
const SNARE_BEATS: readonly number[] = [1, 3]

/**
 * The Drums part's notes for a phrase, in start order: in each of its measures, the kick or the
 * snare on each beat followed by the closed hi-hat at the same start, and the hi-hat alone on each
 * eighth between the beats; 48 notes. Pure and deterministic.
 */
// @spec-link [[req_accompaniment_parts]]
// @spec-link [[req_drum_part]]
export function drumsPart(): readonly PartNote[] {
  const notes: PartNote[] = []
  for (let measure = 0; measure < PHRASE_MEASURE_COUNT; measure += 1) {
    for (let eighth = 0; eighth < EIGHTHS_PER_MEASURE; eighth += 1) {
      const start = makeRational(measure * EIGHTHS_PER_MEASURE + eighth, EIGHTHS_PER_WHOLE_NOTE)
      const onBeat = eighth % EIGHTHS_PER_BEAT === 0
      const beat = eighth / EIGHTHS_PER_BEAT
      if (onBeat && KICK_BEATS.includes(beat)) {
        notes.push(drumNote(start, 'kick', DRUM_VELOCITIES.kick))
      }
      if (onBeat && SNARE_BEATS.includes(beat)) {
        notes.push(drumNote(start, 'snare', DRUM_VELOCITIES.snare))
      }
      const hiHatVelocity = onBeat ? DRUM_VELOCITIES.hiHatOnBeat : DRUM_VELOCITIES.hiHatOffBeat
      notes.push(drumNote(start, 'closed-hi-hat', hiHatVelocity))
    }
  }
  return notes
}

/** One drum note of `drum` at `start`, `DRUM_NOTE_LENGTH` long, at `velocity`. */
function drumNote(start: Rational, drum: DrumSound, velocity: number): PartNote {
  return makePartNote(start, DRUM_NOTE_LENGTH, { kind: 'drum', drum }, velocity)
}
