/**
 * The lead's facts the accompaniment parts read, recomputed from a phrase's concert timeline and
 * its harmony: each sounding lead note (a tied note counted once, with its whole tied length), the
 * chord sounding at its start, whether it is one of that chord's tones and whether it lasts at
 * least a beat; and each stretch of silence between the lead's notes. Pure arithmetic in
 * whole-note rationals from the phrase's start; it reads nothing of the generator.
 */

import type { ConcertPitch } from '../events/concert-pitch'
import { deepFreeze } from '../events/deep-freeze'
import type { ConcertEventTimeline } from '../events/timeline'
import { FOUR_FOUR_METER } from '../generation/generation-request-envelope'
import { chordTones, type HarmonyEvent } from '../harmony/harmony-types'
import {
  addRational,
  compareRational,
  makeRational,
  subtractRational,
  type Rational,
} from '../time/rational'

/** One sounding lead note: a fresh attack with every tie continuation after it folded in. */
// @spec-link [[module_accompaniment_arranger]]
export interface LeadNote {
  readonly pitch: ConcertPitch
  readonly start: Rational
  readonly duration: Rational
  /** The harmony event whose span holds the note's start. */
  readonly chord: HarmonyEvent
  /** Whether the note's pitch class is one of `chord`'s tones, its seventh included. */
  readonly chordTone: boolean
  /** Whether the note, with its ties, lasts at least one beat. */
  readonly long: boolean
}

/** One stretch of the lead's silence: consecutive rest events joined, across barlines too. */
// @spec-link [[module_accompaniment_arranger]]
export interface LeadRest {
  readonly start: Rational
  readonly duration: Rational
}

/** A phrase's lead facts: its notes and its rests, each in order of start. */
// @spec-link [[module_accompaniment_arranger]]
export interface LeadFacts {
  readonly notes: readonly LeadNote[]
  readonly rests: readonly LeadRest[]
}

/** Typed failure for a timeline or harmony the lead facts cannot be read from; never repaired. */
// @spec-link [[module_accompaniment_arranger]]
export class LeadFactsError extends Error {
  readonly kind = 'LeadFactsError' as const

  constructor(message: string) {
    super(message)
    this.name = 'LeadFactsError'
  }
}

/**
 * Read a phrase's lead facts from its concert timeline and harmony events. Deterministic and
 * pure; the result is frozen. Throws a LeadFactsError on a tie continuation that opens the
 * phrase, follows a rest or changes pitch, and on a note start no harmony event holds.
 */
// @spec-link [[module_accompaniment_arranger]]
// @spec-link [[rule_parts_read_chord_as_written]]
export function leadFacts(
  timeline: ConcertEventTimeline,
  harmony: readonly HarmonyEvent[],
): LeadFacts {
  const spans = leadSpans(timeline)
  const notes = spans.notes.map((note) => {
    const chord = chordHolding(harmony, note.start)
    return {
      ...note,
      chord,
      chordTone: chordTones(chord).some((tone) => tone === pitchClassOf(note.pitch)),
      long: compareRational(note.duration, ONE_BEAT) >= 0,
    }
  })
  return deepFreeze({ notes, rests: spans.rests })
}

const ZERO = makeRational(0, 1)
const ONE_BEAT = makeRational(1, FOUR_FOUR_METER.beatUnit)
const BEATS_PER_MEASURE = FOUR_FOUR_METER.beatsPerMeasure
const BEATS_PER_WHOLE_NOTE = FOUR_FOUR_METER.beatUnit
const OCTAVE = 12

/** A sounding note or a rest span, before the harmony is read. */
interface Span {
  readonly start: Rational
  readonly duration: Rational
}

/** A sounding note before the harmony is read. */
interface PitchedSpan extends Span {
  readonly pitch: ConcertPitch
}

/** The pitch class 0-11 of a concert MIDI pitch. */
function pitchClassOf(pitch: ConcertPitch): number {
  return ((pitch % OCTAVE) + OCTAVE) % OCTAVE
}

/** `spans` with its last span lengthened to end at `end`. */
function extendLast<T extends Span>(spans: T[], end: Rational): void {
  const last = spans[spans.length - 1]!
  spans[spans.length - 1] = { ...last, duration: subtractRational(end, last.start) }
}

/**
 * Walk the timeline in order: a fresh note starts a note span, a tie continuation lengthens the
 * note span it continues, a rest starts a rest span or lengthens the rest span just before it.
 * Throws a LeadFactsError on a tie continuation that opens the phrase, follows a rest or is at
 * another pitch than the note it continues.
 */
function leadSpans(timeline: ConcertEventTimeline): {
  notes: PitchedSpan[]
  rests: Span[]
} {
  const notes: PitchedSpan[] = []
  const rests: Span[] = []
  let previous: 'note' | 'rest' | null = null
  let position = ZERO
  for (const measure of timeline.measures) {
    measure.events.forEach((event, eventIndex) => {
      const end = addRational(position, event.duration)
      if (event.kind === 'rest') {
        if (previous === 'rest') extendLast(rests, end)
        else rests.push({ start: position, duration: event.duration })
        previous = 'rest'
      } else if (event.tieContinuation) {
        const where = `measure ${measure.measureIndex}, event ${eventIndex}`
        const continued = previous === 'note' ? notes[notes.length - 1]! : null
        if (continued === null) {
          throw new LeadFactsError(`lead facts: the tie continuation at ${where} continues no note`)
        }
        if (continued.pitch !== event.pitch) {
          throw new LeadFactsError(
            `lead facts: the tie continuation at ${where} is at pitch ${event.pitch}, but continues pitch ${continued.pitch}`,
          )
        }
        extendLast(notes, end)
      } else {
        notes.push({ pitch: event.pitch, start: position, duration: event.duration })
        previous = 'note'
      }
      position = end
    })
  }
  return { notes, rests }
}

/**
 * The harmony event whose span, [barIndex * 4 + startBeat, + durationBeats) in beats from the
 * phrase's first downbeat, holds position `start`, compared exactly by cross-multiplying. Throws a
 * LeadFactsError when none does.
 */
function chordHolding(harmony: readonly HarmonyEvent[], start: Rational): HarmonyEvent {
  const scaledStart = start.numerator * BEATS_PER_WHOLE_NOTE
  const holding = harmony.find((event) => {
    const spanStart = event.barIndex * BEATS_PER_MEASURE + event.startBeat
    const spanEnd = spanStart + event.durationBeats
    return spanStart * start.denominator <= scaledStart && scaledStart < spanEnd * start.denominator
  })
  if (holding === undefined) {
    throw new LeadFactsError(
      `lead facts: no harmony event holds the note starting at ${start.numerator}/${start.denominator}`,
    )
  }
  return holding
}
