/**
 * The workspace's side of the My instrument sheet: `instrument-actions` opens it, loaded on demand
 * (`load-my-instrument-sheet.ts`) with how it opens (`my-instrument-sheet-opening.ts`): creating
 * from the selected built-in profile or editing the saved my instrument. The load warms the
 * session's actions on my instrument, so a save never waits on a fetch. What the sheet reports is
 * applied through the Idle session's actions, and when it closes focus goes to
 * `instrument-actions`, always there between sessions. While it is open no MIDI note starts a
 * session.
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
import type { MyInstrument } from '@/domain/profile/my-instrument'
import { loadMyInstrumentSheet } from './load-my-instrument-sheet'
import type { MyInstrumentSheetProps } from './my-instrument-sheet-opening'

export type { MyInstrumentSheetProps } from './my-instrument-sheet-opening'

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
 * button is disabled then. Opening loads the sheet, then shows it with the props the session's
 * state gives at that moment.
 */
// @spec-link [[req_my_instrument]]
export function useMyInstrumentSheet(deps: MyInstrumentSheetDeps): MyInstrumentSheetHost {
  const sheetComponent = shallowRef<Component | null>(null)
  const sheetProps = shallowRef<MyInstrumentSheetProps | null>(null)

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
      const opening = await loadMyInstrumentSheet()
      sheetComponent.value = opening.MyInstrumentSheet
      sheetProps.value = opening.sheetPropsNow(deps.session.state)
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
