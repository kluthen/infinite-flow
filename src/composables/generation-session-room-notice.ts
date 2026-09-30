/**
 * The workspace session's reactions around the "staff needs more room" notice at Idle, split out
 * of use-generation-session.ts: the staff's layout reports, the phrase-independent room check, the
 * setting changes that start a round, and the routing of a layout failure of the phrase on screen.
 * This module owns no session state of its own beyond the last reported container width and the
 * serial that makes a superseded room check a no-op; runs go through the injected fit runner.
 */

import type { NotationError, StaffLayoutFailureCode } from '@/notation/notation-error'
import type {
  StaffKeySignature,
  StaffLayoutInputs,
  StaffRoomVerdict,
} from '@/notation/staff-fit-types'
import type { FitRunner } from './generation-session-fit-round'
import type { MutableGenerationSessionState } from './use-generation-session'

/** The staff's layout-input reports, as PhraseScore forwards them on every layout change. */
// @spec-link [[module_idle_fit_round]]
export interface StaffLayoutReports {
  readonly subscribe: (listener: (inputs: StaffLayoutInputs) => void) => () => void
}

/** The dependency surface the notice reactions need from the root session composable. */
// @spec-link [[module_idle_fit_round]]
export interface RoomNoticeDependencies<TResult> {
  readonly state: MutableGenerationSessionState<TResult>
  readonly checkRoom: (signature: StaffKeySignature) => Promise<StaffRoomVerdict>
  readonly staffLayout: StaffLayoutReports
  readonly fitRunner: FitRunner
  /** The key signature the next phrase would have, from the current controls. */
  readonly currentSignature: () => StaffKeySignature
  /** Whether the current rhythm combination blocks generation at the width now. */
  readonly isBlocked: () => boolean
  /** Show no phrase, as before a first one exists: phrase, notice and both errors all go. */
  readonly showEmpty: () => void
}

/** What the session actions call into once they have applied their own change. */
export interface RoomNoticeReactions {
  /** A setting the phrase is generated from just changed at idle. */
  readonly afterGenerationSettingChange: () => void
  /** Route a layout failure of the phrase on screen, outside a run. */
  readonly routeLayoutFailure: (
    error: NotationError & { readonly code: StaffLayoutFailureCode },
  ) => void
  readonly dispose: () => void
}

/**
 * Intent: build the notice reactions and start listening for the staff's layout reports. Under the
 * no-room cause, every report and every generation-setting change runs the room check, and room
 * regained clears the notice into a run with no score shown. Under the too-many-notes cause, a
 * wider container or a generation-setting change starts a round; a report that is not wider can
 * only give the notice its no-room cause. Under a blocked rhythm combination, each of these shows
 * no phrase instead of running. While a run is active a report only updates the reference width.
 */
// @spec-link [[module_idle_fit_round]]
// @spec-link [[rule_too_dense_notice_retry_rounds]]
// @spec-link [[rule_staff_notice_gives_way_to_new_phrase]]
// @spec-link [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
export function createRoomNoticeReactions<TResult>(
  deps: RoomNoticeDependencies<TResult>,
): RoomNoticeReactions {
  const { state, fitRunner } = deps
  let previousWidthPx: number | null = null
  let roomCheckSerial = 0

  /** Intent: start a run, or show no phrase when the rhythm combination blocks generation. */
  function runUnlessBlocked(start: 'keep_screen' | 'no_score'): void {
    if (deps.isBlocked()) {
      deps.showEmpty()
      return
    }
    void fitRunner.run(start)
  }

  /**
   * Intent: run the room check with the next phrase's key; no room gives the notice its no-room
   * cause, room calls `onRoom` when there is one. A result is dropped when a later check, a run, or a change of the
   * notice has superseded it.
   */
  async function checkRoomNow(onRoom: (() => void) | null): Promise<void> {
    const serial = ++roomCheckSerial
    const epoch = fitRunner.epoch()
    const noticeAtStart = state.roomNotice
    const verdict = await deps.checkRoom(deps.currentSignature())
    const superseded =
      serial !== roomCheckSerial ||
      epoch !== fitRunner.epoch() ||
      state.operation !== 'idle' ||
      state.roomNotice !== noticeAtStart
    if (superseded) return
    if (verdict.kind === 'no_room') {
      state.roomNotice = 'no_room'
      return
    }
    onRoom?.()
  }

  /** Intent: the no-room notice clears into a new phrase, with no score shown meanwhile. */
  function clearNoRoom(): void {
    runUnlessBlocked('no_score')
  }

  /** Intent: a round under the too-many-notes notice, with the notice kept. */
  function startRound(): void {
    runUnlessBlocked('keep_screen')
  }

  /** Intent: react to one layout report; the reference width updates on every report. */
  function handleLayoutInputs(inputs: StaffLayoutInputs): void {
    const wider = previousWidthPx !== null && inputs.containerWidthPx > previousWidthPx
    previousWidthPx = inputs.containerWidthPx
    if (state.operation !== 'idle') return
    if (state.roomNotice === 'no_room') void checkRoomNow(clearNoRoom)
    else if (state.roomNotice === 'notes_too_wide') {
      void checkRoomNow(wider ? startRound : null)
    }
  }

  /** Intent: a generation-setting change starts a round, or re-checks the room under no room. */
  function afterGenerationSettingChange(): void {
    if (state.roomNotice === 'notes_too_wide') startRound()
    else if (state.roomNotice === 'no_room') void checkRoomNow(clearNoRoom)
  }

  /**
   * Intent: no room shows the notice and keeps any generation-failure banner; a phrase left too
   * wide is replaced by a run with no score shown, or gives way to no phrase when blocked.
   */
  function routeLayoutFailure(
    error: NotationError & { readonly code: StaffLayoutFailureCode },
  ): void {
    state.notationError = null
    if (error.code === 'notation_no_room') {
      fitRunner.showNotice('no_room')
      return
    }
    runUnlessBlocked('no_score')
  }

  const stopListening = deps.staffLayout.subscribe(handleLayoutInputs)

  return { afterGenerationSettingChange, routeLayoutFailure, dispose: stopListening }
}
