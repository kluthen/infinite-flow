/**
 * Storage's one mapping from a stored musical profile selection to the figure levels it stands
 * for. A phrase kept by v3.0 holds a profile selection (Neutral or Jazz, and whether it was
 * customized) and no levels; the kept-session codec reads such a phrase's levels here, and the
 * upgrade step that carries v3.0's kept sessions over to the levels (chunk 9) reuses it, so a
 * session read before the upgrade and the same session carried over by it hold the same levels.
 * No other storage file maps a profile to levels.
 *
 * Pure: no database, no clock. A stored selection that is not exactly a known profile and a
 * customized flag is refused as a KeptRecordError, never defaulted.
 */

import { MUSICAL_PROFILES } from '@/domain/controls/generation-controls'
import type { ProfileSelection } from '@/domain/controls/profile-selection'
import { levelsForProfile, type FigureLevels } from '@/domain/figures/figure-levels'

import { exactRecord, KeptRecordError } from './kept-record-shape'

/**
 * Intent: a stored musical profile selection: exactly a known profile and a boolean customized
 * flag, as a v3.0 phrase's intent and a kept session's session-wide record hold it; a missing,
 * extra or unknown field is refused, never defaulted.
 */
// @spec-link [[module_stored_profile_to_levels]]
export function parseStoredProfileSelection(value: unknown, context: string): ProfileSelection {
  const record = exactRecord(value, ['musicalProfile', 'isCustom'], context)
  const musicalProfile = MUSICAL_PROFILES.find((profile) => profile === record.musicalProfile)
  if (musicalProfile === undefined)
    throw new KeptRecordError(`${context}.musicalProfile is unknown.`)
  if (typeof record.isCustom !== 'boolean')
    throw new KeptRecordError(`${context}.isCustom must be a boolean.`)
  return { musicalProfile, isCustom: record.isCustom }
}

/**
 * Intent: the figure levels a stored musical profile selection stands for: its profile's levels,
 * Neutral's or Jazz's, whatever its customized flag, since being customized never changed the
 * figures. Returns a fresh frozen copy.
 */
// @spec-link [[module_stored_profile_to_levels]]
export function storedProfileLevels(selection: ProfileSelection): FigureLevels {
  return levelsForProfile(selection.musicalProfile)
}
