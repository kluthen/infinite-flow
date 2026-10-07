/**
 * Shared builders for the session engine tests: deterministic queued identity and seed providers,
 * a window-width reading and a display reading the test moves by hand, real phrase 1 intents and
 * outcomes, real failure outcomes, and a driver that feeds timed events to one engine and keeps
 * every output it returned.
 */

import { expect } from 'vitest'

import {
  makeGenerationControls,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import type {
  GenerationIntent,
  GenerationIntentProviders,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type {
  GenerationFailureCode,
  GenerationOutcome,
} from '@/domain/generation/orchestration/orchestration-types'
import { makeSeed } from '@/domain/random/seed'
import { createSessionEngine } from '@/session/session-engine'
import { SETTINGS_MUTATION_OFF, type SettingsMutationFlag } from '@/session/settings-mutation'
import type {
  AudioTime,
  SessionDisplayReading,
  SessionEndCause,
  SessionEngine,
  SessionEvent,
  SessionOutput,
  SessionSettings,
  SessionStart,
  SuccessfulOutcome,
} from '@/session/session-types'
import {
  BASE_CONTROLS,
  buildIntent,
  generateSuccess,
} from '../domain/generation/carry-in/carry-in-fixture'

/** One output kind of the engine, narrowed. */
export type OutputOf<K extends SessionOutput['kind']> = Extract<SessionOutput, { kind: K }>

/** The request-generation output. */
export type GenerationRequestOutput = OutputOf<'request-generation'>

/** Queued identity and seed providers, with every seed they have handed out so far. */
export interface QueuedProviders extends GenerationIntentProviders {
  readonly seedsHandedOut: readonly number[]
}

/**
 * Intent: providers that hand out a fixed queue of seeds (`firstSeed`, `firstSeed + 1`, ...) and
 * request ids `session-1`, `session-2`, ..., failing loudly once the queue is empty, so a run is
 * deterministic and every attempt's seed is fresh.
 */
export function queuedProviders(firstSeed = 3000, queueLength = 80): QueuedProviders {
  const queue = Array.from({ length: queueLength }, (_, index) => firstSeed + index)
  const seedsHandedOut: number[] = []
  let requestCount = 0
  return {
    seedsHandedOut,
    nextRequestId: () => makeRequestId(`session-${++requestCount}`),
    nextSeed: () => {
      const seed = queue.shift()
      if (seed === undefined) throw new Error('The queued seed provider ran out of seeds.')
      seedsHandedOut.push(seed)
      return makeSeed(seed)
    },
  }
}

/** The epoch milliseconds a fixed test wall clock reads: 2026-09-30 at 12:00 UTC. */
export const SESSION_START_EPOCH_MS = Date.UTC(2026, 8, 30, 12)

/** Intent: a wall clock stuck at `SESSION_START_EPOCH_MS`, for tests that ignore the start time. */
export function fixedWallClock(): number {
  return SESSION_START_EPOCH_MS
}

/** A window-width reading the test moves by hand. */
export interface FakeViewport {
  below: boolean
  readonly isBelowTabletLandscape: () => boolean
}

/** Intent: a window-width reading that starts below or at/above the tablet-landscape width. */
export function fakeViewport(below: boolean): FakeViewport {
  const viewport: FakeViewport = { below, isBelowTabletLandscape: () => viewport.below }
  return viewport
}

/** A display reading the test moves by hand, with every phrase number it was asked about. */
export interface FakeDisplay extends SessionDisplayReading {
  onScreen: boolean
  readonly asked: number[]
}

/** Intent: a display reading that answers `onScreen` for every phrase and logs each question. */
export function fakeDisplay(onScreen = false): FakeDisplay {
  const display: FakeDisplay = {
    onScreen,
    asked: [],
    isPhraseOnScreen: (phraseNumber) => {
      display.asked.push(phraseNumber)
      return display.onScreen
    },
  }
  return display
}

/**
 * A display reading for runs that never send a settings change, the only event that reads it:
 * a read is a test bug and throws.
 */
export const UNREAD_DISPLAY: SessionDisplayReading = Object.freeze({
  isPhraseOnScreen(phraseNumber: number): boolean {
    throw new Error(`The display was read for phrase ${phraseNumber} with no settings change.`)
  },
})

/** Intent: chosen session settings: the base carry-in controls with the given overrides. */
export function sessionSettings(overrides: Partial<GenerationControls> = {}): SessionSettings {
  return {
    controls: makeGenerationControls({ ...BASE_CONTROLS, ...overrides }),
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
  }
}

const phraseOneCache = new Map<string, SessionStart['phraseOne']>()

/**
 * Intent: a real phrase 1 generated at Idle from the settings' controls (with optional overrides,
 * such as the density the Idle window gave it) and a seed; cached, since generation is pure.
 */
export function phraseOneFor(
  settings: SessionSettings,
  options: { readonly seed?: number; readonly controls?: Partial<GenerationControls> } = {},
): SessionStart['phraseOne'] {
  const controls = { ...settings.controls, ...options.controls }
  const seed = options.seed ?? 11
  const key = JSON.stringify({ controls, seed })
  const cached = phraseOneCache.get(key)
  if (cached !== undefined) return cached
  const intent = buildIntent({ controls, seed, label: 'phrase-1' })
  const phraseOne = { intent, outcome: generateSuccess(intent) }
  phraseOneCache.set(key, phraseOne)
  return phraseOne
}

/**
 * Intent: a real generation failure outcome with the given code and empty diagnostics. The default
 * code is a search allowance cutoff, a failure every rung of the ladder retries.
 */
export function failureOutcome(
  code: GenerationFailureCode = 'search_limit_exceeded',
): GenerationOutcome {
  return {
    kind: 'generation_failure',
    code,
    diagnostics: {
      version: 'generation-diagnostics-v1',
      harmonyDomainSize: 0,
      rhythmDomainSize: 0,
      windows: [],
      successfulRegisters: [],
    },
  }
}

const successCache = new Map<GenerationIntent, SuccessfulOutcome>()

/** Intent: the real successful outcome of an intent the engine requested; cached per intent. */
export function successFor(intent: GenerationIntent): SuccessfulOutcome {
  const cached = successCache.get(intent)
  if (cached !== undefined) return cached
  const outcome = generateSuccess(intent)
  successCache.set(intent, outcome)
  return outcome
}

const outcomeCache = new Map<string, GenerationOutcome>()

/**
 * Intent: the real outcome of an intent, a success or a failure, cached by the intent's content,
 * so two runs of the same session share each generation.
 */
export function realOutcomeFor(intent: GenerationIntent): GenerationOutcome {
  const key = JSON.stringify(intent)
  const cached = outcomeCache.get(key)
  if (cached !== undefined) return cached
  const outcome = generatePhrase(intent)
  outcomeCache.set(key, outcome)
  return outcome
}

/** Intent: an intent without its tempo, for comparing intents built at different tempos. */
export function withoutTempo(intent: GenerationIntent): unknown {
  const { tempo, ...controls } = intent.controls
  void tempo
  return { ...intent, controls }
}

/** What a driver starts from; every field has a test default. */
export interface DriverOptions {
  readonly at?: AudioTime
  readonly settings?: SessionSettings
  readonly phraseOne?: SessionStart['phraseOne']
  readonly viewport?: FakeViewport
  readonly display?: FakeDisplay
  readonly providers?: QueuedProviders
  readonly mutation?: SettingsMutationFlag
  readonly adaptiveTempo?: boolean
  readonly multiPhraseTensionArc?: boolean
}

/** Feeds timed events to one engine and keeps every output it returned, in order. */
// @test-link [[service_session_engine]]
export class SessionDriver {
  readonly log: SessionOutput[] = []
  readonly engine: SessionEngine
  readonly settings: SessionSettings
  readonly phraseOne: SessionStart['phraseOne']
  readonly viewport: FakeViewport
  readonly display: FakeDisplay
  readonly providers: QueuedProviders
  readonly start: SessionStart
  readonly startOutputs: readonly SessionOutput[]

  /** Intent: start one engine from the options, keeping its start outputs. */
  constructor(options: DriverOptions = {}) {
    this.settings = options.settings ?? sessionSettings()
    this.phraseOne = options.phraseOne ?? phraseOneFor(this.settings)
    this.viewport = options.viewport ?? fakeViewport(false)
    this.display = options.display ?? fakeDisplay(false)
    this.providers = options.providers ?? queuedProviders()
    this.start = {
      at: options.at ?? 0,
      settings: this.settings,
      phraseOne: this.phraseOne,
      mutation: options.mutation ?? SETTINGS_MUTATION_OFF,
      adaptiveTempo: options.adaptiveTempo ?? false,
      multiPhraseTensionArc: options.multiPhraseTensionArc ?? false,
    }
    this.engine = createSessionEngine(
      { providers: this.providers, viewport: this.viewport, display: this.display },
      this.start,
    )
    this.startOutputs = this.engine.outputsAtStart
    this.log.push(...this.startOutputs)
  }

  /** Intent: feed one event, log its outputs and return them. */
  send(event: SessionEvent): readonly SessionOutput[] {
    const outputs = this.engine.handle(event)
    this.log.push(...outputs)
    return outputs
  }

  /** Intent: every logged output of one kind, in order. */
  all<K extends SessionOutput['kind']>(kind: K): readonly OutputOf<K>[] {
    return this.log.filter((output): output is OutputOf<K> => output.kind === kind)
  }

  /** Intent: every logged request, optionally only those for one phrase. */
  requests(phraseNumber?: number): readonly GenerationRequestOutput[] {
    return this.all('request-generation').filter(
      (request) => phraseNumber === undefined || request.phraseNumber === phraseNumber,
    )
  }

  /** Intent: the latest logged request, failing the test's assertion when there is none. */
  lastRequest(): GenerationRequestOutput {
    const request = this.requests().at(-1)
    expect(request, 'the engine has requested a generation').toBeDefined()
    return request!
  }

  /** Intent: answer the latest request with a real generation failure with the given code. */
  fail(
    at: AudioTime,
    attemptId = this.lastRequest().attemptId,
    code?: GenerationFailureCode,
  ): readonly SessionOutput[] {
    return this.send({ kind: 'generation-result', at, attemptId, outcome: failureOutcome(code) })
  }

  /** Intent: report the latest request's generate call as rejected. */
  crash(at: AudioTime, attemptId = this.lastRequest().attemptId): readonly SessionOutput[] {
    return this.send({ kind: 'generation-crashed', at, attemptId })
  }

  /** Intent: answer the latest request with the real successful outcome of its intent. */
  succeed(at: AudioTime, request = this.lastRequest()): readonly SessionOutput[] {
    const outcome = successFor(request.intent)
    return this.send({ kind: 'generation-result', at, attemptId: request.attemptId, outcome })
  }

  /** Intent: answer the latest request's fit check. */
  fit(
    at: AudioTime,
    fits: boolean,
    attemptId = this.lastRequest().attemptId,
  ): readonly SessionOutput[] {
    return this.send({ kind: 'fit-result', at, attemptId, fits })
  }

  /** Intent: answer the latest request with a success that fits, both at the same time. */
  accept(at: AudioTime): readonly SessionOutput[] {
    return [...this.succeed(at), ...this.fit(at, true)]
  }

  /**
   * Intent: answer every attempt of the latest requested phrase at the given time with its real
   * outcome, a success fitting, until the phrase is decided or its ladder is exhausted.
   */
  settle(at: AudioTime): void {
    for (;;) {
      const { attemptId, intent } = this.lastRequest()
      const outcome = realOutcomeFor(intent)
      const outputs = this.send({ kind: 'generation-result', at, attemptId, outcome })
      if (outcome.kind === 'generation_success') {
        this.fit(at, true, attemptId)
        return
      }
      if (!outputs.some((output) => output.kind === 'request-generation')) return
    }
  }

  /** Intent: fail every remaining rung of the latest phrase's ladder at the given time. */
  exhaust(at: AudioTime): void {
    const phraseNumber = this.lastRequest().phraseNumber
    while (this.requests(phraseNumber).length < 5) this.fail(at)
    this.fail(at)
  }

  /** Intent: let time reach the given moment. */
  tick(at: AudioTime): readonly SessionOutput[] {
    return this.send({ kind: 'tick', at })
  }

  /** Intent: the count-in ends and phrase 1 starts sounding. */
  countInOver(at: AudioTime): readonly SessionOutput[] {
    return this.send({ kind: 'count-in-over', at })
  }

  /** Intent: phrase N (2 or more) starts sounding. */
  sounding(at: AudioTime, phraseNumber: number): readonly SessionOutput[] {
    return this.send({ kind: 'phrase-started-sounding', at, phraseNumber })
  }

  /** Intent: a settings change puts these settings in effect. */
  change(at: AudioTime, settings: SessionSettings): readonly SessionOutput[] {
    return this.send({ kind: 'settings-change', at, settings })
  }

  /** Intent: a controller lost mid-session goes away, or reconnects. */
  controller(at: AudioTime, attached: boolean): readonly SessionOutput[] {
    return this.send({ kind: 'controller', at, attached })
  }

  /** Intent: the session ends for the given cause. */
  end(at: AudioTime, cause: SessionEndCause = 'stop'): readonly SessionOutput[] {
    return this.send({ kind: 'end', at, cause })
  }
}

/** Intent: the kinds of a list of outputs, in order, for compact assertions. */
export function kinds(outputs: readonly SessionOutput[]): readonly SessionOutput['kind'][] {
  return outputs.map((output) => output.kind)
}
