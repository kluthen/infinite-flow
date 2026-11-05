/**
 * Jam's phrase 1 in the Jam sweep through chunk 18's real ladder (measurement tooling, v3.2
 * measurement M1, chunk 33): `createJamPhraseOne` (src/jam/jam-phrase-one.ts) behind the sweep's
 * pluggable ladder, beside the double (jam-sweep-ladder.ts), driven as a discrete-event
 * simulation on the generation measure's clock: 0 is the doodle's end barline, where the
 * generation measure starts. The doodle is already quantized, so the ladder runs over a stub of
 * Jam's capture that ends the doodle by length at 0 and shows phrase 1 at the first barline at or
 * after it is ready, never before the generation measure's end.
 *
 * The one generator runs one attempt at a time, as the double charges it: an attempt asked for
 * starts at once, or after the worker restarts when it superseded one still generating; it is
 * generated at once, measured, and keeps the generator busy for its charged time. The ladder's own
 * decision (the cutover, the deadline) is taken first when it falls at or before the attempt's
 * end, so an attempt ending at the cutover or at the deadline is too late; otherwise the result
 * reaches the ladder at its end, with its fit check when it generated a phrase.
 */

import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { makeRequestId } from '@/domain/generation/generation-request-envelope'
import { makeSeed } from '@/domain/random/seed'
import type { JamCapture, JamCaptureOutput } from '@/jam/jam-capture'
import type { JamPhase } from '@/jam/jam-phase'
import {
  createJamPhraseOne,
  type JamPhraseOne,
  type JamPhraseOneOutput,
} from '@/jam/jam-phrase-one'
import {
  STANDALONE_ATTEMPT,
  rungOfAttempt,
  type JamPhraseOneAttemptIndex,
} from '@/jam/jam-phrase-one-attempts'
import type { RecordedDoodle } from '@/session/session-history'
import { jamPhraseOneSeed } from '@/session/session-seed-plan'
import {
  STANDALONE_RESERVE_SECONDS,
  WORKER_RESPAWN_SECONDS,
  jamPhraseOneDeadline,
  measureSeconds,
} from '@/session/session-timing'
import type {
  AudioTime,
  PhraseOneAttemptResult,
  PhraseOneEvent,
  SessionOutput,
} from '@/session/session-types'
import {
  JAM_LADDER_ATTEMPTS,
  type DoodlePhraseOne,
  type GeneratedAttempt,
  type LadderAttempt,
  type LadderInput,
  type PhraseOneLadder,
} from './jam-sweep-ladder'

/** One attempt the real ladder asked the session for. */
type AttemptAsked = Extract<PhraseOneEvent, { readonly kind: 'phrase-one-attempt' }>

/**
 * Intent: a stub of Jam's capture over a doodle already quantized: its one decision, at 0, ends
 * the doodle by length at its end barline (0); phrase 1 ready at a moment is shown at the first
 * barline at or after it, never before measure 1 (the generation measure's end), and sounds one
 * measure later. Played notes are not its concern.
 */
function quantizedDoodleCapture(doodle: DoodlePhraseOne): JamCapture {
  const tempo = doodle.settings.controls.tempo
  const measure = measureSeconds(tempo)
  const end: RecordedDoodle = {
    doodle: doodle.quantized,
    captureTempo: tempo,
    firstBarlineAt: -doodle.quantized.measureCount * measure,
    endBarlineAt: 0,
    notes: [],
  }
  let ended = false
  let phase: JamPhase = { state: 'capture', beat: 1, doodleMeasure: null }
  return {
    note: () => [],
    advance(): readonly JamCaptureOutput[] {
      if (ended) return []
      ended = true
      phase = { state: 'generation-measure', beat: 1 }
      return [{ kind: 'doodle-ended', at: 0, by: 'length', end }]
    },
    phraseOneReady(at): readonly JamCaptureOutput[] {
      const shownAt = Math.max(1, Math.ceil(at / measure)) * measure
      phase = { state: 'phrase-one' }
      return [{ kind: 'phrase-one-shown', at, shownAt, soundsAt: shownAt + measure }]
    },
    end() {
      phase = { state: 'ended' }
    },
    phase: () => phase,
    nextDecisionAt: () => (ended ? null : 0),
  }
}

/** Intent: whether a session event's retry number is one of the ladder's six attempt indices. */
function isAttemptIndex(retry: number): retry is JamPhraseOneAttemptIndex {
  return Number.isInteger(retry) && retry >= 0 && retry <= STANDALONE_ATTEMPT
}

/** Intent: the attempt the ladder asks for among its outputs, if it asks for one. */
function attemptAsked(outputs: readonly JamPhraseOneOutput[]): AttemptAsked | undefined {
  for (const output of outputs)
    if (output.kind === 'session-event' && output.event.kind === 'phrase-one-attempt')
      return output.event
  return undefined
}

/** Intent: whether the ladder hands attempt `attemptId` over as phrase 1 among its outputs. */
function handsOver(outputs: readonly JamPhraseOneOutput[], attemptId: number): boolean {
  return outputs.some(
    (output) =>
      output.kind === 'session-event' &&
      output.event.kind === 'phrase-one' &&
      output.event.attemptId === attemptId,
  )
}

/** Intent: whether the Jam ends among the ladder's outputs, phrase 1 never having come. */
function endsWithout(outputs: readonly JamPhraseOneOutput[]): boolean {
  return outputs.some((output) => output.kind === 'no-phrase-one')
}

/** Intent: the session's request for an attempt asked, as the engine shapes it for phrase 1. */
function requestOf(asked: AttemptAsked, attemptId: number): SessionOutput {
  const { step, retry, intent, deadline } = asked
  return { kind: 'request-generation', attemptId, phraseNumber: 1, step, retry, intent, deadline }
}

/**
 * Intent: an attempt's outcome to the ladder at `at`: a generated phrase is fit-checked, then
 * fits; a failure is the result with its code.
 */
function deliver(
  ladder: JamPhraseOne,
  asked: AttemptAsked,
  attemptId: number,
  outcome: GenerationOutcome,
  at: AudioTime,
): readonly JamPhraseOneOutput[] {
  /** Intent: the attempt's result to the ladder. */
  const result = (value: PhraseOneAttemptResult): readonly JamPhraseOneOutput[] =>
    ladder.session({ kind: 'phrase-one-attempt-result', attemptId, result: value }, at)
  if (outcome.kind !== 'generation_success')
    return result({ kind: 'generation-failure', code: outcome.code })
  const { intent } = asked
  const checked = ladder.session(
    { kind: 'check-fit', attemptId, phraseNumber: 1, outcome, intent },
    at,
  )
  return [...checked, ...result({ kind: 'fits' })]
}

/** Intent: the record of an attempt the generator ran, cancelled at `cancelledAt` when cut. */
function attemptRecord(
  asked: AttemptAsked,
  index: JamPhraseOneAttemptIndex,
  startedAt: number,
  generated: GeneratedAttempt,
  cancelledAt?: number,
): LadderAttempt {
  const { outcome } = generated
  return {
    rung: rungOfAttempt(index),
    attempt: index,
    seed: asked.intent.seed,
    startedAt,
    seconds: generated.seconds,
    chargedSeconds: generated.chargedSeconds,
    failureCode: outcome.kind === 'generation_failure' ? outcome.code : null,
    orderingSeconds: generated.orderingSeconds,
    cold: generated.cold,
    ...(cancelledAt === undefined ? {} : { cancelledAt }),
  }
}

/**
 * Intent: the real ladder over one Jam's doodle, its request ids counted, each attempt's seed the
 * session seed plan's (C11), at the tablet-landscape width or wider; the sweep's deadline and
 * reserve checked against the ladder's own.
 */
function realLadderOf(input: LadderInput, doodle: DoodlePhraseOne): JamPhraseOne {
  const deadline = jamPhraseOneDeadline(0, doodle.settings.controls.tempo)
  if (deadline !== input.deadlineSeconds)
    throw new Error(
      `The real ladder's deadline is ${deadline} s, the sweep's ${input.deadlineSeconds} s.`,
    )
  if (input.reserveSeconds !== STANDALONE_RESERVE_SECONDS)
    throw new Error(`The real ladder keeps the standalone reserve, not ${input.reserveSeconds} s.`)
  let requests = 0
  const sessionSeed = makeSeed(input.sessionSeed)
  return createJamPhraseOne(
    {
      nextRequestId: () => makeRequestId(`jam-sweep-real-${(requests += 1)}`),
      seedOf: (index) => jamPhraseOneSeed(sessionSeed, index),
      isBelowTabletLandscape: () => false,
    },
    { settings: doodle.settings, drift: doodle.drift },
    quantizedDoodleCapture(doodle),
  )
}

/**
 * Chunk 18's ladder (`createJamPhraseOne`) in the sweep, on the generation measure's clock: the
 * doodle's end at 0 starts it; each attempt it asks for is requested at once and run on the one
 * generator (after the worker restarts when it superseded one still generating); the ladder's own
 * decision at or before an attempt's end is taken first (a new attempt asked there supersedes the
 * one running, cancelled where it ran; the deadline ends the Jam); otherwise the attempt's result
 * reaches the ladder at its end. Phrase 1 came when the ladder hands that attempt over; it never
 * came when the Jam ends at the deadline.
 */
export const JAM_REAL_LADDER: PhraseOneLadder = {
  name: 'chunk 18 (createJamPhraseOne)',
  run(input) {
    const { doodle } = input
    if (doodle === undefined) throw new Error("Jam's real ladder needs a doodle.")
    const ladder = realLadderOf(input, doodle)
    const attempts: LadderAttempt[] = []
    let asked = attemptAsked(ladder.advance(0))
    let startedAt = 0
    while (asked !== undefined) {
      if (attempts.length >= JAM_LADDER_ATTEMPTS)
        throw new Error(`Jam's real ladder asked for more than ${JAM_LADDER_ATTEMPTS} attempts.`)
      const index = asked.retry
      if (!isAttemptIndex(index)) throw new Error(`Jam's real ladder asked for attempt ${index}.`)
      const attemptId = attempts.length + 1
      ladder.session(requestOf(asked, attemptId), asked.at)
      const generated = input.generate(asked.intent, rungOfAttempt(index))
      const endsAt = startedAt + generated.chargedSeconds
      const decision = ladder.nextDecisionAt()
      if (decision !== null && decision <= endsAt) {
        const decided = ladder.advance(decision)
        const superseding = attemptAsked(decided)
        if (superseding === undefined && !endsWithout(decided))
          throw new Error(`Jam's real ladder decided nothing at ${decision} s.`)
        const cut = superseding === undefined ? undefined : decision
        attempts.push(attemptRecord(asked, index, startedAt, generated, cut))
        if (superseding === undefined) return { attempts, ready: undefined }
        asked = superseding
        startedAt = superseding.at + WORKER_RESPAWN_SECONDS
        continue
      }
      const made = attemptRecord(asked, index, startedAt, generated)
      attempts.push(made)
      const { outcome } = generated
      const delivered = deliver(ladder, asked, attemptId, outcome, endsAt)
      if (outcome.kind === 'generation_success' && handsOver(delivered, attemptId)) {
        const phraseOne = { intent: asked.intent, outcome }
        return { attempts, ready: { phraseOne, rung: made.rung, readyAt: endsAt, made } }
      }
      asked = attemptAsked(delivered)
      startedAt = endsAt
    }
    const deadline = ladder.nextDecisionAt()
    if (deadline === null || !endsWithout(ladder.advance(deadline)))
      throw new Error("Jam's real ladder neither asked for an attempt nor ended the Jam.")
    return { attempts, ready: undefined }
  },
}
