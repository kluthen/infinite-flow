/**
 * The workspace's side of the My instrument sheet: `instrument-actions` opens it, loaded on demand
 * (`load-my-instrument-sheet.ts`), creating from the selected built-in profile or editing the saved
 * my instrument; what the sheet reports is applied through the Idle session's actions, and when it
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

import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import {
  isBuiltInInstrumentProfileId,
  MY_INSTRUMENT_ID,
} from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import { loadMyInstrumentSheet } from './load-my-instrument-sheet'
import type { MyInstrumentFormStart } from './use-my-instrument'

/** The sheet's props while it is open. */
export interface MyInstrumentSheetProps {
  readonly start: MyInstrumentFormStart
  readonly selected: boolean
}

/** What the host needs. */
export interface MyInstrumentSheetDeps {
  readonly session: GenerationSession<WorkspaceSessionResult>
  /** Put focus on the `instrument-actions` button. */
  readonly focusInstrumentActions: () => void
}

/** The sheet's host state and the reports that drive it. */
export interface MyInstrumentSheetHost {
  readonly sheetComponent: Readonly<ShallowRef<Component | null>>
  readonly sheetProps: Readonly<ShallowRef<MyInstrumentSheetProps | null>>
  readonly sheetOpen: ComputedRef<boolean>
  readonly open: () => Promise<void>
  readonly save: (instrument: MyInstrument) => void
  readonly remove: () => void
  readonly close: () => void
}

/**
 * Intent: host the sheet over the Idle session. Opening while a session runs is a defect: the
 * button is disabled then.
 */
// @spec-link [[req_my_instrument]]
export function useMyInstrumentSheet(deps: MyInstrumentSheetDeps): MyInstrumentSheetHost {
  const sheetComponent = shallowRef<Component | null>(null)
  const sheetProps = shallowRef<MyInstrumentSheetProps | null>(null)

  /** Intent: how the sheet opens now: editing the saved my instrument, or creating from the selected built-in. */
  function startNow(): MyInstrumentFormStart {
    const { myInstrument, controls } = deps.session.state
    if (myInstrument !== null) return { mode: 'editing', saved: myInstrument }
    const selected = controls.instrumentProfileId
    if (!isBuiltInInstrumentProfileId(selected)) {
      throw new Error('my instrument sheet: creating needs a built-in profile selected')
    }
    return { mode: 'creating', template: selected }
  }

  /** Intent: close the sheet and put focus on `instrument-actions` once it has left. */
  function close(): void {
    sheetProps.value = null
    void nextTick(deps.focusInstrumentActions)
  }

  return {
    sheetComponent,
    sheetProps,
    sheetOpen: computed(() => sheetProps.value !== null),
    open: async () => {
      const component = await loadMyInstrumentSheet()
      sheetComponent.value = component
      sheetProps.value = {
        start: startNow(),
        selected: deps.session.state.controls.instrumentProfileId === MY_INSTRUMENT_ID,
      }
    },
    save: (instrument) => {
      void deps.session.actions.saveMyInstrument(instrument)
      close()
    },
    remove: () => {
      void deps.session.actions.deleteMyInstrument()
      close()
    },
    close,
  }
}
