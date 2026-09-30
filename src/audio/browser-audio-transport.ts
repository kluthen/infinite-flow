/**
 * The production audio transport: the transport wired to the one Web Audio output, the Web Worker
 * wake-up timer and the stylesheet's `--mix-*` design tokens.
 */

import { readAudioMixDesign } from './audio-mix'
import { createAudioTransport, type AudioTransport } from './audio-transport'
import { openWebAudioOutput } from './web-audio-output'
import { createBrowserWakeTimerWorker, createWorkerWakeTimer } from './worker-wake-timer'

/**
 * Intent: build the app's audio transport on the real browser seams. Building it creates nothing:
 * no `AudioContext` exists until `unlock()` runs from a player click (Start or "Connect
 * controller"), the wake-up Worker starts with the first session, and the design tokens are read
 * on first use.
 */
// @spec-link [[rule_audio_unlocked_by_player_click]]
export function createBrowserAudioTransport(): AudioTransport {
  return createAudioTransport({
    openOutput: openWebAudioOutput,
    createWakeTimer: () => createWorkerWakeTimer(createBrowserWakeTimerWorker()),
    readMixDesign: () => readAudioMixDesign(getComputedStyle(document.documentElement)),
  })
}
