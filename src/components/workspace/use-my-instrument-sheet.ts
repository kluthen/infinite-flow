/**
 * The workspace's side of the My instrument sheet: `instrument-actions` opens it, loaded on demand
 * (`load-my-instrument-sheet.ts`) with how it opens (`my-instrument-sheet-opening.ts`): creating
 * from the selected built-in profile or editing the saved my instrument. The load warms the
 * session's actions on my instrument, so a save never waits on a fetch. What the sheet reports is
 * applied through the Idle session's actions, given the kept sessions of my instrument the session
 * controller counts: a save that erases nothing closes the sheet at once; a save that erases and a
 * deletion are one batch whose outcome the sheet waits for, closing once it is saved and staying
 * on a refusal or with saving off. The check's `Use for my instrument` goes through the same
 * actions. The sheet shows once the controller has loaded, so it always has their count. When it
 * closes focus goes to `instrument-actions`, always there between sessions. While it is open no
 * MIDI note starts a session.
 */
import {
  computed,
  nextTick,
  shallowRef,
  type Component,
  type ComputedRef,
  type ShallowRef,
} from 'vue'

import type {
  GenerationSession,
  MyInstrumentChangeOutcome,
  MyInstrumentSessions,
} from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import { loadMyInstrumentSheet } from './load-my-instrument-sheet'
import type { MyInstrumentSheetProps } from './my-instrument-sheet-opening'
import type { MyInstrumentSessionCount } from './workspace-session-controller-types'

/**
 * What became of a batch the sheet or the check waits for: done (saved, the change applied),
 * refused by the device, or not made because saving is off.
 */
export type MyInstrumentBatchOutcome = 'done' | 'refused' | 'saving-off'

/** The sheet's props while it is open: how it opened, the sessions counted, and its batches. */
export interface MyInstrumentSheetHostProps extends MyInstrumentSheetProps {
  readonly sessions: MyInstrumentSessionCount
  readonly saveAndErase: (
    instrument: MyInstrument,
    sessions: MyInstrumentSessions,
  ) => Promise<MyInstrumentBatchOutcome>
  readonly remove: (sessions: MyInstrumentSessions) => Promise<MyInstrumentBatchOutcome>
}

/** What the host needs. */
export interface MyInstrumentSheetDeps {
  readonly session: GenerationSession<WorkspaceSessionResult>
  /** The kept sessions of my instrument now; null while the session controller loads. */
  readonly sessions: () => MyInstrumentSessionCount | null
  /** Put focus on the `instrument-actions` button. */
  readonly focusInstrumentActions: () => void
}

/** The sheet's host state, the reports that drive it, and the check's side of my instrument. */
export interface MyInstrumentSheetHost {
  readonly sheetComponent: Readonly<ShallowRef<Component | null>>
  readonly sheetProps: ComputedRef<MyInstrumentSheetHostProps | null>
  readonly sheetOpen: ComputedRef<boolean>
  /** The kept sessions of my instrument now, for the check; null while the controller loads. */
  readonly sessions: ComputedRef<MyInstrumentSessionCount | null>
  readonly open: () => Promise<void>
  /** A save that erases nothing: applied, and the sheet closes at once. */
  readonly save: (instrument: MyInstrument) => void
  readonly close: () => void
  /** The check's `Use for my instrument` erasing nothing: saved and selected. */
  readonly useForMyInstrument: (instrument: MyInstrument) => void
  /** The check's `Use and erase`: saved, selected and erased in one batch, its outcome resolved. */
  readonly useAndErase: (
    instrument: MyInstrument,
    sessions: MyInstrumentSessions,
  ) => Promise<MyInstrumentBatchOutcome>
}

/** Intent: an action's outcome as the sheet and the check take it. */
function batchOutcome(outcome: MyInstrumentChangeOutcome): MyInstrumentBatchOutcome {
  return outcome === 'refused' || outcome === 'saving-off' ? outcome : 'done'
}

/**
 * Intent: host the sheet over the Idle session and the counted sessions of my instrument. Opening
 * while a session runs is a defect: the button is disabled then. Opening loads the sheet, then
 * shows it with the props the session's state gives at that moment, once the sessions are counted.
 */
// @spec-link [[req_my_instrument]]
// @spec-link [[entity_my_instrument_record]]
export function useMyInstrumentSheet(deps: MyInstrumentSheetDeps): MyInstrumentSheetHost {
  const sheetComponent = shallowRef<Component | null>(null)
  const opened = shallowRef<MyInstrumentSheetProps | null>(null)
  const sessions = computed(deps.sessions)
  const { actions } = deps.session

  /** Intent: the sessions counted now; asking before the controller loaded is a defect. */
  function counted(): MyInstrumentSessionCount {
    const now = sessions.value
    if (now === null) throw new Error('my instrument: its sessions are not counted yet')
    return now
  }

  /** Intent: close the sheet and put focus on `instrument-actions` once it has left. */
  function close(): void {
    opened.value = null
    void nextTick(deps.focusInstrumentActions)
  }

  /** Intent: the sheet's batch's outcome, the sheet closing once it is done. */
  async function closedOnce(change: Promise<MyInstrumentChangeOutcome>) {
    const outcome = batchOutcome(await change)
    if (outcome === 'done') close()
    return outcome
  }

  const sheetProps = computed((): MyInstrumentSheetHostProps | null => {
    const props = opened.value
    const now = sessions.value
    if (props === null || now === null) return null
    return {
      ...props,
      sessions: now,
      saveAndErase: (instrument, erased) =>
        closedOnce(actions.saveMyInstrument(instrument, erased)),
      remove: (erased) => closedOnce(actions.deleteMyInstrument(erased)),
    }
  })

  return {
    sheetComponent,
    sheetProps,
    sheetOpen: computed(() => sheetProps.value !== null),
    sessions,
    open: async () => {
      const opening = await loadMyInstrumentSheet()
      sheetComponent.value = opening.MyInstrumentSheet
      opened.value = opening.sheetPropsNow(deps.session.state)
    },
    save: (instrument) => {
      void actions.saveMyInstrument(instrument, counted())
      close()
    },
    close,
    useForMyInstrument: (instrument) => {
      void actions.saveAndSelectMyInstrument(instrument, counted())
    },
    useAndErase: async (instrument, erased) =>
      batchOutcome(await actions.saveAndSelectMyInstrument(instrument, erased)),
  }
}
