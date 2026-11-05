/**
 * One session's sound on Web Audio: five fade gains, one per click route, one for the backing and
 * one per guide, that every sound of the session goes through, and the synthesized click and the
 * notes of every sound role themselves, each note an oscillator shaped by its role's voice entry.
 * Fading the five gains out on stop silences everything the session scheduled, sound planned past
 * the fade and guide notes still ringing included, while the next session opens its own fresh
 * set. It is the only part of the guide playback that knows Web Audio. The node
 * interfaces are the minimal structural slice of Web Audio this directory uses, so a real audio
 * context fits them without a cast and a test can pass a fake.
 */

import {
  SOUND_ROLE_VOICES,
  type AudioTime,
  type ClickRoute,
  type GuideRole,
  type ScheduledBackingNote,
  type ScheduledClick,
  type ScheduledGuideNote,
  type SessionBus,
  type SoundRoleVoice,
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

/**
 * The paths a session's sound takes into the mix: the two click routes, the backing, and one per
 * guide.
 */
// @spec-link [[rule_count_in_always_clicks]]
// @spec-link [[req_session_audio_mix]]
// @spec-link [[req_guide_playback]]
export type SessionBusRoute = ClickRoute | 'backing' | GuideRole

/** Every route, in the order a bus opens and fades them. */
const SESSION_BUS_ROUTES: readonly SessionBusRoute[] = [
  'count-in',
  'click',
  'backing',
  'melody-guide',
  'rhythm-guide',
]

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

/** The MIDI pitch range a note can sound in. */
const LOWEST_PITCH = 0
const HIGHEST_PITCH = 127

/**
 * How fast a guide's still-ringing note fades out when that guide starts a note on its pitch: a
 * quick linear fade to silence from the new start, inside the 10 to 20 ms the guide allows, so the
 * new note is heard as a new note and the two never sound on one pitch together.
 */
// @spec-link [[rule_guide_same_pitch_reattack]]
const REATTACK_FADE_SECONDS = 0.015

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

/** One note to sound in a role's voice: its concert MIDI pitch, its start and its written end. */
interface SoundedNote {
  readonly pitch: number
  readonly at: AudioTime
  readonly until: AudioTime
}

/**
 * Intent: throw unless `note`, a note of `what`, can sound in `voice`: finite times, an end after
 * its start, a whole MIDI pitch from 0 to 127, and, for a voice whose release ends at the note's
 * end, room for the attack and the release inside the note. A voice whose release starts at the
 * note's end has no shortest note.
 */
function assertPlayableNote(note: SoundedNote, voice: SoundRoleVoice, what: string): void {
  assertFinite(note.at, `A ${what} note start`)
  assertFinite(note.until, `A ${what} note end`)
  if (!(note.until > note.at)) {
    throw new Error(`A ${what} note must end after it starts, got ${note.at} to ${note.until}`)
  }
  if (voice.release === 'ends-at-note-end') {
    const shortest = voice.attackSeconds + voice.releaseSeconds
    if (note.until - note.at < shortest) {
      throw new Error(`A ${what} note is too short: ${note.until - note.at} s, under ${shortest} s`)
    }
  }
  const { pitch } = note
  if (!Number.isInteger(pitch) || pitch < LOWEST_PITCH || pitch > HIGHEST_PITCH) {
    throw new Error(`A ${what} note pitch must be a whole MIDI number 0-127, got ${pitch}`)
  }
}

/**
 * A note the bus has sounded, as far as a later note needs it: its envelope gain, its oscillator,
 * its voice, its times, and when its oscillator stops (its release's end).
 */
interface SoundingNote {
  readonly envelope: WebAudioGainNodePort
  readonly oscillator: WebAudioOscillatorNodePort
  readonly voice: SoundRoleVoice
  readonly attackSeconds: number
  readonly at: AudioTime
  readonly until: AudioTime
  readonly stopsAt: AudioTime
}

/**
 * Intent: sound one note of a role from `note.at` into `destination`: an oscillator at the note's
 * pitch in its voice's waveform, shaped by its own envelope gain, both unhooked once the
 * oscillator has ended. The envelope rises linearly from silence to the voice's peak over its
 * attack, holds, then falls exponentially over its release: a release that ends at the note's end
 * starts its last `releaseSeconds` before it, and the oscillator stops at the end; a release that
 * starts at the note's end rings on after it, the attack at most half the note, and the
 * oscillator stops once the release is over.
 */
// @spec-link [[req_session_backing_track]]
// @spec-link [[rule_guide_note_rings_out]]
// @spec-link [[rule_guide_sound_from_oscillators]]
// @spec-link [[module_guide_playback_layers]]
function soundNote(
  factory: WebAudioNodeFactory,
  voice: SoundRoleVoice,
  note: SoundedNote,
  destination: WebAudioNodePort,
): SoundingNote {
  const ringsOn = voice.release === 'starts-at-note-end'
  const attackSeconds = ringsOn
    ? Math.min(voice.attackSeconds, (note.until - note.at) / 2)
    : voice.attackSeconds
  const releaseStartsAt = ringsOn ? note.until : note.until - voice.releaseSeconds
  const stopsAt = ringsOn ? note.until + voice.releaseSeconds : note.until
  const oscillator = factory.createOscillator()
  const envelope = factory.createGain()
  oscillator.type = voice.waveform
  oscillator.frequency.setValueAtTime(midiFrequency(note.pitch), note.at)
  envelope.gain.setValueAtTime(0, note.at)
  envelope.gain.linearRampToValueAtTime(voice.peak, note.at + attackSeconds)
  envelope.gain.setValueAtTime(voice.peak, releaseStartsAt)
  envelope.gain.exponentialRampToValueAtTime(voice.releaseEndGain, stopsAt)
  oscillator.connect(envelope)
  envelope.connect(destination)
  oscillator.addEventListener('ended', () => {
    oscillator.disconnect()
    envelope.disconnect()
  })
  oscillator.start(note.at)
  oscillator.stop(stopsAt)
  return { envelope, oscillator, voice, attackSeconds, at: note.at, until: note.until, stopsAt }
}

/**
 * Intent: cut a sounding note's envelope at `at`, keeping its curve exactly up to there. The cut
 * (`cancelScheduledValues`) removes every envelope event from `at` on, a ramp ending later
 * included, so the part of the curve before `at` is laid again: the attack's linear rise, or the
 * release's exponential fall (the same curve, ending at its own level at `at`), or nothing during
 * the hold, whose level stays at the peak.
 */
function cutEnvelopeAt(note: SoundingNote, at: AudioTime): void {
  const { voice, envelope } = note
  envelope.gain.cancelScheduledValues(at)
  if (at < note.at + note.attackSeconds) {
    const level = (voice.peak * Math.max(0, at - note.at)) / note.attackSeconds
    envelope.gain.linearRampToValueAtTime(level, at)
    return
  }
  if (at <= note.until) {
    envelope.gain.setValueAtTime(voice.peak, at)
    return
  }
  const progress = (at - note.until) / (note.stopsAt - note.until)
  envelope.gain.exponentialRampToValueAtTime(
    voice.peak * (voice.releaseEndGain / voice.peak) ** progress,
    at,
  )
}

/**
 * Intent: fade a guide's still-ringing note out quickly from `at`, where that guide starts a new
 * note on its pitch: from the level its envelope holds then to silence over
 * `REATTACK_FADE_SECONDS`, its oscillator stopping there. A note whose release is over by the end
 * of that fade is left as it is.
 */
// @spec-link [[rule_guide_same_pitch_reattack]]
function fadeRingingNote(ringing: SoundingNote, at: AudioTime): void {
  const fadeEndsAt = at + REATTACK_FADE_SECONDS
  if (fadeEndsAt >= ringing.stopsAt) return
  cutEnvelopeAt(ringing, at)
  ringing.envelope.gain.linearRampToValueAtTime(0, fadeEndsAt)
  ringing.oscillator.stop(fadeEndsAt)
}

/**
 * Intent: sound one backing note in its voice into `destination`, its release ending at the
 * note's end as it always has. Throws on a note that cannot sound.
 */
// @spec-link [[req_session_backing_track]]
function soundBackingNote(
  factory: WebAudioNodeFactory,
  note: ScheduledBackingNote,
  destination: WebAudioNodePort,
): void {
  const voice = SOUND_ROLE_VOICES[note.voice]
  assertPlayableNote(note, voice, 'backing')
  soundNote(factory, voice, note, destination)
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
 * Intent: the route a click takes: a click-track click before the forced end goes the count-in's
 * way, around the click on/off gate; every other click its own route.
 */
// @spec-link [[rule_jam_click_runs_until_phrase_one]]
function routeOf(click: ScheduledClick, forcedUntil: AudioTime): ClickRoute {
  return click.route === 'click' && click.at < forcedUntil ? 'count-in' : click.route
}

/**
 * Intent: open one session's bus: a fresh fade gain per route, feeding that route's target, so a
 * count-in click reaches the click volume around the click on/off gate, a click-track click goes
 * through the gate, the backing goes through the backing on/off gate, and each guide through its
 * own on/off gate. Once the click is forced on, a click-track click before the forced end takes
 * the count-in's way around the gate, the count-in's bypass extended. The bus remembers, per guide
 * and pitch, the last note it sounded, across phrases, so a guide note starting on the pitch of
 * that guide's note still ringing fades the ringing one out quickly from the new start. Fading the
 * bus out fades all five routes, guide notes still ringing included, and leaves every other bus
 * alone.
 */
// @spec-link [[rule_count_in_always_clicks]]
// @spec-link [[rule_jam_click_runs_until_phrase_one]]
// @spec-link [[rule_stop_ends_session]]
// @spec-link [[req_session_audio_mix]]
// @spec-link [[rule_guide_same_pitch_reattack]]
// @spec-link [[module_guide_playback_layers]]
export function createWebAudioSessionBus(
  factory: WebAudioNodeFactory,
  targets: SessionBusTargets,
): SessionBus {
  const fades = Object.fromEntries(
    SESSION_BUS_ROUTES.map((route) => [route, openFadeGain(factory, targets[route])]),
  ) as Readonly<Record<SessionBusRoute, WebAudioGainNodePort>>
  /** Click-track clicks before this time go around the gate; none before a force. */
  let forcedUntil: AudioTime = Number.NEGATIVE_INFINITY
  /** Each guide's last sounded note per pitch. */
  const lastGuideNotes: Readonly<Record<GuideRole, Map<number, SoundingNote>>> = {
    'melody-guide': new Map(),
    'rhythm-guide': new Map(),
  }

  /**
   * Intent: sound one guide note on its guide's route, first fading out that guide's note still
   * ringing on its pitch, then remember it as that pitch's last note.
   */
  // @spec-link [[req_guide_playback]]
  // @spec-link [[rule_guide_same_pitch_reattack]]
  function scheduleGuideNote(note: ScheduledGuideNote): void {
    const voice = SOUND_ROLE_VOICES[note.role]
    assertPlayableNote(note, voice, note.role)
    const sounded = lastGuideNotes[note.role]
    const ringing = sounded.get(note.pitch)
    if (ringing !== undefined) fadeRingingNote(ringing, note.at)
    sounded.set(note.pitch, soundNote(factory, voice, note, fades[note.role]))
  }

  return {
    scheduleClick: (click) => soundClick(factory, click, fades[routeOf(click, forcedUntil)]),
    forceClickUntil: (until) => {
      if (Number.isNaN(until)) throw new Error('A forced click end must be a time, got NaN')
      forcedUntil = until
    },
    scheduleBackingNote: (note) => soundBackingNote(factory, note, fades.backing),
    scheduleGuideNote,
    fadeOut: (at, durationSeconds) => {
      assertFinite(at, 'A fade-out time')
      assertFinite(durationSeconds, 'A fade-out duration')
      if (durationSeconds < 0) {
        throw new Error(`A fade-out duration can't be negative, got ${durationSeconds}`)
      }
      for (const route of SESSION_BUS_ROUTES) fadeToSilence(fades[route], at, durationSeconds)
    },
  }
}
