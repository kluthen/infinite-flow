/**
 * What the workspace shell's musical controls show, for the shell: whether they are read-only, the
 * settings they show (the player's own, or during a session those of the phrase now sounding), and
 * the session's start settings, which the preset bar's description line keeps for the whole
 * session. A session never writes the player's own settings, so every end shows them, the
 * starting tempo included, again.
 */
import { computed, type ComputedRef } from 'vue'

import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { FigureLevels } from '@/domain/figures/figure-levels'
import type { PresetSelection } from '@/domain/presets/preset-selection'
import type { SessionSettings } from '@/session/session-types'
import type { SessionController } from './workspace-session-controller-types'

/** What the controls' readings follow; every getter is read reactively. */
// @spec-link [[rule_session_settings_locked]]
export interface ShownSettingsDeps {
  readonly idle: () => Readonly<GenerationSessionState<WorkspaceSessionResult>>
  /** The session controller; null while its lazy chunk loads. */
  readonly controller: () => SessionController | null
  /** True while a session runs, count-in included. */
  readonly sessionActive: () => boolean
}

/**
 * The settings the controls show, as `ControlPanel` takes them: the controls, the seven figure
 * levels and the preset selection (a preset, or Custom naming its base).
 */
// @spec-link [[rule_automatic_change_updates_controls_quietly]]
export interface ShownSettings {
  readonly controls: GenerationControls
  readonly figureLevels: FigureLevels
  readonly selection: PresetSelection
}

/** The controls' readings, all reactive. */
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[rule_automatic_change_updates_controls_quietly]]
export interface ShownSettingsView {
  readonly controlsReadonly: ComputedRef<boolean>
  readonly shownSettings: ComputedRef<ShownSettings>
  /** The settings the session started with during a session; null with no session. */
  readonly startSettings: ComputedRef<SessionSettings | null>
}

/** Intent: the controls' readings over `deps`, all computed from them. */
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[rule_automatic_change_updates_controls_quietly]]
// @spec-link [[rule_mutation_reverts_at_session_end]]
export function useShownSettings(deps: ShownSettingsDeps): ShownSettingsView {
  /**
   * Every musical control, tempo included, is read-only for the whole lifetime of any Idle
   * operation and of a session, through the same read-only treatment (values at full contrast).
   */
  // @spec-link [[rule_session_settings_locked]]
  // @spec-link [[rule_readonly_controls_keep_contrast]]
  const controlsReadonly = computed(() => deps.idle().operation !== 'idle' || deps.sessionActive())

  /**
   * The settings the controls show: during a session, those the controller says the phrase now
   * sounding was generated with, at the exact tempo in effect (off the tempo control's list once a
   * rising tempo has moved it), with their levels and selection (Custom once a Vary settings step
   * moved a preset-held setting); otherwise the player's own, which a session never writes, so
   * every end shows the starting tempo, the player's levels and selection again.
   */
  // @spec-link [[rule_automatic_change_updates_controls_quietly]]
  // @spec-link [[rule_mutation_reverts_at_session_end]]
  // @spec-link [[rule_adaptive_tempo_resets_after_session]]
  // @spec-link [[rule_vary_settings_marks_custom]]
  const shownSettings = computed((): ShownSettings => {
    const session = deps.controller()?.state.shownSettings ?? null
    if (session === null) {
      const { controls, figureLevels, selection } = deps.idle()
      return { controls, figureLevels, selection }
    }
    const tempo = deps.controller()?.state.sessionTempo ?? null
    if (tempo === null) throw new Error('workspace shell: a session shows settings but no tempo')
    return {
      controls: { ...session.controls, tempo },
      figureLevels: session.figureLevels,
      selection: session.selection,
    }
  })

  /**
   * The settings the session started with, as the controller holds them: what the preset bar's
   * description line reads for the whole session, so it keeps its text; null with no session.
   */
  // @spec-link [[rule_automatic_change_updates_controls_quietly]]
  // @spec-link [[module_preset_bar_model]]
  const startSettings = computed(() => deps.controller()?.state.startSettings ?? null)

  return { controlsReadonly, shownSettings, startSettings }
}
