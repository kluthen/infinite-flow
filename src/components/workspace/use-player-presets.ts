/**
 * The player presets composable: the presets the Idle session knows (the eight built-ins, then the
 * player's), and the four preset actions, save as new, save changes, rename and delete, each
 * applying the preset model's rules. Every action changes the session's player presets and, where
 * the rules say, its selection through the session's preset-list action alone, which saves the
 * selection; the records are written or deleted through the visit's preset saves. It refuses
 * every action while a session runs, count-in included, and waits for no phrase being generated or
 * drawn. In a visit that saves nothing the actions change the list for the page only and write
 * nothing, and deletion is not offered. It never calls the pre-generation queue: the restriction
 * in force follows from the state the session action changes.
 */
import { computed, type ComputedRef } from 'vue'

import type {
  GenerationSessionActions,
  GenerationSessionState,
} from '@/composables/use-generation-session'
import type { KeyAndModeRestriction } from '@/domain/presets/key-and-mode-restriction'
import {
  checkPresetName,
  isPlayerPresetLimitReached,
  suggestedPresetName,
  type PresetNameCheck,
} from '@/domain/presets/preset-names'
import {
  presetForSaveAsNew,
  presetWithSavedChanges,
  saveAsNewChoices as saveAsNewChoicesFor,
  saveChangesQuestion,
  selectionOfSavedPreset,
  type PresetIdSource,
  type SaveRestrictionChoice,
  type SaveRestrictionChoiceKind,
} from '@/domain/presets/preset-save-choices'
import {
  findPreset,
  makePreset,
  selectionAfterDeleting,
  type Preset,
  type PresetId,
  type PresetSettings,
} from '@/domain/presets/preset-selection'
import type { PresetSaves } from '@/storage/settings-saver'
import type { SessionControllerPhase } from './workspace-session-controller-types'

/** A name refused by the name check, with its reason. */
export type PresetNameRefusal = Extract<PresetNameCheck, { readonly ok: false }>

/**
 * What a save as new, a save of changes or a rename did: applied, giving the preset as saved;
 * nothing, for a rename to the same name; or refused: a session runs, 50 or more player presets
 * are kept (save as new), or the name is refused, with its reason.
 */
// @spec-link [[module_player_presets]]
export type PresetActionOutcome =
  | { readonly status: 'applied'; readonly preset: Preset }
  | { readonly status: 'unchanged' }
  | { readonly status: 'session-running' }
  | { readonly status: 'limit-reached' }
  | { readonly status: 'name-refused'; readonly refusal: PresetNameRefusal }

/**
 * What a deletion did: deleted, the preset gone from the list; refused by the device, nothing
 * changed; not made as saving turned off meanwhile, nothing changed; or refused as a session runs.
 */
// @spec-link [[module_player_presets]]
export type PresetDeletionOutcome = 'deleted' | 'failed' | 'saving-off' | 'session-running'

/** What the composable reads and acts through. */
export interface PlayerPresetsDependencies {
  /** The Idle session: its presets, selection and settings read, its preset-list action. */
  readonly session: {
    readonly state: Pick<
      GenerationSessionState<unknown>,
      'presets' | 'selection' | 'controls' | 'figureLevels'
    >
    readonly actions: Pick<GenerationSessionActions, 'replacePlayerPresets'>
  }
  /** The session controller's phase; null while it is not loaded (no session can run). */
  readonly controllerPhase: () => SessionControllerPhase | null
  /** Whether the visit saves nothing: an outdated tab, or one whose saved data was not read. */
  readonly savingOff: () => boolean
  /** Where the player preset records are written and deleted. */
  readonly saves: PresetSaves
  /** Where a new player preset's id comes from. */
  readonly nextPresetId: PresetIdSource
  /** Tell the notices that the save of the preset named `name` was refused. */
  readonly tellRefusedSave: (name: string) => void
}

/** The presets, what the actions row offers, what the preset sheet asks, and the actions. */
export interface PlayerPresets {
  /** The presets the session knows: the built-ins, then the player presets. */
  readonly presets: ComputedRef<readonly Preset[]>
  /** The player preset acted on: the selected one, or Custom's base; null for none. */
  readonly actedOn: ComputedRef<Preset | null>
  /** True while a session runs, count-in included: every action is refused. */
  readonly sessionActive: ComputedRef<boolean>
  /** True while the visit saves nothing: nothing is written and deletion is not offered. */
  readonly savingOff: ComputedRef<boolean>
  /** True while 50 or more player presets are kept: save as new is refused. */
  readonly limitReached: ComputedRef<boolean>
  /** Whether the row offers Save changes: Custom based on a player preset. */
  readonly canSaveChanges: ComputedRef<boolean>
  /** Whether the row offers Rename preset: a player preset acted on. */
  readonly canRename: ComputedRef<boolean>
  /** Whether the row offers Delete preset: a player preset acted on, and saving on. */
  readonly canDelete: ComputedRef<boolean>
  /** The name a new preset is offered: "My preset", or the first numbered one not taken. */
  readonly suggestedName: ComputedRef<string>
  /** The restriction choices of save as new, the default first. */
  readonly saveAsNewChoices: ComputedRef<readonly SaveRestrictionChoice[]>
  /**
   * The restriction choices save changes asks, the default first, when the written key or the
   * collection lies outside the preset acted on's restriction; null when it asks nothing (one
   * click) or there is no player preset acted on.
   */
  readonly saveChangesChoices: ComputedRef<readonly SaveRestrictionChoice[] | null>
  /** Check a typed name for a new preset (`new`) or for renaming the one acted on (`rename`). */
  readonly checkName: (typed: string, mode: 'new' | 'rename') => PresetNameCheck
  /** Save the current preset-held settings as a new player preset; it becomes the selection. */
  readonly saveAsNew: (typedName: string, choice: SaveRestrictionChoiceKind) => PresetActionOutcome
  /**
   * Save the current preset-held settings into the player preset acted on; it becomes the
   * selection. `choice` answers the restriction question, given exactly when it is asked.
   */
  readonly saveChanges: (choice?: SaveRestrictionChoiceKind) => PresetActionOutcome
  /** Rename the player preset acted on; the selection and Custom's base stay. */
  readonly rename: (typedName: string) => PresetActionOutcome
  /** Delete the player preset `id`, once its record is deleted; resolves what became of it. */
  readonly deletePreset: (id: PresetId) => Promise<PresetDeletionOutcome>
}

/** Intent: the player presets of a list, in their order: every preset but the built-ins. */
function playerPresetsOf(presets: readonly Preset[]): readonly Preset[] {
  return presets.filter((preset) => preset.kind === 'player')
}

/** Intent: the restriction of `choice` among the offered ones; else a defect. */
function chosenRestriction(
  offered: readonly SaveRestrictionChoice[],
  choice: SaveRestrictionChoiceKind,
): KeyAndModeRestriction {
  const chosen = offered.find((candidate) => candidate.kind === choice)
  if (chosen === undefined) {
    throw new Error(`player presets: the save offers no "${choice}" restriction choice`)
  }
  return chosen.restriction
}

/**
 * Intent: the player presets of the visit and the four preset actions over `deps`. A save
 * changes the list and the selection at once, whatever becomes of its write, which is told to
 * the notices when refused; a deletion changes them only once its record is deleted.
 */
// @spec-link [[module_player_presets]]
// @spec-link [[rule_preset_management_actions]]
// @spec-link [[rule_presets_in_visits_that_save_nothing]]
export function usePlayerPresets(deps: PlayerPresetsDependencies): PlayerPresets {
  const { state, actions } = deps.session

  const presets = computed(() => state.presets)
  const actedOn = computed<Preset | null>(() => {
    const { selection } = state
    const id = selection.kind === 'preset' ? selection.presetId : selection.baseId
    const preset = id === null ? undefined : findPreset(state.presets, id)
    return preset?.kind === 'player' ? preset : null
  })
  /** Intent: whether a session runs now, count-in included: any controller phase but idle. */
  function isSessionActive(): boolean {
    const phase = deps.controllerPhase()
    return phase !== null && phase !== 'idle'
  }
  const saveAsNewChoices = computed(() =>
    saveAsNewChoicesFor(
      state.selection,
      state.controls.tonalCenter,
      state.controls.collection,
      state.presets,
    ),
  )
  const saveChangesChoices = computed(() => {
    const preset = actedOn.value
    if (preset === null) return null
    const question = saveChangesQuestion(
      preset,
      state.controls.tonalCenter,
      state.controls.collection,
    )
    return question.asks ? question.choices : null
  })

  /** Intent: the player preset acted on; an action needing one with none is a defect. */
  function requireActedOn(action: string): Preset {
    const preset = actedOn.value
    if (preset === null) throw new Error(`player presets: ${action} with no player preset acted on`)
    return preset
  }

  /** Intent: the current preset-held settings a save stores. */
  function currentSettings(): PresetSettings {
    return { controls: state.controls, levels: state.figureLevels }
  }

  /**
   * Intent: write a saved or renamed preset's record unless the visit saves nothing, telling the
   * notices once the write is refused. A defect of the saves rejects, unhandled, and surfaces.
   */
  // @spec-link [[rule_refused_preset_save_told]]
  // @spec-link [[rule_presets_in_visits_that_save_nothing]]
  function write(preset: Preset, save: 'savePreset' | 'saveRenamedPreset'): void {
    if (deps.savingOff()) return
    void deps.saves[save](preset).then((outcome) => {
      if (outcome === 'failed') deps.tellRefusedSave(preset.name)
    })
  }

  /** Intent: the player presets with `preset` in place of the one with its id. */
  function replaced(preset: Preset): readonly Preset[] {
    return playerPresetsOf(state.presets).map((kept) => (kept.id === preset.id ? preset : kept))
  }

  /**
   * Save as new: the current preset-held settings under the checked name and the restriction
   * chosen among those offered, under a new id; written, then listed and selected.
   */
  // @spec-link [[rule_saving_preset_asks_its_restriction]]
  // @spec-link [[rule_player_preset_names]]
  // @spec-link [[rule_player_preset_limit]]
  // @spec-link [[rule_player_preset_may_hold_unsupported_rhythm]]
  function saveAsNew(typedName: string, choice: SaveRestrictionChoiceKind): PresetActionOutcome {
    if (isSessionActive()) return { status: 'session-running' }
    if (isPlayerPresetLimitReached(state.presets)) return { status: 'limit-reached' }
    const check = checkPresetName(typedName, state.presets)
    if (!check.ok) return { status: 'name-refused', refusal: check }
    const restriction = chosenRestriction(saveAsNewChoices.value, choice)
    const preset = presetForSaveAsNew(
      { name: check.name, settings: currentSettings(), restriction },
      deps.nextPresetId,
      state.presets,
    )
    write(preset, 'savePreset')
    actions.replacePlayerPresets(
      [...playerPresetsOf(state.presets), preset],
      selectionOfSavedPreset(preset),
    )
    return { status: 'applied', preset }
  }

  /**
   * Save changes: the current preset-held settings into the player preset acted on, its
   * restriction kept inside it, or replaced by the answer outside it; written, then selected.
   */
  // @spec-link [[rule_save_changes_restriction]]
  // @spec-link [[rule_preset_management_actions]]
  function saveChanges(choice?: SaveRestrictionChoiceKind): PresetActionOutcome {
    if (isSessionActive()) return { status: 'session-running' }
    const base = requireActedOn('save changes')
    const asked = saveChangesChoices.value
    if ((asked === null) !== (choice === undefined)) {
      throw new Error(
        'player presets: save changes answers its restriction question exactly when asked',
      )
    }
    const restriction =
      asked === null || choice === undefined ? null : chosenRestriction(asked, choice)
    const preset = presetWithSavedChanges(base, currentSettings(), restriction)
    write(preset, 'savePreset')
    actions.replacePlayerPresets(replaced(preset), selectionOfSavedPreset(preset))
    return { status: 'applied', preset }
  }

  /**
   * Rename: the player preset acted on takes the checked name; the selection and Custom's base,
   * which name its id, stay. The same name, letter case included, changes nothing.
   */
  // @spec-link [[rule_player_preset_names]]
  function rename(typedName: string): PresetActionOutcome {
    if (isSessionActive()) return { status: 'session-running' }
    const target = requireActedOn('rename')
    const check = checkPresetName(typedName, state.presets, target.id)
    if (!check.ok) return { status: 'name-refused', refusal: check }
    if (check.name === target.name) return { status: 'unchanged' }
    const preset = makePreset({ ...target, name: check.name })
    write(preset, 'saveRenamedPreset')
    actions.replacePlayerPresets(replaced(preset))
    return { status: 'applied', preset }
  }

  /**
   * Delete: the record of the player preset `id` deleted; once it is, the preset leaves the list
   * and a selection that was it, or based on it, becomes Custom with no base and the same values.
   * A refused deletion, or one that found saving turned off, changes nothing.
   */
  // @spec-link [[rule_deleting_base_preset_leaves_custom]]
  // @spec-link [[rule_presets_in_visits_that_save_nothing]]
  async function deletePreset(id: PresetId): Promise<PresetDeletionOutcome> {
    if (isSessionActive()) return 'session-running'
    if (deps.savingOff()) throw new Error('player presets: no deletion while saving is off')
    if (findPreset(state.presets, id)?.kind !== 'player') {
      throw new Error(`player presets: no player preset has the id ${JSON.stringify(id)}`)
    }
    const outcome = await deps.saves.deletePreset(id)
    if (outcome === 'failed') return 'failed'
    if (outcome === 'skipped') return 'saving-off'
    if (outcome === 'held') throw new Error('player presets: a deletion was held by a session')
    actions.replacePlayerPresets(
      playerPresetsOf(state.presets).filter((preset) => preset.id !== id),
      selectionAfterDeleting(state.selection, id),
    )
    return 'deleted'
  }

  return {
    presets,
    actedOn,
    sessionActive: computed(isSessionActive),
    savingOff: computed(() => deps.savingOff()),
    limitReached: computed(() => isPlayerPresetLimitReached(state.presets)),
    canSaveChanges: computed(() => state.selection.kind === 'custom' && actedOn.value !== null),
    canRename: computed(() => actedOn.value !== null),
    canDelete: computed(() => actedOn.value !== null && !deps.savingOff()),
    suggestedName: computed(() => suggestedPresetName(state.presets)),
    saveAsNewChoices,
    saveChangesChoices,
    checkName: (typed, mode) =>
      checkPresetName(
        typed,
        state.presets,
        mode === 'rename' ? requireActedOn('rename').id : undefined,
      ),
    saveAsNew,
    saveChanges,
    rename,
    deletePreset,
  }
}
