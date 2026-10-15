/**
 * Lazy-loading boundary for my instrument's session actions (./generation-session-my-instrument.ts):
 * nothing may import that module statically outside this file (type-only imports aside, erased in
 * the build), so saving and deleting my instrument stay out of the entry chunk.
 * `loadMyInstrumentActions()` dynamically `import()`s it and memoizes the promise, so the sheet's
 * load, which warms it, and the session's first save or delete share one fetch. A rejected import
 * (a lazy chunk failing to fetch) clears the memo before rethrowing, so the next caller tries again.
 */

/** The module of my instrument's session actions (a type-only reference, erased in the build). */
// @spec-link [[req_my_instrument]]
export type MyInstrumentActionsModule = typeof import('./generation-session-my-instrument')

let actionsPromise: Promise<MyInstrumentActionsModule> | null = null

/**
 * Intent: the module of my instrument's session actions, loaded once and shared by every caller.
 * Safe to call speculatively (as the My instrument sheet loads) to absorb the fetch ahead of a
 * save or a delete.
 */
// @spec-link [[req_my_instrument]]
export function loadMyInstrumentActions(): Promise<MyInstrumentActionsModule> {
  if (actionsPromise === null) {
    actionsPromise = import('./generation-session-my-instrument').catch((cause: unknown) => {
      actionsPromise = null
      throw cause
    })
  }
  return actionsPromise
}
