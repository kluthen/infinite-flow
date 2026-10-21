/**
 * The workspace's side of the preset actions and the preset sheet, kept small since it ships in
 * the first load: the player presets (./use-player-presets.ts) over the Idle session, the visit's
 * preset saves and its saving state; the buttons `preset-actions` holds, the ones it held at Start
 * kept for a whole session; and the sheet, loaded on demand (./load-preset-sheet.ts), opened in the
 * mode its button asks for, never during a session. `Save changes` inside the base's restriction
 * saves at once, with no sheet. What the sheet reports is applied through the player presets, and
 * it closes once applied; a deletion closes it once deleted, a failed one leaving it open. When it
 * closes, or after a one-click save, focus goes to the button that opened it if it is still shown
 * and enabled, else to `preset-select`.
 */
import {
  computed,
  nextTick,
  onScopeDispose,
  shallowRef,
  watch,
  type Component,
  type ComputedRef,
  type ShallowRef,
} from 'vue'

import type { PresetActionKind, PresetActionsRow } from '@/components/controls/preset-bar-model'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type {
  PresetIdSource,
  SaveRestrictionChoiceKind,
} from '@/domain/presets/preset-save-choices'
import type { Preset } from '@/domain/presets/preset-selection'
import type { SavedDataLoad } from '@/storage-bootstrap'
import type { SavingState } from '@/storage/save-policy'
import type { PresetSaves } from '@/storage/settings-saver'
import {
  loadPresetSheet,
  type PresetSheetOpening,
  type PresetSheetProps,
} from './load-preset-sheet'
import { usePlayerPresets, type PresetActionOutcome } from './use-player-presets'
import type { SessionControllerPhase } from './workspace-session-controller-types'

/** Where the player presets are kept: the visit's preset saves, and where a new one's id comes from. */
// @spec-link [[module_player_presets]]
export interface PresetStore {
  readonly saves: PresetSaves
  readonly nextPresetId: PresetIdSource
}

/** What the host needs. */
export interface PresetSheetDeps {
  readonly session: GenerationSession<WorkspaceSessionResult>
  /** The session controller's phase; null while it is not loaded. */
  readonly controllerPhase: () => SessionControllerPhase | null
  /** The load's outcome and the visit's save policy, whose saving state the presets follow. */
  readonly savedData: Pick<SavedDataLoad, 'outcome' | 'savePolicy'>
  readonly store: PresetStore
  /** Tell the notices that the save of the preset named `name` was refused. */
  readonly tellRefusedSave: (name: string) => void
  /** The mounted workspace, in which focus returns to `preset-actions` or `preset-select`. */
  readonly root: () => HTMLElement | null
}

/** The actions row, the sheet's host state and the reports that drive it. */
export interface PresetSheetHost {
  readonly row: ComputedRef<PresetActionsRow>
  readonly sheetComponent: Readonly<ShallowRef<Component | null>>
  readonly sheetProps: ComputedRef<PresetSheetProps | null>
  readonly sheetOpen: ComputedRef<boolean>
  /** A button of `preset-actions` pressed: open the sheet in its mode, or save at once. */
  readonly act: (action: PresetActionKind) => void
  readonly saveAsNew: (name: string, choice: SaveRestrictionChoiceKind) => void
  readonly saveChanges: (choice: SaveRestrictionChoiceKind) => void
  readonly rename: (name: string) => void
  readonly close: () => void
}

/**
 * Intent: the visit's saving state, read from its save policy once it arrives: off for a visit
 * started from the defaults until then, on for one that read its data.
 */
// @spec-link [[rule_presets_in_visits_that_save_nothing]]
// @spec-link [[rule_outdated_tab_stops_saving]]
function useSavingState(source: Pick<SavedDataLoad, 'outcome' | 'savePolicy'>) {
  const saving = shallowRef<SavingState>(
    source.outcome === 'started-from-defaults' ? 'off-unreadable' : 'on',
  )
  let unsubscribe: (() => void) | null = null
  let disposed = false
  void source.savePolicy.then((policy) => {
    if (disposed) return
    saving.value = policy.state()
    unsubscribe = policy.onStateChange((state) => {
      saving.value = state
    })
  })
  onScopeDispose(() => {
    disposed = true
    unsubscribe?.()
  })
  return saving
}

/**
 * Intent: host the preset actions and the sheet over the Idle session, the visit's saves and its
 * saving state. Pressing an action during a session is a defect: every button is disabled then.
 */
// @spec-link [[module_player_presets]]
// @spec-link [[rule_preset_management_actions]]
// @spec-link [[rule_save_changes_restriction]]
export function usePresetSheet(deps: PresetSheetDeps): PresetSheetHost {
  const saving = useSavingState(deps.savedData)
  const presets = usePlayerPresets({
    session: deps.session,
    controllerPhase: deps.controllerPhase,
    savingOff: () => saving.value !== 'on',
    saves: deps.store.saves,
    nextPresetId: deps.store.nextPresetId,
    tellRefusedSave: deps.tellRefusedSave,
  })
  const sheetComponent = shallowRef<Component | null>(null)
  const opened = shallowRef<PresetSheetOpening | null>(null)
  let opener: PresetActionKind = 'save-as-new'

  const liveRow = computed<PresetActionsRow>(() => ({
    saveChanges: presets.canSaveChanges.value,
    rename: presets.canRename.value,
    delete: presets.canDelete.value,
    limitReached: presets.limitReached.value,
  }))
  // The row a session started with, kept for its whole length whatever changes meanwhile.
  const heldRow = shallowRef<PresetActionsRow>(liveRow.value)
  watch(
    presets.sessionActive,
    (active) => {
      if (active) heldRow.value = liveRow.value
    },
    { flush: 'sync', immediate: true },
  )

  /** Intent: focus the button that opened the sheet if shown and enabled, else `preset-select`. */
  function focusAfterSheet(): void {
    const root = deps.root()
    if (root === null) throw new Error('preset sheet: the workspace is not mounted')
    const button = root.querySelector(`.preset-actions [data-preset-action="${opener}"]`)
    if (button instanceof HTMLButtonElement && !button.disabled) {
      button.focus()
      return
    }
    const select = root.querySelector('.preset-select')
    if (!(select instanceof HTMLElement)) throw new Error('preset sheet: no preset-select')
    select.focus()
  }

  /** Intent: close the sheet, then move focus once it has left. */
  function close(): void {
    opened.value = null
    void nextTick(focusAfterSheet)
  }

  /** Intent: the player preset acted on; an action on none is a defect (its button is absent). */
  function actedOn(): Preset {
    const preset = presets.actedOn.value
    if (preset === null) throw new Error('preset sheet: no player preset is acted on')
    return preset
  }

  /** Intent: how the sheet opens for `action`, from the state at the press. */
  function openingFor(action: PresetActionKind): PresetSheetOpening {
    if (action === 'save-as-new') {
      const choices = presets.saveAsNewChoices.value
      return { mode: 'save-as-new', suggestedName: presets.suggestedName.value, choices }
    }
    if (action === 'save-changes') {
      const choices = presets.saveChangesChoices.value
      if (choices === null) throw new Error('preset sheet: Save changes asks nothing here')
      return { mode: 'save-changes', preset: actedOn(), choices }
    }
    if (action === 'rename') return { mode: 'rename', preset: actedOn() }
    return { mode: 'delete', preset: actedOn() }
  }

  /** Intent: close the sheet once a save or a rename applied (a rename changing nothing too). */
  function closeOnce(outcome: PresetActionOutcome): void {
    if (outcome.status === 'applied' || outcome.status === 'unchanged') close()
  }

  const sheetProps = computed((): PresetSheetProps | null => {
    const opening = opened.value
    if (opening === null) return null
    return {
      opening,
      checkName: (typed) => presets.checkName(typed, opening.mode === 'rename' ? 'rename' : 'new'),
      deletePreset: async () => {
        if (opening.mode !== 'delete') throw new Error('preset sheet: no deletion is confirmed')
        const outcome = await presets.deletePreset(opening.preset.id)
        if (outcome !== 'failed') close()
        return outcome
      },
    }
  })

  return {
    row: computed(() => (presets.sessionActive.value ? heldRow.value : liveRow.value)),
    sheetComponent,
    sheetProps,
    sheetOpen: computed(() => sheetProps.value !== null),
    act: (action) => {
      if (presets.sessionActive.value) throw new Error('preset sheet: an action during a session')
      opener = action
      if (action === 'save-changes' && presets.saveChangesChoices.value === null) {
        presets.saveChanges()
        void nextTick(focusAfterSheet)
        return
      }
      const opening = openingFor(action)
      void loadPresetSheet().then((component) => {
        if (presets.sessionActive.value) return
        sheetComponent.value = component
        opened.value = opening
      })
    },
    saveAsNew: (name, choice) => closeOnce(presets.saveAsNew(name, choice)),
    saveChanges: (choice) => closeOnce(presets.saveChanges(choice)),
    rename: (name) => closeOnce(presets.rename(name)),
    close,
  }
}
