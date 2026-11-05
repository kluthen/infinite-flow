/**
 * The audio transport: it opens the one audio output when the player's click unlocks it, plays a
 * session's count-in, click, and each queued phrase's backing and guide notes planned ahead on the
 * audio clock, applies the mix controls as gains at any moment, and fades a session out on stop. It never suspends or
 * pauses the clock: the output offers no such operation. Time comes only from the output's clock.
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
import { renderBacking } from '../domain/backing/backing-renderer'
import { renderGuide } from '../domain/backing/guide-renderer'
import type { ConcertEventTimeline } from '../domain/events/timeline'
import { FOUR_FOUR_METER } from '../domain/generation/generation-request-envelope'
import type { HarmonyEvent } from '../domain/harmony/harmony-types'
import {
  GUIDE_ROLES,
  MIX_CHANNELS,
  type AudioOutput,
  type AudioTime,
  type ClockAnchor,
  type GuideRole,
  type MixGain,
  type ScheduledBackingNote,
  type ScheduledGuideNote,
  type SessionBus,
  type WakeTimer,
} from './audio-ports'
import {
  backingNotesBetween,
  phraseFirstBeat,
  phraseStartsAt,
  scheduleBacking,
} from './backing-track'
import {
  beatAt,
  clicksBetween,
  countInEndsAt,
  createClickPlan,
  withTempoFrom,
  type ClickPlan,
} from './click-track'
import { guideNotesBetween, scheduleGuide } from './guide-track'
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
 * Where a session's phrase 1 starts: at the count-in's end (a session started with phrase 1), or
 * at the barline handed over later through `startPhraseOneAt` (a session started without it).
 */
// @spec-link [[module_session_transport_tempo_map]]
// @spec-link [[module_session_start_without_phrase_one]]
export type PhraseOneStart = 'count-in-end' | 'handed-over'

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

/**
 * A running session: its bus, where its phrase 1 starts, its click plan (replaced by a new tempo
 * map as each phrase is queued at its tempo), phrase 1's first beat (null until handed over, in a
 * session whose phrase 1 start is handed over), the backing and guide notes queued but not yet
 * planned (each in time order), the phrase the next backing must be for, and how far planning has
 * reached.
 */
// @spec-link [[module_session_transport_tempo_map]]
// @spec-link [[module_session_start_without_phrase_one]]
interface RunningSession {
  readonly bus: SessionBus
  readonly phraseOneStart: PhraseOneStart
  plan: ClickPlan
  phraseOneBeat: number | null
  pendingBacking: readonly ScheduledBackingNote[]
  pendingGuide: readonly ScheduledGuideNote[]
  nextPhrase: number
  plannedUntil: AudioTime
}

/**
 * Intent: plan one look-ahead window of a session on its bus: the clicks, the queued backing
 * notes and the queued notes of each guide switched on (per `guideOn`), all with
 * `from <= at < to`, then forget every note of the window, sent or not, and note how far planning
 * has reached. A guide switched off sends nothing, so with both off no guide note reaches the bus.
 */
// @spec-link [[req_session_backing_track]]
// @spec-link [[rule_playhead_follows_audio_clock]]
// @spec-link [[rule_guide_switch_takes_effect]]
function planWindow(
  session: RunningSession,
  from: AudioTime,
  to: AudioTime,
  guideOn: (guide: GuideRole) => boolean,
): void {
  clicksBetween(session.plan, from, to).forEach(session.bus.scheduleClick)
  backingNotesBetween(session.pendingBacking, from, to).forEach(session.bus.scheduleBackingNote)
  for (const note of guideNotesBetween(session.pendingGuide, from, to)) {
    if (guideOn(note.role)) session.bus.scheduleGuideNote(note)
  }
  session.pendingBacking = session.pendingBacking.filter((note) => note.at >= to)
  session.pendingGuide = session.pendingGuide.filter((note) => note.at >= to)
  session.plannedUntil = to
}

/** Intent: throw unless `guide` names one of the two guides. */
function assertGuide(guide: GuideRole): void {
  if (!GUIDE_ROLES.includes(guide)) throw new Error(`audio transport: ${String(guide)} is no guide`)
}

/**
 * Intent: the session beat `soundsAt` falls exactly on, when it is a barline at or after the
 * count-in's end of `plan`, a plan with no tempo change yet (phrase 1 is not queued): compared
 * with `beatAt` exactly, the way the code handing it over computes its barlines. Throws otherwise.
 */
// @spec-link [[module_session_transport_tempo_map]]
// @spec-link [[module_session_start_without_phrase_one]]
function barlineBeatAt(plan: ClickPlan, soundsAt: AudioTime): number {
  const estimate = Math.round(((soundsAt - plan.startAt) * plan.tempo) / 60)
  const onBarline =
    Number.isFinite(soundsAt) &&
    estimate >= plan.countInBeats &&
    estimate % plan.beatsPerMeasure === 0 &&
    beatAt(plan, estimate) === soundsAt
  if (!onBarline) {
    throw new Error(
      `audio transport: phrase 1 must start on a barline at or after the count-in's end, got ${soundsAt}`,
    )
  }
  return estimate
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

  /**
   * Intent: the running session's phrase 1 first beat; throws before it is handed over, since no
   * phrase's start is known until then.
   */
  // @spec-link [[module_session_transport_tempo_map]]
  // @spec-link [[module_session_start_without_phrase_one]]
  function phraseOneBeatOf(running: RunningSession, phraseNumber: number): number {
    if (running.phraseOneBeat === null) {
      throw new Error(
        `audio transport: phrase ${phraseNumber}'s start is not known yet: phrase 1's start has not been handed over`,
      )
    }
    return running.phraseOneBeat
  }

  /**
   * Intent: in a session whose phrase 1 start is handed over, set phrase 1's first beat on the
   * click plan at `soundsAt`, once. Everything is checked before anything is set, so a refused
   * hand-over leaves the session as it was.
   */
  // @spec-link [[module_session_transport_tempo_map]]
  // @spec-link [[module_session_start_without_phrase_one]]
  function startPhraseOneAt(soundsAt: AudioTime): void {
    const running = runningSession()
    if (running.phraseOneStart !== 'handed-over') {
      throw new Error(
        "audio transport: this session's phrase 1 starts at the count-in's end; its start is not handed over",
      )
    }
    if (running.phraseOneBeat !== null) {
      throw new Error(
        `audio transport: phrase 1's start was already handed over, at ${beatAt(running.plan, running.phraseOneBeat)}`,
      )
    }
    running.phraseOneBeat = barlineBeatAt(running.plan, soundsAt)
  }

  /**
   * Intent: the running session's click plan with phrase `phraseNumber` at `tempo` BPM from its
   * first beat, counted from phrase 1's first beat `phraseOneBeat`. Phrase 1 must be at the
   * starting tempo (the count-in's), so its plan is unchanged, as are the beats up to it.
   */
  // @spec-link [[module_session_transport_tempo_map]]
  function planWithPhraseTempo(
    running: RunningSession,
    phraseNumber: number,
    tempo: number,
    phraseOneBeat: number,
  ): ClickPlan {
    if (phraseNumber === 1) {
      if (tempo !== running.plan.tempo) {
        throw new Error(
          `audio transport: phrase 1 must be at the starting tempo ${running.plan.tempo}, got ${tempo}`,
        )
      }
      return running.plan
    }
    return withTempoFrom(
      running.plan,
      phraseFirstBeat(running.plan, phraseNumber, phraseOneBeat),
      tempo,
    )
  }

  /** Intent: whether `guide` is switched on in the current mix, read as each window is planned. */
  // @spec-link [[rule_guide_switch_takes_effect]]
  function guideOn(guide: GuideRole): boolean {
    return channelOn(currentMix(), guide)
  }

  /**
   * Intent: render phrase `phraseNumber`'s backing from its harmony and its guide notes from its
   * concert timeline and harmony, and queue both at `tempo`, so the click runs at that tempo from
   * the phrase's first beat and the scheduler plays the backing on the session's beat grid, and
   * each guide note at its exact position through the tempo map, from phrase 1's first beat. Both
   * guides' notes are queued whatever the switches say; planning sends only those of a guide
   * switched on. Phrases must come 1, 2, 3… in order,
   * once phrase 1's start is known, each before planning reaches its start, so no click of the
   * phrase was planned at the old tempo; otherwise, or on a refused tempo, this throws and the
   * queue and the tempo map are left as they were. A phrase never queued simply leaves silence: the
   * transport can't tell it is missing until the next call, which then throws (out of order, or
   * too late).
   */
  // @spec-link [[req_session_backing_track]]
  // @spec-link [[module_session_transport_tempo_map]]
  // @spec-link [[rule_guide_plays_from_phrase_one]]
  // @spec-link [[module_guide_playback_layers]]
  function queueBacking(
    phraseNumber: number,
    harmony: readonly HarmonyEvent[],
    timeline: ConcertEventTimeline,
    tempo: number,
  ): void {
    const running = runningSession()
    if (phraseNumber !== running.nextPhrase) {
      throw new Error(
        `audio transport: backing is due for phrase ${running.nextPhrase} next, got phrase ${phraseNumber}`,
      )
    }
    const phraseOneBeat = phraseOneBeatOf(running, phraseNumber)
    const startsAt = phraseStartsAt(running.plan, phraseNumber, phraseOneBeat)
    if (startsAt < running.plannedUntil) {
      throw new Error(
        `audio transport: phrase ${phraseNumber}'s backing is queued too late: it starts at ${startsAt}, planning has reached ${running.plannedUntil}`,
      )
    }
    const plan = planWithPhraseTempo(running, phraseNumber, tempo, phraseOneBeat)
    const rendered = renderBacking(harmony, FOUR_FOUR_METER)
    const notes = scheduleBacking(plan, phraseNumber, rendered, phraseOneBeat)
    const guideNotes = scheduleGuide(
      plan,
      phraseNumber,
      renderGuide(timeline, harmony),
      phraseOneBeat,
    )
    running.plan = plan
    running.pendingBacking = [...running.pendingBacking, ...notes]
    running.pendingGuide = [...running.pendingGuide, ...guideNotes]
    running.nextPhrase += 1
  }

  /**
   * Intent: when the running session's phrase `phraseNumber` starts sounding. Only phrases up to
   * the one after the last queued are known: a later start depends on a tempo not queued yet; and
   * none before phrase 1's start is handed over, in a session whose phrase 1 start is handed over.
   */
  // @spec-link [[req_session_backing_track]]
  // @spec-link [[module_session_transport_tempo_map]]
  function runningPhraseStartsAt(phraseNumber: number): AudioTime {
    const running = runningSession()
    const phraseOneBeat = phraseOneBeatOf(running, phraseNumber)
    if (phraseNumber > running.nextPhrase) {
      throw new Error(
        `audio transport: phrase ${phraseNumber}'s start is not known yet: phrase ${running.nextPhrase} is the next to queue`,
      )
    }
    return phraseStartsAt(running.plan, phraseNumber, phraseOneBeat)
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
    phraseStartsAt: runningPhraseStartsAt,
    forceClickUntil: (until) => runningSession().bus.forceClickUntil(until),
    startPhraseOneAt,
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
