/**
 * The generation worker entry point and composition root. Keeps its long-lived rhythm-domain memo
 * alive in module scope for the worker's whole lifetime, wires the cooperative runtime to the real
 * clock and to a private MessageChannel that yields between prewarm slices, and registers exactly
 * one `message` listener that posts back a response whenever the runtime returns one.
 */

import { createGenerationWorkerRuntime } from './generation-worker-runtime'

/**
 * Intent: a slice scheduler that yields to the Worker's message queue through a private
 * MessageChannel, so a generate request queued meanwhile runs before the next slice.
 *
 * Chosen by measurement (2026-09-30, worst setting Sixteenth|Heavily varied|Sparse|Active
 * displacement|Build, a small-setting generate posted 40 ms into its prewarm, 6 runs each): the
 * generate waited at most 3 ms (Chromium), 4 ms (Firefox) and 9 ms (WebKit) before the Worker
 * picked it up, about one 8 ms slice, and the whole prewarm took 0-14 ms longer than its own
 * work. `setTimeout(0)` preempted as well but, clamped to 4 ms once nested, stretched the
 * prewarm by 180-270 ms; mixing in a `setTimeout(0)` every 4th slice gained nothing. (Node's
 * worker_threads differ: there this channel starves incoming messages, so it is not a model of
 * the browser.)
 */
// @spec-link [[module_generation_worker_protocol]]
function createMessageChannelScheduler(): (run: () => void) => void {
  const channel = new MessageChannel()
  let pending: (() => void) | undefined
  channel.port1.onmessage = () => {
    const run = pending
    if (run === undefined) throw new Error('Generation worker slice channel fired with no slice.')
    pending = undefined
    run()
  }
  return (run) => {
    if (pending !== undefined) throw new Error('Generation worker slice already scheduled.')
    pending = run
    channel.port2.postMessage(null)
  }
}

const runtime = createGenerationWorkerRuntime({
  now: () => performance.now(),
  scheduleSlice: createMessageChannelScheduler(),
})

/** Intent: hand every incoming message to the runtime and post back the response it returns. */
// @spec-link [[module_generation_worker_protocol]]
self.addEventListener('message', (event: MessageEvent<unknown>) => {
  const response = runtime.handleMessage(event.data)
  if (response !== undefined) self.postMessage(response)
})
