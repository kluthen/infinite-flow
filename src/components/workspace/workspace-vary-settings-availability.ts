/**
 * Whether `Vary settings` is available, for the session controller: whether a session started now
 * would have at least one move (chunk 15's legal-move check), judged on the settings Start would
 * take, the player's rhythm lock and allowed groups with them, under the context phrase 1 gives.
 * Judged live at Idle and while the Review shows; during a session, count-in included, it keeps
 * the judgement it had when the session left Idle. The player's `Vary settings` choice is never
 * touched here: an unavailable `On` is only shown off, and a session started meanwhile runs
 * without it (the session start runs the same check).
 */
import { computed, shallowRef, watch } from 'vue'

import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { mutationContextAtStart } from '@/session/session-mutation-step'
import { hasLegalMove } from '@/session/settings-mutation'
import type { SessionControllerPhase } from './workspace-session-controller-types'
import { chosenSessionSettings, type LockAndGroupsChoices } from './workspace-session-lock-choices'

/** The availability's reading and its teardown. */
// @spec-link [[rule_vary_settings_needs_legal_move]]
export interface VarySettingsAvailability {
  /** Whether a move exists: live outside a session, as when the session left Idle during one. */
  readonly available: () => boolean
  /** Stop watching the phase; call once. */
  readonly dispose: () => void
}

/**
 * Intent: build the availability over the Idle state, the controller's phase and the player's
 * lock and groups, all read reactively. At Idle it is the legal-move check on the settings Start
 * would take now, under the context phrase 1 gives at the current window width; with no phrase 1,
 * or while an Idle generation runs (no session can start then, and the controls are read-only),
 * it keeps its last judgement, available before any. The
 * judgement in force when the phase leaves Idle is held for the whole session.
 */
// @spec-link [[rule_vary_settings_needs_legal_move]]
// @spec-link [[rule_vary_settings_allowed_groups]]
// @spec-link [[module_session_lock_and_groups_choices]]
export function createVarySettingsAvailability(
  idle: Readonly<GenerationSessionState<WorkspaceSessionResult>>,
  phase: () => SessionControllerPhase,
  choices: () => LockAndGroupsChoices,
): VarySettingsAvailability {
  let lastJudged = true
  const live = computed(() => {
    const phraseOne = idle.result
    if (phraseOne === null || idle.operation !== 'idle') return lastJudged
    const settings = chosenSessionSettings(idle, choices(), phraseOne.intent)
    const context = mutationContextAtStart(phraseOne, idle.noteDensityContext.belowTabletLandscape)
    lastJudged = hasLegalMove(settings, context)
    return lastJudged
  })
  const atSessionStart = shallowRef(true)
  const stop = watch(
    () => phase() === 'idle',
    (atIdle) => {
      if (!atIdle) atSessionStart.value = live.value
    },
    { flush: 'sync' },
  )
  return {
    available: () => (phase() === 'idle' ? live.value : atSessionStart.value),
    dispose: stop,
  }
}
