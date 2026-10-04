/**
 * The workspace-harness-only substitute for `@/export/load-generated-notes-export`, wired in by
 * `vite.workspace-harness.config.ts`'s `resolve.alias` so the Review's real export path (the
 * shell's `browserReviewExportPorts`) resolves here instead -- never a test-only branch inside src/
 * itself. It always delegates to the real loader and the real dynamic `import()` it performs (so a
 * spec can still fail the real chunk load by aborting the `generated-notes-file` request with
 * Playwright routing), and wraps the loaded module's two file builders, `buildGeneratedNotesFile`
 * and `buildPlayedNotesFile`:
 *
 * - one-shot failure `armNextExportFailure()` arms: the next file built, of either content, throws
 *   instead, as an encoder refusing the history would, so the Review's export error shows with
 *   nothing downloaded;
 * - every file built, of either content, is counted (`exportsBuilt()`), so a spec can tell how
 *   many files an action made, failed ones excluded.
 */
import {
  GeneratedNotesExportLoadError,
  loadGeneratedNotesExport as loadRealGeneratedNotesExport,
  type ExportFile,
  type GeneratedNotesExportModule,
} from '../../../src/export/load-generated-notes-export'

export { GeneratedNotesExportLoadError }
export type {
  ExportFile,
  ExportableHistory,
  GeneratedNotesExportModule,
  GeneratedNotesFormat,
  GeneratedNotesRequest,
} from '../../../src/export/load-generated-notes-export'

let failureArmed = false
let filesBuilt = 0

/** Intent: make the next file the export builds throw instead; one shot. */
export function armNextExportFailure(): void {
  failureArmed = true
}

/** Intent: how many files the export has built since the page loaded. */
export function exportsBuilt(): number {
  return filesBuilt
}

/** Intent: run one file build, throwing instead when a failure is armed, and count it if built. */
function counted(build: () => ExportFile): ExportFile {
  if (failureArmed) {
    failureArmed = false
    throw new Error('Workspace harness: the armed export failure')
  }
  const file = build()
  filesBuilt += 1
  return file
}

/** Intent: the real module, both its file builders counted and failing when armed. */
function wrapModule(real: GeneratedNotesExportModule): GeneratedNotesExportModule {
  return {
    ...real,
    buildGeneratedNotesFile: (history, request) =>
      counted(() => real.buildGeneratedNotesFile(history, request)),
    buildPlayedNotesFile: (history) => counted(() => real.buildPlayedNotesFile(history)),
  }
}

/** Intent: the real lazy load (its own memo and failure handling), with the module wrapped. */
// @test-link [[req_session_export]]
// @test-link [[req_played_notes_export]]
export async function loadGeneratedNotesExport(): Promise<GeneratedNotesExportModule> {
  return wrapModule(await loadRealGeneratedNotesExport())
}
