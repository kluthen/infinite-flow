/**
 * The notice row's one notice, by the rules of the saved-data flow: from the load outcome, the save
 * policy's saving state and its failure reports. Outdated tab, in its saved-data or defaults
 * wording by the load outcome, is never replaced; Unusable data gives way only to it; the
 * save-problem notice (Save failed or Storage full, switched in place to the latest cause) shows
 * only while saving is on, and once dismissed stays away until a save has succeeded and another
 * failed (a report that starts a new run of refusals).
 *
 * A notice never appears, changes or leaves during a session: the one showing at Start stays as it
 * is, its actions disabled, and whatever arose meanwhile shows once the session ends. Nothing here
 * moves focus or announces anything. Before a late-opening port hands over its policy, a visit
 * started from the defaults is told its data was unusable; one that read its data, nothing.
 */
import { computed, onScopeDispose, shallowRef, watch, type ComputedRef } from 'vue'

import type { SavedDataLoad } from '@/storage-bootstrap'
import type { SaveFailureKind, SavingState } from '@/storage/save-policy'

/** Which notice shows. */
export type AppNoticeKind =
  'save-failed' | 'storage-full' | 'outdated-saved-data' | 'outdated-defaults' | 'unusable-data'

/** One notice: its sentence, its one action (if any) and whether it has `Dismiss`. */
export interface AppNotice {
  readonly kind: AppNoticeKind
  readonly text: string
  /** `Reload` reloads the page; `Your data` opens the Your data sheet. */
  readonly action: 'reload' | 'your-data' | null
  readonly dismissable: boolean
}

/** Every notice, by kind: the saved-data flow's copy and actions. */
const NOTICES: { readonly [K in AppNoticeKind]: AppNotice } = {
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

/** What the notices read: the load's outcome and its save policy, and whether a session runs. */
export interface AppNoticeDependencies {
  readonly source: Pick<SavedDataLoad, 'outcome' | 'savePolicy'>
  /** True while a session runs, count-in included. */
  readonly sessionActive: () => boolean
}

/** The notice the row shows, whether its actions are disabled, and its `Dismiss`. */
export interface AppNotices {
  readonly notice: ComputedRef<AppNotice | null>
  /** True while a session runs: the notice's buttons are disabled for its length. */
  readonly actionsDisabled: ComputedRef<boolean>
  /** Dismiss the shown save-problem notice; anything else, or during a session, is a defect. */
  readonly dismiss: () => void
}

/**
 * Intent: the notice of the moment, ignoring any session: outdated, then unusable, then the
 * undismissed save problem.
 */
function liveNotice(
  outcome: SavedDataLoad['outcome'],
  saving: SavingState,
  saveProblem: SaveFailureKind | null,
): AppNoticeKind | null {
  if (saving === 'off-outdated') {
    return outcome === 'saved-data-read' ? 'outdated-saved-data' : 'outdated-defaults'
  }
  if (saving === 'off-unreadable') return 'unusable-data'
  if (saveProblem === null) return null
  return saveProblem === 'quota' ? 'storage-full' : 'save-failed'
}

/**
 * Intent: the notice row's notice over the visit's load, held still while a session runs.
 */
// @spec-link [[rule_failed_save_never_disturbs_session]]
// @spec-link [[rule_outdated_tab_stops_saving]]
// @spec-link [[rule_failed_read_told_to_player]]
// @spec-link [[module_save_policy]]
export function useAppNotices(deps: AppNoticeDependencies): AppNotices {
  const { outcome, savePolicy } = deps.source
  // Until the policy arrives: a visit started from the defaults saves nothing; one that read its
  // data has its policy within a microtask, and nothing to tell before.
  const saving = shallowRef<SavingState>(
    outcome === 'started-from-defaults' ? 'off-unreadable' : 'on',
  )
  // The save-problem notice's latest cause; null when none shows (never raised, or dismissed).
  const saveProblem = shallowRef<SaveFailureKind | null>(null)
  const unsubscribes: (() => void)[] = []
  let disposed = false

  void savePolicy.then((policy) => {
    if (disposed) return
    saving.value = policy.state()
    unsubscribes.push(
      policy.onStateChange((state) => {
        saving.value = state
      }),
      policy.onFailure((kind, startsRun) => {
        if (startsRun || saveProblem.value !== null) saveProblem.value = kind
      }),
    )
  })
  onScopeDispose(() => {
    disposed = true
    for (const unsubscribe of unsubscribes.splice(0)) unsubscribe()
  })

  const live = computed(() => liveNotice(outcome, saving.value, saveProblem.value))
  // The notice showing when the current session started, kept as it was until it ends.
  const heldAtStart = shallowRef<AppNoticeKind | null>(null)
  watch(
    deps.sessionActive,
    (active) => {
      if (active) heldAtStart.value = live.value
    },
    { flush: 'sync', immediate: true },
  )

  const shown = computed(() => (deps.sessionActive() ? heldAtStart.value : live.value))

  return {
    notice: computed(() => (shown.value === null ? null : NOTICES[shown.value])),
    actionsDisabled: computed(() => deps.sessionActive()),
    dismiss: () => {
      const kind = shown.value
      if (deps.sessionActive() || kind === null || !NOTICES[kind].dismissable) {
        throw new Error(`app notices: nothing to dismiss (${kind ?? 'no notice'})`)
      }
      saveProblem.value = null
    },
  }
}
