/**
 * The shared mount of the control panel for its specs: the panel at Idle with the built-in presets,
 * the neutral figure levels, no my instrument and a built-in selection's preset actions.
 */
import { mount } from '@vue/test-utils'

import ControlPanel from '@/components/controls/ControlPanel.vue'
import type { PresetActionsRow, SessionStartSettings } from '@/components/controls/preset-bar-model'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { BUILT_IN_PRESETS, DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import type { Preset, PresetSelection } from '@/domain/presets/preset-selection'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation-scales'

/** The actions row of a built-in selection: Save as new preset alone. */
const NO_PRESET_ACTIONS: PresetActionsRow = {
  saveChanges: false,
  rename: false,
  delete: false,
  limitReached: false,
}

/**
 * Intent: mount the control panel showing `controls` and `selection` among `presets`, readonly
 * (its session options too) when `readonly`, with `startSettings` as the session's start settings.
 */
export function mountPanel(
  controls: GenerationControls = DEFAULT_GENERATION_CONTROLS,
  selection: PresetSelection = DEFAULT_PRESET_SELECTION,
  readonly = false,
  presets: readonly Preset[] = BUILT_IN_PRESETS,
  startSettings: SessionStartSettings | null = null,
) {
  return mount(ControlPanel, {
    props: {
      controls,
      figureLevels: NEUTRAL_FIGURE_LEVELS,
      selection,
      presets,
      readonly,
      noteDensityContext: { belowTabletLandscape: false, sessionSteppedDown: false },
      risingTempo: false,
      risingTempoAvailable: false,
      lastSessionReachedTempo: null,
      varySettings: false,
      varySettingsAvailable: true,
      allowedGroups: ALL_GROUPS_ALLOWED,
      rhythmLockOn: false,
      allowedRhythmChanges: [],
      tensionAcrossPhrases: false,
      sessionOptionsReadonly: readonly,
      startSettings,
      myInstrument: null,
      instrumentActionsDisabled: false,
      presetActions: NO_PRESET_ACTIONS,
      presetActionsDisabled: false,
    },
  })
}
