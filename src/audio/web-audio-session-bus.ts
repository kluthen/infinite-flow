/**
 * One session's sound on Web Audio: three fade gains, one per click route and one for the backing,
 * that every sound of the session goes through, and the synthesized click and backing voices
 * themselves. Fading the three gains out on stop silences everything the session scheduled, sound
 * planned past the fade included, while the next session opens its own fresh set. The node
 * interfaces are the minimal structural slice of Web Audio this directory uses, so a real audio
 * context fits them without a cast and a test can pass a fake.
 */

import type {
  AudioTime,
  ClickRoute,
  ScheduledBackingNote,
  ScheduledClick,
  SessionBus,
} from './audio-ports'

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

/** The paths a session's sound takes into the mix: the two click routes and the backing. */
// @spec-link [[rule_count_in_always_clicks]]
// @spec-link [[req_session_audio_mix]]
export type SessionBusRoute = ClickRoute | 'backing'

/** Where each route's fade gain feeds into the mix. */
// @spec-link [[rule_count_in_always_clicks]]
// @spec-link [[req_session_audio_mix]]
export type SessionBusTargets = Readonly<Record<SessionBusRoute, WebAudioNodePort>>

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

/**
 * The backing voices: synthesized with oscillators and gains only, no samples and no download, in
 * a placeholder timbre. The bass is a triangle wave, each chord note a quieter sine. A note rises
 * from silence to its peak in 5 ms, holds, then falls to near silence over the 40 ms before its
 * end, so a note re-attacked on the same pitch is heard again and no note ends in a click; the
 * oscillator stops at the note's end. A note shorter than attack plus release is refused.
 */
// @spec-link [[req_session_backing_track]]
const BACKING_VOICE = {
  bass: { waveform: 'triangle', peak: 0.35 },
  chord: { waveform: 'sine', peak: 0.12 },
  attackSeconds: 0.005,
  releaseSeconds: 0.04,
  releaseEndGain: 0.0001,
  lowestPitch: 0,
  highestPitch: 127,
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

/** Intent: the equal-tempered frequency of a MIDI pitch, A4 (69) at 440 Hz. */
function midiFrequency(pitch: number): number {
  return 440 * 2 ** ((pitch - 69) / 12)
}

/**
 * Intent: throw unless `note` can sound: finite times, an end after its start leaving room for
 * the attack and release, and a whole MIDI pitch from 0 to 127.
 */
function assertPlayableNote(note: ScheduledBackingNote): void {
  assertFinite(note.at, 'A backing note start')
  assertFinite(note.until, 'A backing note end')
  if (!(note.until > note.at)) {
    throw new Error(`A backing note must end after it starts, got ${note.at} to ${note.until}`)
  }
  const shortest = BACKING_VOICE.attackSeconds + BACKING_VOICE.releaseSeconds
  if (note.until - note.at < shortest) {
    throw new Error(`A backing note is too short: ${note.until - note.at} s, under ${shortest} s`)
  }
  const { pitch } = note
  if (
    !Number.isInteger(pitch) ||
    pitch < BACKING_VOICE.lowestPitch ||
    pitch > BACKING_VOICE.highestPitch
  ) {
    throw new Error(`A backing note pitch must be a whole MIDI number 0-127, got ${pitch}`)
  }
}

/**
 * Intent: sound one backing note from `note.at` until `note.until` into `destination`: an
 * oscillator at the note's pitch in its voice's waveform, shaped by its own envelope gain (attack,
 * hold, release ending at `until`), both unhooked once the oscillator has ended.
 */
// @spec-link [[req_session_backing_track]]
function soundBackingNote(
  factory: WebAudioNodeFactory,
  note: ScheduledBackingNote,
  destination: WebAudioNodePort,
): void {
  assertPlayableNote(note)
  const voice = BACKING_VOICE[note.voice]
  const oscillator = factory.createOscillator()
  const envelope = factory.createGain()
  oscillator.type = voice.waveform
  oscillator.frequency.setValueAtTime(midiFrequency(note.pitch), note.at)
  envelope.gain.setValueAtTime(0, note.at)
  envelope.gain.linearRampToValueAtTime(voice.peak, note.at + BACKING_VOICE.attackSeconds)
  envelope.gain.setValueAtTime(voice.peak, note.until - BACKING_VOICE.releaseSeconds)
  envelope.gain.exponentialRampToValueAtTime(BACKING_VOICE.releaseEndGain, note.until)
  oscillator.connect(envelope)
  envelope.connect(destination)
  oscillator.addEventListener('ended', () => {
    oscillator.disconnect()
    envelope.disconnect()
  })
  oscillator.start(note.at)
  oscillator.stop(note.until)
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
 * Intent: open one session's bus: a fresh fade gain per route, feeding that route's target, so a
 * count-in click reaches the click volume around the click on/off gate, a click-track click goes
 * through the gate, and the backing goes through the backing on/off gate. Fading the bus out fades
 * all three routes and leaves every other bus alone.
 */
// @spec-link [[rule_count_in_always_clicks]]
// @spec-link [[rule_stop_ends_session]]
// @spec-link [[req_session_audio_mix]]
export function createWebAudioSessionBus(
  factory: WebAudioNodeFactory,
  targets: SessionBusTargets,
): SessionBus {
  const fades: Readonly<Record<SessionBusRoute, WebAudioGainNodePort>> = {
    'count-in': openFadeGain(factory, targets['count-in']),
    click: openFadeGain(factory, targets.click),
    backing: openFadeGain(factory, targets.backing),
  }
  return {
    scheduleClick: (click) => soundClick(factory, click, fades[click.route]),
    scheduleBackingNote: (note) => soundBackingNote(factory, note, fades.backing),
    fadeOut: (at, durationSeconds) => {
      assertFinite(at, 'A fade-out time')
      assertFinite(durationSeconds, 'A fade-out duration')
      if (durationSeconds < 0) {
        throw new Error(`A fade-out duration can't be negative, got ${durationSeconds}`)
      }
      fadeToSilence(fades['count-in'], at, durationSeconds)
      fadeToSilence(fades.click, at, durationSeconds)
      fadeToSilence(fades.backing, at, durationSeconds)
    },
  }
}
