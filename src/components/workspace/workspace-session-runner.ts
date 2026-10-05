/**
 * The workspace's session runner: the session engine's runner as the workspace starts it. The
 * settings-mutation flag comes from the player's `Vary settings` choice: on, it runs from a
 * mutation seed drawn at the start from the workspace's own seed provider and kept in the
 * session's start, so the session replays from its inputs. The display reading the engine asks
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
 * Intent: the engine's mutation flag for the player's choice: off, or on with a seed drawn now
 * from `nextSeed`. Nothing is drawn when the choice is off, so a session without mutations draws
 * the same seeds as before the flag existed.
 */
// @spec-link [[req_settings_mutation_flag]]
export function mutationFlagFor(varySettings: boolean, nextSeed: () => Seed): SettingsMutationFlag {
  return varySettings ? { kind: 'on', seed: nextSeed() } : SETTINGS_MUTATION_OFF
}

/**
 * Intent: start a workspace session runner with the settings-mutation flag the player's choice
 * gives (its seed drawn before the engine asks for any attempt seed), the multi-phrase tension arc
 * and adaptive tempo as the start says, and the display reading and output sink the caller passes.
 */
// @spec-link [[service_workspace_session_runner_factory]]
// @spec-link [[service_session_runner]]
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[req_multi_phrase_tension_arc]]
export function startWorkspaceSessionRunner(
  deps: SessionRunnerDependencies,
  start: WorkspaceSessionStart,
): SessionRunner {
  const { varySettings, ...engineStart } = start
  return createSessionRunner(deps, {
    ...engineStart,
    mutation: mutationFlagFor(varySettings, deps.providers.nextSeed),
  })
}
