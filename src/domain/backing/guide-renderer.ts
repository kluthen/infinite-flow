/**
 * The guide playback's notes, rendered from a phrase's concert timeline and its harmony: the
 * melody guide plays the phrase's notes at concert pitch, the rhythm guide plays the same starts
 * and lengths on the root of the chord in effect at each start. Ties and rests are read as
 * acknowledgement's expected notes read them. Pure arithmetic in whole-note rationals; it reads no
 * clock, draws no random number and never touches audio.
 */

import { makeConcertPitch, type ConcertPitch } from '../events/concert-pitch'
import { deepFreeze } from '../events/deep-freeze'
import type { ConcertEventTimeline } from '../events/timeline'
import { FOUR_FOUR_METER } from '../generation/generation-request-envelope'
import type { HarmonyEvent } from '../harmony/harmony-types'
import { addRational, makeRational, subtractRational, type Rational } from '../time/rational'

/** One guide note: concert MIDI pitch, start and length in whole notes from the phrase's start. */
// @spec-link [[rule_melody_guide_notes]]
// @spec-link [[rule_rhythm_guide_notes]]
// @spec-link [[module_guide_playback_layers]]
export interface GuideNote {
  readonly pitch: ConcertPitch
  readonly start: Rational
  readonly duration: Rational
}

/** The rendered guides of one phrase: the melody guide's and the rhythm guide's notes, in order. */
// @spec-link [[rule_melody_guide_notes]]
// @spec-link [[rule_rhythm_guide_notes]]
// @spec-link [[module_guide_playback_layers]]
export interface RenderedGuide {
  readonly melody: readonly GuideNote[]
  readonly rhythm: readonly GuideNote[]
}

/** Typed failure for a timeline or harmony the guide renderer cannot render; never repaired. */
// @spec-link [[module_guide_playback_layers]]
export class GuideRenderError extends Error {
  readonly kind = 'GuideRenderError' as const

  constructor(message: string) {
    super(message)
    this.name = 'GuideRenderError'
  }
}

/** The rhythm guide's register: one octave from middle C, C4 to B4 (MIDI 60-71). */
// @spec-link [[rule_rhythm_guide_notes]]
export const RHYTHM_GUIDE_REGISTER = { lowest: 60, highest: 71 } as const

const ZERO = makeRational(0, 1)
const BEATS_PER_MEASURE = FOUR_FOUR_METER.beatsPerMeasure
const BEATS_PER_WHOLE_NOTE = FOUR_FOUR_METER.beatUnit
const OCTAVE = 12

/**
 * Intent: the melody guide's notes: every fresh attack starts a note at its position, at its
 * concert pitch; a tie continuation lengthens the note it continues, across a barline too; a rest
 * starts nothing and clears the sounding note. Throws a GuideRenderError on a tie continuation
 * that opens the phrase, follows a rest, or is at another pitch than the note it continues.
 */
// @spec-link [[rule_melody_guide_notes]]
function melodyGuideNotes(timeline: ConcertEventTimeline): GuideNote[] {
  const notes: GuideNote[] = []
  // The note a tie continuation may extend: the last event read was a note. A rest clears it.
  let sounding: { pitch: ConcertPitch; noteIndex: number } | null = null
  let position = ZERO

  for (const measure of timeline.measures) {
    measure.events.forEach((event, eventIndex) => {
      const end = addRational(position, event.duration)
      if (event.kind === 'rest') {
        sounding = null
      } else if (event.tieContinuation) {
        const where = `measure ${measure.measureIndex}, event ${eventIndex}`
        if (sounding === null) {
          throw new GuideRenderError(
            `guide: the tie continuation at ${where} has no note sounding before it to continue`,
          )
        }
        if (sounding.pitch !== event.pitch) {
          throw new GuideRenderError(
            `guide: the tie continuation at ${where} is at pitch ${event.pitch}, but continues pitch ${sounding.pitch}`,
          )
        }
        const attack = notes[sounding.noteIndex]!
        notes[sounding.noteIndex] = { ...attack, duration: subtractRational(end, attack.start) }
      } else {
        notes.push({ pitch: event.pitch, start: position, duration: event.duration })
        sounding = { pitch: event.pitch, noteIndex: notes.length - 1 }
      }
      position = end
    })
  }

  return notes
}

/**
 * Intent: whether harmony event `event` holds position `start`: its span, in quarter beats from
 * the phrase's first downbeat, is [barIndex * 4 + startBeat, + durationBeats), compared exactly by
 * cross-multiplying over the start's positive denominator.
 */
function eventHolds(event: HarmonyEvent, start: Rational): boolean {
  const spanStart = event.barIndex * BEATS_PER_MEASURE + event.startBeat
  const spanEnd = spanStart + event.durationBeats
  const scaledStart = start.numerator * BEATS_PER_WHOLE_NOTE
  return spanStart * start.denominator <= scaledStart && scaledStart < spanEnd * start.denominator
}

/**
 * Intent: the rhythm guide's pitch for a note starting at `start`: the root of the harmony event
 * holding the start, in the C4-B4 octave. Throws a GuideRenderError when no event holds the start
 * or the root is not an integer pitch class 0-11.
 */
// @spec-link [[rule_rhythm_guide_notes]]
function rhythmGuidePitch(harmony: readonly HarmonyEvent[], start: Rational): ConcertPitch {
  const event = harmony.find((candidate) => eventHolds(candidate, start))
  if (event === undefined) {
    throw new GuideRenderError(
      `guide: no harmony event holds the note starting at ${start.numerator}/${start.denominator}`,
    )
  }
  const root = event.triad.pitchClasses[0]
  if (!Number.isInteger(root) || root < 0 || root >= OCTAVE) {
    throw new GuideRenderError(
      `guide: the chord holding beat ${event.barIndex * BEATS_PER_MEASURE + event.startBeat} has root ${root}`,
    )
  }
  return makeConcertPitch(RHYTHM_GUIDE_REGISTER.lowest + root)
}

/**
 * Intent: render one phrase's guides from its concert timeline and harmony events: the melody
 * guide's notes at concert pitch with their tied lengths, and the rhythm guide's, one per melody
 * note with the same start and length, on the root of the chord in effect at the start (a note
 * held across a chord change keeps the root it started on). Deterministic and pure; the result is
 * frozen. Throws a GuideRenderError on a malformed tie, a start no harmony event holds, or a root
 * that is not a pitch class.
 */
// @spec-link [[rule_melody_guide_notes]]
// @spec-link [[rule_rhythm_guide_notes]]
// @spec-link [[module_guide_playback_layers]]
export function renderGuide(
  timeline: ConcertEventTimeline,
  harmony: readonly HarmonyEvent[],
): RenderedGuide {
  const melody = melodyGuideNotes(timeline)
  const rhythm = melody.map((note) => ({
    pitch: rhythmGuidePitch(harmony, note.start),
    start: note.start,
    duration: note.duration,
  }))
  return deepFreeze({ melody, rhythm })
}
