/**
 * The session engine's contract for a session started without phrase 1: what such a session
 * starts from, the two events only it takes before phrase 1 sounds (a phrase 1 attempt asked for,
 * phrase 1 handed over), and the result of each phrase 1 attempt it reports back. The engine never
 * names the code that drives it. Time is audio time, plain seconds on the audio clock.
 */

import type { GenerationIntent } from '../domain/generation/generation-intent'
import type { GenerationOutcome } from '../domain/generation/orchestration/orchestration-types'
import type { SteeringBlock } from '../domain/generation/steering-block'
import type { AudioTime, SessionSettings, SessionStart } from './session-types'

/**
 * What a session started without phrase 1 starts from: the moment its count-in starts, the chosen
 * settings, the session seed drawn once at Start (there is no Idle result to take it from), the
 * settings-mutation flag, whether adaptive tempo and the multi-phrase tension arc run in it. It
 * holds no phrase 1, no settings phrase 1 was generated under and no ready phrases: its caller asks
 * for phrase 1's attempts and hands phrase 1 over once one fits, with the time it starts sounding.
 */
// @spec-link [[module_session_start_without_phrase_one]]
// @spec-link [[module_session_seed_plan]]
export interface SessionStartWithoutPhraseOne extends Omit<
  SessionStart,
  'phraseOne' | 'phraseOneSettings' | 'readyPhrases'
> {
  readonly phraseOne?: undefined
}

/**
 * The result of one phrase 1 attempt a session started without phrase 1 ran for its caller: a
 * phrase that fits the session's staff layout, a generation failure with its code, a rejected
 * generate request, or a phrase that does not fit.
 */
// @spec-link [[module_session_start_without_phrase_one]]
export type PhraseOneAttemptResult =
  | { readonly kind: 'fits' }
  | {
      readonly kind: 'generation-failure'
      readonly code: Exclude<GenerationOutcome, { kind: 'generation_success' }>['code']
    }
  | { readonly kind: 'crash' }
  | { readonly kind: 'not-fitting' }

/**
 * The three events only a session started without phrase 1 takes, before phrase 1 sounds:
 * `phrase-one-attempt` asks for one phrase 1 attempt, with its intent (its seed in it), the step it
 * takes, the retry number its caller gives it, the settings it is generated under, its deadline
 * and the steering block every request of the session carries from phrase 2 on (whatever this
 * attempt's own intent holds; none, no phrase steered), superseding the attempt in flight; `cancel-phrase-one-attempt` drops the attempt in
 * flight, cancelled where it runs while still generating (its caller's reason to try it is gone);
 * `phrase-one` hands over the attempt that fits as phrase 1, with the time phrase 1 starts
 * sounding.
 */
// @spec-link [[module_session_start_without_phrase_one]]
export type PhraseOneEvent =
  | {
      readonly kind: 'phrase-one-attempt'
      readonly at: AudioTime
      readonly step: 'carry-in' | 'standalone'
      readonly retry: number
      readonly intent: GenerationIntent
      readonly settings: SessionSettings
      readonly deadline: AudioTime
      readonly steering?: SteeringBlock
    }
  | { readonly kind: 'cancel-phrase-one-attempt'; readonly at: AudioTime }
  | {
      readonly kind: 'phrase-one'
      readonly at: AudioTime
      readonly attemptId: number
      readonly soundsAt: AudioTime
    }
