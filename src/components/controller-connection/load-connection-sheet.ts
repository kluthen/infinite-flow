/**
 * Lazy-loading boundary for the connection sheet (./ConnectionSheet.vue): nothing may import it
 * statically outside this file, so the sheet, its model and its transposition check stay out of the
 * entry chunk. `loadConnectionSheet()` dynamically `import()`s it and memoizes the resulting promise
 * so the warm-up after mount and every later open share one fetch. A rejected import (a lazy chunk
 * failing to fetch) clears the memo before rethrowing, so the next open tries again.
 */
import type { Component } from 'vue'

let sheetPromise: Promise<Component> | null = null

/**
 * Intent: the connection sheet component, loaded once and shared by every caller. Safe to call
 * speculatively (on workspace mount) to absorb the fetch ahead of the first click.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
export function loadConnectionSheet(): Promise<Component> {
  if (sheetPromise === null) {
    sheetPromise = import('./ConnectionSheet.vue').then(
      (module) => module.default,
      (cause: unknown) => {
        sheetPromise = null
        throw cause
      },
    )
  }
  return sheetPromise
}
