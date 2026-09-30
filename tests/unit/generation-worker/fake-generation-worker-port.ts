/**
 * An in-memory GenerationWorkerPort fixture for generation-worker-client tests. `postMessage`
 * structured-clones the message (as the real message-channel boundary would), runs it through an
 * injected responder asynchronously, and structured-clones any response back before dispatching
 * it to registered listeners — so a test exercises exactly the same serialization boundary a real
 * Worker imposes, without spawning one. The default responder is the real Worker runtime over the
 * port's own fresh memo (one memo per worker, as in production), whose prewarm slices are queued
 * and never run on their own: a test runs them on demand with `runNextSlice`, so a generate posted
 * after a prewarm is served before any slice unless the test runs some first.
 */

import {
  createCanonicalRhythmDomainMemo,
  type CanonicalRhythmDomainMemo,
} from '@/domain/generation/orchestration/canonical-rhythm-domain'
import type { GenerationWorkerPort } from '@/generation-worker/generation-worker-client'
import type {
  GenerationWorkerInboundMessage,
  GenerationWorkerResponse,
} from '@/generation-worker/generation-worker-protocol'
import { createGenerationWorkerRuntime } from '@/generation-worker/generation-worker-runtime'

type PortListener = (event: Event | MessageEvent) => void
type PortEventType = 'message' | 'error' | 'messageerror'

/** A scripted worker: the response to one posted message, or undefined for none (a prewarm). */
export type FakeWorkerResponder = (data: unknown) => GenerationWorkerResponse | undefined

/** Options of the default runtime-backed responder. */
export interface FakeGenerationWorkerPortOptions {
  /** The runtime clock; defaults to a frozen `() => 0`, so one slice finishes a whole job. */
  readonly now?: () => number
  /** The runtime's memo; defaults to a fresh one per port. */
  readonly memo?: CanonicalRhythmDomainMemo
}

export interface FakeGenerationWorkerPort extends GenerationWorkerPort {
  /** Directly and synchronously invoke every registered 'message' listener with `data`. */
  readonly dispatchMessageSync: (data: unknown) => void
  /** Directly and synchronously invoke every registered 'error' listener. */
  readonly emitError: () => void
  /** Directly and synchronously invoke every registered 'messageerror' listener. */
  readonly emitMessageError: () => void
  readonly terminated: () => boolean
  readonly postedMessages: () => readonly unknown[]
  /** The number of prewarm slices the default runtime has scheduled and not yet run. */
  readonly pendingSliceCount: () => number
  /** Run the oldest scheduled prewarm slice; throws when none is scheduled. */
  readonly runNextSlice: () => void
}

/** Intent: dispatch a bare `{ data }` MessageEvent-shaped payload to every listener in `listeners`. */
function dispatchMessageEvent(listeners: ReadonlySet<PortListener>, data: unknown): void {
  const event = new MessageEvent('message', { data })
  for (const listener of listeners) listener(event)
}

/**
 * Intent: build one fake port whose async responder defaults to the real Worker runtime (see the
 * file header), letting a caller override it (e.g. to script a `crash` response without touching
 * real generation). Passing `null` disables auto-responding entirely, for tests that must observe
 * a request stay pending until they manually dispatch or emit an event (e.g. asserting a pending
 * request is rejected once an "error" event fires, before any response would otherwise arrive).
 */
export function createFakeGenerationWorkerPort(
  respond?: FakeWorkerResponder | null,
  options: FakeGenerationWorkerPortOptions = {},
): FakeGenerationWorkerPort {
  const listeners: Record<PortEventType, Set<PortListener>> = {
    message: new Set(),
    error: new Set(),
    messageerror: new Set(),
  }
  const posted: unknown[] = []
  const slices: (() => void)[] = []
  let terminated = false
  const responder: FakeWorkerResponder | null =
    respond === undefined
      ? createGenerationWorkerRuntime({
          now: options.now ?? (() => 0),
          scheduleSlice: (run) => slices.push(run),
          memo: options.memo ?? createCanonicalRhythmDomainMemo(),
        }).handleMessage
      : respond

  function postMessage(message: GenerationWorkerInboundMessage): void {
    posted.push(message)
    if (responder === null) return
    const cloned = structuredClone(message)
    queueMicrotask(() => {
      const response = responder(cloned)
      if (response !== undefined) dispatchMessageEvent(listeners.message, structuredClone(response))
    })
  }

  function addEventListener(type: PortEventType, listener: PortListener): void {
    listeners[type].add(listener)
  }

  function terminate(): void {
    terminated = true
  }

  /** Intent: run the oldest scheduled slice, failing loudly when none is scheduled. */
  function runNextSlice(): void {
    const run = slices.shift()
    if (run === undefined) throw new Error('No prewarm slice is scheduled.')
    run()
  }

  return {
    postMessage,
    addEventListener,
    terminate,
    dispatchMessageSync: (data) => dispatchMessageEvent(listeners.message, data),
    emitError: () => {
      const event = new Event('error')
      for (const listener of listeners.error) listener(event)
    },
    emitMessageError: () => {
      const event = new MessageEvent('messageerror', { data: undefined })
      for (const listener of listeners.messageerror) listener(event)
    },
    terminated: () => terminated,
    postedMessages: () => posted,
    pendingSliceCount: () => slices.length,
    runNextSlice,
  }
}
