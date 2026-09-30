/**
 * The wake-up timer's worker protocol and the worker's logic. The look-ahead scheduler is woken
 * from a Web Worker because a main-thread timer is throttled and delayed by long tasks; a Worker
 * timer is enough, since chunk 1 measured a worst main-thread block of 90 ms against the 200 ms
 * look-ahead window. The worker's logic is a pure handler over injected timer functions, so it is
 * tested without a Worker.
 */

/** A command from the main thread to the wake-up worker. */
// @spec-link [[rule_playhead_follows_audio_clock]]
export type WakeTimerCommand =
  { readonly type: 'start'; readonly intervalMs: number } | { readonly type: 'stop' }

/** The wake-up worker's one message to the main thread: time to plan more sound. */
// @spec-link [[rule_playhead_follows_audio_clock]]
export interface WakeTimerEvent {
  readonly type: 'wake'
}

/** What the wake-up worker's handler needs from its scope: an interval timer and `postMessage`. */
export interface WakeTimerWorkerDeps<Handle> {
  readonly setInterval: (callback: () => void, intervalMs: number) => Handle
  readonly clearInterval: (handle: Handle) => void
  readonly post: (event: WakeTimerEvent) => void
}

/** Intent: `message` as a wake-timer command; throws on anything else or on a bad interval. */
function parseWakeTimerCommand(message: unknown): WakeTimerCommand {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    throw new Error(`The wake-up worker got a message that is not a command: ${String(message)}`)
  }
  if (message.type === 'stop') return { type: 'stop' }
  if (message.type !== 'start') {
    throw new Error(`The wake-up worker got an unknown command: ${String(message.type)}`)
  }
  const intervalMs = 'intervalMs' in message ? message.intervalMs : undefined
  if (typeof intervalMs !== 'number' || !Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error(`The wake-up worker needs a positive interval, got ${String(intervalMs)}`)
  }
  return { type: 'start', intervalMs }
}

/**
 * Intent: the wake-up worker's message handler: on start, run one interval that posts a wake-up
 * each time it fires; on stop, clear it. A second start, or a stop with nothing started, throws.
 */
// @spec-link [[rule_playhead_follows_audio_clock]]
export function createWakeTimerWorkerHandler<Handle>(
  deps: WakeTimerWorkerDeps<Handle>,
): (message: unknown) => void {
  let running: { readonly handle: Handle } | null = null
  return (message) => {
    const command = parseWakeTimerCommand(message)
    if (command.type === 'start') {
      if (running !== null) throw new Error('The wake-up worker is already started')
      running = { handle: deps.setInterval(() => deps.post({ type: 'wake' }), command.intervalMs) }
      return
    }
    if (running === null) throw new Error('The wake-up worker is not started')
    deps.clearInterval(running.handle)
    running = null
  }
}
