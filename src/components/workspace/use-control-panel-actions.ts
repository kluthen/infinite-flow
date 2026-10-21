/**
 * The control panel's setting events, for the workspace shell: each one forwarded onto the
 * session's own action (a control, a figure level, the instrument profile, a preset). The panel
 * has already validated the event; the phrase on screen stays.
 */
import type { SettableControlKey } from '@/components/controls/set-control-event'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { FigureId, FigureLevel } from '@/domain/figures/figure-levels'
import type { PresetId } from '@/domain/presets/preset-selection'

/** The panel's setting-event handlers. */
export interface ControlPanelActions {
  readonly setControl: <K extends SettableControlKey>(payload: {
    readonly key: K
    readonly value: GenerationControls[K]
  }) => void
  readonly setFigureLevel: (payload: {
    readonly figure: FigureId
    readonly level: FigureLevel
  }) => void
  readonly selectInstrumentProfile: (id: GenerationControls['instrumentProfileId']) => void
  readonly selectPreset: (id: PresetId) => void
}

/** Intent: build the handlers that forward the control panel's setting events onto `session`. */
export function useControlPanelActions(
  session: GenerationSession<WorkspaceSessionResult>,
): ControlPanelActions {
  /** Intent: forward one control-group's validated set-control event onto the session's action. */
  function setControl<K extends SettableControlKey>(payload: {
    readonly key: K
    readonly value: GenerationControls[K]
  }): void {
    session.actions.setControl(payload.key, payload.value)
  }

  /**
   * Intent: forward a figure level change onto the session's one figure-level action, which makes
   * Custom and, through the queue's key, discards the pre-generated phrases; the phrase on screen
   * stays.
   */
  // @spec-link [[module_figure_level_options]]
  // @spec-link [[rule_custom_selection]]
  function setFigureLevel(payload: {
    readonly figure: FigureId
    readonly level: FigureLevel
  }): void {
    session.actions.setFigureLevel(payload.figure, payload.level)
  }

  /** Intent: forward an instrument-profile selection onto the session's dedicated action. */
  function selectInstrumentProfile(id: GenerationControls['instrumentProfileId']): void {
    void session.actions.selectInstrumentProfile(id)
  }

  /** Intent: forward a preset choice onto the session's own action; the phrase on screen stays. */
  // @spec-link [[rule_choosing_preset_sets_its_settings]]
  function selectPreset(id: PresetId): void {
    session.actions.selectPreset(id)
  }

  return { setControl, setFigureLevel, selectInstrumentProfile, selectPreset }
}
