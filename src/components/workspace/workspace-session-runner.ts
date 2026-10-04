/**
 * The workspace's session runner as v2.1's engine stands before its control exists: the
 * settings-mutation flag is always off and nothing sends a settings change, so no setting changes
 * during a workspace session. The multi-phrase tension arc is off too, until its player-facing
 * toggle exists. Chunk 25 connects the three seams marked here: the flag (from the
 * player's on/off control, with a drawn and stored mutation seed), the display reading (from the
 * rolling display) and the two outputs a settings change produces (to the settings panel and the
 * display). Until then, reading the display or receiving either output is a wiring defect and
 * throws. Loaded lazily with the runner, as part of the session controller's chunk.
 */

import {
  createSessionRunner,
  type SessionRunner,
  type SessionRunnerDependencies,
} from '@/session/session-runner'
import type { SessionDisplayReading, SessionOutput, SessionStart } from '@/session/session-types'
import { SETTINGS_MUTATION_OFF } from '@/session/settings-mutation'

/**
 * A workspace session's start: the engine's start without the mutation flag or the multi-phrase
 * tension arc flag, which both stay off. Its `adaptiveTempo` is the session controller's: the
 * page's flag on and a controller at the start.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[req_multi_phrase_tension_arc]]
export type WorkspaceSessionStart = Omit<SessionStart, 'mutation' | 'multiPhraseTensionArc'>

/**
 * The display reading before chunk 25 connects it to the rolling display: the engine reads it only
 * for a settings change, which nothing sends yet, so a read throws.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
export const DISPLAY_NOT_CONNECTED: SessionDisplayReading = Object.freeze({
  isPhraseOnScreen(phraseNumber: number): boolean {
    throw new Error(
      `The session display reading (phrase ${phraseNumber}) is not connected until chunk 25.`,
    )
  },
})

/**
 * Intent: forward each output to `onOutput`, refusing the two a settings change produces, which
 * cannot occur with the flag off and no settings change sent: the controller has no handling for
 * them until chunk 25, and would otherwise ignore them silently.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[req_settings_mutation_flag]]
export function refusingSettingsChangeOutputs(
  onOutput: (output: SessionOutput) => void,
): (output: SessionOutput) => void {
  return (output) => {
    if (output.kind === 'settings-changed' || output.kind === 'phrase-discarded')
      throw new Error(`A "${output.kind}" session output is not handled until chunk 25.`)
    onOutput(output)
  }
}

/**
 * Intent: start a workspace session runner with the settings-mutation flag and the multi-phrase
 * tension arc off, adaptive tempo as the start says, the display reading not yet connected, and
 * the settings change outputs refused.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[service_session_runner]]
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[req_multi_phrase_tension_arc]]
export function startWorkspaceSessionRunner(
  deps: Omit<SessionRunnerDependencies, 'display'>,
  start: WorkspaceSessionStart,
): SessionRunner {
  return createSessionRunner(
    {
      ...deps,
      display: DISPLAY_NOT_CONNECTED,
      onOutput: refusingSettingsChangeOutputs(deps.onOutput),
    },
    { ...start, mutation: SETTINGS_MUTATION_OFF, multiPhraseTensionArc: false },
  )
}
