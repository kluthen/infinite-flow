/**
 * Lazy-loading boundary for the preset sheet (./PresetSheet.vue): nothing may import it statically
 * outside this file (type-only imports aside, erased in the build), so the sheet and its words
 * (./preset-sheet-copy.ts) stay out of the entry chunk. It also names how the sheet opens: the mode
 * its button asks for, with what that mode shows. `loadPresetSheet()` memoizes the import, so every
 * opening shares one fetch; a rejected import clears the memo before rethrowing, so the next
 * opening tries again.
 */
import type { Component } from 'vue'

import type { PresetNameCheck } from '@/domain/presets/preset-names'
import type { SaveRestrictionChoice } from '@/domain/presets/preset-save-choices'
import type { Preset } from '@/domain/presets/preset-selection'
import type { PresetDeletionOutcome } from './use-player-presets'

/**
 * How the sheet opens: Save as new, with the name it suggests and its Key and mode choices (the
 * default first); Save changes, asking the restriction of the player preset acted on; Rename it;
 * or the confirmation that deletes it.
 */
// @spec-link [[rule_preset_management_actions]]
export type PresetSheetOpening =
  | {
      readonly mode: 'save-as-new'
      readonly suggestedName: string
      readonly choices: readonly SaveRestrictionChoice[]
    }
  | {
      readonly mode: 'save-changes'
      readonly preset: Preset
      readonly choices: readonly SaveRestrictionChoice[]
    }
  | { readonly mode: 'rename'; readonly preset: Preset }
  | { readonly mode: 'delete'; readonly preset: Preset }

/** The sheet's props: how it opened, the name check of its mode, and the deletion it runs. */
// @spec-link [[rule_preset_management_actions]]
export interface PresetSheetProps {
  readonly opening: PresetSheetOpening
  /** Check a typed name for the mode's preset: a new one, or the one renamed. */
  readonly checkName: (typed: string) => PresetNameCheck
  /** Delete the preset acted on; the host closes the sheet once it is deleted. */
  readonly deletePreset: () => Promise<PresetDeletionOutcome>
}

let sheetPromise: Promise<Component> | null = null

/** Intent: the preset sheet's component, loaded once and shared by every opening. */
// @spec-link [[rule_preset_management_actions]]
export function loadPresetSheet(): Promise<Component> {
  sheetPromise ??= import('./PresetSheet.vue').then(
    (loaded) => loaded.default,
    (cause: unknown) => {
      sheetPromise = null
      throw cause
    },
  )
  return sheetPromise
}
