/**
 * Lazy-loading boundary for the VexFlow engraving adapter (./vexflow-engraver.ts). VexFlow plus its
 * embedded Bravura/Academico faces are the bulk of the production bundle, so nothing may import
 * './vexflow-engraver' statically outside this file -- everyone else reaches it through
 * `loadVexflowEngraver()`, which dynamically `import()`s it and memoizes the resulting module
 * promise so concurrent and later callers share one fetch instead of re-requesting the chunk. A
 * rejected import is a transient condition (a lazy chunk failing to fetch, most plausibly), never a
 * corrupt written model, so the failure is wrapped as the same typed `notation_engraving_failed`
 * NotationError the adapter itself already uses, and the memoized promise is cleared before
 * rethrowing so a later call -- typically triggered by a user's Retry -- attempts the import again
 * rather than replaying the same failure forever.
 */
import { NotationError } from './notation-error'

/** The shape callers get back once the lazy module has loaded. */
export type VexflowEngraverModule = typeof import('./vexflow-engraver')

let modulePromise: Promise<VexflowEngraverModule> | null = null

/** Intent: turn any thrown value into a readable message, since a caught value need not be an Error. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Dynamically import the VexFlow engraving adapter, memoizing the in-flight or settled load so
 * repeat callers (a resize redraw, a notation-mode switch, a Retry) never re-trigger the chunk
 * fetch once it has already succeeded. Safe to call speculatively before the module is needed --
 * for example, on workspace mount -- to absorb the fetch latency ahead of the first engrave.
 */
// @spec-link [[module_notation_layout_preflight]]
export function loadVexflowEngraver(): Promise<VexflowEngraverModule> {
  if (modulePromise === null) {
    modulePromise = import('./vexflow-engraver').catch((cause: unknown) => {
      modulePromise = null
      throw new NotationError(
        'notation_engraving_failed',
        `Failed to load the notation engraving module: ${errorMessage(cause)}`,
        {},
        cause,
      )
    })
  }
  return modulePromise
}
