/**
 * A fresh Jam's phrase 1 ladder (master spec C5.6, C5.7): a pure state machine that runs the Jam's
 * capture (jam-capture.ts) and drives the session started without phrase 1 (the session engine's
 * way in) from the doodle to phrase 1. At each end of the doodle it starts phrase 1's first
 * attempt; a doodle note voiding a candidate end cancels it on the worker. It climbs three rungs
 * (the join and the steering block with v2's carry-in retries, the block with no join, v2's
 * standalone phrase), keeping the standalone reserve before a deadline three measures after the
 * generation measure begins: once less is left, no attempt of rungs 1 or 2 starts, the one
 * generating is cancelled and rung 3 requested at once. Phrase 1 that fits is ready, and handed
 * over when the capture shows it, with the time it sounds; if nothing fits by the deadline, the
 * Jam ends. It reads no clock: every input carries its time, and `nextDecisionAt` says when to
 * wake it. Each attempt's seed comes from the caller. Part of Jam's code (src/jam/), loaded on
 * demand.
 */
import type { RequestId } from '@/domain/generation/generation-request-envelope'
import type { Seed } from '@/domain/random/seed'
import type { PlayedNoteEvent } from '@/midi/played-note-tracker'
import type { RecordedDoodle } from '@/session/session-history'
import {
  cutoverAt,
  deadlineReached,
  jamPhraseOneDeadline,
  standaloneDue,
} from '@/session/session-timing'
import type {
  AudioTime,
  PhraseOneAttemptResult,
  PhraseOneEvent,
  SessionOutput,
} from '@/session/session-types'

import type { JamCapture, JamCaptureOutput } from './jam-capture'
import type { KeySuggestion } from './key-suggestion/key-suggestion'
import { doodleSuggestion } from './jam-phrase-one-attempts'
import {
  BLOCK_ATTEMPT,
  STANDALONE_ATTEMPT,
  doodleAttempts,
  jamAttempt,
  rungOfAttempt,
  type DoodleAttempts,
  type JamPhraseOneAttemptIndex,
  type JamPhraseOneSettings,
} from './jam-phrase-one-attempts'

/**
 * The ladder's seams: the page-wide request ids, the seed of each attempt (in a fresh Jam, the
 * session seed plan's label for it; at Idle, a fresh draw), and the window width read when an
 * attempt is built.
 */
// @spec-link [[rule_jam_phrase_one_failure_ladder]]
// @spec-link [[module_session_seed_plan]]
export interface JamPhraseOneDependencies {
  readonly nextRequestId: () => RequestId
  readonly seedOf: (attempt: JamPhraseOneAttemptIndex) => Seed
  readonly isBelowTabletLandscape: () => boolean
}

/**
 * What the ladder asks its caller to do or tells it, each at the time it was decided: send the
 * session a phrase 1 event (an attempt, its cancellation, or phrase 1 handed over); a capture
 * output, passed on (the doodle's end to record, no note played, phrase 1 shown); the key and mode
 * suggestion worked out at the doodle's end, to keep with the session; the Jam ends, no phrase 1
 * having come by its deadline.
 */
// @spec-link [[rule_jam_phrase_one_failure_ladder]]
// @spec-link [[rule_jam_ends_when_phrase_one_never_comes]]
export type JamPhraseOneOutput =
  | { readonly kind: 'session-event'; readonly event: PhraseOneEvent }
  | { readonly kind: 'capture'; readonly output: JamCaptureOutput }
  | { readonly kind: 'suggestion'; readonly at: AudioTime; readonly suggestion: KeySuggestion }
  | { readonly kind: 'no-phrase-one'; readonly at: AudioTime }

/**
 * One Jam's way to phrase 1: `note` takes each played note's note-on or finished span for the
 * capture, `session` each output of the session's engine (its phrase 1 requests, fit checks and
 * results, with the time it came at), `advance` the time its caller woke it at; each first takes
 * every decision due by its time, the capture's and the ladder's in time order, and returns what
 * to do, in order. `nextDecisionAt` is when to wake it next, null when nothing is due.
 */
// @spec-link [[rule_jam_phrase_one_failure_ladder]]
export interface JamPhraseOne {
  note(event: PlayedNoteEvent): readonly JamPhraseOneOutput[]
  session(output: SessionOutput, at: AudioTime): readonly JamPhraseOneOutput[]
  advance(at: AudioTime): readonly JamPhraseOneOutput[]
  nextDecisionAt(): AudioTime | null
}

/** Typed failure for an input the ladder cannot take in its state. */
// @spec-link [[rule_jam_phrase_one_failure_ladder]]
export class JamPhraseOneError extends Error {
  readonly kind = 'JamPhraseOneError' as const

  constructor(message: string) {
    super(message)
    this.name = 'JamPhraseOneError'
  }
}

/** The attempt asked for: its index, and its id and stage once the session requested it. */
interface InFlight {
  readonly index: JamPhraseOneAttemptIndex
  readonly attemptId: number | null
  readonly stage: 'generating' | 'fitting'
}

/** Where the ladder stands. */
type Stage =
  | { readonly kind: 'waiting' }
  | {
      readonly kind: 'climbing'
      readonly attempts: DoodleAttempts
      readonly deadline: AudioTime
      readonly attempt: InFlight | undefined
    }
  | { readonly kind: 'ready'; readonly attemptId: number }
  | { readonly kind: 'over' }

/**
 * Intent: the attempt after a failed one, or undefined after rung 3: rung 3 once the standalone
 * attempt is due; rung 2 after a rung 1 attempt whose search covered every candidate
 * (no_legal_pitch_plan: its retries would fail the same way, whatever the seed); the next one
 * otherwise.
 */
// @spec-link [[rule_jam_phrase_one_failure_ladder]]
// @spec-link [[rule_session_generation_failure_ladder]]
function attemptAfter(
  failed: JamPhraseOneAttemptIndex,
  result: PhraseOneAttemptResult,
  due: boolean,
): JamPhraseOneAttemptIndex | undefined {
  if (failed === STANDALONE_ATTEMPT) return undefined
  if (due) return STANDALONE_ATTEMPT
  const exhausted = result.kind === 'generation-failure' && result.code === 'no_legal_pitch_plan'
  if (rungOfAttempt(failed) === 'join-and-block' && exhausted) return BLOCK_ATTEMPT
  return (failed + 1) as JamPhraseOneAttemptIndex
}

/**
 * Intent: one fresh Jam's way to phrase 1, over its capture (started at the Jam's count-in), under
 * Jam's settings and drift (the deadline at their tempo); see JamPhraseOne. It waits for the
 * doodle's end; each candidate end (or the end by length) gives every attempt its inputs and the
 * deadline, three measures after the generation measure begins (the end's barline). The first
 * attempt is rung 1's, rung 2's when the doodle gives no join, rung 3's once the standalone
 * attempt is due. Skipping attempts draws and discards their request ids, so the next one keeps
 * the request id it would have had; their seeds are simply unused. The step-down memory starts
 * off and only steps down. Phrase 1 that fits is ready for the capture once every capture
 * decision due by then is taken, so a doodle note voiding the candidate end at that very moment
 * drops it first.
 */
// @spec-link [[rule_jam_phrase_one_failure_ladder]]
// @spec-link [[rule_jam_phrase_one_deadline]]
// @spec-link [[rule_jam_ends_when_phrase_one_never_comes]]
// @spec-link [[rule_two_measures_before_jam_phrase_one]]
// @spec-link [[rule_dropped_attempt_cancelled]]
export function createJamPhraseOne(
  deps: JamPhraseOneDependencies,
  jam: JamPhraseOneSettings,
  capture: JamCapture,
): JamPhraseOne {
  let stage: Stage = { kind: 'waiting' }
  let steppedDown = false
  let lastAt = Number.NEGATIVE_INFINITY

  /** Intent: ask for attempt `index` at `at`, discarding the request ids of the attempts skipped. */
  function request(
    climbing: Extract<Stage, { kind: 'climbing' }>,
    index: JamPhraseOneAttemptIndex,
    skipped: number,
    at: AudioTime,
  ): JamPhraseOneOutput[] {
    for (let left = skipped; left > 0; left -= 1) deps.nextRequestId()
    const belowTabletLandscape = deps.isBelowTabletLandscape()
    const built = jamAttempt(climbing.attempts, index, {
      requestId: deps.nextRequestId(),
      seed: deps.seedOf(index),
      belowTabletLandscape,
      steppedDown,
    })
    steppedDown = built.steppedDown
    stage = { ...climbing, attempt: { index, attemptId: null, stage: 'generating' } }
    const { step, intent, settings } = built
    const event: PhraseOneEvent = {
      kind: 'phrase-one-attempt',
      at,
      step,
      retry: index,
      intent,
      settings,
      deadline: climbing.deadline,
      steering: climbing.attempts.steering,
    }
    return [{ kind: 'session-event', event }]
  }

  /** Intent: start the ladder on a doodle end at `at`: its inputs, its deadline, its first attempt. */
  function climb(end: RecordedDoodle, at: AudioTime): JamPhraseOneOutput[] {
    const attempts = doodleAttempts(end.doodle, jam)
    const deadline = jamPhraseOneDeadline(end.endBarlineAt, jam.settings.controls.tempo)
    const climbing: Extract<Stage, { kind: 'climbing' }> = {
      kind: 'climbing',
      attempts,
      deadline,
      attempt: undefined,
    }
    stage = climbing
    if (deadlineReached(at, deadline)) return fail(at)
    const first = standaloneDue(at, deadline)
      ? STANDALONE_ATTEMPT
      : attempts.join.kind === 'join'
        ? 0
        : BLOCK_ATTEMPT
    return request(climbing, first, first, at)
  }

  /** Intent: the Jam ends at `at`, no phrase 1 having come by its deadline; the capture stops. */
  function fail(at: AudioTime): JamPhraseOneOutput[] {
    stage = { kind: 'over' }
    capture.end()
    return [{ kind: 'no-phrase-one', at }]
  }

  /**
   * Intent: the ladder's own decision at `at` while climbing: the end at the deadline; from the
   * cutover on, a rung 1 or 2 attempt still generating is superseded by rung 3 (the session
   * cancels it).
   */
  function decide(at: AudioTime): JamPhraseOneOutput[] {
    if (stage.kind !== 'climbing') return []
    if (deadlineReached(at, stage.deadline)) return fail(at)
    const { attempt } = stage
    if (attempt === undefined || attempt.index === STANDALONE_ATTEMPT) return []
    if (attempt.stage !== 'generating' || !standaloneDue(at, stage.deadline)) return []
    return request(stage, STANDALONE_ATTEMPT, STANDALONE_ATTEMPT - attempt.index - 1, at)
  }

  /** Intent: when the ladder's own next decision falls: the cutover or the deadline, or none. */
  function ladderDecisionAt(): AudioTime | null {
    if (stage.kind !== 'climbing') return null
    const { attempt, deadline } = stage
    const cuttable =
      attempt !== undefined &&
      attempt.index !== STANDALONE_ATTEMPT &&
      attempt.stage === 'generating'
    return cuttable ? cutoverAt(deadline) : deadline
  }

  /** Intent: drop the ladder's attempt on a voided candidate end; the session cancels it. */
  function voided(at: AudioTime): JamPhraseOneOutput[] {
    if (stage.kind === 'waiting' || stage.kind === 'over') return []
    stage = { kind: 'waiting' }
    return [{ kind: 'session-event', event: { kind: 'cancel-phrase-one-attempt', at } }]
  }

  /** Intent: phrase 1 shown by the capture: hand the fitting attempt over, sounding at `soundsAt`. */
  function shown(at: AudioTime, soundsAt: AudioTime): JamPhraseOneOutput[] {
    if (stage.kind !== 'ready')
      throw new JamPhraseOneError(`Phrase 1 cannot be shown while the ladder is ${stage.kind}.`)
    const { attemptId } = stage
    stage = { kind: 'over' }
    return [{ kind: 'session-event', event: { kind: 'phrase-one', at, attemptId, soundsAt } }]
  }

  /** Intent: what one capture output asks of the ladder. */
  function onCapture(output: JamCaptureOutput): JamPhraseOneOutput[] {
    const { at } = output
    switch (output.kind) {
      case 'candidate-end':
        if (stage.kind !== 'waiting')
          throw new JamPhraseOneError(
            `A candidate end cannot come while the ladder is ${stage.kind}.`,
          )
        return climb(output.end, at)
      case 'doodle-ended': {
        const suggestion = doodleSuggestion(output.end.doodle, jam)
        const kept: JamPhraseOneOutput = { kind: 'suggestion', at, suggestion }
        return stage.kind === 'waiting' ? [...climb(output.end, at), kept] : [kept]
      }
      case 'candidate-voided':
        return voided(at)
      case 'phrase-one-shown':
        return shown(at, output.soundsAt)
      case 'no-note-played':
        stage = { kind: 'over' }
        return []
    }
  }

  /** Intent: each capture output passed on, followed by what it asks of the ladder. */
  function fromCapture(outputs: readonly JamCaptureOutput[]): JamPhraseOneOutput[] {
    return outputs.flatMap((output) => [{ kind: 'capture', output } as const, ...onCapture(output)])
  }

  /**
   * Intent: take every decision due by `at`, the capture's and the ladder's, in time order (the
   * ladder's first on a tie).
   */
  function runUntil(at: AudioTime): JamPhraseOneOutput[] {
    const outputs: JamPhraseOneOutput[] = []
    for (;;) {
      const own = ladderDecisionAt()
      const captured = capture.nextDecisionAt()
      if (own !== null && own <= at && (captured === null || own <= captured)) {
        outputs.push(...decide(Math.max(own, lastAt)))
      } else if (captured !== null && captured <= at) {
        outputs.push(...fromCapture(capture.advance(Math.max(captured, lastAt))))
      } else return outputs
    }
  }

  /** Intent: the in-flight attempt `attemptId` names, or undefined for a superseded one. */
  function named(attemptId: number): InFlight | undefined {
    if (stage.kind !== 'climbing') return undefined
    const { attempt } = stage
    return attempt?.attemptId === attemptId ? attempt : undefined
  }

  /**
   * Intent: a phrase 1 attempt's result at `at`: ready when it fits (the capture told, and showing
   * it when the barline is now), the next attempt otherwise.
   */
  function onResult(
    attemptId: number,
    result: PhraseOneAttemptResult,
    at: AudioTime,
  ): JamPhraseOneOutput[] {
    const attempt = named(attemptId)
    if (attempt === undefined || stage.kind !== 'climbing') return []
    if (result.kind === 'fits') {
      stage = { kind: 'ready', attemptId }
      return fromCapture(capture.phraseOneReady(at))
    }
    const next = attemptAfter(attempt.index, result, standaloneDue(at, stage.deadline))
    if (next === undefined) {
      stage = { ...stage, attempt: undefined }
      return []
    }
    return request(stage, next, next - attempt.index - 1, at)
  }

  /** Intent: one engine output: its phrase 1 request, fit check and result; others are not ours. */
  function onSession(output: SessionOutput, at: AudioTime): JamPhraseOneOutput[] {
    if (output.kind === 'phrase-one-attempt-result')
      return onResult(output.attemptId, output.result, at)
    if (stage.kind !== 'climbing' || stage.attempt === undefined) return []
    if (output.kind === 'request-generation' && output.phraseNumber === 1) {
      if (stage.attempt.attemptId !== null)
        throw new JamPhraseOneError(`Attempt ${stage.attempt.attemptId} was already requested.`)
      stage = { ...stage, attempt: { ...stage.attempt, attemptId: output.attemptId } }
    } else if (output.kind === 'check-fit' && named(output.attemptId) !== undefined) {
      stage = { ...stage, attempt: { ...stage.attempt, stage: 'fitting' } }
    }
    return []
  }

  /**
   * Intent: at `at` (never before the last time reached), take what is due, then `handle`, unless
   * the way to phrase 1 is over by then.
   */
  function at(
    time: AudioTime,
    what: string,
    handle: () => JamPhraseOneOutput[],
  ): readonly JamPhraseOneOutput[] {
    if (!Number.isFinite(time) || time < lastAt)
      throw new JamPhraseOneError(`${what} at ${time} comes before ${lastAt}.`)
    const due = runUntil(time)
    lastAt = time
    if (stage.kind === 'over') return due
    return [...due, ...handle(), ...runUntil(time)]
  }

  return Object.freeze({
    note(event: PlayedNoteEvent): readonly JamPhraseOneOutput[] {
      const eventAt = event.kind === 'played' ? event.note.onsetAt : event.note.releaseAt
      return at(Math.max(eventAt, lastAt), 'A note', () => fromCapture(capture.note(event)))
    },
    session(output: SessionOutput, time: AudioTime): readonly JamPhraseOneOutput[] {
      return at(time, `A session output "${output.kind}"`, () => onSession(output, time))
    },
    advance(time: AudioTime): readonly JamPhraseOneOutput[] {
      return at(time, 'An advance', () => [])
    },
    nextDecisionAt(): AudioTime | null {
      const times = [ladderDecisionAt(), capture.nextDecisionAt()].filter(
        (time): time is AudioTime => time !== null,
      )
      return times.length === 0 ? null : Math.max(Math.min(...times), lastAt)
    },
  })
}
