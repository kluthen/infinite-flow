/**
 * Shared builders for the pre-generation tests: a plan's start and seams from test defaults,
 * attempt results from real generation, and a runner that steps a plan until it stops, keeping
 * every attempt it asked for.
 */

import { expect } from 'vitest'

import type { Seed } from '@/domain/random/seed'
import {
  createPregenerationPlan,
  type PregenerationAttempt,
  type PregenerationPlan,
  type PregenerationResult,
  type PregenerationSeams,
  type PregenerationStart,
} from '@/session/session-pregeneration'
import type { ReadyPhrase } from '@/session/session-ready-phrases'
import type { SessionSettings } from '@/session/session-types'
import { SETTINGS_MUTATION_OFF, type SettingsMutationFlag } from '@/session/settings-mutation'
import {
  DEFAULT_SESSION_SEED,
  fakeViewport,
  phraseOneFor,
  queuedProviders,
  realOutcomeFor,
  sessionSettings,
  type FakeViewport,
  type QueuedProviders,
} from './session-harness'

/** The seams of a plan under test, kept in the test's hand. */
export interface PlanSeams extends PregenerationSeams {
  readonly providers: QueuedProviders
  readonly viewport: FakeViewport
}

/** Intent: a plan's seams: queued providers and a window that starts wide unless told otherwise. */
export function planSeams(below = false): PlanSeams {
  return { providers: queuedProviders(), viewport: fakeViewport(below) }
}

/** What a plan's start is built from; every field has a test default. */
export interface PlanStartOptions {
  readonly settings?: SessionSettings
  readonly phraseOne?: PregenerationStart['phraseOne']
  readonly sessionSeed?: Seed
  readonly mutation?: SettingsMutationFlag
  readonly multiPhraseTensionArc?: boolean
}

/** Intent: a plan's start, 60 BPM base settings and their real phrase 1 unless told otherwise. */
export function planStart(options: PlanStartOptions = {}): PregenerationStart {
  const settings = options.settings ?? sessionSettings({ tempo: 60 })
  return {
    settings,
    phraseOne: options.phraseOne ?? phraseOneFor(settings),
    sessionSeed: options.sessionSeed ?? DEFAULT_SESSION_SEED,
    mutation: options.mutation ?? SETTINGS_MUTATION_OFF,
    multiPhraseTensionArc: options.multiPhraseTensionArc ?? false,
  }
}

/** Intent: an attempt's real result: its generation's success, which fits, or its failure code. */
export function realResult(attempt: PregenerationAttempt): PregenerationResult {
  const outcome = realOutcomeFor(attempt.intent)
  return outcome.kind === 'generation_success'
    ? { kind: 'fits', outcome }
    : { kind: 'generation-failure', code: outcome.code }
}

/** A plan stepped until it stopped, and every attempt it asked for, in order. */
export interface PlanRun {
  readonly plan: PregenerationPlan
  readonly attempts: readonly PregenerationAttempt[]
}

/**
 * Intent: step a plan, answering each attempt it asks for, until it stops; a plan that never
 * stops within a generous bound fails the test.
 */
export function runPlan(
  plan: PregenerationPlan,
  answer: (attempt: PregenerationAttempt) => PregenerationResult = realResult,
): PlanRun {
  const attempts: PregenerationAttempt[] = []
  let current = plan
  while (current.attempt !== undefined) {
    expect(attempts.length, 'the plan stops within its 20 attempts').toBeLessThan(20)
    attempts.push(current.attempt)
    current = current.after(answer(current.attempt))
  }
  return { plan: current, attempts }
}

/** Intent: the ready phrases a fresh plan from these seams and start makes with real results. */
export function plannedReadyPhrases(
  seams: PregenerationSeams,
  start: PregenerationStart,
): readonly ReadyPhrase[] {
  return runPlan(createPregenerationPlan(seams, start, [])).plan.readyPhrases
}
