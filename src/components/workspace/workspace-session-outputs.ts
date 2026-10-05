/**
 * The session controller's handling of what the engine reports: every runner output is recorded
 * in the session's history, a phrase starting to sound placed at its scheduled start, then acted
 * on: a readied phrase is shown and kept, scheduled once its tempo is fixed, or taken back when
 * discarded (./workspace-session-phrases.ts); a settings change waits for the phrase it applies
 * to; a phrase starting to sound sets the tempo and settings shown; the struggling notice shows or
 * hides; a wake-up request is scheduled on the audio clock; and the `ended` output is kept for the
 * end that asked for it.
 */
import type { AudioTransport } from '@/audio/audio-transport'
import type { SessionOutput } from '@/session/session-types'
import {
  dispatchAt,
  phrasesOf,
  type ActiveSession,
  type SessionControllerWritableState,
} from './workspace-session-active'

/**
 * Intent: an output as the history keeps it: a phrase starting to sound is placed at its
 * scheduled start on the transport, where the phrases sit exactly back to back, not at the
 * engine's time, which the floor may have raised past it before the wake-up fired; every other
 * output is kept as it is.
 */
// @spec-link [[rule_session_history_records_played_notes]]
// @spec-link [[rule_played_notes_export_unquantized_timing]]
function historyOutput(
  audio: Pick<AudioTransport, 'phraseStartsAt'>,
  output: SessionOutput,
): SessionOutput {
  if (output.kind !== 'phrase-sounding') return output
  return { ...output, at: audio.phraseStartsAt(output.phrase.phraseNumber) }
}

/**
 * Intent: a phrase started sounding: the tempo shown becomes its own, the exact tempo in effect,
 * while the Idle tempo control is never written, so it shows the starting tempo again at the
 * end; the controls show the settings it was generated with, a change reported for it (or for a
 * repeat before it) appearing now, with nothing else on screen moving.
 */
// @spec-link [[rule_automatic_change_updates_controls_quietly]]
// @spec-link [[service_session_controller]]
function onSounding(
  state: SessionControllerWritableState,
  session: ActiveSession,
  output: Extract<SessionOutput, { kind: 'phrase-sounding' }>,
): void {
  state.sessionTempo = output.tempo
  state.shownSettings = session.shown.phraseSounding(output.phrase)
}

/**
 * Intent: record one runner output in the history, a sounding phrase at its scheduled start,
 * then act on it: a phrase is shown when ready and scheduled at its tempo, and a discarded one
 * taken back before its tempo; a settings change is kept until the phrase it applies to sounds.
 */
// @spec-link [[rule_struggling_generator_notice]]
// @spec-link [[rule_session_history_records_played_notes]]
// @spec-link [[rule_played_notes_export_unquantized_timing]]
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
// @spec-link [[service_session_controller]]
export function onSessionOutput(
  audio: Pick<AudioTransport, 'phraseStartsAt'>,
  state: SessionControllerWritableState,
  session: ActiveSession,
  output: SessionOutput,
): void {
  session.history.record(historyOutput(audio, output))
  if (output.kind === 'phrase-ready') phrasesOf(session).phraseReady(output.phrase)
  else if (output.kind === 'phrase-tempo')
    phrasesOf(session).phraseTempo(output.phraseNumber, output.tempo)
  else if (output.kind === 'phrase-discarded')
    phrasesOf(session).phraseDiscarded(output.phraseNumber)
  else if (output.kind === 'settings-changed') session.shown.settingsChanged(output)
  else if (output.kind === 'phrase-sounding') onSounding(state, session, output)
  else if (output.kind === 'struggling-notice') state.strugglingNotice = output.visible
  else if (output.kind === 'wake-at')
    session.agenda.schedule(output.at, () => dispatchAt(session, output.at, { kind: 'tick' }))
  else if (output.kind === 'ended') session.ended = output
}
