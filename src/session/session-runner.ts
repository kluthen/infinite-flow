/**
 * The session runner: it wraps one session engine and carries out what the engine asks for. Each
 * generation request goes through the injected generate seam and each fit check through the
 * injected fit-check seam; every result comes back to the engine as an event stamped with the
 * injected audio clock's time, the only time the session layer reads. Every engine output, those
 * produced by fed-back results included, reaches the output callback in the order the engine gave
 * it. Transport events (count-in over, phrase started sounding, the controller going away or
 * reconnecting, ticks, the end) come from the caller through `dispatch`, and so does a settings
 * change from an automatic source other than the engine's own mutations. Each attempt gets its own
 * abort signal, aborted when the engine cancels that attempt.
 */

import type { ViewportWidthProvider } from '../composables/viewport-width'
import type { GenerationIntent } from '../domain/generation/generation-intent'
import type { GenerationOutcome } from '../domain/generation/orchestration/orchestration-types'
import {
  GenerationWorkerCrashError,
  GenerationWorkerTransportError,
} from '../generation-worker/generation-worker-client'
import { createSessionEngine } from './session-engine'
import type {
  AudioTime,
  SessionDisplayReading,
  SessionEngineDependencies,
  SessionEvent,
  SessionOutput,
  SessionStart,
  SuccessfulOutcome,
} from './session-types'

/**
 * What the fit check receives for one attempt: its successful outcome and the intent it was
 * generated from, which together give the attempt's written phrase.
 */
// @spec-link [[service_session_runner]]
export interface FitCandidate {
  readonly outcome: SuccessfulOutcome
  readonly intent: GenerationIntent
}

/**
 * The runner's seams. `generate` is the app's one generation worker seam, given each attempt's own
 * abort signal; `checkFit` is required, has no default and receives the attempt's outcome with its
 * intent; `now` is the audio clock; `display` tells the engine whether any of a phrase is on
 * screen; `onError` receives a programming error from `generate` or `checkFit`, which the runner
 * never swallows.
 */
// @spec-link [[service_session_runner]]
export interface SessionRunnerDependencies {
  readonly generate: (intent: GenerationIntent, signal?: AbortSignal) => Promise<GenerationOutcome>
  readonly checkFit: (candidate: FitCandidate, phraseNumber: number) => Promise<boolean>
  readonly now: () => AudioTime
  readonly providers: SessionEngineDependencies['providers']
  readonly viewport: Pick<ViewportWidthProvider, 'isBelowTabletLandscape'>
  readonly display: SessionDisplayReading
  readonly onOutput: (output: SessionOutput) => void
  readonly onError: (error: unknown) => void
}

/**
 * The events the transport sends a running session, the controller event included; results are
 * the runner's own to feed.
 */
// @spec-link [[service_session_runner]]
export type SessionTransportEvent = Extract<
  SessionEvent,
  { kind: 'count-in-over' | 'phrase-started-sounding' | 'controller' | 'tick' | 'end' }
>

/**
 * The events a caller sends a running session: its transport's, and a settings change giving the
 * complete settings in effect from the next phrase boundary on, from an automatic source other
 * than the engine's own mutations. The app has no such source yet; the engine reads the display
 * for it alone.
 */
// @spec-link [[service_session_runner]]
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
export type SessionRunnerEvent =
  SessionTransportEvent | Extract<SessionEvent, { kind: 'settings-change' }>

/** A running session, driven by its transport's events and any automatic settings change. */
// @spec-link [[service_session_runner]]
export interface SessionRunner {
  dispatch(event: SessionRunnerEvent): void
}

/**
 * Intent: whether a generate rejection is a worker failure (a crash on that request or a dead
 * worker), which the session treats as a failed attempt rather than a programming error.
 */
// @spec-link [[rule_session_generation_failure_ladder]]
function isWorkerFailure(error: unknown): boolean {
  return (
    error instanceof GenerationWorkerCrashError || error instanceof GenerationWorkerTransportError
  )
}

/**
 * Intent: start one session engine from `start` and run it: forward its start outputs, execute
 * its generation requests and fit checks through the seams, and feed their results back stamped
 * with `now()`. A generate rejection that is a worker crash or a transport error becomes a
 * `generation-crashed` event, a failed attempt that never ends the session; any other rejection,
 * a fit-check rejection, or an error while handling a fed-back result goes to `onError` and
 * nothing is fed back. A `cancel-generation` output aborts that attempt's signal, and whatever the
 * aborted attempt then settles with is dropped. An event the engine refuses throws from `dispatch`.
 */
// @spec-link [[service_session_runner]]
// @spec-link [[rule_session_generation_failure_ladder]]
// @spec-link [[rule_look_ahead_deadline]]
// @spec-link [[rule_dropped_attempt_cancelled]]
export function createSessionRunner(
  deps: SessionRunnerDependencies,
  start: SessionStart,
): SessionRunner {
  const { providers, viewport, display } = deps
  const engine = createSessionEngine({ providers, viewport, display }, start)
  /** The abort controller of each attempt whose generate request has not settled yet. */
  const inFlight = new Map<number, AbortController>()

  /** Intent: forward each output in order, executing the requests and fit checks among them. */
  function run(outputs: readonly SessionOutput[]): void {
    for (const output of outputs) {
      deps.onOutput(output)
      if (output.kind === 'request-generation') requestGeneration(output.attemptId, output.intent)
      else if (output.kind === 'cancel-generation') inFlight.get(output.attemptId)?.abort()
      else if (output.kind === 'check-fit')
        requestFitCheck(
          output.attemptId,
          { outcome: output.outcome, intent: output.intent },
          output.phraseNumber,
        )
    }
  }

  /** Intent: feed a result event back; an error while handling it goes to the owner. */
  function feedBack(event: SessionEvent): void {
    try {
      run(engine.handle(event))
    } catch (error) {
      deps.onError(error)
    }
  }

  /**
   * Intent: generate one attempt under its own abort signal and feed back its outcome, or its
   * worker failure; once the attempt is cancelled, whatever it settles with is dropped.
   */
  // @spec-link [[rule_dropped_attempt_cancelled]]
  // @spec-link [[module_generation_worker_cancellation]]
  function requestGeneration(attemptId: number, intent: GenerationIntent): void {
    const controller = new AbortController()
    inFlight.set(attemptId, controller)
    const { signal } = controller
    void deps.generate(intent, signal).then(
      (outcome) => {
        inFlight.delete(attemptId)
        if (signal.aborted) return
        feedBack({ kind: 'generation-result', at: deps.now(), attemptId, outcome })
      },
      (error: unknown) => {
        inFlight.delete(attemptId)
        if (signal.aborted) return
        if (isWorkerFailure(error))
          feedBack({ kind: 'generation-crashed', at: deps.now(), attemptId })
        else deps.onError(error)
      },
    )
  }

  /** Intent: fit-check one attempt's outcome with its intent and feed back whether it fits. */
  function requestFitCheck(attemptId: number, candidate: FitCandidate, phraseNumber: number): void {
    void deps.checkFit(candidate, phraseNumber).then(
      (fits) => feedBack({ kind: 'fit-result', at: deps.now(), attemptId, fits }),
      (error: unknown) => deps.onError(error),
    )
  }

  run(engine.outputsAtStart)
  return Object.freeze({
    dispatch(event: SessionRunnerEvent): void {
      run(engine.handle(event))
    },
  })
}
