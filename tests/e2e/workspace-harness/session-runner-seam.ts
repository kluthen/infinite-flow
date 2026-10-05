/**
 * The harness-only substitute for the workspace's session runner module, swapped in by the
 * `@/components/workspace/workspace-session-runner` alias in vite.workspace-harness.config.ts. It
 * starts every runner with the real `startWorkspaceSessionRunner` and keeps the latest one, with
 * its engine clock and the settings in effect (the start's, then each `settings-changed`
 * output's), so `changeSettings` can send the running session the one event no part of the app
 * sends yet: an automatic settings change from a source other than the engine's own mutations.
 * It travels the runner's real `dispatch`, the engine reads the real rolling display for it, and
 * every output it produces reaches the real controller. Nothing else changes.
 */
import type { SessionRunner, SessionRunnerDependencies } from '../../../src/session/session-runner'
import type { SessionSettings } from '../../../src/session/session-types'
import { makeGenerationControls } from '../../../src/domain/controls/generation-controls'
import {
  mutationFlagFor,
  startWorkspaceSessionRunner as startRealRunner,
  type WorkspaceSessionStart,
} from '../../../src/components/workspace/workspace-session-runner'

export { mutationFlagFor, type WorkspaceSessionStart }

/** The latest runner started, its engine clock and the settings it has in effect now. */
interface LatestRunner {
  readonly runner: SessionRunner
  readonly now: () => number
  settings: SessionSettings
}

let latest: LatestRunner | null = null

/**
 * Intent: start the real workspace runner, keeping it as the latest, and follow the settings in
 * effect through its outputs before forwarding each unchanged.
 */
// @test-link [[service_workspace_session_runner_factory]]
export function startWorkspaceSessionRunner(
  deps: SessionRunnerDependencies,
  start: WorkspaceSessionStart,
): SessionRunner {
  const kept: { current: LatestRunner | null } = { current: null }
  const runner = startRealRunner(
    {
      ...deps,
      onOutput: (output) => {
        if (output.kind === 'settings-changed' && kept.current !== null)
          kept.current.settings = output.settings
        deps.onOutput(output)
      },
    },
    start,
  )
  kept.current = { runner, now: deps.now, settings: start.settings }
  latest = kept.current
  return runner
}

/**
 * Intent: send the latest runner a settings change now, on its engine clock: the settings in
 * effect with `controls` overriding some of their controls, the result validated as any controls
 * are (an unknown value throws). Throws with no runner started; the engine throws on a change of
 * tempo or instrument, or once its session has ended.
 */
// @test-link [[rule_session_change_applies_at_phrase_boundary]]
export function changeSettings(controls: Readonly<Record<string, string>>): void {
  if (latest === null) throw new Error('Workspace harness: changeSettings() with no session runner')
  const settings: SessionSettings = Object.freeze({
    controls: makeGenerationControls(Object.assign({}, latest.settings.controls, controls)),
    musicalProfile: latest.settings.musicalProfile,
  })
  latest.runner.dispatch({ kind: 'settings-change', at: latest.now(), settings })
}
