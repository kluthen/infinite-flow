/**
 * A fresh Jam from Start to phrase 1, on screen (master spec C5.3 to C5.7): Jam's code starts a
 * session without phrase 1 through the session controller and runs its capture (jam-capture.ts)
 * and phrase 1's ladder (jam-phrase-one.ts) on the session's audio clock. Every note the session
 * reads goes into the ladder; every engine output comes back to it; it is woken at each of its
 * decisions and at each barline (the doodle's measures light on the audio clock). What it asks
 * for goes to the session: its phrase 1 events, the doodle and its key and mode suggestion, kept
 * in the session's history, the controls read from the doodle, kept for the review, and its own
 * ends (no doodle note, no phrase 1 by the deadline). Its
 * view publishes the Jam's phase for the cue row (never a note of the doodle) and, once phrase 1
 * enters, the controls read from the doodle for `doodle-readings`. Part of Jam's code (src/jam/),
 * loaded on demand.
 */
import { shallowRef, type ShallowRef } from 'vue'

import { createClickPlan } from '@/audio/click-track'
import type {
  SessionWithoutPhraseOne,
  StartWithoutPhraseOne,
} from '@/components/workspace/workspace-session-controller-types'
import { VERY_SHORT_NOTE_SECONDS } from '@/domain/played-notes/stray-notes'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type { PlayedNoteEvent } from '@/midi/played-note-tracker'
import { jamPhraseOneSeed } from '@/session/session-seed-plan'
import type { AudioTime, SessionOutput } from '@/session/session-types'

import type { DoodleReadings } from './doodle-controls'
import { createJamCapture, type JamCaptureOutput } from './jam-capture'
import { barlineAt, measureAt, type JamPhase } from './jam-phase'
import { createJamPhraseOne, type JamPhraseOne, type JamPhraseOneOutput } from './jam-phrase-one'
import type { JamPhraseOneSettings } from './jam-phrase-one-attempts'

/**
 * What a fresh Jam is started with: the session controller's start without phrase 1, Jam's
 * settings and drift phrase 1 is written under (their tempo the Jam's), and the clef the session's
 * instrument is drawn in.
 */
// @spec-link [[req_jam]]
export interface FreshJamRequest {
  readonly startWithoutPhraseOne: (request: StartWithoutPhraseOne) => SessionWithoutPhraseOne
  readonly jam: JamPhraseOneSettings
  readonly clef: InstrumentClef
}

/**
 * What a fresh Jam shows: its phase (the cue row's part), and the controls read from the doodle,
 * null until phrase 1 enters.
 */
// @spec-link [[rule_jam_live_view_never_shows_doodle]]
// @spec-link [[rule_doodle_sets_jam_controls]]
export interface FreshJamView {
  readonly phase: JamPhase
  readonly readings: DoodleReadings | null
}

/** A fresh Jam running: its session's handle and what it shows, reactive. */
// @spec-link [[req_jam]]
export interface FreshJam {
  readonly session: SessionWithoutPhraseOne
  readonly view: Readonly<ShallowRef<FreshJamView>>
}

/**
 * Intent: start a fresh Jam, synchronously, inside the Start click or the home note's MIDI
 * callback: start the session without phrase 1 (which draws the session seed and starts the
 * count-in), then run its capture and phrase 1's ladder from the count-in's start, each attempt
 * seeded from the session seed plan's label for it. Each note, engine output and wake-up first
 * takes what is due by then, then acts on what the ladder asks; a session that has ended, by
 * whatever cause, stops the capture, and the phase reads `ended`; once phrase 1 sounds it reads
 * `phrase-one` and nothing more is woken.
 */
// @spec-link [[req_jam]]
// @spec-link [[module_jam_capture]]
// @spec-link [[rule_jam_without_doodle_note_ends]]
// @spec-link [[rule_jam_ends_when_phrase_one_never_comes]]
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
// @spec-link [[module_session_seed_plan]]
export function startFreshJam(request: FreshJamRequest): FreshJam {
  const { jam } = request
  const tempo = jam.settings.controls.tempo
  const routed: { ladder: JamPhraseOne | null; at: AudioTime } = { ladder: null, at: -Infinity }
  const outputsBeforeLadder: SessionOutput[] = []
  let ended = false
  const session = request.startWithoutPhraseOne({
    settings: jam.settings,
    clef: request.clef,
    playedNotes: (event: PlayedNoteEvent) => {
      if (routed.ladder === null || ended) return
      const eventAt = event.kind === 'played' ? event.note.onsetAt : event.note.releaseAt
      routed.at = Math.max(routed.at, eventAt)
      act(routed.ladder.note(event))
    },
    outputs: (output) => {
      if (routed.ladder === null) outputsBeforeLadder.push(output)
      else onSession(routed.ladder, output)
    },
  })
  const plan = createClickPlan(session.timeline.startAt, tempo)
  const capture = createJamCapture({ startAt: session.timeline.startAt, tempo })
  const ladder = createJamPhraseOne(
    {
      nextRequestId: session.attemptSeams.nextRequestId,
      seedOf: (index) => jamPhraseOneSeed(session.sessionSeed, index),
      isBelowTabletLandscape: session.attemptSeams.isBelowTabletLandscape,
    },
    jam,
    capture,
  )
  const view = shallowRef<FreshJamView>({ phase: capture.phase(), readings: null })
  routed.ladder = ladder
  /** The wake-up asked for last and not fired yet, with its token; a newer one supersedes it. */
  let wake: { readonly at: AudioTime; readonly token: number } | null = null
  let wakes = 0

  /** Intent: publish the phase as the capture stands, keeping the readings. */
  function publish(readings: DoodleReadings | null = view.value.readings): void {
    const phase: JamPhase = ended ? { state: 'ended' } : capture.phase()
    view.value = Object.freeze({ phase, readings })
  }

  /** Intent: one engine output to the ladder, at the audio clock's time; `ended` stops the Jam. */
  function onSession(running: JamPhraseOne, output: SessionOutput): void {
    if (ended) return
    if (output.kind === 'ended') {
      ended = true
      capture.end()
      publish(null)
      return
    }
    routed.at = Math.max(session.now(), routed.at)
    act(running.session(output, routed.at))
  }

  /** Intent: one capture output passed on by the ladder, as the session needs it. */
  function onCapture(output: JamCaptureOutput): void {
    if (output.kind === 'doodle-ended') session.recordDoodle(output.end)
    else if (output.kind === 'no-note-played') session.end('no-note-played')
  }

  /** Intent: do what the ladder asks, in order, then publish and ask for the next wake-up. */
  function act(outputs: readonly JamPhraseOneOutput[]): void {
    let readings = view.value.readings
    for (const output of outputs) {
      if (ended) break
      // The session stamps the event now on the audio clock: the ladder's own time is dropped.
      if (output.kind === 'session-event') session.dispatch(output.event)
      else if (output.kind === 'capture') onCapture(output.output)
      else if (output.kind === 'suggestion') session.recordSuggestion(output.suggestion)
      else if (output.kind === 'readings') {
        readings = output.readings
        session.recordDoodleControls(readings)
      } else session.end('no-phrase-one')
    }
    if (ended) return
    publish(readings)
    scheduleWake()
  }

  /**
   * Intent: when to wake the Jam next: its next decision, or the next barline before it, so a
   * doodle measure lights at its barline; never a barline a decision follows within the time a
   * note takes to count, so a silent barline turns to the writing cue without lighting the next
   * number first. Null once phrase 1 sounds or nothing is due.
   */
  function nextWakeAt(): AudioTime | null {
    const state = view.value.phase.state
    if (state === 'phrase-one' || state === 'ended') return null
    const decision = ladder.nextDecisionAt()
    const now = Math.max(session.now(), routed.at)
    const barline = barlineAt(plan, Math.max(0, measureAt(plan, now) + 1))
    if (decision !== null && decision <= barline + VERY_SHORT_NOTE_SECONDS) return decision
    return barline
  }

  /** Intent: ask the session to wake the Jam at its next wake-up time, unless already asked. */
  function scheduleWake(): void {
    const at = nextWakeAt()
    if (at === null || (wake !== null && wake.at <= at)) return
    const token = ++wakes
    wake = { at, token }
    session.wakeAt(at, () => {
      if (wake?.token !== token) return
      wake = null
      if (ended) return
      routed.at = Math.max(routed.at, at)
      act(ladder.advance(routed.at))
    })
  }

  for (const output of outputsBeforeLadder) onSession(ladder, output)
  if (!ended) {
    publish()
    scheduleWake()
  }
  return { session, view }
}
