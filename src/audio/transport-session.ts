/**
 * The audio transport's running session (./audio-transport.ts runs one at a time): its bus, its
 * click plan with the tempo map each queued phrase extends, where its phrase 1 starts (at the
 * count-in's end, or at the barline handed over later in a session started without phrase 1), and
 * the backing and guide notes queued for the look-ahead scheduler, each window planned on the bus
 * with only the guides switched on. Every function here works on the session it is given, and
 * throws, leaving it as it was, on a refused hand-over or phrase.
 */

import { renderBacking } from '../domain/backing/backing-renderer'
import { renderGuide } from '../domain/backing/guide-renderer'
import type { ConcertEventTimeline } from '../domain/events/timeline'
import { FOUR_FOUR_METER } from '../domain/generation/generation-request-envelope'
import type { HarmonyEvent } from '../domain/harmony/harmony-types'
import type { AudioTime, SessionBus } from './audio-ports'
import {
  backingNotesBetween,
  phraseFirstBeat,
  phraseStartsAt,
  scheduleBacking,
} from './backing-track'
import { beatAt, clicksBetween, withTempoFrom, type ClickPlan } from './click-track'
import { guideNotesBetween, scheduleGuide } from './guide-track'
import type { GuideRole, ScheduledBackingNote, ScheduledGuideNote } from './sound-roles'

/**
 * Where a session's phrase 1 starts: at the count-in's end (a session started with phrase 1), or
 * at the barline handed over later through `startPhraseOneAt` (a session started without it).
 */
// @spec-link [[module_session_transport_tempo_map]]
// @spec-link [[module_session_start_without_phrase_one]]
export type PhraseOneStart = 'count-in-end' | 'handed-over'

/**
 * A running session: its bus, where its phrase 1 starts, its click plan (replaced by a new tempo
 * map as each phrase is queued at its tempo), phrase 1's first beat (null until handed over, in a
 * session whose phrase 1 start is handed over), the backing and guide notes queued but not yet
 * planned (each in time order), the phrase the next backing must be for, and how far planning has
 * reached.
 */
// @spec-link [[module_session_transport_tempo_map]]
// @spec-link [[module_session_start_without_phrase_one]]
export interface RunningSession {
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
export function planWindow(
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
export function handOverPhraseOne(running: RunningSession, soundsAt: AudioTime): void {
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
export function queuePhrase(
  running: RunningSession,
  phraseNumber: number,
  harmony: readonly HarmonyEvent[],
  timeline: ConcertEventTimeline,
  tempo: number,
): void {
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
export function sessionPhraseStartsAt(running: RunningSession, phraseNumber: number): AudioTime {
  const phraseOneBeat = phraseOneBeatOf(running, phraseNumber)
  if (phraseNumber > running.nextPhrase) {
    throw new Error(
      `audio transport: phrase ${phraseNumber}'s start is not known yet: phrase ${running.nextPhrase} is the next to queue`,
    )
  }
  return phraseStartsAt(running.plan, phraseNumber, phraseOneBeat)
}
