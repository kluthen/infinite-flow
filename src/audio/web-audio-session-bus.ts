/**
 * One session's sound on Web Audio: two fade gains, one per click route, that every click of the
 * session goes through, and the synthesized click itself. Fading the two gains out on stop silences
 * everything the session scheduled, sound planned past the fade included, while the next session
 * opens its own fresh pair. The node interfaces are the minimal structural slice of Web Audio this
 * directory uses, so a real audio context fits them without a cast and a test can pass a fake.
 */

import type { AudioTime, ClickRoute, ScheduledClick, SessionBus } from './audio-ports'

/** The part of a Web Audio `AudioParam` this directory automates. */
export interface WebAudioParamPort {
  value: number
  cancelScheduledValues(cancelTime: number): unknown
  setValueAtTime(value: number, startTime: number): unknown
  linearRampToValueAtTime(value: number, endTime: number): unknown
  exponentialRampToValueAtTime(value: number, endTime: number): unknown
}

/** The part of a Web Audio `AudioNode` this directory wires: connect it on, or unhook it. */
export interface WebAudioNodePort {
  connect(destination: WebAudioNodePort): unknown
  disconnect(): void
}

/** The part of a Web Audio `GainNode` this directory uses. */
export interface WebAudioGainNodePort extends WebAudioNodePort {
  readonly gain: WebAudioParamPort
}

/** The part of a Web Audio `OscillatorNode` this directory uses. */
export interface WebAudioOscillatorNodePort extends WebAudioNodePort {
  type: OscillatorType
  readonly frequency: WebAudioParamPort
  start(when: number): void
  stop(when: number): void
  addEventListener(type: 'ended', listener: () => void): void
}

/** The node constructors of a Web Audio context that a session bus needs. */
export interface WebAudioNodeFactory {
  createGain(): WebAudioGainNodePort
  createOscillator(): WebAudioOscillatorNodePort
}

/** Where each click route's fade gain feeds into the mix. */
// @spec-link [[rule_count_in_always_clicks]]
export type SessionBusTargets = Readonly<Record<ClickRoute, WebAudioNodePort>>

/**
 * The click voice: a synthesized click with no audio assets, a short sine blip whose timbre is a
 * placeholder. Beat 1 is higher and louder than the other beats. The envelope rises from silence
 * in 2 ms, decays to near silence by 50 ms (an exponential ramp can't reach zero), and the
 * oscillator stops at 60 ms, once the envelope is inaudible.
 */
// @spec-link [[rule_click_track]]
const CLICK_VOICE = {
  waveform: 'sine',
  accentHz: 1500,
  beatHz: 1000,
  accentPeak: 1,
  beatPeak: 0.6,
  attackSeconds: 0.002,
  decayEndSeconds: 0.05,
  decayEndGain: 0.0001,
  stopSeconds: 0.06,
} as const

/** Intent: throw unless `value`, named `what`, is a finite number. */
function assertFinite(value: number, what: string): void {
  if (!Number.isFinite(value)) throw new Error(`${what} must be a finite number, got ${value}`)
}

/** Intent: a new gain node at gain 1, connected on to `destination`. */
function openFadeGain(
  factory: WebAudioNodeFactory,
  destination: WebAudioNodePort,
): WebAudioGainNodePort {
  const fade = factory.createGain()
  fade.gain.value = 1
  fade.connect(destination)
  return fade
}

/**
 * Intent: sound one click at `click.at` into `destination`: an oscillator at the beat's pitch,
 * shaped by its own envelope gain, both unhooked once the oscillator has ended.
 */
// @spec-link [[rule_click_track]]
function soundClick(
  factory: WebAudioNodeFactory,
  click: ScheduledClick,
  destination: WebAudioNodePort,
): void {
  assertFinite(click.at, 'A click time')
  const oscillator = factory.createOscillator()
  const envelope = factory.createGain()
  oscillator.type = CLICK_VOICE.waveform
  oscillator.frequency.setValueAtTime(
    click.accent ? CLICK_VOICE.accentHz : CLICK_VOICE.beatHz,
    click.at,
  )
  envelope.gain.setValueAtTime(0, click.at)
  envelope.gain.linearRampToValueAtTime(
    click.accent ? CLICK_VOICE.accentPeak : CLICK_VOICE.beatPeak,
    click.at + CLICK_VOICE.attackSeconds,
  )
  envelope.gain.exponentialRampToValueAtTime(
    CLICK_VOICE.decayEndGain,
    click.at + CLICK_VOICE.decayEndSeconds,
  )
  oscillator.connect(envelope)
  envelope.connect(destination)
  oscillator.addEventListener('ended', () => {
    oscillator.disconnect()
    envelope.disconnect()
  })
  oscillator.start(click.at)
  oscillator.stop(click.at + CLICK_VOICE.stopSeconds)
}

/**
 * Intent: fade `fade` from full level at `at` to silence at `at + durationSeconds`, cancelling
 * whatever was planned on it from `at` on.
 */
// @spec-link [[rule_stop_ends_session]]
function fadeToSilence(fade: WebAudioGainNodePort, at: AudioTime, durationSeconds: number): void {
  fade.gain.cancelScheduledValues(at)
  fade.gain.setValueAtTime(1, at)
  fade.gain.linearRampToValueAtTime(0, at + durationSeconds)
}

/**
 * Intent: open one session's bus: a fresh fade gain per click route, feeding that route's target,
 * so a count-in click reaches the click volume around the click on/off gate and a click-track
 * click goes through the gate. Fading the bus out fades both routes and leaves every other bus
 * alone.
 */
// @spec-link [[rule_count_in_always_clicks]]
// @spec-link [[rule_stop_ends_session]]
export function createWebAudioSessionBus(
  factory: WebAudioNodeFactory,
  targets: SessionBusTargets,
): SessionBus {
  const fades: Readonly<Record<ClickRoute, WebAudioGainNodePort>> = {
    'count-in': openFadeGain(factory, targets['count-in']),
    click: openFadeGain(factory, targets.click),
  }
  return {
    scheduleClick: (click) => soundClick(factory, click, fades[click.route]),
    fadeOut: (at, durationSeconds) => {
      assertFinite(at, 'A fade-out time')
      assertFinite(durationSeconds, 'A fade-out duration')
      if (durationSeconds < 0) {
        throw new Error(`A fade-out duration can't be negative, got ${durationSeconds}`)
      }
      fadeToSilence(fades['count-in'], at, durationSeconds)
      fadeToSilence(fades.click, at, durationSeconds)
    },
  }
}
