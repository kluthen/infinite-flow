/**
 * The session's measure grid: how long a measure lasts at the frozen tempo and where each
 * look-ahead deadline falls on it. Tempo only ever sets these times; it never reaches an intent's
 * musical content. Everything is plain arithmetic on audio time, with no clock read.
 */

import { FOUR_FOUR_METER, PHRASE_MEASURE_COUNT } from '../domain/generation/generation-request'
import type { AudioTime } from './session-types'

/** The count-in lasts one measure; phrase 1 starts sounding when it is over. */
// @spec-link [[rule_look_ahead_deadline]]
export const COUNT_IN_MEASURES = 1

/**
 * Intent: the length of one 4/4 measure at a tempo in BPM, in seconds: four beats of 60 / tempo
 * seconds each (1 s at 240 BPM, 4 s at 60 BPM).
 */
// @spec-link [[rule_look_ahead_deadline]]
// @spec-link [[rule_tempo_never_affects_generation]]
export function measureSeconds(tempo: number): number {
  return (FOUR_FOUR_METER.beatsPerMeasure * 60) / tempo
}

/**
 * Intent: phrase 2's deadline: the end of the count-in, one measure after the session starts, so
 * phrase 2 is ready as read-ahead from the moment phrase 1 starts sounding.
 */
// @spec-link [[rule_look_ahead_deadline]]
// @spec-link [[service_session_engine]]
export function phraseTwoDeadline(startAt: AudioTime, tempo: number): AudioTime {
  return startAt + COUNT_IN_MEASURES * measureSeconds(tempo)
}

/**
 * Intent: the deadline of phrase N+1, given the moment phrase N (2 or more) starts sounding: the
 * start of phrase N's last measure, which leaves at least one measure of read-ahead on screen.
 */
// @spec-link [[rule_look_ahead_deadline]]
// @spec-link [[service_session_engine]]
export function nextPhraseDeadline(soundingAt: AudioTime, tempo: number): AudioTime {
  return soundingAt + (PHRASE_MEASURE_COUNT - 1) * measureSeconds(tempo)
}

/** Intent: whether a moment has reached a deadline; a result arriving at the deadline is too late. */
// @spec-link [[rule_look_ahead_deadline]]
export function deadlineReached(at: AudioTime, deadline: AudioTime): boolean {
  return at >= deadline
}
