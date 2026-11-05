/**
 * Phrase 1 through the workspace, in a session started without phrase 1 (a fresh Jam's): the fit
 * check its attempts take against the staff layout the session holds, and what the session takes
 * at the hand-over, once the engine has readied phrase 1 there. Phrase 1 enters the session's own
 * staff in the held layout, its backing and guide notes are queued and its notes acknowledged from the start the
 * transport took from the hand-over, the session gets the rolling display and the steps of
 * phrases 2 on, the read-in measure is counted in on the cue row, and phrase 1's start makes it a
 * running session. Part of the session controller's chunk.
 */
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import { measureSeconds } from '@/session/session-timing'
import type { SessionPhrase } from '@/session/session-types'
import type { FitCandidate } from '@/session/session-runner'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import { fitsHeldLayout, writtenPhraseOf } from './held-layout-fit'
import {
  dispatchAt,
  type ActiveSession,
  type SessionControllerCore,
} from './workspace-session-active'
import { showCountIn } from './workspace-session-begin'
import { createSessionDisplay } from './workspace-session-display'
import type { SessionEnds } from './workspace-session-ends'
import { createSessionPhrases } from './workspace-session-phrases'

/**
 * Intent: the fit check of phrase 1's attempts: the attempt's written phrase, in the session's
 * clef, against the held layout at the staff's latest layout inputs once the planner is ready, as
 * the rolling display checks every later phrase; a check before the staff ever reported is a
 * defect.
 */
// @spec-link [[rule_look_ahead_phrase_must_fit_staff]]
// @spec-link [[rule_session_layout_fixed_at_start]]
export function phraseOneFitCheck(
  core: SessionControllerCore,
  heldLayout: StaffLayout,
  clef: InstrumentClef,
): (candidate: FitCandidate) => Promise<boolean> {
  const { deps } = core
  /** Intent: the staff's latest layout inputs; a check before the staff ever reported is a defect. */
  const requireInputs = () => {
    const inputs = deps.idleLayout.latestInputs()
    if (inputs === null) throw new Error('session controller: the staff never reported its layout')
    return inputs
  }
  return async (candidate) => {
    requireInputs()
    const phrase = writtenPhraseOf(candidate, clef)
    const plan = await deps.staffFitPlanner()
    return fitsHeldLayout(plan, phrase, heldLayout, requireInputs())
  }
}

/**
 * Intent: what a session started without phrase 1 takes when the engine readies phrase 1, at the
 * hand-over, its start already on the transport: phrase 1's backing and guide notes at the
 * starting tempo, its
 * notes added for acknowledgement (which also sets when the silence timer may arm), the rolling
 * display with phrase 1 entering the held layout and no playhead yet, the steps of phrases 2 on,
 * the read-in measure counted in on the cue row as a count-in is, and at phrase 1's start the
 * running phase and its `count-in-over`. Once only; a second phrase 1 is a defect.
 */
// @spec-link [[module_session_start_without_phrase_one]]
// @spec-link [[module_session_rolling_display]]
// @spec-link [[module_session_phrase_steps]]
// @spec-link [[rule_count_in_shown_on_screen]]
// @spec-link [[rule_jam_silence_timer_from_phrase_one]]
export function phraseOneEntry(
  core: SessionControllerCore,
  ends: SessionEnds,
  session: ActiveSession,
  entry: { readonly heldLayout: StaffLayout; readonly clef: InstrumentClef },
): (phrase: SessionPhrase) => void {
  const { deps, state } = core
  const { audio } = deps
  return (phrase) => {
    if (session.display !== null || session.phrases !== null)
      throw new Error('session controller: phrase 1 was handed over twice')
    if (session.midi === null) throw new Error('session controller: no MIDI handling yet')
    const tempo = session.startingTempo
    const soundsAt = audio.phraseStartsAt(1)
    audio.queueBacking(
      1,
      phrase.outcome.provenance.harmony.events,
      phrase.outcome.result.timeline,
      tempo,
    )
    session.midi.phraseReady(1, phrase.outcome.result.timeline, tempo)
    const display = createSessionDisplay({
      audio,
      frames: deps.clock.frames,
      startingTempo: tempo,
      heldLayout: entry.heldLayout,
      phraseOne: writtenPhraseOf(phrase, entry.clef),
      latestInputs: deps.idleLayout.latestInputs,
      loadPlanner: deps.staffFitPlanner,
      publish: (staff, latestReady) => {
        state.sessionStaff = staff
        state.latestReady = latestReady
      },
      fail: (error) => ends.failLoudly(session, error),
    })
    session.display = display
    session.phrases = createSessionPhrases({
      audio,
      display,
      midi: session.midi,
      agenda: session.agenda,
      startedSounding: (phraseNumber, at) =>
        dispatchAt(session, at, { kind: 'phrase-started-sounding', phraseNumber }),
    })
    showCountIn(core, session, audio.now(), soundsAt - measureSeconds(tempo))
    session.agenda.schedule(soundsAt, () => {
      state.phase = 'running'
      state.countIn = null
      dispatchAt(session, soundsAt, { kind: 'count-in-over' })
    })
  }
}
