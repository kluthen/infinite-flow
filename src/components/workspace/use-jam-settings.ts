/**
 * The workspace's side of Jam's own settings (master spec C5.16): made once in the visit, from the
 * load's Jam records and session mode's current key, mode and tempo, the first time Jam mode shows,
 * through Jam's code (src/jam/jam-settings.ts, loaded on demand: only type imports of it here, so
 * the first load decodes nothing of Jam's); then kept for the visit, leaving and opening Jam mode
 * again included. It gives what Jam's view and controls read: Jam's settings, and the controls and
 * figure levels a Jam is generated with (Jam's own values with the shared instrument), and takes
 * the player's changes at Jam's Idle, each saved by Jam's code.
 */
import { computed, shallowRef, watch, type ComputedRef } from 'vue'

import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { FigureLevels } from '@/domain/figures/figure-levels'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import type { JamSettings, JamSettingsChange, JamSettingsStore } from '@/jam/jam-settings'
import type { SaveSettings } from '@/storage/settings-saver'

import type { JamModeModule } from './load-jam-mode'

/** What Jam's settings are read from in the workspace. */
// @spec-link [[module_jam_settings]]
export interface JamSettingsSeams {
  /** Jam's code, once loaded in this visit; null before. */
  readonly jamModule: () => JamModeModule | null
  /** Jam mode shows (its code loaded). */
  readonly jamShowing: () => boolean
  /** Jam's settings records as the load handed them, undecoded. */
  readonly records: () => readonly unknown[]
  /** Session mode's current controls, which Jam's key, mode and tempo first start from. */
  readonly sessionControls: () => GenerationControls
  /** The shared instrument now, session mode's. */
  readonly instrumentProfileId: () => InstrumentProfileId
  /** The visit's saver. */
  readonly saveSettings: SaveSettings
}

/** Jam's settings and what a Jam is generated with from them. */
// @spec-link [[module_jam_settings]]
export interface JamSettingsView {
  readonly settings: JamSettings
  readonly controls: GenerationControls
  readonly figureLevels: FigureLevels
}

/** Jam's settings in the workspace: null until Jam mode first shows in the visit. */
// @spec-link [[module_jam_settings]]
export interface WorkspaceJamSettings {
  readonly view: ComputedRef<JamSettingsView | null>
  /** A change of the player's at Jam's Idle; one before Jam's settings exist is a defect. */
  readonly change: (change: JamSettingsChange) => void
}

/**
 * Intent: Jam's settings, made the first time Jam mode shows in the visit (synchronously, as the
 * mode changes, so Jam's controls are drawn with them), and kept for the rest of the visit.
 */
// @spec-link [[module_jam_settings]]
// @spec-link [[rule_jam_settings_first_values]]
export function useJamSettings(seams: JamSettingsSeams): WorkspaceJamSettings {
  const store = shallowRef<JamSettingsStore | null>(null)
  const module = computed(() => seams.jamModule())

  watch(
    seams.jamShowing,
    (showing) => {
      if (!showing || store.value !== null) return
      const loaded = module.value
      if (loaded === null) throw new Error("Jam's settings: Jam mode shows before its code loaded.")
      const { tempo, tonalCenter, collection } = seams.sessionControls()
      store.value = loaded.createJamSettings({
        records: seams.records(),
        session: { tempo, tonalCenter, collection },
        saveSettings: seams.saveSettings,
      })
    },
    { flush: 'sync', immediate: true },
  )

  const view = computed((): JamSettingsView | null => {
    const loaded = module.value
    if (store.value === null || loaded === null) return null
    const settings = store.value.settings.value
    return {
      settings,
      controls: loaded.jamGenerationControls(settings, seams.instrumentProfileId()),
      figureLevels: loaded.jamFigureLevels(settings.embellishments),
    }
  })

  return {
    view,
    change: (change) => {
      if (store.value === null) throw new Error("Jam's settings: changed before Jam mode showed.")
      store.value.change(change)
    },
  }
}
