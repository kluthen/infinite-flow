/**
 * The workspace's side of Jam's own settings (master spec C5.16): made once in the visit, from the
 * load's Jam records and session mode's current key, mode and tempo, the first time Jam mode shows,
 * through Jam's code (src/jam/jam-settings.ts, loaded on demand: only type imports of it here, so
 * the first load decodes nothing of Jam's); then kept for the visit, leaving and opening Jam mode
 * again included. It gives what Jam's view and controls read: Jam's settings, and the controls and
 * figure levels a Jam is generated with (Jam's own values with the shared instrument), and takes
 * the player's changes at Jam's Idle, each saved by Jam's code. A Jam session's Review reads Jam's
 * key and mode before Jam mode has shown (the load's records, or session mode's current values for
 * want of one, saving nothing), and its `Jam in {answer}` may make Jam's settings first: made for
 * the Review, they save no first values (change set W4, option (a)), and Jam mode, as it first
 * shows, starts from them and saves the first values still pending.
 */
import { computed, shallowRef, watch, type ComputedRef } from 'vue'

import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { FigureLevels } from '@/domain/figures/figure-levels'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import type {
  JamSettings,
  JamSettingsChange,
  JamSettingsStore,
  SessionModeStart,
} from '@/jam/jam-settings'
import type { JamKeyAndMode } from '@/jam/key-suggestion/key-suggestion'
import type { SaveSettings } from '@/storage/settings-saver'

import type { JamModeModule } from './load-jam-mode'
import type { JamSettingsCode } from './review-jam-ports'

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
  /**
   * Jam's written key and collection as a Jam session's Review judges its suggestion against:
   * Jam's settings', or, before they exist, what the load's records and session mode's current
   * values give, saving nothing.
   */
  readonly reviewKeyAndMode: (jam: JamSettingsCode) => JamKeyAndMode
  /**
   * The review's `Jam in {answer}`: Jam's key and mode changed and saved, Jam's settings made
   * first when they do not exist yet, saving no first values.
   */
  readonly changeFromReview: (jam: JamSettingsCode, change: JamKeyAndMode) => void
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

  /** Intent: session mode's current key, mode and tempo, which Jam's first values start from. */
  function sessionStart(): SessionModeStart {
    const { tempo, tonalCenter, collection } = seams.sessionControls()
    return { tempo, tonalCenter, collection }
  }

  /** Intent: Jam's settings made from the load's records and session mode's current values. */
  function made(loaded: JamSettingsCode, firstValuesDeferred: boolean): JamSettingsStore {
    return loaded.createJamSettings({
      records: seams.records(),
      session: sessionStart(),
      saveSettings: seams.saveSettings,
      firstValuesDeferred,
    })
  }

  watch(
    seams.jamShowing,
    (showing) => {
      if (!showing) return
      if (store.value !== null) {
        store.value.saveFirstValues()
        return
      }
      const loaded = module.value
      if (loaded === null) throw new Error("Jam's settings: Jam mode shows before its code loaded.")
      store.value = made(loaded, false)
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

  /**
   * Intent: Jam's key and mode for a Review: its settings', else the records' or session mode's
   * current values, read again at each call, so they follow session mode until Jam's settings
   * exist.
   */
  // @spec-link [[rule_jam_settings_first_values]]
  function reviewKeyAndMode(loaded: JamSettingsCode): JamKeyAndMode {
    const settings =
      store.value?.settings.value ??
      loaded.decodeJamSettings(seams.records(), sessionStart()).settings
    return { tonalCenter: settings.tonalCenter, collection: settings.collection }
  }

  /** Intent: `Jam in {answer}` from a Review: Jam's settings made first if need be, then changed. */
  // @spec-link [[rule_jam_settings_saved_on_change]]
  function changeFromReview(loaded: JamSettingsCode, change: JamKeyAndMode): void {
    store.value ??= made(loaded, true)
    store.value.change(change)
  }

  return {
    view,
    change: (change) => {
      if (store.value === null) throw new Error("Jam's settings: changed before Jam mode showed.")
      store.value.change(change)
    },
    reviewKeyAndMode,
    changeFromReview,
  }
}
