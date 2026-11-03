/**
 * Jam's phrase 1 in the Jam sweep (measurement tooling, v3.2 measurement M1): the pluggable ladder
 * that produces it before its deadline, the generator each ladder asks for one attempt, the
 * baseline ladder (chunk 3: rung 3 only, no doodle), and the test double of Jam's three-rung
 * ladder (chunk 29, spec D453), written from master spec C5.7 and C11 and importing nothing of the
 * app's own ladder (src/jam/jam-phrase-one.ts), with what a doodle gives its attempts: the controls
 * read from it (chunk 28), its join (chunk 7) and its steering block.
 *
 * The generation measure starts at 0; the deadline is three measures later (master spec C5.7) and
 * the standalone reserve is kept before it for rung 3. Each attempt keeps the one generator busy
 * for its measured `generatePhrase` time plus the round trip and the engraving, as the measured
 * deadline sweep charges a look-ahead attempt (deadline-sweep-measured.ts). A phrase 1 ready
 * strictly before the deadline came; otherwise the Jam ends, and phrase 1 never came.
 */

import { performance } from 'node:perf_hooks'

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import {
  createCanonicalRhythmDomainMemo,
  SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO,
} from '@/domain/generation/orchestration/canonical-rhythm-domain'
import {
  generatePhrase,
  rhythmDomainInputOf,
} from '@/domain/generation/orchestration/generation-orchestrator'
import type {
  GenerationFailureCode,
  GenerationOutcome,
} from '@/domain/generation/orchestration/orchestration-types'
import {
  makeRequestRhythmLock,
  type RequestRhythmLock,
  type RhythmChangeKind,
} from '@/domain/generation/request-rhythm-lock'
import {
  createGenerationIntent,
  makeGenerationIntent,
  type GenerationIntentInput,
} from '@/domain/generation/generation-intent'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import { makeRequestId } from '@/domain/generation/generation-request-envelope'
import type { SteeringBlock } from '@/domain/generation/steering-block'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'
import { fnv1a32 } from '@/domain/random/hash32'
import { makeSeed, type Seed } from '@/domain/random/seed'
import { readDoodleControls } from '@/jam/doodle-controls'
import { doodleJoin } from '@/jam/doodle-join'
import { buildSteeringBlock, type JamDrift } from '@/jam/steering-block-builder'
import { sessionInstrumentProfile } from '@/session/session-intents'
import { WORKER_RESPAWN_SECONDS, measureSeconds } from '@/session/session-timing'
import type { SessionSettings, SessionStart } from '@/session/session-types'
import { phraseOneIntent, splitOrderingsTime } from '../unit/session/deadline-sweep'
import { ROUND_TRIP_AND_ENGRAVING_SECONDS } from './deadline-sweep-measured'

/** The rhythm lock a run plays with: off, or on with the rhythm changes the player allows. */
export type JamLock =
  | { readonly on: false }
  | { readonly on: true; readonly allowedChanges: readonly RhythmChangeKind[] }

/** Whether phrase 1's rhythm domain is already built (warm) or built by its first attempt (cold). */
export type RhythmDomainState = 'warm' | 'cold'

/**
 * A rung of Jam's phrase-1 ladder (C5.7): the doodle's join and the steering block, the block
 * without the join, or v2's standalone phrase.
 */
export type LadderRung = 'join-and-block' | 'block' | 'standalone'

/** Every rung, in ladder order. */
export const LADDER_RUNGS: readonly LadderRung[] = ['join-and-block', 'block', 'standalone']

/** How many measures after the generation measure begins phrase 1's deadline falls (C5.7). */
export const PHRASE_ONE_DEADLINE_MEASURES = 3

/** One attempt the generator made for phrase 1: its measured time and what it became. */
export interface GeneratedAttempt {
  readonly outcome: GenerationOutcome
  /** The wall time `generatePhrase` took here, in seconds. */
  readonly seconds: number
  /** What the attempt keeps the generator busy for: `seconds` plus the round trip and engraving. */
  readonly chargedSeconds: number
  /**
   * The time, in seconds, the generator's diagnostics report for building the rhythm orderings
   * (the lock's order and its change draw; the steering rank later).
   */
  readonly orderingSeconds: number
  /** Whether it ran on a cold rhythm domain. */
  readonly cold: boolean
}

/** Generates one phrase-1 attempt of a rung. */
export type PhraseOneGenerate = (intent: GenerationIntent, rung: LadderRung) => GeneratedAttempt

/**
 * What a doodle gives Jam's phrase 1 (C5.9, C5.16, C11): Jam's settings with the seven controls
 * read from the doodle (those in effect once phrase 1 is handed over, the rhythm lock's switch and
 * allowed changes included), the steering block every phrase of the Jam carries, whether the
 * doodle's last note gives phrase 1 a join, and the intent of an attempt of a rung at a seed.
 */
export interface DoodlePhraseOne {
  readonly settings: SessionSettings
  readonly steering: SteeringBlock
  readonly hasJoin: boolean
  readonly intentAt: (rung: LadderRung, seed: Seed) => GenerationIntent
}

/** What a ladder works from for one Jam. */
export interface LadderInput {
  /** Phrase 1's intent at the case's seed with no steering block and no lock: v3.1's phrase 1. */
  readonly baseIntent: GenerationIntent
  /** Phrase 1's intent at a seed, carrying the steering block and the lock group when given. */
  readonly intentAt: (
    seed: number,
    extras: Pick<GenerationIntent, 'steering' | 'rhythmLock'>,
  ) => GenerationIntent
  readonly firstSeed: number
  readonly steering: SteeringBlock | undefined
  readonly lock: JamLock
  /** Seconds from the generation measure's start to phrase 1's deadline. */
  readonly deadlineSeconds: number
  /** The standalone reserve kept before the deadline for rung 3, in seconds. */
  readonly reserveSeconds: number
  readonly generate: PhraseOneGenerate
  /** The Jam's session seed, drawn at Start: every attempt seed of the double derives from it. */
  readonly sessionSeed: number
  /** What the doodle gives phrase 1; none in a run with no doodle (the baseline's). */
  readonly doodle?: DoodlePhraseOne
}

/** One attempt a ladder made, on the generation measure's clock. */
export interface LadderAttempt {
  readonly rung: LadderRung
  /**
   * Its index among the ladder's six attempts (C11's label: 0 rung 1's first attempt, 1 to 3 its
   * retries, 4 rung 2, 5 rung 3), when the ladder numbers them.
   */
  readonly attempt?: number
  /** Its seed, when the ladder records it. */
  readonly seed?: number
  /**
   * When it was cancelled where it ran, superseded by rung 3 at the cutover (the deadline minus
   * the reserve), if it was: its result never counted.
   */
  readonly cancelledAt?: number
  /** When the generator started it, in seconds from the generation measure's start. */
  readonly startedAt: number
  readonly seconds: number
  readonly chargedSeconds: number
  /** Its failure code, or null when it generated a phrase. */
  readonly failureCode: GenerationFailureCode | null
  /**
   * The time, in seconds, the generator's diagnostics report for building the rhythm orderings
   * (the lock's order and its change draw; the steering rank later), when the ladder measures it.
   */
  readonly orderingSeconds?: number
  readonly cold: boolean
}

/** Phrase 1 when it came: the phrase, its rung, and when it was ready. */
export interface PhraseOneReady {
  readonly phraseOne: SessionStart['phraseOne']
  readonly rung: LadderRung
  readonly readyAt: number
  /** The attempt that made it, the last of the ladder's attempts. */
  readonly made?: LadderAttempt
}

/** What a ladder did for one Jam: every attempt in order, and phrase 1, unless it never came. */
export interface LadderResult {
  readonly attempts: readonly LadderAttempt[]
  readonly ready: PhraseOneReady | undefined
}

/** A ladder producing Jam's phrase 1 before its deadline. */
export interface PhraseOneLadder {
  readonly name: string
  readonly run: (input: LadderInput) => LadderResult
}

/** Intent: phrase 1's deadline at a tempo, in seconds from the generation measure's start. */
export function phraseOneDeadlineSeconds(tempo: number): number {
  return PHRASE_ONE_DEADLINE_MEASURES * measureSeconds(tempo)
}

/**
 * Intent: how many whole measures phrase 1 ready at `readyAt` extends the wait by: it is shown at
 * the first barline at or after it is ready (C5.7), so none when it is ready within the
 * generation measure.
 */
export function extendedWaitMeasures(readyAt: number, tempo: number): number {
  if (!(readyAt >= 0)) throw new Error(`Phrase 1 cannot be ready at ${readyAt} s.`)
  return Math.max(0, Math.ceil(readyAt / measureSeconds(tempo)) - 1)
}

/**
 * Intent: phrase 1's intent at a seed under some settings, exactly as the sweep builds it at Idle,
 * with the steering block and the lock group added when given (absent, the very intent of v3.1).
 */
export function jamPhraseOneIntent(
  settings: SessionSettings,
  seed: number,
  extras: Pick<GenerationIntent, 'steering' | 'rhythmLock'>,
): GenerationIntent {
  const base = phraseOneIntent(settings, seed)
  if (extras.steering === undefined && extras.rhythmLock === undefined) return base
  return createGenerationIntent({
    requestId: base.requestId,
    seed: base.seed,
    controls: settings.controls,
    figureLevels: settings.figureLevels,
    ...(extras.rhythmLock === undefined ? {} : { rhythmLock: extras.rhythmLock }),
    ...(extras.steering === undefined ? {} : { steering: extras.steering }),
  })
}

/**
 * Intent: Jam phrase 1's rhythm lock group with the lock on: pending (nothing locked yet: phrase 1
 * sets the locked rhythm) with the allowed changes, not a tenser phrase.
 */
export function phraseOneLockGroup(
  lock: Extract<JamLock, { readonly on: true }>,
): RequestRhythmLock {
  return makeRequestRhythmLock({
    state: { kind: 'pending' },
    allowedChanges: lock.allowedChanges,
    tenserPhrase: false,
  })
}

/** Intent: one timed `generatePhrase` call, with its wall time in seconds. */
function timed(run: () => GenerationOutcome): { outcome: GenerationOutcome; seconds: number } {
  const startedAt = performance.now()
  const outcome = run()
  return { outcome, seconds: (performance.now() - startedAt) / 1000 }
}

/**
 * Intent: the generator of one Jam's phrase-1 attempts. With a cold domain, the first attempt runs
 * on a fresh rhythm-domain memo, so it builds the domain itself, and is never cached; every other
 * attempt runs warm: the shared memo is filled for its rhythm setting first, off the clock, so
 * only the generation is timed. Each attempt is generated and timed afresh, so a warm time is
 * never one measured on a cold domain earlier in the process.
 */
export function phraseOneGenerator(domain: RhythmDomainState): PhraseOneGenerate {
  let coldLeft = domain === 'cold'
  return (intent) => {
    const cold = coldLeft
    coldLeft = false
    if (!cold) SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO.lookup(rhythmDomainInputOf(intent))
    const rhythmDomainMemo = cold
      ? createCanonicalRhythmDomainMemo()
      : SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO
    const clocked = timed(() =>
      generatePhrase(intent, { rhythmDomainMemo, clock: () => performance.now() }),
    )
    const { seconds } = clocked
    const { outcome, orderingSeconds } = splitOrderingsTime(clocked.outcome)
    const chargedSeconds = seconds + ROUND_TRIP_AND_ENGRAVING_SECONDS
    return { outcome, seconds, chargedSeconds, orderingSeconds, cold }
  }
}

/**
 * The baseline ladder, standing in for Jam's real one: rung 3 only, phrase 1 generated as at Idle
 * (the case's seed, then the next ones, under the same label), with the lock group and the
 * steering block when given. Attempts run back to back from the generation measure's start, until
 * one generates a phrase or the next would start at or after the deadline. Each attempt reports
 * the time the generator's diagnostics report for building the rhythm orderings (the lock's order
 * and its change draw; the steering rank later).
 */
export const BASELINE_LADDER: PhraseOneLadder = {
  name: 'baseline (rung 3 only)',
  run(input) {
    const extras = {
      ...(input.steering === undefined ? {} : { steering: input.steering }),
      ...(input.lock.on ? { rhythmLock: phraseOneLockGroup(input.lock) } : {}),
    }
    const attempts: LadderAttempt[] = []
    let clock = 0
    for (let seed = input.firstSeed; clock < input.deadlineSeconds; seed += 1) {
      const intent = input.intentAt(seed, extras)
      const generated = input.generate(intent, 'standalone')
      const { outcome } = generated
      attempts.push({
        rung: 'standalone',
        startedAt: clock,
        seconds: generated.seconds,
        chargedSeconds: generated.chargedSeconds,
        failureCode: outcome.kind === 'generation_failure' ? outcome.code : null,
        orderingSeconds: generated.orderingSeconds,
        cold: generated.cold,
      })
      clock += generated.chargedSeconds
      if (outcome.kind !== 'generation_success') continue
      if (!(clock < input.deadlineSeconds)) break
      return {
        attempts,
        ready: { phraseOne: { intent, outcome }, rung: 'standalone', readyAt: clock },
      }
    }
    return { attempts, ready: undefined }
  },
}

/** How many attempts the double's ladder has (C5.7, C11): rung 1's first and three retries, rung 2, rung 3. */
export const JAM_LADDER_ATTEMPTS = 6

/** The attempt index of rung 2 (the block, no join) and of rung 3 (v2's standalone phrase). */
const BLOCK_ATTEMPT_INDEX = 4
const STANDALONE_ATTEMPT_INDEX = 5

/** The window every swept Jam runs in: at or above the tablet-landscape width, never stepped down. */
const WIDE_WINDOW = { belowTabletLandscape: false, sessionSteppedDown: false }

/** Intent: the rung of one of the ladder's six attempts (C11's index). */
export function rungOfAttemptIndex(index: number): LadderRung {
  if (!Number.isInteger(index) || index < 0 || index >= JAM_LADDER_ATTEMPTS)
    throw new Error(`A Jam phrase 1 attempt index runs from 0 to 5, got ${index}.`)
  if (index < BLOCK_ATTEMPT_INDEX) return 'join-and-block'
  return index === BLOCK_ATTEMPT_INDEX ? 'block' : 'standalone'
}

/**
 * Intent: the seed of one of a fresh Jam's phrase 1 attempts, as C11 sets it: derived from the
 * session seed drawn at Start by the seed plan's one derivation (the session seed XOR the FNV-1a
 * 32-bit hash of the label, unsigned), under the label `session-seed-plan-v1:jam-phrase-one:rung:<r>`.
 */
export function jamAttemptSeed(sessionSeed: number, index: number): Seed {
  rungOfAttemptIndex(index)
  return makeSeed(
    (sessionSeed ^ fnv1a32(`session-seed-plan-v1:jam-phrase-one:rung:${index}`)) >>> 0,
  )
}

/**
 * Intent: what a doodle gives Jam's phrase 1 under a sweep case's settings (C5.9, C5.16, C7.1):
 * the seven controls read from the quantized doodle for the case's instrument on a wide window
 * (chunk 28's mapping) set into the settings, with Jam's lock; the steering block from the doodle
 * and the drift; the join from the doodle's last note (chunk 7). Rung 1's attempt joins the doodle
 * in the join's register and carries the block; rung 2's carries the block, no join, in the
 * register read from the doodle; both carry, with the lock on, the lock "on, nothing locked yet".
 * Rung 3's is v2's standalone phrase under the same controls, with no block and no lock group
 * (C5.7: "with no steering block"; C7.1: the lock then holds the rhythm it came with).
 */
export function doodlePhraseOne(
  settings: SessionSettings,
  doodle: QuantizedDoodle,
  drift: JamDrift,
  lock: JamLock,
): DoodlePhraseOne {
  const instrument = sessionInstrumentProfile(settings)
  const windows = deriveRegisterWindowCandidates(
    instrument.concertRange,
    instrument.registerWindows,
  )
  const readings = readDoodleControls(doodle, windows, WIDE_WINDOW)
  const controls = makeGenerationControls({
    ...settings.controls,
    noteDensity: readings.noteDensity.value,
    rhythmicVariety: readings.rhythmicVariety.value,
    syncopation: readings.syncopation.value,
    silenceDensity: readings.silenceDensity.value,
    contour: readings.contour.value,
    leapiness: readings.leapiness.value,
    register: readings.register.value,
  })
  const jamSettings: SessionSettings = {
    ...settings,
    controls,
    rhythmLockOn: lock.on,
    ...(lock.on ? { allowedRhythmChanges: lock.allowedChanges } : {}),
  }
  const steering = buildSteeringBlock(doodle, drift)
  const join = doodleJoin(doodle, instrument, readings.register)
  const rhythmLock = lock.on ? phraseOneLockGroup(lock) : undefined
  return {
    settings: jamSettings,
    steering,
    hasJoin: join.kind === 'join',
    intentAt(rung, seed) {
      const input: GenerationIntentInput = {
        requestId: makeRequestId(`jam-sweep-phrase-1-${rung}-${seed}`),
        seed,
        controls,
        figureLevels: settings.figureLevels,
        ...(rung === 'standalone' || rhythmLock === undefined ? {} : { rhythmLock }),
        ...(rung === 'standalone' ? {} : { steering }),
      }
      if (rung !== 'join-and-block') return makeGenerationIntent(input)
      if (join.kind !== 'join') throw new Error("Rung 1 needs the doodle's join, and it has none.")
      return makeCarryInGenerationIntent({
        ...input,
        controls: { ...controls, register: join.register },
        carryIn: join.carryIn,
      })
    },
  }
}

/**
 * Intent: the attempt after a failed one (C5.7): rung 3 once less than the reserve is left before
 * the deadline; rung 2 after a rung-1 attempt whose search covered every candidate
 * (`no_legal_pitch_plan`: its retries would fail the same way, whatever the seed); otherwise the
 * next attempt (a retry of rung 1, then rung 2, then rung 3); none after rung 3.
 */
function attemptAfter(
  index: number,
  failureCode: GenerationFailureCode,
  due: boolean,
): number | undefined {
  if (index === STANDALONE_ATTEMPT_INDEX) return undefined
  if (due) return STANDALONE_ATTEMPT_INDEX
  if (rungOfAttemptIndex(index) === 'join-and-block' && failureCode === 'no_legal_pitch_plan')
    return BLOCK_ATTEMPT_INDEX
  return index + 1
}

/**
 * The test double of Jam's phrase-1 ladder (chunk 29, spec D453), written from master spec C5.7
 * and C11 on the generation measure's clock (0 at its start, the deadline three measures later).
 * Rung 1, the doodle's join and the steering block, has a first attempt and up to three retries,
 * each with a seed of its own, the retries skipped after a search that covered every candidate;
 * rung 2 is one attempt with the block and no join (the first one when the doodle gives no join);
 * rung 3 is one attempt of v2's standalone phrase, with no block. The standalone reserve is kept
 * before the deadline for rung 3: from the cutover (the deadline minus the reserve) on, no attempt
 * of rungs 1 or 2 starts, the one running is cancelled at the cutover (one ending at the cutover
 * is too late), the worker restarts, and rung 3 is asked for at once. Attempts run back to back on
 * the one generator, each charged its measured time (`generate`); a phrase ready strictly before
 * the deadline came; when rung 3 fails or comes too late, the Jam ends at the deadline (spec D457)
 * and phrase 1 never came. There is no repeat: there is no phrase before. Each attempt's seed is
 * C11's (jamAttemptSeed); every attempt reports the orderings' time its diagnostics give.
 */
export const JAM_DOUBLE_LADDER: PhraseOneLadder = {
  name: 'double of chunk 18 (three rungs)',
  run(input) {
    const { doodle } = input
    if (doodle === undefined) throw new Error("The double of Jam's ladder needs a doodle.")
    const cutover = input.deadlineSeconds - input.reserveSeconds
    const attempts: LadderAttempt[] = []
    let clock = 0
    let index: number | undefined =
      clock >= cutover ? STANDALONE_ATTEMPT_INDEX : doodle.hasJoin ? 0 : BLOCK_ATTEMPT_INDEX
    while (index !== undefined) {
      const rung = rungOfAttemptIndex(index)
      const seed = jamAttemptSeed(input.sessionSeed, index)
      const intent = doodle.intentAt(rung, seed)
      const generated = input.generate(intent, rung)
      const { outcome } = generated
      const startedAt = clock
      const endsAt = startedAt + generated.chargedSeconds
      const superseded = rung !== 'standalone' && endsAt >= cutover
      attempts.push({
        rung,
        attempt: index,
        seed,
        startedAt,
        seconds: generated.seconds,
        chargedSeconds: generated.chargedSeconds,
        failureCode: outcome.kind === 'generation_failure' ? outcome.code : null,
        orderingSeconds: generated.orderingSeconds,
        cold: generated.cold,
        ...(superseded ? { cancelledAt: cutover } : {}),
      })
      if (superseded) {
        clock = cutover + WORKER_RESPAWN_SECONDS
        index = STANDALONE_ATTEMPT_INDEX
        continue
      }
      clock = endsAt
      if (outcome.kind === 'generation_success') {
        if (!(clock < input.deadlineSeconds)) break
        return {
          attempts,
          ready: { phraseOne: { intent, outcome }, rung, readyAt: clock, made: attempts.at(-1)! },
        }
      }
      index = attemptAfter(index, outcome.code, clock >= cutover)
    }
    return { attempts, ready: undefined }
  },
}
