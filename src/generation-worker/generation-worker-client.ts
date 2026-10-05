/**
 * The session's injected generate seam, backed by one long-lived generation worker: correlates
 * requests/responses by a monotonically increasing id, resolves with the parsed and re-frozen
 * outcome, and rejects on a worker crash or transport failure. `GenerationWorkerPort` is a
 * minimal structural interface so tests can drive this against an in-memory fake instead of a
 * real Worker.
 */

import type { GenerationIntent } from '../domain/generation/generation-intent'
import type { GenerationOutcome } from '../domain/generation/orchestration/orchestration-types'
import {
  parseGenerationWorkerResponse,
  GenerationWorkerProtocolError,
  type GenerationWorkerInboundMessage,
} from './generation-worker-protocol'

/** The minimal Worker-shaped surface this client depends on, satisfied by a real or fake worker. */
export interface GenerationWorkerPort {
  postMessage(message: GenerationWorkerInboundMessage): void
  addEventListener(
    type: 'message' | 'error' | 'messageerror',
    listener: (event: Event | MessageEvent) => void,
  ): void
  terminate(): void
}

/** The session-facing generation seam this worker client implements. */
export interface GenerationWorkerClient {
  generate(intent: GenerationIntent): Promise<GenerationOutcome>
  prewarm(intent: GenerationIntent): void
  dispose(): void
}

/**
 * Typed rejection for a `crash` response: the worker's own `generatePhrase` call (or request
 * parsing on the worker side) threw, carrying that error's original name/message.
 */
// @spec-link [[service_workspace_session_runner_factory]]
export class GenerationWorkerCrashError extends Error {
  readonly kind = 'GenerationWorkerCrashError' as const

  constructor(
    readonly workerErrorName: string,
    workerErrorMessage: string,
  ) {
    super(`Generation worker crashed: ${workerErrorName}: ${workerErrorMessage}`)
    this.name = 'GenerationWorkerCrashError'
  }
}

/**
 * Typed rejection for the worker's `error`/`messageerror` transport events: once raised, the
 * worker is considered unusable for the rest of the session — every pending request is rejected
 * with this error, and every subsequent `generate` call rejects immediately with it too, without
 * posting to the port.
 */
// @spec-link [[service_workspace_session_runner_factory]]
export class GenerationWorkerTransportError extends Error {
  readonly kind = 'GenerationWorkerTransportError' as const

  constructor(message: string) {
    super(message)
    this.name = 'GenerationWorkerTransportError'
  }
}

interface PendingRequest {
  readonly resolve: (outcome: GenerationOutcome) => void
  readonly reject: (error: Error) => void
}

/**
 * Intent: create the session's one long-lived generation worker client for `port`. The caller is
 * responsible for creating exactly one `port` per session and keeping it alive across every
 * `generate` call, since the worker's rhythm-domain memo only pays off when reused.
 */
// @spec-link [[service_workspace_session_runner_factory]]
export function createGenerationWorkerClient(port: GenerationWorkerPort): GenerationWorkerClient {
  const pending = new Map<number, PendingRequest>()
  let nextId = 1
  let broken: GenerationWorkerTransportError | null = null

  /** Intent: fail every still-pending request with `error` and mark the worker unusable from now on. */
  function breakWorker(error: GenerationWorkerTransportError): void {
    broken = error
    for (const request of pending.values()) request.reject(error)
    pending.clear()
  }

  /** Intent: route one parsed worker response to its correlated pending request. */
  function handleResponse(data: unknown): void {
    const response = parseGenerationWorkerResponse(data)
    const request = pending.get(response.id)
    if (request === undefined) {
      throw new GenerationWorkerProtocolError(
        `Generation worker response id ${response.id} has no matching pending request.`,
      )
    }
    pending.delete(response.id)
    if (response.type === 'crash') {
      request.reject(new GenerationWorkerCrashError(response.name, response.message))
      return
    }
    request.resolve(response.outcome)
  }

  port.addEventListener('message', (event) => {
    handleResponse((event as MessageEvent<unknown>).data)
  })
  port.addEventListener('error', () => {
    breakWorker(new GenerationWorkerTransportError('Generation worker raised an "error" event.'))
  })
  port.addEventListener('messageerror', () => {
    breakWorker(
      new GenerationWorkerTransportError('Generation worker raised a "messageerror" event.'),
    )
  })

  /** Intent: run one generation request on the worker, rejecting immediately if it is unusable. */
  function generate(intent: GenerationIntent): Promise<GenerationOutcome> {
    if (broken !== null) return Promise.reject(broken)
    const id = nextId++
    return new Promise<GenerationOutcome>((resolve, reject) => {
      pending.set(id, { resolve, reject })
      port.postMessage({ type: 'generate', id, intent })
    })
  }

  /**
   * Intent: ask the worker to build this intent's rhythm domain in the background, fire-and-forget:
   * no id is consumed, nothing is awaited and no response ever arrives. A no-op on an unusable
   * worker, whose failure the next `generate` call reports.
   */
  // @spec-link [[module_generation_worker_protocol]]
  function prewarm(intent: GenerationIntent): void {
    if (broken !== null) return
    port.postMessage({ type: 'prewarm', intent })
  }

  /** Intent: terminate the underlying port and reject every still-pending request. */
  function dispose(): void {
    breakWorker(new GenerationWorkerTransportError('Generation worker client was disposed.'))
    port.terminate()
  }

  return { generate, prewarm, dispose }
}
