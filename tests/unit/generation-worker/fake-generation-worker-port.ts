/**
 * An in-memory GenerationWorkerPort fixture for generation-worker-client tests. `postMessage`
 * structured-clones the request (as the real message-channel boundary would), runs it through an
 * injected responder asynchronously, and structured-clones the response back before dispatching
 * it to registered listeners — so a test exercises exactly the same serialization boundary a real
 * Worker imposes, without spawning one.
 */

import type { GenerationWorkerPort } from '@/generation-worker/generation-worker-client'
import { handleGenerationWorkerMessage } from '@/generation-worker/generation-worker-handler'
import type {
  GenerationWorkerRequest,
  GenerationWorkerResponse,
} from '@/generation-worker/generation-worker-protocol'

type PortListener = (event: Event | MessageEvent) => void
type PortEventType = 'message' | 'error' | 'messageerror'

export interface FakeGenerationWorkerPort extends GenerationWorkerPort {
  /** Directly and synchronously invoke every registered 'message' listener with `data`. */
  readonly dispatchMessageSync: (data: unknown) => void
  /** Directly and synchronously invoke every registered 'error' listener. */
  readonly emitError: () => void
  /** Directly and synchronously invoke every registered 'messageerror' listener. */
  readonly emitMessageError: () => void
  readonly terminated: () => boolean
  readonly postedMessages: () => readonly unknown[]
}

/** Intent: dispatch a bare `{ data }` MessageEvent-shaped payload to every listener in `listeners`. */
function dispatchMessageEvent(listeners: ReadonlySet<PortListener>, data: unknown): void {
  const event = new MessageEvent('message', { data })
  for (const listener of listeners) listener(event)
}

/**
 * Intent: build one fake port whose async responder defaults to the real
 * `handleGenerationWorkerMessage`, letting a caller override it (e.g. to script a `crash`
 * response without touching real generation). Passing `null` disables auto-responding entirely,
 * for tests that must observe a request stay pending until they manually dispatch or emit an
 * event (e.g. asserting a pending request is rejected once an "error" event fires, before any
 * response would otherwise arrive).
 */
export function createFakeGenerationWorkerPort(
  respond: ((data: unknown) => GenerationWorkerResponse) | null = handleGenerationWorkerMessage,
): FakeGenerationWorkerPort {
  const listeners: Record<PortEventType, Set<PortListener>> = {
    message: new Set(),
    error: new Set(),
    messageerror: new Set(),
  }
  const posted: unknown[] = []
  let terminated = false

  function postMessage(message: GenerationWorkerRequest): void {
    posted.push(message)
    if (respond === null) return
    const cloned = structuredClone(message)
    queueMicrotask(() => {
      const response = respond(cloned)
      dispatchMessageEvent(listeners.message, structuredClone(response))
    })
  }

  function addEventListener(type: PortEventType, listener: PortListener): void {
    listeners[type].add(listener)
  }

  function terminate(): void {
    terminated = true
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
  }
}
