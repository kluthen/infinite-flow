/**
 * The session's injected generate seam, backed by one generation worker at a time: correlates
 * requests/responses by a monotonically increasing id, resolves with the parsed and re-frozen
 * outcome, and rejects on a worker crash or transport failure. A request given an abort signal can
 * be cancelled: the worker running it is terminated and replaced by a fresh one from the port
 * factory, which receives every other pending request again. `GenerationWorkerPort` is a minimal
 * structural interface so tests can drive this against an in-memory fake instead of a real Worker.
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

/** Creates one fresh worker port; the client calls it at creation and on each cancellation. */
export type GenerationWorkerPortFactory = () => GenerationWorkerPort

/** How the client re-warms a worker it creates to replace a cancelled one. */
export interface GenerationWorkerClientOptions {
  /** Whether the workspace's prewarm policy is enabled: a replacement worker is then prewarmed. */
  readonly prewarmEnabled: boolean
}

/** The session-facing generation seam this worker client implements. */
export interface GenerationWorkerClient {
  generate(intent: GenerationIntent, signal?: AbortSignal): Promise<GenerationOutcome>
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

/**
 * Typed rejection for a request cancelled through its abort signal: it gets no outcome, and the
 * worker that was running it has been replaced.
 */
// @spec-link [[module_generation_worker_cancellation]]
export class GenerationCancelledError extends Error {
  readonly kind = 'GenerationCancelledError' as const

  constructor() {
    super('Generation request was cancelled.')
    this.name = 'GenerationCancelledError'
  }
}

interface PendingRequest {
  readonly intent: GenerationIntent
  readonly resolve: (outcome: GenerationOutcome) => void
  readonly reject: (error: Error) => void
  /** Detaches the request's abort listener, if it has a signal; called once it settles. */
  readonly detach: () => void
}

/**
 * Intent: create the app's generation worker client over the workers `createPort` makes. It holds
 * one current worker, created now and kept across every `generate` call, since the worker's
 * rhythm-domain memo only pays off when reused; a new one is created only to cancel a request.
 */
// @spec-link [[service_workspace_session_runner_factory]]
// @spec-link [[module_generation_worker_cancellation]]
export function createGenerationWorkerClient(
  createPort: GenerationWorkerPortFactory,
  options: GenerationWorkerClientOptions,
): GenerationWorkerClient {
  const pending = new Map<number, PendingRequest>()
  let nextId = 1
  let broken: GenerationWorkerTransportError | null = null
  let port = attach(createPort())

  /** Intent: take one request out of the pending set, detaching its abort listener. */
  function take(id: number): PendingRequest | undefined {
    const request = pending.get(id)
    if (request === undefined) return undefined
    pending.delete(id)
    request.detach()
    return request
  }

  /** Intent: fail every still-pending request with `error` and mark the worker unusable from now on. */
  function breakWorker(error: GenerationWorkerTransportError): void {
    broken = error
    for (const id of [...pending.keys()]) take(id)?.reject(error)
  }

  /** Intent: route one parsed worker response to its correlated pending request. */
  function handleResponse(data: unknown): void {
    const response = parseGenerationWorkerResponse(data)
    const request = take(response.id)
    if (request === undefined) {
      throw new GenerationWorkerProtocolError(
        `Generation worker response id ${response.id} has no matching pending request.`,
      )
    }
    if (response.type === 'crash') {
      request.reject(new GenerationWorkerCrashError(response.name, response.message))
      return
    }
    request.resolve(response.outcome)
  }

  /**
   * Intent: listen to `candidate`'s events, each ignored once `candidate` is no longer the current
   * worker, so a terminated worker's late response or error never reaches a request.
   */
  function attach(candidate: GenerationWorkerPort): GenerationWorkerPort {
    candidate.addEventListener('message', (event) => {
      if (candidate === port) handleResponse((event as MessageEvent<unknown>).data)
    })
    candidate.addEventListener('error', () => {
      if (candidate !== port) return
      breakWorker(new GenerationWorkerTransportError('Generation worker raised an "error" event.'))
    })
    candidate.addEventListener('messageerror', () => {
      if (candidate !== port) return
      breakWorker(
        new GenerationWorkerTransportError('Generation worker raised a "messageerror" event.'),
      )
    })
    return candidate
  }

  /**
   * Intent: cancel the pending request `id`: reject it, replace the worker running it, post every
   * other pending request again to the fresh worker with its original id and in its original
   * order, then, with the prewarm policy enabled, a prewarm of the cancelled intent. Nothing
   * happens once the request has settled.
   */
  // @spec-link [[module_generation_worker_cancellation]]
  function cancel(id: number): void {
    const cancelled = take(id)
    if (cancelled === undefined) return
    cancelled.reject(new GenerationCancelledError())
    port.terminate()
    try {
      port = attach(createPort())
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      breakWorker(new GenerationWorkerTransportError(`Generation worker restart failed: ${reason}`))
      return
    }
    for (const [pendingId, request] of pending)
      port.postMessage({ type: 'generate', id: pendingId, intent: request.intent })
    if (options.prewarmEnabled) port.postMessage({ type: 'prewarm', intent: cancelled.intent })
  }

  /**
   * Intent: run one generation request on the worker, rejecting immediately if it is unusable or
   * its signal is already aborted; aborting `signal` while it is pending cancels it.
   */
  // @spec-link [[module_generation_worker_cancellation]]
  function generate(intent: GenerationIntent, signal?: AbortSignal): Promise<GenerationOutcome> {
    if (broken !== null) return Promise.reject(broken)
    if (signal?.aborted === true) return Promise.reject(new GenerationCancelledError())
    const id = nextId++
    return new Promise<GenerationOutcome>((resolve, reject) => {
      /** Intent: cancel this request when its signal is aborted. */
      const onAbort = (): void => cancel(id)
      signal?.addEventListener('abort', onAbort, { once: true })
      /** Intent: stop listening to the signal once the request has settled. */
      const detach = (): void => signal?.removeEventListener('abort', onAbort)
      pending.set(id, { intent, resolve, reject, detach })
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

  /** Intent: terminate the current worker and reject every still-pending request. */
  function dispose(): void {
    breakWorker(new GenerationWorkerTransportError('Generation worker client was disposed.'))
    port.terminate()
  }

  return { generate, prewarm, dispose }
}
