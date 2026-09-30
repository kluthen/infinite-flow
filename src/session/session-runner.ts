/**
 * The session runner: it wraps one session engine and carries out what the engine asks for. Each
 * generation request goes through the injected generate seam and each fit check through the
 * injected fit-check seam; every result comes back to the engine as an event stamped with the
 * injected audio clock's time, the only time the session layer reads. Every engine output, those
 * produced by fed-back results included, reaches the output callback in the order the engine gave
 * it. Transport events (count-in over, phrase started sounding, ticks, the end) come from the
 * caller through `dispatch`.
 */

import type { ViewportWidthProvider } from '../composables/viewport-width'
import type {
  GenerationIntent,
  GenerationIntentProviders,
} from '../domain/generation/generation-intent'
import type { GenerationOutcome } from '../domain/generation/orchestration/orchestration-types'
import {
  GenerationWorkerCrashError,
  GenerationWorkerTransportError,
} from '../generation-worker/generation-worker-client'
import { createSessionEngine } from './session-engine'
import type {
  AudioTime,
  SessionEvent,
  SessionOutput,
  SessionStart,
  SuccessfulOutcome,
} from './session-types'

/**
 * The runner's seams. `generate` is the app's one generation worker seam; `checkFit` is required
 * and has no default; `now` is the audio clock; `onError` receives a programming error from
 * `generate` or `checkFit`, which the runner never swallows.
 */
// @spec-link [[service_session_runner]]
export interface SessionRunnerDependencies {
  readonly generate: (intent: GenerationIntent) => Promise<GenerationOutcome>
  readonly checkFit: (outcome: SuccessfulOutcome, phraseNumber: number) => Promise<boolean>
  readonly now: () => AudioTime
  readonly providers: GenerationIntentProviders
  readonly viewport: Pick<ViewportWidthProvider, 'isBelowTabletLandscape'>
  readonly onOutput: (output: SessionOutput) => void
  readonly onError: (error: unknown) => void
}

/** The events the transport sends a running session; results are the runner's own to feed. */
// @spec-link [[service_session_runner]]
export type SessionTransportEvent = Extract<
  SessionEvent,
  { kind: 'count-in-over' | 'phrase-started-sounding' | 'tick' | 'end' }
>

/** A running session, driven by its transport's events. */
// @spec-link [[service_session_runner]]
export interface SessionRunner {
  dispatch(event: SessionTransportEvent): void
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
 * nothing is fed back. A transport event the engine refuses throws from `dispatch`.
 */
// @spec-link [[service_session_runner]]
// @spec-link [[rule_session_generation_failure_ladder]]
// @spec-link [[rule_look_ahead_deadline]]
export function createSessionRunner(
  deps: SessionRunnerDependencies,
  start: SessionStart,
): SessionRunner {
  const engine = createSessionEngine({ providers: deps.providers, viewport: deps.viewport }, start)

  /** Intent: forward each output in order, executing the requests and fit checks among them. */
  function run(outputs: readonly SessionOutput[]): void {
    for (const output of outputs) {
      deps.onOutput(output)
      if (output.kind === 'request-generation') requestGeneration(output.attemptId, output.intent)
      else if (output.kind === 'check-fit')
        requestFitCheck(output.attemptId, output.outcome, output.phraseNumber)
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

  /** Intent: generate one attempt and feed back its outcome, or its worker failure. */
  function requestGeneration(attemptId: number, intent: GenerationIntent): void {
    void deps.generate(intent).then(
      (outcome) => feedBack({ kind: 'generation-result', at: deps.now(), attemptId, outcome }),
      (error: unknown) => {
        if (isWorkerFailure(error))
          feedBack({ kind: 'generation-crashed', at: deps.now(), attemptId })
        else deps.onError(error)
      },
    )
  }

  /** Intent: fit-check one attempt's outcome and feed back whether it fits. */
  function requestFitCheck(
    attemptId: number,
    outcome: SuccessfulOutcome,
    phraseNumber: number,
  ): void {
    void deps.checkFit(outcome, phraseNumber).then(
      (fits) => feedBack({ kind: 'fit-result', at: deps.now(), attemptId, fits }),
      (error: unknown) => deps.onError(error),
    )
  }

  run(engine.outputsAtStart)
  return Object.freeze({
    dispatch(event: SessionTransportEvent): void {
      run(engine.handle(event))
    },
  })
}
