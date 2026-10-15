/**
 * Lazy-loading boundary for the My instrument sheet (./MyInstrumentSheet.vue): nothing may import
 * it statically outside this file, so the sheet, its model, its words and building my instrument
 * stay out of the entry chunk. `loadMyInstrumentSheet()` dynamically `import()`s it and memoizes
 * the promise, so every open shares one fetch. A rejected import clears the memo before rethrowing,
 * so the next open tries again.
 */
import type { Component } from 'vue'

let sheetPromise: Promise<Component> | null = null

/** Intent: the My instrument sheet component, loaded once and shared by every caller. */
// @spec-link [[req_my_instrument]]
export function loadMyInstrumentSheet(): Promise<Component> {
  if (sheetPromise === null) {
    sheetPromise = import('./MyInstrumentSheet.vue').then(
      (module) => module.default,
      (cause: unknown) => {
        sheetPromise = null
        throw cause
      },
    )
  }
  return sheetPromise
}
