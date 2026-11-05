/**
 * One session's sound on Web Audio: five fade gains, one per click route, one for the backing and
 * one per guide, that every sound of the session goes through, each sound made in
 * ./web-audio-voices.ts (the synthesized click, and each note an oscillator shaped by its role's
 * voice entry). Fading the five gains out on stop silences everything the session scheduled, sound
 * planned past the fade and guide notes still ringing included, while the next session opens its
 * own fresh set. With ./web-audio-voices.ts, it is the only part of the guide playback that knows
 * Web Audio.
 */
import type { AudioTime, ClickRoute, ScheduledClick, SessionBus } from './audio-ports'
import { SOUND_ROLE_VOICES, type GuideRole, type ScheduledGuideNote } from './sound-roles'
import {
  assertFinite,
  assertPlayableNote,
  fadeRingingNote,
  soundBackingNote,
  soundClick,
  soundNote,
  type SoundingNote,
  type WebAudioGainNodePort,
  type WebAudioNodeFactory,
  type WebAudioNodePort,
} from './web-audio-voices'

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
