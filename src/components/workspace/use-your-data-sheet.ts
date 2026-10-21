/**
 * The Your data sheet's model (ui_ux screens/your-data, flows/saved-data Your Data), loaded on
 * demand with the sheet (./YourDataSheet.vue): the form the sheet takes from the load's outcome and
 * the save policy's saving state, followed while it is open (a tab turning outdated, another tab's
 * Delete everything included, takes the outdated form at once); the counts, from the rows the
 * session controller holds for the visit (the sessions the list shows); the space used and whether
 * the browser protects the data, read from the save policy when the sheet opens and again after
 * each deletion; `Keep my played notes`, saved as it turns and handed to the controller; the player
 * presets, in the preset box's Your presets order; and the one confirmation that may be open, with
 * its way through. A deletion is made through the controller (every session, every kept played
 * note), the player presets (one preset, exactly as Delete preset makes it) or the save policy
 * (Delete everything, then the page reloads); a refusal keeps its confirmation with its error
 * line, the confirming action trying again; a confirmation open when the visit stops saving
 * closes, deleting nothing, while a deletion already running finishes.
 */
import { computed, onScopeDispose, shallowRef, watch, type ComputedRef, type ShallowRef } from 'vue'

import { playerPresetsInBoxOrder } from '@/components/controls/preset-bar-model'
import type { Preset } from '@/domain/presets/preset-selection'
import type { SavedDataLoad } from '@/storage-bootstrap'
import type { SavePolicy, SavingState } from '@/storage/save-policy'
import type { SaveSettings } from '@/storage/settings-saver'
import { databaseBytes } from '@/storage/storage-estimate'
import { StorageError } from '@/storage/storage-port'
import type {
  ProtectionReading,
  SpaceReading,
  YourDataConfirmationKind,
  YourDataForm,
} from './your-data-copy'
import type { KeptSessionRow } from './use-kept-sessions'
import type { PlayerPresets, PresetDeletionOutcome } from './use-player-presets'
import type { SessionController, SessionDeletion } from './workspace-session-controller-types'

/**
 * The confirmation open in the sheet: its kind, the sessions or the preset it concerns, and how it
 * stands.
 */
export interface YourDataConfirmation {
  readonly kind: YourDataConfirmationKind
  /** For a preset's: the player preset it deletes; else null. */
  readonly preset: Preset | null
  /** For the played notes already kept: the sessions read at the switch; else unused. */
  readonly readCount: number
  readonly failed: boolean
  readonly busy: boolean
}

/** What the sheet's model reads and acts through. */
export interface YourDataSheetDependencies {
  readonly controller: SessionController
  readonly savedData: Pick<SavedDataLoad, 'outcome' | 'savePolicy'>
  readonly saveSettings: SaveSettings
  /** The player presets: those the preset box lists, and their deletion. */
  readonly presets: Pick<PlayerPresets, 'presets' | 'deletePreset'>
  readonly reloadPage: () => void
  /** The visit stopped saving while a confirmation was open: it closed; focus goes to `Done`. */
  readonly forcedBack: () => void
}

/** What became of a confirmation's confirming action. */
export type YourDataConfirmed = 'overview' | 'failed' | 'reloading'

/** The sheet's model. */
export interface YourDataSheet {
  readonly form: ComputedRef<YourDataForm>
  /** The sessions the list shows, how many are pinned, and their favorite phrases. */
  readonly sessions: ComputedRef<{ count: number; pinned: number; favorites: number }>
  /** The sessions whose played notes are kept, as their rows say. */
  readonly playedNotesCount: ComputedRef<number>
  readonly keepPlayedNotes: ComputedRef<boolean>
  /** The player presets the preset box lists, in its Your presets order. */
  readonly playerPresets: ComputedRef<readonly Preset[]>
  readonly space: Readonly<ShallowRef<SpaceReading>>
  readonly protection: Readonly<ShallowRef<ProtectionReading>>
  readonly confirmation: Readonly<ShallowRef<YourDataConfirmation | null>>
  /** The sessions the open confirmation concerns now, as its first paragraph counts them. */
  readonly confirmationCount: ComputedRef<number>
  /** Open the confirmation of `kind`, from its Overview button. */
  readonly ask: (kind: Exclude<YourDataConfirmationKind, 'kept-played-notes' | 'preset'>) => void
  /** Open the confirmation of deleting the player preset `preset`, from its row's `Delete`. */
  readonly askToDelete: (preset: Preset) => void
  /** `Keep my played notes` turned: saved, handed on; resolves whether its confirmation opened. */
  readonly toggleKeepPlayedNotes: () => Promise<boolean>
  /** The confirming action: run the open confirmation's deletion. */
  readonly confirm: () => Promise<YourDataConfirmed>
  /** The way back (also Close, Escape, the backdrop): to the Overview; nothing while busy. */
  readonly back: () => boolean
}

/** Intent: the form the sheet takes from the load's outcome and the saving state. */
// @spec-link [[rule_outdated_tab_stops_saving]]
// @spec-link [[rule_failed_read_offers_only_delete_everything]]
export function yourDataForm(outcome: SavedDataLoad['outcome'], saving: SavingState): YourDataForm {
  if (saving === 'on') return 'overview'
  if (saving === 'off-unreadable') return 'unreadable'
  return outcome === 'saved-data-read' ? 'outdated' : 'outdated-defaults'
}

/** Intent: the pinned and favorites facts a row holds, a newer one's as far as it can be read. */
function rowFacts(row: KeptSessionRow): { pinned: boolean; favorites: number; kept: boolean } {
  if (row.kind === 'current') {
    const { pinned, favoritesCount, playedNotesKept } = row.summary
    return { pinned, favorites: favoritesCount, kept: playedNotesKept }
  }
  const { pinned, favoritesCount, playedNotesKept } = row.readable
  return { pinned: pinned ?? false, favorites: favoritesCount ?? 0, kept: playedNotesKept ?? false }
}

/** Intent: whether a deletion refused as outdated, or a plain refusal; anything else is a defect. */
function refusalOf(error: unknown): 'outdated' | 'refused' {
  if (!(error instanceof StorageError)) throw error
  return error.kind === 'outdated' ? 'outdated' : 'refused'
}

/**
 * Intent: what became of a preset's deletion, as a deletion of the sheet. A session running is a
 * defect: the sheet never opens during one.
 */
// @spec-link [[rule_deleting_base_preset_leaves_custom]]
function presetDeletion(outcome: PresetDeletionOutcome): SessionDeletion {
  if (outcome === 'session-running') throw new Error('your data: a preset deleted during a session')
  return outcome === 'failed' ? 'refused' : outcome
}

/**
 * Intent: the sheet's model over the controller, the player presets, the load and the saver, for
 * as long as the sheet's scope lives: the saving state followed, the space and protection read at
 * once.
 */
// @spec-link [[req_your_data]]
// @spec-link [[rule_delete_everything]]
// @spec-link [[rule_kept_played_notes_deletable]]
// @spec-link [[rule_persistent_storage_requested]]
// @spec-link [[rule_outdated_tab_stops_saving]]
// @spec-link [[rule_failed_read_offers_only_delete_everything]]
// @spec-link [[rule_deleting_base_preset_leaves_custom]]
// @spec-link [[rule_presets_in_visits_that_save_nothing]]
export function useYourDataSheet(deps: YourDataSheetDependencies): YourDataSheet {
  const { controller, savedData } = deps
  const saving = shallowRef<SavingState>(
    savedData.outcome === 'started-from-defaults' ? 'off-unreadable' : 'on',
  )
  const space = shallowRef<SpaceReading>({ kind: 'measuring' })
  const protection = shallowRef<ProtectionReading>('checking')
  const confirmation = shallowRef<YourDataConfirmation | null>(null)
  let unsubscribe: (() => void) | null = null
  let disposed = false

  /** Intent: read the space used and the protection again from the save policy. */
  const measure = (policy: SavePolicy): void => {
    space.value = { kind: 'measuring' }
    protection.value = 'checking'
    policy.estimate().then(
      (estimate) => {
        const bytes = databaseBytes(estimate)
        space.value = bytes === null ? { kind: 'unmeasured' } : { kind: 'measured', bytes }
      },
      (error: unknown) => {
        refusalOf(error)
        space.value = { kind: 'unmeasured' }
      },
    )
    policy.persisted().then(
      (persisted) => {
        protection.value = persisted ? 'protected' : 'not-protected'
      },
      (error: unknown) => {
        refusalOf(error)
        protection.value = 'not-protected'
      },
    )
  }

  void savedData.savePolicy.then((policy) => {
    if (disposed) return
    saving.value = policy.state()
    unsubscribe = policy.onStateChange((state) => {
      saving.value = state
    })
    measure(policy)
  })
  onScopeDispose(() => {
    disposed = true
    unsubscribe?.()
  })

  const form = computed(() => yourDataForm(savedData.outcome, saving.value))
  const facts = computed(() => controller.state.keptRows.map(rowFacts))
  const sessions = computed(() => ({
    count: facts.value.length,
    pinned: facts.value.filter((row) => row.pinned).length,
    favorites: facts.value.reduce((sum, row) => sum + row.favorites, 0),
  }))
  const playedNotesCount = computed(() => facts.value.filter((row) => row.kept).length)
  const confirmationCount = computed(() => {
    const open = confirmation.value
    if (open === null) return 0
    if (open.kind === 'every-session') return sessions.value.count
    if (open.kind === 'all-played-notes') return playedNotesCount.value
    if (open.kind === 'preset') return 0
    return open.readCount
  })

  // A confirmation open when the visit stops saving gives way to the Overview, deleting nothing;
  // one whose deletion runs is not interrupted.
  watch(form, (next) => {
    const open = confirmation.value
    if (next === 'overview' || open === null || open.busy) return
    confirmation.value = null
    deps.forcedBack()
  })

  /** Intent: run the open confirmation's deletion; what it became, a refusal told as such. */
  const deletion = async (open: YourDataConfirmation): Promise<SessionDeletion> => {
    if (open.kind === 'every-session') return controller.deleteEverySession()
    if (open.kind === 'preset') {
      if (open.preset === null) throw new Error("your data: a preset's confirmation names none")
      return presetDeletion(await deps.presets.deletePreset(open.preset.id))
    }
    if (open.kind !== 'everything') return controller.deleteEveryKeptPlayedNote()
    try {
      await (await savedData.savePolicy).deleteEverything()
      return 'deleted'
    } catch (error) {
      return refusalOf(error) === 'outdated' ? 'saving-off' : 'refused'
    }
  }

  /** Intent: open the confirmation of deleting `preset`, offered only on the Overview. */
  // @spec-link [[rule_deleting_base_preset_leaves_custom]]
  const askToDelete = (preset: Preset): void => {
    if (form.value !== 'overview' || confirmation.value !== null)
      throw new Error("your data: a preset's confirmation is not offered now")
    confirmation.value = { kind: 'preset', preset, readCount: 0, failed: false, busy: false }
  }

  /** Intent: confirm: the Overview once deleted (the page reloading after Delete everything). */
  const confirm = async (): Promise<YourDataConfirmed> => {
    const open = confirmation.value
    if (open === null || open.busy) throw new Error('your data: no confirmation to confirm')
    confirmation.value = { ...open, failed: false, busy: true }
    const outcome = await deletion(open)
    if (outcome === 'refused') {
      confirmation.value = { ...open, failed: true, busy: false }
      return 'failed'
    }
    confirmation.value = null
    if (outcome === 'deleted' && open.kind === 'everything') {
      deps.reloadPage()
      return 'reloading'
    }
    void savedData.savePolicy.then(measure)
    return 'overview'
  }

  return {
    form,
    sessions,
    playedNotesCount,
    keepPlayedNotes: computed(() => controller.state.keepPlayedNotes),
    playerPresets: computed(() => playerPresetsInBoxOrder(deps.presets.presets.value)),
    space,
    protection,
    confirmation,
    confirmationCount,
    ask: (kind) => {
      const offered =
        kind === 'everything' ? !form.value.startsWith('outdated') : form.value === 'overview'
      if (!offered || confirmation.value !== null)
        throw new Error(`your data: the ${kind} confirmation is not offered now`)
      confirmation.value = { kind, preset: null, readCount: 0, failed: false, busy: false }
    },
    askToDelete,
    toggleKeepPlayedNotes: async () => {
      const on = !controller.state.keepPlayedNotes
      deps.saveSettings({ keepPlayedNotes: on })
      const outcome = await controller.setKeepPlayedNotes(on)
      if (outcome.kind !== 'confirm-deletion' || form.value !== 'overview') return false
      const readCount = outcome.sessionCount
      confirmation.value = {
        kind: 'kept-played-notes',
        preset: null,
        readCount,
        failed: false,
        busy: false,
      }
      return true
    },
    confirm,
    back: () => {
      if (confirmation.value?.busy === true) return false
      confirmation.value = null
      return true
    },
  }
}
