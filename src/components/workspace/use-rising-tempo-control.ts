/**
 * The screen's side of rising tempo (adaptive tempo), for the workspace shell: what the "During a
 * session" group's `Rising tempo` control shows, whether its `On` is available, and the tempo
 * field's reached-tempo note, all read from the session controller, which holds the page's flag.
 * Availability is judged live at Idle and while the Review shows; during a session the control
 * keeps the availability the session started with, whatever happens to the controller then. No
 * performance figure is read or shown here: only the flag and a tempo.
 */
import { computed, type ComputedRef } from 'vue'

import type { SessionController } from './workspace-session-controller-types'

/** The control's readings, all reactive. */
// @spec-link [[req_adaptive_tempo]]
export interface RisingTempoControl {
  /** The player's choice, kept while unavailable; off while the controller loads. */
  readonly on: ComputedRef<boolean>
  /** Whether `On` may be chosen (live at Idle, as at the start during a session). */
  readonly available: ComputedRef<boolean>
  /** The tempo the last session that ran rising tempo reached; null shows no note. */
  readonly lastSessionReachedTempo: ComputedRef<number | null>
}

/**
 * Intent: read the control's state from `controller` (null while its chunk loads, when the flag
 * is off and unavailable, as at page load, and no session has ended). During a session, count-in
 * included, availability is whether that session has a controller, fixed at its start exactly
 * when a controller was attached then; otherwise it is whether one is attached now.
 */
// @spec-link [[req_adaptive_tempo]]
// @spec-link [[rule_controller_attached_definition]]
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[rule_adaptive_tempo_resets_after_session]]
export function useRisingTempoControl(
  controller: () => SessionController | null,
): RisingTempoControl {
  return {
    on: computed(() => controller()?.state.adaptiveTempo ?? false),
    available: computed(() => {
      const state = controller()?.state
      if (state === undefined) return false
      if (state.phase !== 'idle') return state.sessionHasController === true
      return state.adaptiveTempoAvailable
    }),
    lastSessionReachedTempo: computed(() => controller()?.state.lastSessionReachedTempo ?? null),
  }
}
