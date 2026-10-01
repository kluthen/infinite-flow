/**
 * The audio transport: it opens the one audio output when the player's click unlocks it, plays a
 * session's count-in, click and queued phrase backing planned ahead on the audio clock, applies the
 * four mix controls as gains at any moment, and fades a session out on stop. It never suspends or
 * pauses the clock: the output offers no such operation. Time comes only from the output's clock.
 */

import {
  mixGains,
  validateBackingVolume,
  validateClickVolume,
  type AudioMix,
  type AudioMixDesign,
} from './audio-mix'
import { renderBacking } from '../domain/backing/backing-renderer'
import { FOUR_FOUR_METER } from '../domain/generation/generation-request'
import type { HarmonyEvent } from '../domain/harmony/harmony-types'
import type {
  AudioOutput,
  AudioTime,
  ClockAnchor,
  MixGain,
  ScheduledBackingNote,
  SessionBus,
  WakeTimer,
} from './audio-ports'
import { backingNotesBetween, phraseStartsAt, scheduleBacking } from './backing-track'
import { clicksBetween, countInEndsAt, createClickPlan, type ClickPlan } from './click-track'
import {
  createLookAheadScheduler,
  LOOK_AHEAD_SECONDS,
  type LookAheadScheduler,
} from './look-ahead-scheduler'

/** How far after `start` the count-in's first click falls, so it too is planned ahead. */
// @spec-link [[rule_playhead_follows_audio_clock]]
export const START_DELAY_SECONDS = 0.1

/** How long the fade-out on stop lasts, in seconds. */
// @spec-link [[rule_stop_ends_session]]
export const STOP_FADE_SECONDS = 0.1

/**
 * The transport's seams: `openOutput` creates the one audio output (the one `AudioContext`),
 * `createWakeTimer` the scheduler's timer, and `readMixDesign` reads the mix's design tokens.
 */
// @spec-link [[rule_audio_unlocked_by_player_click]]
export interface AudioTransportDependencies {
  readonly openOutput: () => AudioOutput
  readonly createWakeTimer: () => WakeTimer
  readonly readMixDesign: () => AudioMixDesign
}

/** A started session's timeline: when its count-in starts, and when phrase 1 starts sounding. */
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
  /** Start a session's count-in and click at `tempo` BPM. */
  readonly start: (options: { readonly tempo: number }) => TransportTimeline
  /**
   * Queue the backing of the running session's phrase `phraseNumber` (1, 2, 3… in order) from its
   * harmony. Throws with no session running, out of order, or too late to play all of it.
   */
  readonly queueBacking: (phraseNumber: number, harmony: readonly HarmonyEvent[]) => void
  /** When the running session's phrase `phraseNumber` (from 1) starts sounding. */
  readonly phraseStartsAt: (phraseNumber: number) => AudioTime
  /** Fade the running session out and stop planning its sound. */
  readonly stop: () => TransportStop
  readonly isRunning: () => boolean
  /** The current state of the four mix controls. */
  readonly mix: () => AudioMix
  readonly setClickOn: (on: boolean) => void
  readonly setClickVolume: (level: number) => void
  readonly setBackingOn: (on: boolean) => void
  readonly setBackingVolume: (level: number) => void
  /** Register a listener called when the browser interrupts a running session's audio. */
  readonly onInterrupted: (listener: () => void) => void
}

/** Every gain stage, in the order `unlock` applies them. */
const MIX_GAIN_ORDER: readonly MixGain[] = [
  'click-enable',
  'click-volume',
  'backing-enable',
  'backing-volume',
]

/**
 * A running session: its bus, its click plan, the backing notes queued but not yet planned (in
 * time order), the phrase the next backing must be for, and how far planning has reached.
 */
interface RunningSession {
  readonly bus: SessionBus
  readonly plan: ClickPlan
  pendingBacking: readonly ScheduledBackingNote[]
  nextPhrase: number
  plannedUntil: AudioTime
}

/**
 * Intent: plan one look-ahead window of a session on its bus: the clicks and the queued backing
 * notes with `from <= at < to`, then forget the backing notes planned and note how far planning
 * has reached.
 */
// @spec-link [[req_session_backing_track]]
// @spec-link [[rule_playhead_follows_audio_clock]]
function planWindow(session: RunningSession, from: AudioTime, to: AudioTime): void {
  clicksBetween(session.plan, from, to).forEach(session.bus.scheduleClick)
  backingNotesBetween(session.pendingBacking, from, to).forEach(session.bus.scheduleBackingNote)
  session.pendingBacking = session.pendingBacking.filter((note) => note.at >= to)
  session.plannedUntil = to
}

/**
 * Intent: build the audio transport. Nothing opens the audio output until `unlock`, which the
 * player's Start or Connect controller click calls; the mix design is read on first use, when
 * the stylesheet has loaded. Mix changes set their gain at once when unlocked (running or not),
 * and are applied all together at unlock otherwise. Clicks are scheduled whatever the click
 * switch says: the click-enable gain mutes them, and count-in clicks bypass it.
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

  /** Intent: the current mix, starting from the design's defaults. */
  function currentMix(): AudioMix {
    current ??= { ...mixDesign().defaults }
    return current
  }

  /** Intent: the unlocked output; throws before unlock. */
  function unlockedOutput(): AudioOutput {
    if (output === null) throw new Error('audio transport: the audio is not unlocked yet')
    return output
  }

  /** Intent: store a new mix and, once unlocked, set the one gain it changed, at once. */
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
   * an empty backing queue waiting for phrase 1.
   */
  function start({ tempo }: { readonly tempo: number }): TransportTimeline {
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
      plan,
      pendingBacking: [],
      nextPhrase: 1,
      plannedUntil: out.now(),
    }
    scheduler.run((from, to) => planWindow(fresh, from, to))
    session = fresh
    return { startAt: plan.startAt, countInEndsAt: countInEndsAt(plan) }
  }

  /**
   * Intent: render phrase `phraseNumber`'s backing from its harmony and queue it, so the
   * scheduler plays it on the session's beat grid. Phrases must come 1, 2, 3… in order, each
   * before planning reaches its start; otherwise this throws and the queue is left as it was.
   * A phrase never queued simply leaves silence: the transport can't tell it is missing until
   * the next call, which then throws (out of order, or too late).
   */
  // @spec-link [[req_session_backing_track]]
  function queueBacking(phraseNumber: number, harmony: readonly HarmonyEvent[]): void {
    const running = runningSession()
    if (phraseNumber !== running.nextPhrase) {
      throw new Error(
        `audio transport: backing is due for phrase ${running.nextPhrase} next, got phrase ${phraseNumber}`,
      )
    }
    const startsAt = phraseStartsAt(running.plan, phraseNumber)
    if (startsAt < running.plannedUntil) {
      throw new Error(
        `audio transport: phrase ${phraseNumber}'s backing is queued too late: it starts at ${startsAt}, planning has reached ${running.plannedUntil}`,
      )
    }
    const rendered = renderBacking(harmony, FOUR_FOUR_METER)
    const notes = scheduleBacking(running.plan, phraseNumber, rendered)
    running.pendingBacking = [...running.pendingBacking, ...notes]
    running.nextPhrase += 1
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
    queueBacking,
    phraseStartsAt: (phraseNumber) => phraseStartsAt(runningSession().plan, phraseNumber),
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
    onInterrupted: (listener) => {
      interruptListeners.push(listener)
    },
  }
}
