/**
 * The audio output on Web Audio: the one audio context's clock, the mix's gains, two per channel,
 * and the per-session buses. The graph is built once: each channel's on/off gain feeds its volume
 * gain, which feeds the speakers. Muting is always a gain at zero; nothing here suspends, closes or pauses the
 * context, so the audio clock never stops while the app runs.
 */

import type { AudioOutput, ClockAnchor, MixGain } from './audio-ports'
import { MIX_CHANNELS, type MixChannel } from './sound-roles'
import { createWebAudioSessionBus } from './web-audio-session-bus'
import type {
  WebAudioGainNodePort,
  WebAudioNodeFactory,
  WebAudioNodePort,
} from './web-audio-voices'

/**
 * The part of a Web Audio context the output uses: a minimal structural slice, so the browser's
 * real context fits it without a cast and a test can pass a recording fake.
 */
// @spec-link [[rule_playhead_follows_audio_clock]]
export interface WebAudioContextPort extends WebAudioNodeFactory {
  readonly currentTime: number
  readonly outputLatency: number
  readonly state: string
  readonly destination: WebAudioNodePort
  resume(): Promise<void>
  getOutputTimestamp(): { contextTime?: number; performanceTime?: number }
  addEventListener(type: 'statechange', listener: () => void): void
}

/** Intent: a new gain node at gain 1, connected on to `destination`. */
function mixGainInto(
  context: WebAudioNodeFactory,
  destination: WebAudioNodePort,
): WebAudioGainNodePort {
  const node = context.createGain()
  node.gain.value = 1
  node.connect(destination)
  return node
}

/**
 * Intent: build the mix's gains, each at 1, in `MIX_CHANNELS` order: every channel's volume into
 * the speakers, then every channel's on/off gain into its volume.
 */
// @spec-link [[req_session_audio_mix]]
// @spec-link [[module_guide_playback_layers]]
function buildMix(context: WebAudioContextPort): Readonly<Record<MixGain, WebAudioGainNodePort>> {
  const volumes = MIX_CHANNELS.map(() => mixGainInto(context, context.destination))
  const gains = MIX_CHANNELS.flatMap((channel: MixChannel, index) => [
    [`${channel}-volume`, volumes[index]!] as const,
    [`${channel}-enable`, mixGainInto(context, volumes[index]!)] as const,
  ])
  return Object.fromEntries(gains) as Readonly<Record<MixGain, WebAudioGainNodePort>>
}

/**
 * Intent: call every listener when the context leaves the running state after having run, which
 * only the browser does (a device change, an OS interruption), never the app.
 */
// @spec-link [[rule_playhead_follows_audio_clock]]
// @spec-link [[rule_session_never_pauses]]
function watchInterruptions(context: WebAudioContextPort, listeners: readonly (() => void)[]) {
  let running = context.state === 'running'
  context.addEventListener('statechange', () => {
    const wasRunning = running
    running = context.state === 'running'
    if (wasRunning && !running) listeners.forEach((listener) => listener())
  })
}

/** Intent: the context's output latency, in seconds; throws unless it is a finite number. */
// @spec-link [[rule_playhead_follows_audio_clock]]
function readOutputLatency(context: WebAudioContextPort): number {
  const latency = context.outputLatency
  if (!Number.isFinite(latency)) {
    throw new Error(`The audio context reports no finite output latency, got ${latency}`)
  }
  return latency
}

/**
 * Intent: one simultaneous reading of the audio clock and the performance.now() timeline. While
 * the context runs, its output timestamp gives `contextTime`, the frame audible at
 * `performanceTime`; adding the output latency (the same reading the playhead uses) puts it on the
 * scheduling timeline the clicks, backing and playhead use. Latency compensation later subtracts
 * that latency again, so it is never counted twice. When the context is not running (before
 * resume, suspended, interrupted, closed) or its output timestamp still reads 0, the audio clock
 * is frozen: its reading is `currentTime` at the page's performance.now(). That is the defined
 * reading of a stopped clock, not an error fallback. Throws when a running context reports an
 * output timestamp that is not a finite time.
 */
// @spec-link [[rule_playhead_follows_audio_clock]]
// @spec-link [[rule_played_onset_latency_compensation]]
function readClockAnchor(context: WebAudioContextPort, performanceNow: () => number): ClockAnchor {
  if (context.state === 'running') {
    const { contextTime, performanceTime } = context.getOutputTimestamp()
    if (
      contextTime === undefined ||
      performanceTime === undefined ||
      !Number.isFinite(contextTime) ||
      !Number.isFinite(performanceTime)
    ) {
      throw new Error(
        `The audio context reports an output timestamp that is not a finite time, got ${contextTime} at ${performanceTime}`,
      )
    }
    if (performanceTime > 0) {
      return {
        audioTime: contextTime + readOutputLatency(context),
        performanceTimeMs: performanceTime,
      }
    }
  }
  return { audioTime: context.currentTime, performanceTimeMs: performanceNow() }
}

/**
 * Intent: the audio output over `context`: its clock readings (the clock anchor reads
 * `performanceNow` for the page's performance.now() timeline), the mix's gains built once, a
 * fresh bus per session (its click routes into the click gains, its backing into the backing
 * on/off gain, each guide into its own on/off gain) and the interruption notice. Muting is a gain at zero; it never suspends,
 * closes or pauses the context.
 */
// @spec-link [[req_session_audio_mix]]
// @spec-link [[rule_playhead_follows_audio_clock]]
// @spec-link [[rule_session_never_pauses]]
export function createWebAudioOutput(
  context: WebAudioContextPort,
  performanceNow: () => number,
): AudioOutput {
  const mix = buildMix(context)
  const interruptionListeners: (() => void)[] = []
  watchInterruptions(context, interruptionListeners)
  return {
    now: () => context.currentTime,
    outputLatency: () => readOutputLatency(context),
    anchor: () => readClockAnchor(context, performanceNow),
    setGain: (gain, value, at) => {
      if (!Number.isFinite(value) || !Number.isFinite(at)) {
        throw new Error(
          `A ${gain} gain change needs a finite value and time, got ${value} at ${at}`,
        )
      }
      mix[gain].gain.cancelScheduledValues(at)
      mix[gain].gain.setValueAtTime(value, at)
    },
    openSessionBus: () =>
      createWebAudioSessionBus(context, {
        'count-in': mix['click-volume'],
        click: mix['click-enable'],
        backing: mix['backing-enable'],
        'melody-guide': mix['melody-guide-enable'],
        'rhythm-guide': mix['rhythm-guide-enable'],
      }),
    onInterrupted: (listener) => {
      interruptionListeners.push(listener)
    },
  }
}

/**
 * Intent: create the app's one audio context, at interactive latency, and its output, resuming the
 * context if the browser holds it suspended. It must be called synchronously from the player's
 * Start or "Connect controller" click handler: that click is what lets the browser start audio.
 * The resume is not awaited, and a rejection is left to surface as an unhandled rejection. The
 * clock anchor reads the page's own `performance.now()`, the timeline MIDI timestamps are on.
 */
// @spec-link [[rule_audio_unlocked_by_player_click]]
export function openWebAudioOutput(): AudioOutput {
  const context = new AudioContext({ latencyHint: 'interactive' })
  if (context.state === 'suspended') void context.resume()
  return createWebAudioOutput(context, () => performance.now())
}
