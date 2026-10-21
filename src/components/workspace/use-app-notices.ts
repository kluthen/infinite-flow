/**
 * The notice row's one notice, by the rules of the saved-data flow: from the load outcome, the save
 * policy's saving state and its failure reports, and the reports of the deletions of damaged kept
 * sessions. Outdated tab, in its saved-data or defaults wording by the load outcome, is never
 * replaced; Unusable data gives way only to it; the save-problem notice (Save failed or Storage
 * full, switched in place to the latest cause) shows only while saving is on, and once dismissed
 * stays away until a save has succeeded and another failed (a report that starts a new run of
 * refusals). The apology (Damaged sessions deleted) shows once a deletion of damaged sessions has
 * committed, saying how many went, a further one adding its count while it shows; a refused one
 * shows the save-problem notice instead, in its Damaged session not deleted wording (Storage full
 * for lack of space), at every refusal, even after `Dismiss`. A player preset's refused save is
 * told at once in the save-problem notice's preset wording (Preset not saved, naming it), or
 * Storage full for lack of space, under the save-problem notice's rules. The apology and the
 * save-problem notice, the dismissible ones, replace each other in place, the latest shown; an
 * apology whose deletion commits once the tab is outdated is not shown.
 *
 * A notice never appears, changes or leaves during a session: the one showing at Start stays as it
 * is, its actions disabled, and whatever arose meanwhile shows once the session ends. Nothing here
 * moves focus or announces anything. Before a late-opening port hands over its policy, a visit
 * started from the defaults is told its data was unusable; one that read its data, nothing.
 */
import { computed, onScopeDispose, shallowRef, watch, type ComputedRef } from 'vue'

import type { SavedDataLoad } from '@/storage-bootstrap'
import type { SaveFailureKind, SavingState } from '@/storage/save-policy'
import type { DamagedSessionReports, DamagedSessionsReport } from './workspace-kept-sessions-seam'

/** Which notice shows. */
export type AppNoticeKind =
  | 'save-failed'
  | 'preset-not-saved'
  | 'storage-full'
  | 'damaged-sessions-deleted'
  | 'damaged-session-not-deleted'
  | 'outdated-saved-data'
  | 'outdated-defaults'
  | 'unusable-data'

/** The notices whose sentence is the same whatever happened. */
type FixedNoticeKind = Exclude<
  AppNoticeKind,
  'damaged-sessions-deleted' | 'damaged-session-not-deleted' | 'preset-not-saved'
>

/** One notice: its sentence, its one action (if any) and whether it has `Dismiss`. */
export interface AppNotice {
  readonly kind: AppNoticeKind
  readonly text: string
  /** `Reload` reloads the page; `Your data` opens the Your data sheet. */
  readonly action: 'reload' | 'your-data' | null
  readonly dismissable: boolean
}

/** Every notice with a fixed sentence, by kind: the saved-data flow's copy and actions. */
const NOTICES: { readonly [K in FixedNoticeKind]: AppNotice } = {
  'save-failed': {
    kind: 'save-failed',
    text: "Something couldn't be saved on this device. The app keeps working, but this change may be lost when the page closes.",
    action: null,
    dismissable: true,
  },
  'storage-full': {
    kind: 'storage-full',
    text: "This device has no room left for the app's data, so something couldn't be saved. Deleting sessions you no longer need frees space.",
    action: 'your-data',
    dismissable: true,
  },
  'outdated-saved-data': {
    kind: 'outdated-saved-data',
    text: 'A newer version of Infinite Flow has saved data on this device. Reload this page to use it; until then, nothing here is saved.',
    action: 'reload',
    dismissable: false,
  },
  'outdated-defaults': {
    kind: 'outdated-defaults',
    text: "Your saved data couldn't be read, and a newer version of Infinite Flow has saved data on this device. This visit started from the defaults and saves nothing. Reload this page to use the newer version.",
    action: 'reload',
    dismissable: false,
  },
  'unusable-data': {
    kind: 'unusable-data',
    text: "Your saved data couldn't be read, so this visit started from the defaults and saves nothing. Reloading may fix it.",
    action: 'reload',
    dismissable: false,
  },
}

/**
 * Intent: a notice about `count` damaged kept sessions, with `Dismiss` only: the apology for a
 * committed deletion, or the save-problem notice's Damaged session not deleted wording for a
 * refused one; {n} in figures.
 */
// @spec-link [[module_kept_session_save]]
function damagedNotice(
  kind: 'damaged-sessions-deleted' | 'damaged-session-not-deleted',
  count: number,
): AppNotice {
  const several = String(count)
  const text =
    kind === 'damaged-sessions-deleted'
      ? count === 1
        ? "Sorry: a kept session was damaged and couldn't be read, so it was deleted."
        : `Sorry: ${several} kept sessions were damaged and couldn't be read, so they were deleted.`
      : count === 1
        ? "A kept session was damaged and couldn't be read, and this device refused to delete it. It stays hidden until the page is reloaded."
        : `${several} kept sessions were damaged and couldn't be read, and this device refused to delete them. They stay hidden until the page is reloaded.`
  return { kind, text, action: null, dismissable: true }
}

/**
 * Intent: the save-problem notice's preset wording, for a refused save of the player preset
 * saved under `name`, with `Dismiss` only; the name as the player wrote it, in typographic quotes.
 */
// @spec-link [[rule_refused_preset_save_told]]
function presetNotSavedNotice(name: string): AppNotice {
  return {
    kind: 'preset-not-saved',
    text: `Your preset “${name}” couldn't be saved on this device. You can use it until this page closes.`,
    action: null,
    dismissable: true,
  }
}

/**
 * The dismissible notice of the moment, when one is raised and not dismissed: the save-problem
 * notice with its latest cause (a failed save's kind, a refused save of the player preset named
 * `name`, or a refused deletion of `count` damaged sessions), or the apology for `count` damaged
 * sessions deleted.
 */
type Dismissible =
  | { readonly kind: 'save-problem'; readonly cause: SaveFailureKind }
  | { readonly kind: 'preset-not-saved'; readonly name: string }
  | { readonly kind: 'damaged-not-deleted'; readonly count: number }
  | { readonly kind: 'apology'; readonly count: number }

/**
 * The channel a player preset's refused save (a save as new, a save of changes or a rename)
 * reaches the notices by, told the name the preset was saved under, once the save policy has
 * resolved the write as failed (and so has already told its failure listener).
 */
// @spec-link [[rule_refused_preset_save_told]]
export interface RefusedPresetSaves {
  /** Tell every listener now that the save of the preset named `name` was refused. */
  readonly tell: (name: string) => void
  /** Hear every refusal told from now on; returns the way to stop. */
  readonly listen: (listener: (name: string) => void) => () => void
}

/**
 * Intent: the channel of the player presets' refused saves, one per workspace: a refusal reaches
 * the listeners attached when it is told, and nothing keeps it after.
 */
// @spec-link [[rule_refused_preset_save_told]]
export function createRefusedPresetSaves(): RefusedPresetSaves {
  const listeners = new Set<(name: string) => void>()
  return {
    tell: (name) => {
      for (const listener of [...listeners]) listener(name)
    },
    listen: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * What the notices read: the load's outcome and its save policy, whether a session runs, the
 * reports of the deletions of damaged kept sessions and the player presets' refused saves (none
 * heard without them).
 */
export interface AppNoticeDependencies {
  readonly source: Pick<SavedDataLoad, 'outcome' | 'savePolicy'>
  /** True while a session runs, count-in included. */
  readonly sessionActive: () => boolean
  readonly damagedSessions?: Pick<DamagedSessionReports, 'listen'>
  readonly refusedPresetSaves?: Pick<RefusedPresetSaves, 'listen'>
}

/** The notice the row shows, whether its actions are disabled, and its `Dismiss`. */
export interface AppNotices {
  readonly notice: ComputedRef<AppNotice | null>
  /** True while a session runs: the notice's buttons are disabled for its length. */
  readonly actionsDisabled: ComputedRef<boolean>
  /** Dismiss the shown save-problem notice; anything else, or during a session, is a defect. */
  readonly dismiss: () => void
}

/** Intent: the notice a dismissible one shows as. */
function dismissibleNotice(shown: Dismissible): AppNotice {
  if (shown.kind === 'apology') return damagedNotice('damaged-sessions-deleted', shown.count)
  if (shown.kind === 'damaged-not-deleted')
    return damagedNotice('damaged-session-not-deleted', shown.count)
  if (shown.kind === 'preset-not-saved') return presetNotSavedNotice(shown.name)
  return NOTICES[shown.cause === 'quota' ? 'storage-full' : 'save-failed']
}

/**
 * Intent: the notice of the moment, ignoring any session: outdated, then unusable, then the
 * undismissed save problem or apology.
 */
function liveNotice(
  outcome: SavedDataLoad['outcome'],
  saving: SavingState,
  dismissible: Dismissible | null,
): AppNotice | null {
  if (saving === 'off-outdated') {
    return NOTICES[outcome === 'saved-data-read' ? 'outdated-saved-data' : 'outdated-defaults']
  }
  if (saving === 'off-unreadable') return NOTICES['unusable-data']
  return dismissible === null ? null : dismissibleNotice(dismissible)
}

/**
 * Intent: the dismissible notice after `report` of a deletion of damaged kept sessions, over
 * `shown`: a committed one adds its count to an apology showing, else apologises for its own; a
 * refused one raises the save-problem notice in its own wording, or Storage full for lack of space.
 */
// @spec-link [[module_kept_session_save]]
function afterDamagedReport(shown: Dismissible | null, report: DamagedSessionsReport): Dismissible {
  if (report.status === 'refused') {
    return report.kind === 'quota'
      ? { kind: 'save-problem', cause: 'quota' }
      : { kind: 'damaged-not-deleted', count: report.count }
  }
  const before = shown?.kind === 'apology' ? shown.count : 0
  return { kind: 'apology', count: before + report.count }
}

/**
 * Intent: the dismissible notice after the refused save of the player preset named `name`, over
 * `shown`. The policy has already told its failure listener of that refusal, unless it continued
 * a run under the kind last told: so the save-problem notice shows, with the refusal's kind, just
 * when this refusal is to be told. Its Save failed wording, or an earlier preset's, then takes
 * this preset's wording in place; Storage full stays, being the wording of a preset save refused
 * for lack of space; anything else (none, dismissed, the apology) stays as it is.
 */
// @spec-link [[rule_refused_preset_save_told]]
function afterRefusedPresetSave(shown: Dismissible | null, name: string): Dismissible | null {
  const toldInPresetWording =
    shown?.kind === 'preset-not-saved' ||
    (shown?.kind === 'save-problem' && shown.cause === 'other')
  return toldInPresetWording ? { kind: 'preset-not-saved', name } : shown
}

/** Intent: whether `shown` is the save-problem notice in a save's wording, preset or not. */
function isSaveProblem(shown: Dismissible | null): boolean {
  return shown?.kind === 'save-problem' || shown?.kind === 'preset-not-saved'
}

/**
 * Intent: the notice row's notice over the visit's load, the deletions of damaged kept sessions
 * and the player presets' refused saves, held still while a session runs.
 */
// @spec-link [[rule_failed_save_never_disturbs_session]]
// @spec-link [[rule_outdated_tab_stops_saving]]
// @spec-link [[rule_failed_read_told_to_player]]
// @spec-link [[module_save_policy]]
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_refused_preset_save_told]]
export function useAppNotices(deps: AppNoticeDependencies): AppNotices {
  const { outcome, savePolicy } = deps.source
  // Until the policy arrives: a visit started from the defaults saves nothing; one that read its
  // data has its policy within a microtask, and nothing to tell before.
  const saving = shallowRef<SavingState>(
    outcome === 'started-from-defaults' ? 'off-unreadable' : 'on',
  )
  // The save-problem notice or the apology; null when none shows (never raised, or dismissed).
  const dismissible = shallowRef<Dismissible | null>(null)
  const unsubscribes: (() => void)[] = []
  let disposed = false

  if (deps.damagedSessions !== undefined) {
    unsubscribes.push(
      deps.damagedSessions.listen((report) => {
        // An apology for a deletion that commits once the tab is outdated is never shown.
        if (report.status === 'deleted' && saving.value === 'off-outdated') return
        dismissible.value = afterDamagedReport(dismissible.value, report)
      }),
    )
  }
  if (deps.refusedPresetSaves !== undefined) {
    unsubscribes.push(
      deps.refusedPresetSaves.listen((name) => {
        dismissible.value = afterRefusedPresetSave(dismissible.value, name)
      }),
    )
  }
  void savePolicy.then((policy) => {
    if (disposed) return
    saving.value = policy.state()
    unsubscribes.push(
      policy.onStateChange((state) => {
        saving.value = state
      }),
      policy.onFailure((kind, startsRun) => {
        if (startsRun || isSaveProblem(dismissible.value))
          dismissible.value = { kind: 'save-problem', cause: kind }
      }),
    )
  })
  onScopeDispose(() => {
    disposed = true
    for (const unsubscribe of unsubscribes.splice(0)) unsubscribe()
  })

  const live = computed(() => liveNotice(outcome, saving.value, dismissible.value))
  // The notice showing when the current session started, kept as it was until it ends.
  const heldAtStart = shallowRef<AppNotice | null>(null)
  watch(
    deps.sessionActive,
    (active) => {
      if (active) heldAtStart.value = live.value
    },
    { flush: 'sync', immediate: true },
  )

  const shown = computed(() => (deps.sessionActive() ? heldAtStart.value : live.value))

  return {
    notice: shown,
    actionsDisabled: computed(() => deps.sessionActive()),
    dismiss: () => {
      const notice = shown.value
      if (deps.sessionActive() || notice === null || !notice.dismissable) {
        throw new Error(`app notices: nothing to dismiss (${notice?.kind ?? 'no notice'})`)
      }
      dismissible.value = null
    },
  }
}
