/**
 * Lazy-loading boundary for the session export (./generated-notes-file.ts, which re-exports the
 * played-notes file builder of ./played-notes-file.ts), pulling in every encoder and the backing
 * renderer. The export runs only when the player asks for a file, so nothing outside src/export/
 * may import either module statically: the shell reaches them through
 * `loadGeneratedNotesExport()`, which dynamically imports them into one chunk of their own, outside
 * the entry chunk, and memoizes the module promise so later exports share one load. A rejected
 * import (a lazy chunk failing to fetch, most plausibly) is wrapped as a typed
 * GeneratedNotesExportLoadError and the memoized promise is cleared before rethrowing, so the next
 * export calls `import()` again instead of replaying this promise. Whether that call fetches again
 * is the browser's choice: one that keeps the failed module for the page's life, as Chromium
 * does, keeps failing until a reload. The chunk is precached, so that takes a load failure before
 * the precache or a broken deploy, and a reload recovers.
 */

/** The shape callers get back once the lazy module has loaded. */
export type GeneratedNotesExportModule = typeof import('./generated-notes-file')

export type {
  ExportFile,
  GeneratedNotesFormat,
  GeneratedNotesRequest,
  ExportableHistory,
} from './generated-notes-file'

/** Typed failure for an export module that could not be loaded; the load is not memoized. */
// @spec-link [[req_session_export]]
export class GeneratedNotesExportLoadError extends Error {
  readonly kind = 'GeneratedNotesExportLoadError' as const

  constructor(message: string, cause: unknown) {
    super(message, { cause })
    this.name = 'GeneratedNotesExportLoadError'
  }
}

let modulePromise: Promise<GeneratedNotesExportModule> | null = null

/** Intent: turn any thrown value into a readable message, since a caught value need not be an Error. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Intent: dynamically import the export module, with both the generated-notes and the
 * played-notes file builders, memoizing the in-flight or settled load so repeat exports never
 * fetch the chunk twice; on a failed import, clear the memo and throw a
 * GeneratedNotesExportLoadError, so a later call runs `import()` again. A browser that keeps the
 * failed module, as Chromium does, keeps failing until a reload.
 */
// @spec-link [[req_session_export]]
// @spec-link [[req_played_notes_export]]
// @spec-link [[module_review_export_pipeline]]
export function loadGeneratedNotesExport(): Promise<GeneratedNotesExportModule> {
  if (modulePromise === null) {
    modulePromise = import('./generated-notes-file').catch((cause: unknown) => {
      modulePromise = null
      throw new GeneratedNotesExportLoadError(
        `Failed to load the generated-notes export module: ${errorMessage(cause)}`,
        cause,
      )
    })
  }
  return modulePromise
}
