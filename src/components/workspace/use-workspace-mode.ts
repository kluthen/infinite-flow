/**
 * The workspace's mode, session mode or Jam mode, which the one workspace shows over the same
 * generation worker, audio, controller connection and saving. It is workspace state and never
 * saved: every workspace starts in session mode, so every load of the app, a reload included,
 * opens there. The header's mode switch changes it at Idle only (read-only while Loading, during
 * a session and while the review mode shows). The first press of `Jam` in a visit opens Jam mode:
 * `Jam` checked at once while Jam's code loads through its one loader (./load-jam-mode.ts), the
 * workspace held as in Loading, `Session` still pressable to cancel the opening; a failed load
 * leaves session mode as it was and raises the load-failure notice. Later presses wait for
 * nothing. Session mode is held while Jam mode opens or shows: it prepares nothing new and no note
 * starts a session; leaving Jam mode shows it exactly as it was left. Only these presses change
 * the mode: nothing here listens to the controller, a session's end or a load.
 */
import { computed, shallowRef, watch, type ComputedRef, type Ref, type ShallowRef } from 'vue'

import type { JamModeModule } from './load-jam-mode'

/** Which of the two modes the workspace shows. */
// @spec-link [[module_workspace_mode]]
export type WorkspaceMode = 'session' | 'jam'

/** What the mode switch shows: the mode, the segment checked, the opening and the read-only. */
// @spec-link [[module_workspace_mode]]
export interface WorkspaceModeView {
  /** The mode the workspace shows (session mode while Jam mode opens). */
  readonly mode: WorkspaceMode
  /** The segment checked: `jam` while Jam mode opens, else the mode. */
  readonly checked: WorkspaceMode
  /** Jam's code is loading after a press of `Jam`; the switch is `is-loading`. */
  readonly opening: boolean
  /** Every change refused: Loading, a session, the review mode. */
  readonly readonly: boolean
}

/** What the workspace's mode reads and where it reports. */
// @spec-link [[module_workspace_mode]]
export interface WorkspaceModeDependencies {
  /** An Idle operation is running (Loading). */
  readonly operationRunning: () => boolean
  /** A session is running, count-in included. */
  readonly sessionActive: () => boolean
  /** The review mode shows: a review or the session list. */
  readonly reviewShowing: () => boolean
  /** Jam's code, loaded on demand (production: `loadJamMode`). */
  readonly load: () => Promise<JamModeModule>
  /** Session mode's hold began or ended; called at creation (not held), then in each change. */
  readonly onHeldChange: (held: boolean) => void
  /** The opening failed: the load-failure notice shows; the shell moves focus to `Try again`. */
  readonly onLoadFailed: () => void
}

/** The workspace's mode: its readings, all reactive, and the presses that change it. */
// @spec-link [[module_workspace_mode]]
export interface WorkspaceModeState {
  readonly mode: Readonly<Ref<WorkspaceMode>>
  readonly opening: Readonly<Ref<boolean>>
  readonly checked: ComputedRef<WorkspaceMode>
  readonly readonly: ComputedRef<boolean>
  /** Session mode is held: it prepares nothing and no note starts a session. */
  readonly held: ComputedRef<boolean>
  /** Jam's code, once loaded in this visit; null before. */
  readonly jamModule: Readonly<ShallowRef<JamModeModule | null>>
  /** Jam's view while Jam mode shows; null in session mode and while Jam mode opens. */
  readonly jamView: ComputedRef<JamModeModule['JamWorkspace'] | null>
  /** The load-failure notice shows. */
  readonly loadFailed: Readonly<Ref<boolean>>
  /** Everything the mode switch shows. */
  readonly view: ComputedRef<WorkspaceModeView>
  /** A press of a segment (or an arrow key reaching it). */
  readonly select: (mode: WorkspaceMode) => void
  /** The notice's `Try again`: a press of `Jam`. */
  readonly retry: () => void
  /** The notice's `Dismiss`. */
  readonly dismissFailure: () => void
}

/**
 * Intent: the workspace's mode, session mode at creation and never saved, changed only by the
 * switch's presses at Idle; it reports session mode's hold synchronously as it changes.
 */
// @spec-link [[module_workspace_mode]]
// @spec-link [[rule_app_opens_in_session_mode]]
// @spec-link [[rule_leaving_jam_mode_keeps_session_mode]]
export function useWorkspaceMode(deps: WorkspaceModeDependencies): WorkspaceModeState {
  const mode = shallowRef<WorkspaceMode>('session')
  const opening = shallowRef(false)
  const jamModule = shallowRef<JamModeModule | null>(null)
  const loadFailed = shallowRef(false)
  /** Counts the openings, so a load settling for one cancelled or superseded changes nothing. */
  let openings = 0

  const checked = computed<WorkspaceMode>(() => (opening.value ? 'jam' : mode.value))
  /**
   * Intent: the switch is read-only during Loading in either mode, a session and the review
   * mode; never while Jam mode opens, when `Session` stays pressable and cancels.
   */
  // @spec-link [[rule_mode_button_at_idle_only]]
  const readonly = computed(
    () => deps.operationRunning() || deps.sessionActive() || deps.reviewShowing(),
  )
  const held = computed(() => opening.value || mode.value === 'jam')
  const jamView = computed(() =>
    mode.value === 'jam' ? (jamModule.value?.JamWorkspace ?? null) : null,
  )
  watch(held, (next) => deps.onHeldChange(next), { flush: 'sync', immediate: true })

  /** Intent: Jam mode shows at once, any load-failure notice gone with the opening. */
  function showJam(): void {
    mode.value = 'jam'
    opening.value = false
    loadFailed.value = false
  }

  /**
   * Intent: the first press of `Jam` in a visit: `Jam` checked while Jam's code loads. Loaded
   * while still opening, Jam mode shows; loaded after a cancel, the code is kept silently, so a
   * later press waits for nothing. Failed while opening, session mode stays as it was and the
   * notice shows; failed after a cancel, nothing shows.
   */
  // @spec-link [[rule_jam_code_loaded_on_demand]]
  function open(): void {
    opening.value = true
    const current = ++openings
    /** Intent: this opening is still the one under way: not cancelled, not superseded. */
    const stillOpening = (): boolean => opening.value && current === openings
    deps.load().then(
      (loaded) => {
        jamModule.value = loaded
        if (stillOpening()) showJam()
      },
      () => {
        if (!stillOpening()) return
        opening.value = false
        loadFailed.value = true
        deps.onLoadFailed()
      },
    )
  }

  /**
   * Intent: a press of a segment: refused while read-only. `Jam` shows Jam mode at once once its
   * code has loaded, else opens it; `Session` cancels an opening, or leaves Jam mode with session
   * mode exactly as it was left.
   */
  // @spec-link [[rule_mode_button_at_idle_only]]
  // @spec-link [[rule_leaving_jam_mode_keeps_session_mode]]
  function select(next: WorkspaceMode): void {
    if (readonly.value) return
    if (next === 'session') {
      opening.value = false
      mode.value = 'session'
      return
    }
    if (mode.value === 'jam' || opening.value) return
    if (jamModule.value !== null) showJam()
    else open()
  }

  return {
    mode,
    opening,
    checked,
    readonly,
    held,
    jamModule,
    jamView,
    loadFailed,
    view: computed(() => ({
      mode: mode.value,
      checked: checked.value,
      opening: opening.value,
      readonly: readonly.value,
    })),
    select,
    retry: () => select('jam'),
    dismissFailure: () => {
      loadFailed.value = false
    },
  }
}
