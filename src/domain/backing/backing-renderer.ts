/**
 * The session backing, rendered from a phrase's harmony: a bass line and block chords that follow
 * the phrase's own harmony events, in pitch and on the beat. Pure arithmetic on the harmony; it
 * reads no clock, draws no random number and never touches audio.
 */

import { makeConcertPitch, type ConcertPitch } from '../events/concert-pitch'
import { deepFreeze } from '../events/deep-freeze'
import {
  FOUR_FOUR_METER,
  PHRASE_MEASURE_COUNT,
  type Meter,
} from '../generation/generation-request-envelope'
import {
  chordTones,
  type ChordSeventh,
  type DiatonicTriad,
  type HarmonyEvent,
  type PitchClassNumber,
  type SeventhQuality,
  type TriadQuality,
} from '../harmony/harmony-types'
import { makeRational, type Rational } from '../time/rational'

/**
 * One backing note: concert MIDI pitch, start and length in whole notes from the phrase's start.
 * Structurally the MIDI export's MidiBackingNote.
 */
// @spec-link [[req_session_backing_track]]
export interface BackingNote {
  readonly pitch: ConcertPitch
  readonly start: Rational
  readonly duration: Rational
}

/**
 * The rendered backing of one phrase: the bass line and the block chords, each ordered by start.
 */
// @spec-link [[req_session_backing_track]]
export interface RenderedBacking {
  readonly bass: readonly BackingNote[]
  readonly chords: readonly BackingNote[]
}

/** Typed failure for a harmony or meter the backing renderer cannot render; never repaired. */
// @spec-link [[req_session_backing_track]]
export class BackingRenderError extends Error {
  readonly kind = 'BackingRenderError' as const

  constructor(message: string) {
    super(message)
    this.name = 'BackingRenderError'
  }
}

/** The backing's register: bass in MIDI 36–47, chord tops at or below E4 (64), as accepted by ear. */
// @spec-link [[req_session_backing_track]]
export const BACKING_REGISTER = { bassLowest: 36, bassHighest: 47, chordTopHighest: 64 } as const

const BEATS_PER_MEASURE = FOUR_FOUR_METER.beatsPerMeasure
const HALF_MEASURE_BEATS = BEATS_PER_MEASURE / 2
const PHRASE_BEATS = PHRASE_MEASURE_COUNT * BEATS_PER_MEASURE
const OCTAVE = 12

/** The semitones from the root to the third and to the fifth of each triad quality. */
const QUALITY_INTERVALS: Readonly<Record<TriadQuality, readonly [number, number]>> = {
  major: [4, 7],
  minor: [3, 7],
  diminished: [3, 6],
}

/** The triad each seventh quality stacks on, and the semitones from its root to the seventh. */
const SEVENTH_SHAPES: Readonly<Record<SeventhQuality, readonly [TriadQuality, number]>> = {
  'major-seventh': ['major', 11],
  'minor-seventh': ['minor', 10],
  'dominant-seventh': ['major', 10],
  'half-diminished-seventh': ['diminished', 10],
}

/**
 * One attack of the backing: a stretch of one chord that never crosses a bar line. `triad` gives
 * the bass its root and fifth; `tones` are every note of the chord, the seventh's too.
 */
interface AttackSegment {
  readonly startBeat: number
  readonly lengthBeats: number
  readonly triad: DiatonicTriad
  readonly tones: readonly PitchClassNumber[]
}

/** Intent: the non-negative remainder of `value` modulo an octave, i.e. its pitch class. */
function pitchClassDistance(value: number): number {
  return ((value % OCTAVE) + OCTAVE) % OCTAVE
}

/** Intent: the beat a harmony event starts on, counted from the phrase's first downbeat. */
function eventStartBeat(event: HarmonyEvent): number {
  return event.barIndex * BEATS_PER_MEASURE + event.startBeat
}

/** Intent: reject any meter but 4/4, the only meter the backing's attack rules are defined for. */
function assertFourFour(meter: Meter): void {
  if (
    meter.beatsPerMeasure !== FOUR_FOUR_METER.beatsPerMeasure ||
    meter.beatUnit !== FOUR_FOUR_METER.beatUnit
  ) {
    throw new BackingRenderError(
      `backing: only 4/4 is supported, got ${meter.beatsPerMeasure}/${meter.beatUnit}`,
    )
  }
}

/**
 * Intent: reject a triad whose pitch classes are not integers 0-11 stacked as root, third and
 * fifth of its stated quality, since the voicing and the bass fifth both rely on that shape.
 */
function assertStackedTriad(triad: DiatonicTriad, index: number): void {
  const [root, third, fifth] = triad.pitchClasses
  for (const pitchClass of triad.pitchClasses) {
    if (!Number.isInteger(pitchClass) || pitchClass < 0 || pitchClass >= OCTAVE) {
      throw new BackingRenderError(`backing: event ${index} has pitch class ${pitchClass}`)
    }
  }
  const [thirdInterval, fifthInterval] = QUALITY_INTERVALS[triad.quality]
  if (
    pitchClassDistance(third - root) !== thirdInterval ||
    pitchClassDistance(fifth - root) !== fifthInterval
  ) {
    throw new BackingRenderError(
      `backing: event ${index} triad [${triad.pitchClasses.join(', ')}] is not a ${triad.quality} triad`,
    )
  }
}

/**
 * Intent: reject a seventh whose pitch class is not an integer 0-11, or that does not sit at its
 * quality's interval above a triad of its quality's triad quality, so a seventh-form event always
 * stacks root, third, fifth and seventh as its quality states.
 */
function assertStackedSeventh(triad: DiatonicTriad, seventh: ChordSeventh, index: number): void {
  const { pitchClass, quality } = seventh
  if (!Number.isInteger(pitchClass) || pitchClass < 0 || pitchClass >= OCTAVE) {
    throw new BackingRenderError(`backing: event ${index} has seventh pitch class ${pitchClass}`)
  }
  const [triadQuality, seventhInterval] = SEVENTH_SHAPES[quality]
  if (
    triad.quality !== triadQuality ||
    pitchClassDistance(pitchClass - triad.pitchClasses[0]) !== seventhInterval
  ) {
    throw new BackingRenderError(
      `backing: event ${index} seventh ${pitchClass} over a ${triad.quality} triad is not a ${quality} chord`,
    )
  }
}

/**
 * Intent: reject harmony that does not tile the phrase exactly: events must be in order, each
 * starting where the previous one ended (the first on beat 1 of bar 1), with positive whole-beat
 * durations adding up to the phrase's 16 beats. Gaps, overlaps and a short or long phrase throw.
 */
function assertTilesPhrase(harmony: readonly HarmonyEvent[]): void {
  if (harmony.length === 0) throw new BackingRenderError('backing: the harmony has no events')
  let cursor = 0
  harmony.forEach((event, index) => {
    if (!Number.isInteger(event.durationBeats) || event.durationBeats <= 0) {
      throw new BackingRenderError(
        `backing: event ${index} lasts ${event.durationBeats} beats, not a positive whole number`,
      )
    }
    const startBeat = eventStartBeat(event)
    if (startBeat !== cursor) {
      throw new BackingRenderError(
        `backing: event ${index} starts on beat ${startBeat}, expected ${cursor} (a gap, overlap or misorder)`,
      )
    }
    assertStackedTriad(event.triad, index)
    if (event.seventh !== undefined) assertStackedSeventh(event.triad, event.seventh, index)
    cursor += event.durationBeats
  })
  if (cursor !== PHRASE_BEATS) {
    throw new BackingRenderError(`backing: the harmony lasts ${cursor} beats, not ${PHRASE_BEATS}`)
  }
}

/**
 * Intent: split every harmony event at each bar line it crosses, so the backing attacks at every
 * chord change and on every downbeat, and nowhere else.
 */
// @spec-link [[req_session_backing_track]]
function attackSegments(harmony: readonly HarmonyEvent[]): AttackSegment[] {
  const segments: AttackSegment[] = []
  for (const event of harmony) {
    const endBeat = eventStartBeat(event) + event.durationBeats
    let startBeat = eventStartBeat(event)
    while (startBeat < endBeat) {
      const nextBarLine = (Math.floor(startBeat / BEATS_PER_MEASURE) + 1) * BEATS_PER_MEASURE
      const segmentEnd = Math.min(endBeat, nextBarLine)
      segments.push({
        startBeat,
        lengthBeats: segmentEnd - startBeat,
        triad: event.triad,
        tones: chordTones(event),
      })
      startBeat = segmentEnd
    }
  }
  return segments
}

/** Intent: one backing note from a MIDI pitch and a start and length counted in beats. */
function backingNote(pitch: number, startBeat: number, lengthBeats: number): BackingNote {
  const beatUnit = FOUR_FOUR_METER.beatUnit
  return {
    pitch: makeConcertPitch(pitch),
    start: makeRational(startBeat, beatUnit),
    duration: makeRational(lengthBeats, beatUnit),
  }
}

/**
 * Intent: the bass of one attack, in the C2-B2 octave: the root for two beats then the fifth from
 * beat 3 when the attack fills a whole measure, otherwise the root for the whole attack.
 */
// @spec-link [[req_session_backing_track]]
function bassNotes(segment: AttackSegment): BackingNote[] {
  const [root, , fifth] = segment.triad.pitchClasses
  const lowest = BACKING_REGISTER.bassLowest
  if (segment.lengthBeats === BEATS_PER_MEASURE) {
    return [
      backingNote(lowest + root, segment.startBeat, HALF_MEASURE_BEATS),
      backingNote(lowest + fifth, segment.startBeat + HALF_MEASURE_BEATS, HALF_MEASURE_BEATS),
    ]
  }
  return [backingNote(lowest + root, segment.startBeat, segment.lengthBeats)]
}

/**
 * Intent: the close-position voicing of a chord's tones (root first, stacked in thirds),
 * ascending: of its arrangements with each tone at the bottom in turn (three for a triad, four for
 * a seventh chord), each stacked as tightly as possible, the one whose top note is highest at or
 * below the chord ceiling (E4).
 */
// @spec-link [[req_session_backing_track]]
function closePositionChord(tones: readonly PitchClassNumber[]): readonly number[] {
  const ceiling = BACKING_REGISTER.chordTopHighest
  const arrangements = tones.map((_, bottom) => [...tones.slice(bottom), ...tones.slice(0, bottom)])
  const voicings = arrangements.map((arrangement) => {
    let pitch = ceiling
    let previousClass = pitchClassDistance(ceiling)
    const descending = [...arrangement].reverse().map((pitchClass) => {
      pitch -= pitchClassDistance(previousClass - pitchClass)
      previousClass = pitchClass
      return pitch
    })
    return descending.reverse()
  })
  return voicings.reduce((best, voicing) =>
    Math.max(...voicing) > Math.max(...best) ? voicing : best,
  )
}

/**
 * Intent: render one phrase's backing from its harmony events: a bass line and close-position
 * block chords holding every note of each chord (four for a seventh chord), both attacked at every
 * chord change and every downbeat, the bass adding the fifth on beat 3 of a measure held under one
 * chord. Deterministic and pure; the result is frozen. Throws a BackingRenderError on a meter other
 * than 4/4, harmony that does not tile the phrase, or a chord not stacked as its quality states.
 */
// @spec-link [[req_session_backing_track]]
export function renderBacking(harmony: readonly HarmonyEvent[], meter: Meter): RenderedBacking {
  assertFourFour(meter)
  assertTilesPhrase(harmony)
  const segments = attackSegments(harmony)
  const bass = segments.flatMap(bassNotes)
  const chords = segments.flatMap((segment) =>
    closePositionChord(segment.tones).map((pitch) =>
      backingNote(pitch, segment.startBeat, segment.lengthBeats),
    ),
  )
  return deepFreeze({ bass, chords })
}
