/**
 * The wake-up worker entry point: wires the pure wake-timer handler to the worker's own interval
 * timer and `postMessage`, and hands it every incoming message.
 */

import { createWakeTimerWorkerHandler } from './wake-timer-protocol'

const handleWakeTimerMessage = createWakeTimerWorkerHandler({
  setInterval: (callback, intervalMs) => self.setInterval(callback, intervalMs),
  clearInterval: (handle) => self.clearInterval(handle),
  post: (event) => self.postMessage(event),
})

/** Intent: run each start or stop command from the main thread through the wake-timer handler. */
// @spec-link [[rule_playhead_follows_audio_clock]]
self.addEventListener('message', (event: MessageEvent<unknown>) => {
  handleWakeTimerMessage(event.data)
})
