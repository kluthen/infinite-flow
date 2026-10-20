/**
 * The migration step to data version 3 (v3.1): it creates the `presets` store, empty, where the
 * player presets live, and carries v3.0's musical-profile selection over to the preset selection
 * and the seven figure levels. Neutral or Jazz becomes that built-in preset, selected; customized,
 * Custom based on it; and the levels are that built-in's, the ones v3.0's profile generated with.
 * The step compares no saved value with the preset's: the load's "the values win" rule does that
 * at every load. Every other settings record, and every other store, is left as it is.
 *
 * The step never throws for anything stored. A throw from a request callback would escape the
 * migration runner's guard and abort the upgrade, and every later open of the database would then
 * fail on the same record; so reading v3.0's record and writing its replacement are guarded, and
 * a record that cannot be read is left as it is, nothing written in its place: the load then
 * gives the first-load selection and levels. A failing request (a quota error, say) is not
 * prevented: it aborts the upgrade, which a later open then runs again.
 */

import type { MusicalProfile } from '@/domain/controls/generation-controls'
import { deepFreeze } from '@/domain/events/deep-freeze'
import { FIGURE_IDS } from '@/domain/figures/figure-levels'
import type { BuiltInPresetId } from '@/domain/presets/built-in-presets'
import type { PresetSelection } from '@/domain/presets/preset-selection'

import type { MigrationStep } from '../database'
import { storedProfileLevels } from '../records/profile-to-levels'
import {
  decodeV30ProfileSelectionRecord,
  encodeSettingRecord,
  V30_PROFILE_SELECTION_KEY,
  type SettingRecord,
} from '../records/settings-record'

/** The built-in preset each of v3.0's two musical profiles becomes. */
const PRESET_OF_PROFILE: Readonly<Record<MusicalProfile, BuiltInPresetId>> = deepFreeze({
  Neutral: 'neutral',
  Jazz: 'jazz',
})

/**
 * Intent: the settings records that replace a stored v3.0 selection record, written by
 * `appVersion`: the seven level records, the built-in's levels, then the preset selection, that
 * built-in selected, or Custom based on it when it was customized. No saved control is compared
 * with the preset. Null for a record that cannot be read, which is then left as it is. Never
 * throws: any error reading the stored value gives null.
 */
// @spec-link [[module_settings_upgrade_step]]
// @spec-link [[rule_saved_profile_becomes_preset]]
export function upgradedSelectionRecords(
  stored: unknown,
  appVersion: string,
): readonly SettingRecord[] | null {
  try {
    const saved = decodeV30ProfileSelectionRecord(stored)
    if (saved === null) return null
    const presetId = PRESET_OF_PROFILE[saved.musicalProfile]
    const selection: PresetSelection = saved.isCustom
      ? { kind: 'custom', baseId: presetId }
      : { kind: 'preset', presetId }
    const levels = storedProfileLevels(saved)
    return [
      ...FIGURE_IDS.map((figure) =>
        encodeSettingRecord(`figureLevels.${figure}`, levels[figure], appVersion),
      ),
      encodeSettingRecord('presetSelection', selection, appVersion),
    ]
  } catch {
    // Deliberately any error, a refusal or not: v3.0's record stays as it is and the load gives
    // the first-load selection and levels, rather than abort the upgrade every later open would
    // then fail on.
    return null
  }
}

/**
 * The migration step to data version 3: it creates the empty `presets` store (out-of-line keys,
 * no index), then replaces v3.0's selection record, when it can read it, with the level records
 * and the preset selection record, written by the app version the database is opened with.
 */
// @spec-link [[module_settings_upgrade_step]]
// @spec-link [[rule_saved_profile_becomes_preset]]
export const SETTINGS_V3: MigrationStep = {
  toVersion: 3,
  migrate: ({ database, transaction, appVersion }) => {
    database.createObjectStore('presets')
    const settings = transaction.objectStore('settings')
    const read = settings.get(V30_PROFILE_SELECTION_KEY)
    read.onsuccess = () => {
      try {
        const records = upgradedSelectionRecords(read.result, appVersion)
        if (records === null) return
        for (const record of records) settings.put(record, record.key)
        settings.delete(V30_PROFILE_SELECTION_KEY)
      } catch {
        // A throw here would escape the migration runner's guard and abort the upgrade every
        // later open would then fail on; the settings stay as far as they were written instead,
        // and the load reads each one it can and gives every other its first-load value.
      }
    }
  },
}
