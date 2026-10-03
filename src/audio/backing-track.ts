/**
 * The backing's timing: a phrase's rendered backing placed on the session's beat grid, and handed
 * to the look-ahead scheduler one window at a time. Phrases are four 4/4 measures, back to back
 * from the end of the count-in. It is pure arithmetic on audio time, through the click track's own
 * `beatAt`, so a backing note on a beat falls at exactly that beat's click; it reads no clock.
 */

import type { BackingNote, RenderedBacking } from '../domain/backing/backing-renderer'
import { FOUR_FOUR_METER, PHRASE_MEASURE_COUNT } from '../domain/generation/generation-request'
import type { Rational } from '../domain/time/rational'
import type { AudioTime, BackingVoice, ScheduledBackingNote } from './audio-ports'
import { beatAt, type ClickPlan } from './click-track'

/** Intent: throw unless `phraseNumber` counts a phrase: a whole number from 1. */
function assertPhraseNumber(phraseNumber: number): void {
  if (!Number.isInteger(phraseNumber) || phraseNumber < 1) {
    throw new Error(`backing track: phrase ${phraseNumber} is not a whole number from 1`)
  }
}

/**
 * Intent: the session beat phrase `phraseNumber` starts on, just after the count-in for phrase 1.
 * Throws on a phrase number that is not a whole number from 1.
 */
// @spec-link [[req_session_backing_track]]
// @spec-link [[service_workspace_session_flow]]
export function phraseFirstBeat(plan: ClickPlan, phraseNumber: number): number {
  assertPhraseNumber(phraseNumber)
  return plan.countInBeats + (phraseNumber - 1) * PHRASE_MEASURE_COUNT * plan.beatsPerMeasure
}

/**
 * Intent: when phrase `phraseNumber` (from 1) starts sounding: phrase 1 when the count-in ends,
 * each next one four measures later, at the tempo map's tempos, so it depends only on the tempos
 * of the phrases before it. Throws on a phrase number that is not a whole number from 1.
 */
// @spec-link [[req_session_backing_track]]
// @spec-link [[service_workspace_session_flow]]
export function phraseStartsAt(plan: ClickPlan, phraseNumber: number): AudioTime {
  return beatAt(plan, phraseFirstBeat(plan, phraseNumber))
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
// @spec-link [[service_workspace_session_flow]]
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
 * for the phrase. Throws on a phrase number that is not a whole number from 1, on a tempo change
 * inside the phrase, or on a note that does not start and end on a whole beat.
 */
// @spec-link [[req_session_backing_track]]
// @spec-link [[rule_playhead_follows_audio_clock]]
// @spec-link [[service_workspace_session_flow]]
export function scheduleBacking(
  plan: ClickPlan,
  phraseNumber: number,
  backing: RenderedBacking,
): ScheduledBackingNote[] {
  const firstBeat = phraseFirstBeat(plan, phraseNumber)
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
