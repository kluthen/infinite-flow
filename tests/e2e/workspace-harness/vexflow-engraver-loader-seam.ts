/**
 * The workspace-harness-only substitute for `@/notation/vexflow-engraver-loader`, wired in by
 * `vite.workspace-harness.config.ts`'s `resolve.alias` so every real production import of that
 * loader (PhraseScore.vue's engrave path, WorkspaceShell.vue's mount-time preload) resolves here
 * instead -- never a test-only branch inside src/ itself. Always delegates to the real loader and
 * the real dynamic `import()` it performs; the one-shot failure `armNextNotationFailure()` arms is
 * injected at `engraveWrittenPhrase()` instead of at module load, because PhraseScore memoizes the
 * loaded module after its first successful load (see vexflow-engraver-loader.ts), so a load-time
 * rejection could only ever be observed before any phrase had engraved. Wrapping the resolved
 * module's own `engraveWrittenPhrase` lets a spec force a failure on any later redraw (a notation
 * mode switch, a Retry), exercising PhraseScore's real `redraw()` catch/emit('notation-error') path
 * and its real Retry re-request end to end, rather than faking a component result.
 */
import { NotationError } from '../../../src/notation/notation-error'
import {
  loadVexflowEngraver as loadRealVexflowEngraver,
  type VexflowEngraverModule,
} from '../../../src/notation/vexflow-engraver-loader'

let forcedFailureArmed = false
let wrappedModule: VexflowEngraverModule | null = null

/** Intent: arm exactly one forced engraving failure for the next `engraveWrittenPhrase()` call. */
export function armNextNotationFailure(): void {
  forcedFailureArmed = true
}

/** Intent: the aliased drop-in for the real loader, wrapping `engraveWrittenPhrase` to allow one forced failure. */
export async function loadVexflowEngraver(): Promise<VexflowEngraverModule> {
  const real = await loadRealVexflowEngraver()
  if (wrappedModule === null) {
    wrappedModule = {
      ...real,
      engraveWrittenPhrase: (...args) => {
        if (forcedFailureArmed) {
          forcedFailureArmed = false
          throw new NotationError(
            'notation_engraving_failed',
            'Workspace harness injected a forced notation engraving failure.',
            {},
          )
        }
        return real.engraveWrittenPhrase(...args)
      },
    }
  }
  return wrappedModule
}
