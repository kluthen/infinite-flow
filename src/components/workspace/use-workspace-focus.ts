/**
 * Where the workspace shell moves focus after a change the player did not make on the page: a
 * session's end (once the screen shows the Idle state it ends in), a Needs more room notice that
 * lands late after a window end, and the connection sheet's close. The shell owns the elements
 * focus lands on; this holds only the watchers, the order of their steps and the choice of target.
 */
import { onBeforeUnmount, watch } from 'vue'

import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { MixVolumePopover } from './mix-volume-popover'
import {
  awaitsLateRoomNotice,
  sessionEndFocusTarget,
  type SessionEndFocusTarget,
} from './session-end-focus'
import type { SessionController } from './workspace-session-controller-types'

/** What the focus moves read and act through; every element they focus is the shell's. */
// @spec-link [[rule_stop_ends_session]]
export interface WorkspaceFocusDeps {
  /** The loaded session controller; a session end before it loads is a defect, so this throws. */
  readonly controller: () => SessionController
  readonly idle: () => Readonly<GenerationSessionState<WorkspaceSessionResult>>
  /** True while a session runs, count-in included. */
  readonly sessionActive: () => boolean
  /** True while the connection sheet is open. */
  readonly connectionSheetOpen: () => boolean
  /** The page's one volume popover, which a session end closes if the compact `Volume` opened it. */
  readonly mixPopover: MixVolumePopover
  /** Move focus to the element a focus target names, in the mounted header or score panel. */
  readonly focusTarget: (target: SessionEndFocusTarget) => void
  /** Focus `room-notice`, in the mounted score panel. */
  readonly focusRoomNotice: () => void
  /** Focus where the connection sheet's close sends it, in the mounted header. */
  readonly focusAfterConnectionSheet: () => void
}

/** What the shell drives: forgetting a late room notice still awaited. */
// @spec-link [[rule_count_in_ending_returns_to_idle]]
export interface WorkspaceFocus {
  /** No late room notice takes focus any more (a start, or an Idle operation starting). */
  readonly clearLateRoomNotice: () => void
}

/**
 * Intent: the focus watchers over `deps`, registered in the calling component's setup after any
 * other watcher of a session's end, and stopped before it unmounts.
 */
// @spec-link [[rule_stop_ends_session]]
// @spec-link [[rule_count_in_ending_returns_to_idle]]
// @spec-link [[rule_controller_connects_between_sessions]]
export function useWorkspaceFocus(deps: WorkspaceFocusDeps): WorkspaceFocus {
  /**
   * The element a window end moved focus to, while Needs more room may still land late (see
   * `awaitsLateRoomNotice`); null otherwise. Cleared when the notice lands, at the next start, and
   * when an Idle operation starts.
   */
  let lateRoomNoticeFrom: Element | null = null

  /**
   * Intent: move focus where the session's end sends it, once the Idle rules have applied and the
   * screen shows the state they reached (called after the render, so the Idle state read here is
   * the one on screen); after a window end, remember where it went, for a room notice that lands
   * late.
   */
  // @spec-link [[rule_count_in_ending_returns_to_idle]]
  function focusAfterSessionEnd(): void {
    const end = deps.controller().state.lastEnd
    if (end === null) throw new Error('workspace shell: a session ended with no end summary')
    const target = sessionEndFocusTarget(end, deps.idle())
    deps.focusTarget(target)
    lateRoomNoticeFrom = awaitsLateRoomNotice(end, target) ? document.activeElement : null
  }

  /**
   * Intent: at every session end, close a volume popover the compact `Volume` opened, then, once
   * the screen has rendered the Idle state it ends in (a post-flush watcher), move focus.
   */
  // @spec-link [[rule_stop_ends_session]]
  const stopEndFocusWatch = watch(
    deps.sessionActive,
    (active, wasActive) => {
      if (active || !wasActive) return
      deps.mixPopover.closeIfOpenedBy('compact')
      focusAfterSessionEnd()
    },
    { flush: 'post' },
  )

  /**
   * Intent: when Needs more room lands, rendered, after a window end's focus move, move focus once
   * to `room-notice`, unless the player has moved it since (it is still where the end put it, or
   * lost to the page because the notice disabled that button).
   */
  // @spec-link [[rule_count_in_ending_returns_to_idle]]
  // @spec-link [[rule_session_ends_when_staff_too_small]]
  const stopLateNoticeWatch = watch(
    () => deps.idle().roomNotice,
    (notice) => {
      const from = lateRoomNoticeFrom
      if (notice === null || from === null) return
      lateRoomNoticeFrom = null
      const active = document.activeElement
      if (active !== from && active !== document.body && active !== null) return
      deps.focusRoomNotice()
    },
    { flush: 'post' },
  )

  /**
   * Intent: once the connection sheet has closed, by any path, and the page has rendered without
   * it, move focus to the first enabled of the session action, the phrase action and
   * `controller-status`.
   */
  // @spec-link [[rule_controller_connects_between_sessions]]
  const stopSheetCloseFocusWatch = watch(
    deps.connectionSheetOpen,
    (open, wasOpen) => {
      if (open || !wasOpen) return
      deps.focusAfterConnectionSheet()
    },
    { flush: 'post' },
  )

  /**
   * Intent: a session that ends, a room notice that lands, or a sheet that closes while the shell
   * unmounts moves no focus: the page it would go to is going away. The focus watchers stop here,
   * while the header and score panel are still mounted (Vue would stop them a step later anyway;
   * stopping them here makes it explicit), so none ever runs without them.
   */
  onBeforeUnmount(() => {
    stopEndFocusWatch()
    stopLateNoticeWatch()
    stopSheetCloseFocusWatch()
  })

  /** Intent: forget the late room notice still awaited, so it takes no focus when it lands. */
  function clearLateRoomNotice(): void {
    lateRoomNoticeFrom = null
  }

  return { clearLateRoomNotice }
}
