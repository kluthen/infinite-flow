/**
 * The look-ahead scheduler's wake-up timer on the main thread, backed by the wake-up worker, whose
 * timer long main-thread tasks can't hold back. `WakeTimerWorkerPort` is a minimal structural
 * interface so tests can drive this against a hand-made fake instead of a real Worker.
 */

import { WAKE_INTERVAL_SECONDS, type DisposableWakeTimer } from './audio-ports'
import type { WakeTimerCommand, WakeTimerEvent } from './wake-timer-protocol'

/** The minimal Worker-shaped surface the wake-up timer depends on, satisfied by a real or fake worker. */
export interface WakeTimerWorkerPort {
  postMessage(message: WakeTimerCommand): void
  addEventListener(type: 'message', listener: (event: MessageEvent<WakeTimerEvent>) => void): void
  terminate(): void
}

/** Intent: create one real module Worker running ./wake-timer.worker.ts as a WakeTimerWorkerPort. */
// @spec-link [[rule_playhead_follows_audio_clock]]
export function createBrowserWakeTimerWorker(): WakeTimerWorkerPort {
  return new Worker(new URL('./wake-timer.worker.ts', import.meta.url), { type: 'module' })
}

/**
 * Intent: the wake-up timer over `port`: start posts the wake interval to the worker and calls
 * `onWake` on each wake-up while started; stop tells the worker to stop, and a wake-up that
 * arrives after it is ignored; dispose, while stopped, terminates the worker. A second start, a
 * stop with nothing started, a dispose while started, and any start or dispose once disposed throw.
 */
// @spec-link [[rule_playhead_follows_audio_clock]]
export function createWorkerWakeTimer(port: WakeTimerWorkerPort): DisposableWakeTimer {
  let onWake: (() => void) | null = null
  let disposed = false
  port.addEventListener('message', (event) => {
    if (event.data.type !== 'wake') {
      throw new Error(`The wake-up worker sent an unknown message: ${String(event.data.type)}`)
    }
    onWake?.()
  })
  return {
    start: (listener) => {
      if (disposed) throw new Error('The wake-up timer is disposed')
      if (onWake !== null) throw new Error('The wake-up timer is already started')
      onWake = listener
      port.postMessage({ type: 'start', intervalMs: WAKE_INTERVAL_SECONDS * 1000 })
    },
    stop: () => {
      if (onWake === null) throw new Error('The wake-up timer is not started')
      onWake = null
      port.postMessage({ type: 'stop' })
    },
    dispose: () => {
      if (disposed) throw new Error('The wake-up timer is already disposed')
      if (onWake !== null) throw new Error('The wake-up timer is still started')
      disposed = true
      port.terminate()
    },
  }
}
