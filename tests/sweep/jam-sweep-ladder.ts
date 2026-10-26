/**
 * Jam's phrase 1 in the Jam sweep (measurement tooling, v3.2 measurement M1): the pluggable ladder
 * that produces it before its deadline, the generator each ladder asks for one attempt, and the
 * baseline ladder standing in until the real one exists.
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
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import type { SteeringBlock } from '@/domain/generation/steering-block'
import { measureSeconds } from '@/session/session-timing'
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
}

/** One attempt a ladder made, on the generation measure's clock. */
export interface LadderAttempt {
  readonly rung: LadderRung
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
