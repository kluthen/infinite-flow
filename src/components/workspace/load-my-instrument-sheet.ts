/**
 * Lazy-loading boundary for the My instrument sheet (./MyInstrumentSheet.vue, through its opening,
 * ./my-instrument-sheet-opening.ts): nothing may import either statically outside this file, so
 * the sheet, its opening, its model, its words and building my instrument stay out of the entry
 * chunk. `loadMyInstrumentSheet()` dynamically `import()`s the opening and, with it, warms the
 * session's actions on my instrument (`loadMyInstrumentActions()`), so by the time the sheet shows a
 * save never waits on a fetch. It memoizes the promise, so every open shares one fetch. A rejected
 * import clears the memo before rethrowing, so the next open tries again.
 */
import { loadMyInstrumentActions } from '@/composables/load-my-instrument-actions'

/** The sheet's opening module (a type-only reference, erased in the build). */
// @spec-link [[req_my_instrument]]
export type MyInstrumentSheetOpening = typeof import('./my-instrument-sheet-opening')

let sheetPromise: Promise<MyInstrumentSheetOpening> | null = null

/**
 * Intent: the My instrument sheet's opening (its component and its props), loaded once and shared
 * by every caller, with the session's actions on my instrument loaded alongside.
 */
// @spec-link [[req_my_instrument]]
export function loadMyInstrumentSheet(): Promise<MyInstrumentSheetOpening> {
  if (sheetPromise === null) {
    sheetPromise = Promise.all([
      import('./my-instrument-sheet-opening'),
      loadMyInstrumentActions(),
    ]).then(
      ([opening]) => opening,
      (cause: unknown) => {
        sheetPromise = null
        throw cause
      },
    )
  }
  return sheetPromise
}
