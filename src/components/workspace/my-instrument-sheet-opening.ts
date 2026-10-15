/**
 * The My instrument sheet's opening, on the sheet's lazy side: the sheet component and the props it
 * opens with, worked out from the Idle session's state. Loaded on demand through
 * ./load-my-instrument-sheet.ts only: nothing may import it statically outside that file (type-only
 * imports aside, erased in the build), so the sheet and what its opening needs stay out of the
 * entry chunk.
 */
import type { GenerationSessionState } from '@/composables/use-generation-session'
import {
  isBuiltInInstrumentProfileId,
  MY_INSTRUMENT_ID,
} from '@/domain/profile/instrument-profiles'
import MyInstrumentSheet from './MyInstrumentSheet.vue'
import type { MyInstrumentFormStart } from './use-my-instrument'

export { MyInstrumentSheet }

/** The sheet's props while it is open. */
// @spec-link [[req_my_instrument]]
export interface MyInstrumentSheetProps {
  readonly start: MyInstrumentFormStart
  readonly selected: boolean
}

/** What the opening reads of the session's state. */
type OpeningState = Pick<GenerationSessionState<unknown>, 'myInstrument' | 'controls'>

/**
 * Intent: how the sheet opens now: editing the saved my instrument, or creating from the selected
 * built-in. Creating with a selection that is not a built-in is a defect and throws: with no my
 * instrument, the selection is always a built-in.
 */
// @spec-link [[req_my_instrument]]
function startNow(state: OpeningState): MyInstrumentFormStart {
  const { myInstrument, controls } = state
  if (myInstrument !== null) return { mode: 'editing', saved: myInstrument }
  const selected = controls.instrumentProfileId
  if (!isBuiltInInstrumentProfileId(selected)) {
    throw new Error('my instrument sheet: creating needs a built-in profile selected')
  }
  return { mode: 'creating', template: selected }
}

/**
 * Intent: the props the sheet opens with now: how it starts, and whether my instrument is the
 * selected instrument.
 */
// @spec-link [[req_my_instrument]]
export function sheetPropsNow(state: OpeningState): MyInstrumentSheetProps {
  return {
    start: startNow(state),
    selected: state.controls.instrumentProfileId === MY_INSTRUMENT_ID,
  }
}
