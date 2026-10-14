/**
 * The session's measure grid: how long a measure lasts at the frozen tempo and where each
 * look-ahead deadline falls on it. Tempo only ever sets these times; it never reaches an intent's
 * musical content. It also keeps the failure ladder's reserve before each deadline, the measured
 * time a standalone attempt needs, and the cutover time from which that attempt is due. Everything
 * is plain arithmetic on audio time, with no clock read.
 */

import {
  FOUR_FOUR_METER,
  PHRASE_MEASURE_COUNT,
} from '../domain/generation/generation-request-envelope'
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
// @spec-link [[module_session_look_ahead_timing]]
export function phraseTwoDeadline(startAt: AudioTime, tempo: number): AudioTime {
  return startAt + COUNT_IN_MEASURES * measureSeconds(tempo)
}

/**
 * Intent: the deadline of phrase N+1, given the moment phrase N (2 or more) starts sounding: the
 * start of phrase N's last measure, which leaves at least one measure of read-ahead on screen.
 */
// @spec-link [[rule_look_ahead_deadline]]
// @spec-link [[module_session_look_ahead_timing]]
export function nextPhraseDeadline(soundingAt: AudioTime, tempo: number): AudioTime {
  return soundingAt + (PHRASE_MEASURE_COUNT - 1) * measureSeconds(tempo)
}

/** Intent: whether a moment has reached a deadline; a result arriving at the deadline is too late. */
// @spec-link [[rule_look_ahead_deadline]]
export function deadlineReached(at: AudioTime, deadline: AudioTime): boolean {
  return at >= deadline
}

/**
 * The time the generation worker's replacement costs when an attempt is cancelled where it runs,
 * in seconds. Measured 2026-10-07 in headless Chromium 153 on the production build, 40 repetitions:
 * terminating a busy, warmed worker until a fresh worker answers a small Quarter/Strict generate
 * request, minus that request's own warm time (median 3.9 ms), cost a median 49.3 ms, p95 65.7 ms,
 * max 80.4 ms; with a 1.5 margin, 121 ms, rounded up to 0.125 s.
 */
// @spec-link [[module_session_look_ahead_timing]]
// @spec-link [[rule_session_generation_failure_ladder]]
export const WORKER_RESPAWN_SECONDS = 0.125

/**
 * The time a standalone attempt needs, from its request to its written phrase, in seconds.
 * Measured 2026-10-07 (1-minute load 0.85 to 2.9). In Node, over 6,852 standalone successes (568
 * phrase-1 intents at Idle, 41 standalones of real ladders and 6,246 of forced ladders at 60, 120
 * and 240 BPM): median 12.5 ms, p99 258 ms, max 610.5 ms (case #516, Sixteenth, Heavily varied,
 * Sparse, Active displacement, Build, seed 7, 186,154 of 250,000 fuel units); look-ahead
 * standalones at most 349.4 ms. In a cold Chromium worker, request to phrase ready with the fit
 * check and engraving (at most 17.7 ms), 121 runs over the 43 slowest intents: median 245 ms, p95
 * 493 ms, max 618.6 ms (#516); a generation takes about 0.8 times as long in Chromium as in
 * Node. With a 1.5 margin, 928 ms, rounded up to 0.95 s.
 */
// @spec-link [[module_session_look_ahead_timing]]
// @spec-link [[rule_session_generation_failure_ladder]]
export const STANDALONE_BUDGET_SECONDS = 0.95

/**
 * The reserve the failure ladder keeps before each look-ahead deadline for the standalone attempt:
 * its budget plus the worker's replacement cost, 1.075 s. It exceeds phrase 2's one-measure
 * deadline at 240 BPM (1 s), so there phrase 2's standalone attempt is the first one requested, as
 * spec D203 anticipates for a deadline that close.
 */
// @spec-link [[module_session_look_ahead_timing]]
// @spec-link [[rule_session_generation_failure_ladder]]
export const STANDALONE_RESERVE_SECONDS = STANDALONE_BUDGET_SECONDS + WORKER_RESPAWN_SECONDS

/**
 * Intent: a look-ahead phrase's cutover time: its deadline minus the standalone reserve, from which
 * no carry-in attempt may run.
 */
// @spec-link [[module_session_look_ahead_timing]]
// @spec-link [[rule_session_generation_failure_ladder]]
export function cutoverAt(deadline: AudioTime): AudioTime {
  return deadline - STANDALONE_RESERVE_SECONDS
}

/**
 * Intent: whether the standalone attempt is due at a moment: the moment is at or after the cutover
 * time, so the time left before the deadline is no more than the standalone reserve.
 */
// @spec-link [[module_session_look_ahead_timing]]
// @spec-link [[rule_session_generation_failure_ladder]]
export function standaloneDue(at: AudioTime, deadline: AudioTime): boolean {
  return at >= cutoverAt(deadline)
}
