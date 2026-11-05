/**
 * The audio transport: it opens the one audio output when the player's click unlocks it, plays a
 * session's count-in, click, and each queued phrase's backing and guide notes planned ahead on the
 * audio clock, applies the mix controls as gains at any moment, and fades a session out on stop. It never suspends or
 * pauses the clock: the output offers no such operation. Time comes only from the output's clock.
 * The running session's plan, its phrase 1 start and its queued phrases are in
 * ./transport-session.ts.
 */

import {
  channelOn,
  mixGains,
  validateBackingVolume,
  validateChannelVolume,
  validateClickVolume,
  withChannelOn,
  withChannelVolume,
  type AudioMix,
  type AudioMixDesign,
} from './audio-mix'
import type { ConcertEventTimeline } from '../domain/events/timeline'
import type { HarmonyEvent } from '../domain/harmony/harmony-types'
import type { AudioOutput, AudioTime, ClockAnchor, MixGain, WakeTimer } from './audio-ports'
import { countInEndsAt, createClickPlan } from './click-track'
import {
  createLookAheadScheduler,
  LOOK_AHEAD_SECONDS,
  type LookAheadScheduler,
} from './look-ahead-scheduler'
import { GUIDE_ROLES, MIX_CHANNELS, type GuideRole } from './sound-roles'
import {
  handOverPhraseOne,
  planWindow,
  queuePhrase,
  sessionPhraseStartsAt,
  type PhraseOneStart,
  type RunningSession,
} from './transport-session'

export type { PhraseOneStart } from './transport-session'

/** How far after `start` the count-in's first click falls, so it too is planned ahead. */
// @spec-link [[rule_playhead_follows_audio_clock]]
export const START_DELAY_SECONDS = 0.1

/** How long the fade-out on stop lasts, in seconds. */
// @spec-link [[rule_stop_ends_session]]
export const STOP_FADE_SECONDS = 0.1

/**
 * The transport's seams: `openOutput` creates the one audio output (the one `AudioContext`),
 * `createWakeTimer` the scheduler's timer, `readMixDesign` reads the mix's design tokens, and
 * `loadedMix` gives the saved mix the app loaded before its first draw, which the mix starts from
 * in place of the design's defaults (absent: the design's defaults).
 */
// @spec-link [[rule_audio_unlocked_by_player_click]]
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
export interface AudioTransportDependencies {
  readonly openOutput: () => AudioOutput
  readonly createWakeTimer: () => WakeTimer
  readonly readMixDesign: () => AudioMixDesign
  readonly loadedMix?: () => AudioMix
}

/**
 * How a session's sound starts: at `tempo` BPM, and, for a session started without phrase 1,
 * with the click forced on, the count-in's bypass of the click switch extended, until phrase 1
 * sounds, and phrase 1's start `'handed-over'` (absent: `'count-in-end'`).
 */
// @spec-link [[rule_jam_click_runs_until_phrase_one]]
// @spec-link [[module_session_start_without_phrase_one]]
export interface TransportStartOptions {
  readonly tempo: number
  readonly clickForced?: boolean
  readonly phraseOneStart?: PhraseOneStart
}

/**
 * A started session's timeline: when its count-in starts, and when it ends, which is when phrase 1
 * starts sounding in a session started with phrase 1.
 */
// @spec-link [[rule_playhead_follows_audio_clock]]
export interface TransportTimeline {
  readonly startAt: AudioTime
  readonly countInEndsAt: AudioTime
}

/** A stopped session: the moment its fade-out reaches silence. */
// @spec-link [[rule_stop_ends_session]]
export interface TransportStop {
  readonly fadeEndsAt: AudioTime
}

/** The audio transport the session and the mix controls drive. */
// @spec-link [[rule_audio_unlocked_by_player_click]]
// @spec-link [[req_session_audio_mix]]
export interface AudioTransport {
  /** Open the audio output; call it synchronously inside the player's click handler. */
  readonly unlock: () => void
  readonly isUnlocked: () => boolean
  /** The audio clock's time. Throws before unlock. */
  readonly now: () => AudioTime
  /** The output's latency, in seconds. Throws before unlock. */
  readonly outputLatency: () => number
  /** One simultaneous reading of the audio clock and performance.now(). Throws before unlock. */
  readonly clockAnchor: () => ClockAnchor
  /**
   * Start a session's count-in and click at `tempo` BPM; with `clickForced`, the click is forced
   * on, whatever the click switch says, from the count-in until the end `forceClickUntil` sets.
   */
  readonly start: (options: TransportStartOptions) => TransportTimeline
  /**
   * Set when the running session's forced click ends: from `until` on, the click switch governs.
   * Throws with no session running.
   */
  readonly forceClickUntil: (until: AudioTime) => void
  /**
   * In a session started with phrase 1's start `'handed-over'`, set phrase 1's first beat at
   * `soundsAt`: phrase starts and the backing count from it from then on. Throws with no session
   * running, in a session started with phrase 1 at the count-in's end, on a second hand-over, and
   * on a `soundsAt` that is not exactly a barline of the click plan at or after the count-in's end.
   */
  readonly startPhraseOneAt: (soundsAt: AudioTime) => void
  /**
   * Queue the backing and the guide notes of the running session's phrase `phraseNumber` (1, 2,
   * 3… in order) from its harmony and its concert timeline, at `tempo` BPM, the phrase's tempo: the
   * click runs at it from the phrase's first beat. Throws with no session running, before phrase
   * 1's start is handed over in a session started without phrase 1, out of order, too late to play
   * all of it, on phrase 1 at a tempo other than the starting tempo, on a later tempo that is not a
   * whole 60..240 BPM, and on a timeline the guide cannot render.
   */
  readonly queueBacking: (
    phraseNumber: number,
    harmony: readonly HarmonyEvent[],
    timeline: ConcertEventTimeline,
    tempo: number,
  ) => void
  /**
   * When the running session's phrase `phraseNumber` (from 1) starts sounding, for any phrase up
   * to the one after the last queued: it depends only on phrase 1's start and the tempos of the
   * phrases before it. Throws for a later phrase, and for every phrase before phrase 1's start is
   * handed over in a session started without phrase 1.
   */
  readonly phraseStartsAt: (phraseNumber: number) => AudioTime
  /** Fade the running session out and stop planning its sound. */
  readonly stop: () => TransportStop
  readonly isRunning: () => boolean
  /** The current state of the mix controls. */
  readonly mix: () => AudioMix
  readonly setClickOn: (on: boolean) => void
  readonly setClickVolume: (level: number) => void
  readonly setBackingOn: (on: boolean) => void
  readonly setBackingVolume: (level: number) => void
  /**
   * Switch one guide on or off. Off: its on/off gain goes to 0 at once, notes still ringing
   * included, and no more of its notes are sent; on: its notes are sent from the next look-ahead
   * window on.
   */
  readonly setGuideOn: (guide: GuideRole, on: boolean) => void
  /** Set one guide's volume; throws on a level outside its range. */
  readonly setGuideVolume: (guide: GuideRole, level: number) => void
  /** Register a listener called when the browser interrupts a running session's audio. */
  readonly onInterrupted: (listener: () => void) => void
}

/** Every gain stage, in the order `unlock` applies them: channel by channel, enable first. */
const MIX_GAIN_ORDER: readonly MixGain[] = MIX_CHANNELS.flatMap(
  (channel) => [`${channel}-enable`, `${channel}-volume`] as const,
)

/** Intent: throw unless `guide` names one of the two guides. */
function assertGuide(guide: GuideRole): void {
  if (!GUIDE_ROLES.includes(guide)) throw new Error(`audio transport: ${String(guide)} is no guide`)
}

/**
 * Intent: build the audio transport. Nothing opens the audio output until `unlock`, which the
 * player's Start or Connect controller click calls; the mix design, and the loaded mix the mix
 * starts from, are read on first use, when the stylesheet has loaded. Mix changes set their gain
 * at once when unlocked (running or not), and are applied all together at unlock otherwise.
 * Clicks are scheduled whatever the click switch says: the click-enable gain mutes them, and
 * count-in clicks bypass it.
 */
// @spec-link [[rule_audio_unlocked_by_player_click]]
// @spec-link [[req_session_audio_mix]]
// @spec-link [[rule_stop_ends_session]]
// @spec-link [[rule_session_never_pauses]]
export function createAudioTransport(deps: AudioTransportDependencies): AudioTransport {
  let output: AudioOutput | null = null
  let design: AudioMixDesign | null = null
  let current: AudioMix | null = null
  let scheduler: LookAheadScheduler | null = null
  let session: RunningSession | null = null
  const interruptListeners: (() => void)[] = []

  /** Intent: the mix design, read once on first use. */
  function mixDesign(): AudioMixDesign {
    design ??= deps.readMixDesign()
    return design
  }

  /**
   * Intent: the mix the transport starts from, read on first use: the loaded mix, its volumes
   * checked against the design's range (a loaded volume outside it is a defect, and throws), or
   * the design's defaults when none was loaded.
   */
  // @spec-link [[req_session_audio_mix]]
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  function startingMix(): AudioMix {
    if (deps.loadedMix === undefined) return { ...mixDesign().defaults }
    const loaded = deps.loadedMix()
    const { range } = mixDesign()
    validateClickVolume(loaded.clickVolume, range)
    validateBackingVolume(loaded.backingVolume, range)
    validateChannelVolume('melody-guide', loaded.melodyGuideVolume, range)
    validateChannelVolume('rhythm-guide', loaded.rhythmGuideVolume, range)
    return { ...loaded }
  }

  /** Intent: the current mix, starting from the starting mix. */
  function currentMix(): AudioMix {
    current ??= startingMix()
    return current
  }

  /** Intent: the unlocked output; throws before unlock. */
  function unlockedOutput(): AudioOutput {
    if (output === null) throw new Error('audio transport: the audio is not unlocked yet')
    return output
  }

  /** Intent: store a new mix and, once unlocked, set the one gain it changed, at once. */
  // @spec-link [[rule_guide_switch_takes_effect]]
  function updateMix(next: AudioMix, gain: MixGain): void {
    current = next
    if (output !== null) output.setGain(gain, mixGains(next)[gain], output.now())
  }

  /** Intent: end the running session after the browser interrupted the audio, then say so. */
  function handleInterruption(): void {
    if (session === null) return
    session = null
    scheduler?.halt()
    interruptListeners.forEach((listener) => listener())
  }

  /** Intent: open the output once, apply the whole mix to it, and watch for interruptions. */
  function unlock(): void {
    if (output !== null) return
    const mix = currentMix()
    const opened = deps.openOutput()
    output = opened
    const at = opened.now()
    const gains = mixGains(mix)
    for (const gain of MIX_GAIN_ORDER) opened.setGain(gain, gains[gain], at)
    opened.onInterrupted(handleInterruption)
  }

  /** Intent: the running session; throws when none is running. */
  function runningSession(): RunningSession {
    if (session === null) throw new Error('audio transport: no session is running')
    return session
  }

  /**
   * Intent: plan a fresh session's count-in and click on a fresh bus, starting just ahead, with
   * an empty backing queue waiting for phrase 1, phrase 1 on the count-in's end or, with its start
   * `'handed-over'`, nowhere yet; with `clickForced`, the bus's click is forced on with no end yet
   * before anything is planned.
   */
  // @spec-link [[rule_jam_click_runs_until_phrase_one]]
  // @spec-link [[module_session_start_without_phrase_one]]
  function start({
    tempo,
    clickForced = false,
    phraseOneStart = 'count-in-end',
  }: TransportStartOptions): TransportTimeline {
    const out = unlockedOutput()
    if (session !== null) throw new Error('audio transport: a session is already running')
    const plan = createClickPlan(out.now() + START_DELAY_SECONDS, tempo)
    scheduler ??= createLookAheadScheduler({
      clock: out,
      timer: deps.createWakeTimer(),
      lookAheadSeconds: LOOK_AHEAD_SECONDS,
    })
    const fresh: RunningSession = {
      bus: out.openSessionBus(),
      phraseOneStart,
      plan,
      phraseOneBeat: phraseOneStart === 'count-in-end' ? plan.countInBeats : null,
      pendingBacking: [],
      pendingGuide: [],
      nextPhrase: 1,
      plannedUntil: out.now(),
    }
    if (clickForced) fresh.bus.forceClickUntil(Number.POSITIVE_INFINITY)
    scheduler.run((from, to) => planWindow(fresh, from, to, guideOn))
    session = fresh
    return { startAt: plan.startAt, countInEndsAt: countInEndsAt(plan) }
  }

  /** Intent: whether `guide` is switched on in the current mix, read as each window is planned. */
  // @spec-link [[rule_guide_switch_takes_effect]]
  function guideOn(guide: GuideRole): boolean {
    return channelOn(currentMix(), guide)
  }

  /** Intent: fade the running session's bus out from now and stop planning its sound. */
  function stop(): TransportStop {
    const out = unlockedOutput()
    if (session === null || scheduler === null) {
      throw new Error('audio transport: no session is running')
    }
    const at = out.now()
    session.bus.fadeOut(at, STOP_FADE_SECONDS)
    session = null
    scheduler.halt()
    return { fadeEndsAt: at + STOP_FADE_SECONDS }
  }

  return {
    unlock,
    isUnlocked: () => output !== null,
    now: () => unlockedOutput().now(),
    outputLatency: () => unlockedOutput().outputLatency(),
    clockAnchor: () => unlockedOutput().anchor(),
    start,
    queueBacking: (phraseNumber, harmony, timeline, tempo) =>
      queuePhrase(runningSession(), phraseNumber, harmony, timeline, tempo),
    phraseStartsAt: (phraseNumber) => sessionPhraseStartsAt(runningSession(), phraseNumber),
    forceClickUntil: (until) => runningSession().bus.forceClickUntil(until),
    startPhraseOneAt: (soundsAt) => handOverPhraseOne(runningSession(), soundsAt),
    stop,
    isRunning: () => session !== null,
    mix: () => ({ ...currentMix() }),
    setClickOn: (on) => updateMix({ ...currentMix(), clickOn: on }, 'click-enable'),
    setClickVolume: (level) => {
      validateClickVolume(level, mixDesign().range)
      updateMix({ ...currentMix(), clickVolume: level }, 'click-volume')
    },
    setBackingOn: (on) => updateMix({ ...currentMix(), backingOn: on }, 'backing-enable'),
    setBackingVolume: (level) => {
      validateBackingVolume(level, mixDesign().range)
      updateMix({ ...currentMix(), backingVolume: level }, 'backing-volume')
    },
    setGuideOn: (guide, on) => {
      assertGuide(guide)
      updateMix(withChannelOn(currentMix(), guide, on), `${guide}-enable`)
    },
    setGuideVolume: (guide, level) => {
      assertGuide(guide)
      validateChannelVolume(guide, level, mixDesign().range)
      updateMix(withChannelVolume(currentMix(), guide, level), `${guide}-volume`)
    },
    onInterrupted: (listener) => {
      interruptListeners.push(listener)
    },
  }
}
