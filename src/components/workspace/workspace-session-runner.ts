/**
 * The workspace's session runner: the session engine's runner as the workspace starts it. The
 * settings-mutation flag comes from the player's `Vary settings` choice: on, it runs from the
 * mutation seed the session seed plan derives from the start's session seed, so the session
 * replays from its inputs and draws no seed. The display reading the engine asks
 * whether any of a phrase is on screen is the session's rolling display. The multi-phrase tension
 * arc flag is the player's `Tension across phrases` choice, passed on as it is. Loaded lazily with
 * the runner, as part of the session controller's chunk.
 */

import {
  createSessionRunner,
  type SessionRunner,
  type SessionRunnerDependencies,
} from '@/session/session-runner'
import type { SessionStart } from '@/session/session-types'
import { settingsMutationSeed } from '@/session/session-seed-plan'
import { SETTINGS_MUTATION_OFF, type SettingsMutationFlag } from '@/session/settings-mutation'
import type { Seed } from '@/domain/random/seed'

/**
 * A workspace session's start: the engine's start with the player's `Vary settings` choice in
 * place of the mutation flag. Its `multiPhraseTensionArc` is the player's `Tension across phrases`
 * choice; its `adaptiveTempo` is the session controller's: the page's flag on and a controller at
 * the start.
 */
// @spec-link [[service_workspace_session_runner_factory]]
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[req_multi_phrase_tension_arc]]
export interface WorkspaceSessionStart extends Omit<SessionStart, 'mutation'> {
  /** Whether the settings-mutation flag is on for this session. */
  readonly varySettings: boolean
}

/**
 * Intent: the engine's mutation flag for the player's choice: off, or on with the mutation seed
 * the session seed plan derives from `sessionSeed`. Nothing is derived when the choice is off,
 * and no seed is drawn either way.
 */
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[module_session_seed_plan]]
export function mutationFlagFor(varySettings: boolean, sessionSeed: Seed): SettingsMutationFlag {
  return varySettings
    ? { kind: 'on', seed: settingsMutationSeed(sessionSeed) }
    : SETTINGS_MUTATION_OFF
}

/**
 * Intent: start a workspace session runner with the settings-mutation flag the player's choice
 * gives (its seed derived from the start's session seed), the multi-phrase tension arc and
 * adaptive tempo as the start says, and the display reading and output sink the caller passes.
 */
// @spec-link [[service_workspace_session_runner_factory]]
// @spec-link [[service_session_runner]]
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[req_multi_phrase_tension_arc]]
// @spec-link [[module_session_seed_plan]]
export function startWorkspaceSessionRunner(
  deps: SessionRunnerDependencies,
  start: WorkspaceSessionStart,
): SessionRunner {
  const { varySettings, ...engineStart } = start
  return createSessionRunner(deps, {
    ...engineStart,
    mutation: mutationFlagFor(varySettings, engineStart.sessionSeed),
  })
}
