/**
 * The My instrument sheet's two confirmations (screens/my-instrument/handoff.md, States): the
 * erase warning, opened by `Save` when the range or the transposition changed while my instrument
 * has kept sessions, and the delete confirmation. Each counts the sessions as it opens and hands
 * exactly those to its batch; while the batch runs the way back does nothing; a refusal keeps the
 * confirmation with its error line, its action trying again; saving off returns to the form with
 * the range and the transposition back to their saved values. When the tab must be reloaded while
 * sessions would go, an open confirmation returns to the form the same way. Loaded with the sheet.
 */
import { shallowRef, watch, type Ref, type ShallowRef } from 'vue'

import type { MyInstrumentSessions } from '@/composables/use-generation-session'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import type { MyInstrumentBatchOutcome } from './use-my-instrument-sheet'
import type { MyInstrumentSessionCount } from './workspace-session-controller-types'

/** Which part of the sheet shows: the form, the erase warning or the delete confirmation. */
export type MyInstrumentSheetStep = 'form' | 'erase' | 'delete'

/** Where focus goes once a step shows: a confirmation's Cancel, the form's Save or its Delete. */
export type MyInstrumentSheetFocus = 'cancel' | 'save' | 'delete'

/** What the confirmations need from the sheet. */
export interface MyInstrumentConfirmationDeps {
  /** The kept sessions of my instrument now, as the host counts them; reactive. */
  readonly sessions: () => MyInstrumentSessionCount
  readonly saveAndErase: (
    instrument: MyInstrument,
    sessions: MyInstrumentSessions,
  ) => Promise<MyInstrumentBatchOutcome>
  readonly remove: (sessions: MyInstrumentSessions) => Promise<MyInstrumentBatchOutcome>
  /** Put the range and the transposition back to their saved values. */
  readonly restoreSound: () => void
  /** Move focus once the step shows. */
  readonly focus: (target: MyInstrumentSheetFocus) => void
}

/** The confirmations' state and moves. */
export interface MyInstrumentConfirmations {
  readonly step: Readonly<Ref<MyInstrumentSheetStep>>
  /** The confirmation's batch is running. */
  readonly running: Readonly<Ref<boolean>>
  /** The last batch was refused: the confirmation shows its error line. */
  readonly failed: Readonly<Ref<boolean>>
  /** The sessions the open confirmation counted; null on the form. */
  readonly counted: Readonly<ShallowRef<MyInstrumentSessionCount | null>>
  readonly askToErase: (instrument: MyInstrument) => void
  readonly askToDelete: () => void
  readonly confirm: () => Promise<void>
  /** The way back from a confirmation to the form; nothing while its batch runs. */
  readonly back: () => void
}

/** Intent: the sheet's confirmations over `deps`. */
// @spec-link [[entity_my_instrument_record]]
// @spec-link [[rule_outdated_tab_stops_saving]]
export function useMyInstrumentConfirmations(
  deps: MyInstrumentConfirmationDeps,
): MyInstrumentConfirmations {
  const step = shallowRef<MyInstrumentSheetStep>('form')
  const running = shallowRef(false)
  const failed = shallowRef(false)
  const counted = shallowRef<MyInstrumentSessionCount | null>(null)
  let pending: MyInstrument | null = null

  /** Intent: show `next`, counting the sessions now, focus on its Cancel. */
  const open = (next: Exclude<MyInstrumentSheetStep, 'form'>): void => {
    counted.value = deps.sessions()
    failed.value = false
    step.value = next
    deps.focus('cancel')
  }

  /** Intent: back to the form, focus on `target`. */
  const toForm = (target: MyInstrumentSheetFocus): void => {
    step.value = 'form'
    counted.value = null
    failed.value = false
    pending = null
    deps.focus(target)
  }

  /** Intent: saving is off: back to the form, erasing nothing, its sound back to the saved one. */
  const savingOff = (): void => {
    deps.restoreSound()
    toForm('save')
  }

  watch(
    () => deps.sessions().withheld,
    (withheld) => {
      if (!withheld) return
      if (step.value === 'form') deps.restoreSound()
      else if (!running.value) savingOff()
    },
  )

  return {
    step,
    running,
    failed,
    counted,
    askToErase: (instrument) => {
      pending = instrument
      open('erase')
    },
    askToDelete: () => open('delete'),
    confirm: async () => {
      const sessions = counted.value
      if (running.value || sessions === null) return
      running.value = true
      const outcome =
        step.value === 'erase' && pending !== null
          ? await deps.saveAndErase(pending, sessions)
          : await deps.remove(sessions)
      running.value = false
      if (outcome === 'refused') failed.value = true
      else if (outcome === 'saving-off') savingOff()
    },
    back: () => {
      if (running.value || step.value === 'form') return
      toForm(step.value === 'erase' ? 'save' : 'delete')
    },
  }
}
