/**
 * The production audio transport: the transport wired to the one Web Audio output, the Web Worker
 * wake-up timer and the stylesheet's `--mix-*` design tokens.
 */

import { readAudioMixDesign, type AudioMix } from './audio-mix'
import { createAudioTransport, type AudioTransport } from './audio-transport'
import { openWebAudioOutput } from './web-audio-output'
import { createBrowserWakeTimerWorker, createWorkerWakeTimer } from './worker-wake-timer'

/** What the app's audio transport starts from: the saved mix loaded before the first draw. */
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
export interface BrowserAudioTransportOptions {
  readonly loadedMix: () => AudioMix
}

/**
 * Intent: build the app's audio transport on the real browser seams, its mix starting from the
 * loaded one. Building it creates nothing: no `AudioContext` exists until `unlock()` runs from a
 * player click (Start or "Connect controller"), the wake-up Worker starts with the first session,
 * and the design tokens and the loaded mix are read on first use.
 */
// @spec-link [[rule_audio_unlocked_by_player_click]]
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
export function createBrowserAudioTransport(options: BrowserAudioTransportOptions): AudioTransport {
  return createAudioTransport({
    openOutput: openWebAudioOutput,
    createWakeTimer: () => createWorkerWakeTimer(createBrowserWakeTimerWorker()),
    readMixDesign: () => readAudioMixDesign(getComputedStyle(document.documentElement)),
    loadedMix: options.loadedMix,
  })
}
