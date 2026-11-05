/**
 * The backing's timing: a phrase's rendered backing placed on the session's beat grid, and handed
 * to the look-ahead scheduler one window at a time. Phrases are four 4/4 measures, back to back
 * from phrase 1's first beat: the end of the count-in, unless phrase 1's start was handed over. It
 * is pure arithmetic on audio time, through the click track's own `beatAt`, so a backing note on a
 * beat falls at exactly that beat's click; it reads no clock.
 */

import type { BackingNote, RenderedBacking } from '../domain/backing/backing-renderer'
import {
  FOUR_FOUR_METER,
  PHRASE_MEASURE_COUNT,
} from '../domain/generation/generation-request-envelope'
import type { Rational } from '../domain/time/rational'
import type { AudioTime } from './audio-ports'
import type { BackingVoice, ScheduledBackingNote } from './sound-roles'
import { beatAt, type ClickPlan } from './click-track'

/** Intent: throw unless `phraseNumber` counts a phrase: a whole number from 1. */
function assertPhraseNumber(phraseNumber: number): void {
  if (!Number.isInteger(phraseNumber) || phraseNumber < 1) {
    throw new Error(`backing track: phrase ${phraseNumber} is not a whole number from 1`)
  }
}

/**
 * Intent: throw unless `phraseOneBeat` can be phrase 1's first beat: a whole session beat on a
 * barline at or after the count-in's end.
 */
// @spec-link [[module_session_transport_tempo_map]]
// @spec-link [[module_session_start_without_phrase_one]]
function assertPhraseOneBeat(plan: ClickPlan, phraseOneBeat: number): void {
  if (
    !Number.isInteger(phraseOneBeat) ||
    phraseOneBeat < plan.countInBeats ||
    phraseOneBeat % plan.beatsPerMeasure !== 0
  ) {
    throw new Error(
      `backing track: phrase 1 cannot start on beat ${phraseOneBeat}, not a barline at or after the count-in's end`,
    )
  }
}

/**
 * Intent: the session beat phrase `phraseNumber` starts on: phrase 1 on `phraseOneBeat` (by
 * default just after the count-in; in a session started without phrase 1, the barline it was
 * handed over at), each next one four measures later. Throws on a phrase number that is not a
 * whole number from 1, and on a phrase 1 beat that is not a barline at or after the count-in's end.
 */
// @spec-link [[req_session_backing_track]]
// @spec-link [[module_session_transport_tempo_map]]
// @spec-link [[module_session_start_without_phrase_one]]
export function phraseFirstBeat(
  plan: ClickPlan,
  phraseNumber: number,
  phraseOneBeat = plan.countInBeats,
): number {
  assertPhraseNumber(phraseNumber)
  assertPhraseOneBeat(plan, phraseOneBeat)
  return phraseOneBeat + (phraseNumber - 1) * PHRASE_MEASURE_COUNT * plan.beatsPerMeasure
}

/**
 * Intent: when phrase `phraseNumber` (from 1) starts sounding: phrase 1 on `phraseOneBeat` (by
 * default when the count-in ends), each next one four measures later, at the tempo map's tempos, so
 * it depends only on the tempos of the phrases before it. Throws as `phraseFirstBeat` does.
 */
// @spec-link [[req_session_backing_track]]
// @spec-link [[module_session_transport_tempo_map]]
// @spec-link [[module_session_start_without_phrase_one]]
export function phraseStartsAt(
  plan: ClickPlan,
  phraseNumber: number,
  phraseOneBeat = plan.countInBeats,
): AudioTime {
  return beatAt(plan, phraseFirstBeat(plan, phraseNumber, phraseOneBeat))
}

/**
 * Intent: a whole-note time as a count of quarter-note beats. Throws off a whole beat, which the
 * backing renderer never produces, rather than placing a note between two clicks.
 */
function wholeBeats(time: Rational): number {
  const beats = (time.numerator * FOUR_FOUR_METER.beatUnit) / time.denominator
  if (!Number.isInteger(beats)) {
    throw new Error(`backing track: ${time.numerator}/${time.denominator} is not on a whole beat`)
  }
  return beats
}

/**
 * Intent: one rendered note of `voice` on the session's beat grid, from its phrase's first beat.
 */
function placeNote(
  plan: ClickPlan,
  firstBeat: number,
  voice: BackingVoice,
  note: BackingNote,
): ScheduledBackingNote {
  const startBeat = firstBeat + wholeBeats(note.start)
  return {
    voice,
    pitch: note.pitch,
    at: beatAt(plan, startBeat),
    until: beatAt(plan, startBeat + wholeBeats(note.duration)),
  }
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
      `backing track: phrase ${phraseNumber}'s tempo changes inside it, at beat ${inside.beat}`,
    )
  }
}

/**
 * Intent: phrase `phraseNumber`'s rendered backing as notes on the audio clock, ordered by start
 * (the bass before the chord on a shared beat). Each start and end is the time of its session
 * beat, computed exactly as that beat's click, so the notes start and last at the tempo in effect
 * for the phrase; phrase 1 starts on `phraseOneBeat`, as in `phraseFirstBeat`. Throws on a phrase
 * number that is not a whole number from 1, on a phrase 1 beat that is not a barline at or after
 * the count-in's end, on a tempo change inside the phrase, or on a note that does not start and
 * end on a whole beat.
 */
// @spec-link [[req_session_backing_track]]
// @spec-link [[rule_playhead_follows_audio_clock]]
// @spec-link [[module_session_transport_tempo_map]]
// @spec-link [[module_session_start_without_phrase_one]]
export function scheduleBacking(
  plan: ClickPlan,
  phraseNumber: number,
  backing: RenderedBacking,
  phraseOneBeat = plan.countInBeats,
): ScheduledBackingNote[] {
  const firstBeat = phraseFirstBeat(plan, phraseNumber, phraseOneBeat)
  assertOneTempoAcross(plan, phraseNumber, firstBeat)
  const notes = [
    ...backing.bass.map((note) => placeNote(plan, firstBeat, 'bass', note)),
    ...backing.chords.map((note) => placeNote(plan, firstBeat, 'chord', note)),
  ]
  return notes.sort((a, b) => a.at - b.at)
}

/**
 * Intent: the queued notes with `from <= at < to`, in queue order. The window is half-open, like
 * the click track's, so consecutive windows never repeat or drop a note. Throws on a backwards
 * window.
 */
// @spec-link [[req_session_backing_track]]
// @spec-link [[rule_playhead_follows_audio_clock]]
export function backingNotesBetween(
  queue: readonly ScheduledBackingNote[],
  from: AudioTime,
  to: AudioTime,
): ScheduledBackingNote[] {
  if (!(to >= from)) throw new Error(`backing track: window [${from}, ${to}) runs backwards`)
  return queue.filter((note) => from <= note.at && note.at < to)
}
