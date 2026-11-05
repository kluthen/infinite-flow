/**
 * The guides' timing: a phrase's rendered guide notes placed on the audio clock, and handed to
 * the look-ahead scheduler one window at a time. Where the backing takes whole beats only, a guide
 * note may start or end anywhere (off a beat, inside a triplet): each position is placed exactly
 * through the click track's own `beatAt`, so a note on a beat falls at exactly that beat's click.
 * It is pure arithmetic on audio time; it reads no clock.
 */

import type { GuideNote, RenderedGuide } from '../domain/backing/guide-renderer'
import {
  FOUR_FOUR_METER,
  PHRASE_MEASURE_COUNT,
} from '../domain/generation/generation-request-envelope'
import { addRational, type Rational } from '../domain/time/rational'
import type { AudioTime } from './audio-ports'
import type { GuideRole, ScheduledGuideNote } from './sound-roles'
import { phraseFirstBeat } from './backing-track'
import { beatAt, type ClickPlan } from './click-track'

/**
 * Intent: a whole-note position as a count of quarter-note beats, any rational accepted; a
 * position on a whole beat gives that exact integer.
 */
function beatsOf(time: Rational): number {
  return (time.numerator * FOUR_FOUR_METER.beatUnit) / time.denominator
}

/**
 * Intent: throw unless the tempo is constant across the phrase starting on `firstBeat`: no tempo
 * change of the plan falls after its first beat and before the next phrase's.
 */
// @spec-link [[module_session_transport_tempo_map]]
function assertOneTempoAcross(plan: ClickPlan, phraseNumber: number, firstBeat: number): void {
  const nextFirstBeat = firstBeat + PHRASE_MEASURE_COUNT * plan.beatsPerMeasure
  const inside = plan.tempoChanges.find((c) => c.beat > firstBeat && c.beat < nextFirstBeat)
  if (inside !== undefined) {
    throw new Error(
      `guide track: phrase ${phraseNumber}'s tempo changes inside it, at beat ${inside.beat}`,
    )
  }
}

/** Intent: one rendered note of guide `role` on the audio clock, from its phrase's first beat. */
// @spec-link [[rule_guide_notes_placed_exactly]]
function placeNote(
  plan: ClickPlan,
  firstBeat: number,
  role: GuideRole,
  note: GuideNote,
): ScheduledGuideNote {
  return {
    role,
    pitch: note.pitch,
    at: beatAt(plan, firstBeat + beatsOf(note.start)),
    until: beatAt(plan, firstBeat + beatsOf(addRational(note.start, note.duration))),
  }
}

/**
 * Intent: phrase `phraseNumber`'s rendered guides as notes on the audio clock, ordered by start
 * (the melody guide before the rhythm guide on a shared start). Each start and end is the time of
 * its rational position through the tempo map, on a beat exactly that beat's click; phrase 1
 * starts on `phraseOneBeat`, as in `phraseFirstBeat`. Throws as `phraseFirstBeat` does, and on a
 * tempo change inside the phrase.
 */
// @spec-link [[rule_guide_notes_placed_exactly]]
// @spec-link [[module_guide_playback_layers]]
// @spec-link [[module_session_transport_tempo_map]]
export function scheduleGuide(
  plan: ClickPlan,
  phraseNumber: number,
  guide: RenderedGuide,
  phraseOneBeat = plan.countInBeats,
): ScheduledGuideNote[] {
  const firstBeat = phraseFirstBeat(plan, phraseNumber, phraseOneBeat)
  assertOneTempoAcross(plan, phraseNumber, firstBeat)
  const notes = [
    ...guide.melody.map((note) => placeNote(plan, firstBeat, 'melody-guide', note)),
    ...guide.rhythm.map((note) => placeNote(plan, firstBeat, 'rhythm-guide', note)),
  ]
  return notes.sort((a, b) => a.at - b.at)
}

/**
 * Intent: the queued guide notes with `from <= at < to`, in queue order. The window is half-open,
 * like the click track's, so consecutive windows never repeat or drop a note. Throws on a
 * backwards window.
 */
// @spec-link [[rule_guide_notes_placed_exactly]]
// @spec-link [[module_guide_playback_layers]]
export function guideNotesBetween(
  queue: readonly ScheduledGuideNote[],
  from: AudioTime,
  to: AudioTime,
): ScheduledGuideNote[] {
  if (!(to >= from)) throw new Error(`guide track: window [${from}, ${to}) runs backwards`)
  return queue.filter((note) => from <= note.at && note.at < to)
}
