/**
 * The workspace's session runner: the session engine's runner as the workspace starts it. The
 * settings-mutation flag comes from the player's `Vary settings` choice: on, it runs from the
 * mutation seed the session seed plan derives from the start's session seed, so the session
 * replays from its inputs and draws no seed; a session whose start settings have no legal move
 * runs without it. The display reading the engine asks
 * whether any of a phrase is on screen is the session's rolling display. The multi-phrase tension
 * arc flag is the player's `Tension across phrases` choice, passed on as it is. Loaded lazily with
 * the runner, as part of the session controller's chunk.
 */

import {
  createSessionRunner,
  type SessionRunner,
  type SessionRunnerDependencies,
} from '@/session/session-runner'
import { mutationContextAtStart } from '@/session/session-mutation-step'
import type { SessionSettings, SessionStart } from '@/session/session-types'
import { settingsMutationSeed } from '@/session/session-seed-plan'
import {
  hasLegalMove,
  SETTINGS_MUTATION_OFF,
  type MutationContext,
  type SettingsMutationFlag,
} from '@/session/settings-mutation'
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
 * Intent: the engine's mutation flag for the player's choice and the session's start: off when
 * the choice is off, or when the start settings have no legal move under the mutation context the
 * start state gives (a session started then runs without Vary settings); otherwise on with the
 * mutation seed the session seed plan derives from `sessionSeed`. Nothing is derived when the flag
 * is off, and no seed is drawn either way.
 */
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[rule_vary_settings_needs_legal_move]]
// @spec-link [[module_session_seed_plan]]
export function mutationFlagFor(
  varySettings: boolean,
  sessionSeed: Seed,
  settings: SessionSettings,
  context: MutationContext,
): SettingsMutationFlag {
  if (!varySettings || !hasLegalMove(settings, context)) return SETTINGS_MUTATION_OFF
  return { kind: 'on', seed: settingsMutationSeed(sessionSeed) }
}

/**
 * Intent: start a workspace session runner with the settings-mutation flag the player's choice
 * gives (its seed derived from the start's session seed), off when the start settings (with the
 * restriction in force at the start frozen in) have no legal move under the context the start
 * state gives, the window read once now; the multi-phrase tension arc and adaptive tempo as the
 * start says, and the display reading and output sink the caller passes.
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
  const context = mutationContextAtStart(
    engineStart.phraseOne,
    deps.viewport.isBelowTabletLandscape(),
  )
  return createSessionRunner(deps, {
    ...engineStart,
    mutation: mutationFlagFor(varySettings, engineStart.sessionSeed, engineStart.settings, context),
  })
}
