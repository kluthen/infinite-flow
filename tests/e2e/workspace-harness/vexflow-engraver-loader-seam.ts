/**
 * The workspace-harness-only substitute for `@/notation/vexflow-engraver-loader`, wired in by
 * `vite.workspace-harness.config.ts`'s `resolve.alias` so every real production import of that
 * loader (PhraseScore.vue's engrave path, WorkspaceShell.vue's mount-time preload, the workspace's
 * pre-draw fit check) resolves here instead -- never a test-only branch inside src/ itself. Always
 * delegates to the real loader and the real dynamic `import()` it performs, and wraps these of the
 * resolved module's functions:
 *
 * - `engraveWrittenPhrase` and `engravePhraseSystem` (a whole phrase at Idle, one system part in a
 *   running session), for the one-shot failure `armNextNotationFailure()` arms: whichever engraving
 *   comes next throws it. It is injected there instead of at module load, because PhraseScore
 *   memoizes the loaded module after its first successful load (see vexflow-engraver-loader.ts), so
 *   a load-time rejection could only ever be observed before any phrase had engraved. A spec can force a failure on any later redraw
 *   (a resize, a Retry), exercising PhraseScore's real `redraw()` catch/emit('notation-error') path
 *   end to end; the armed code picks a retryable failure or one of the staff layout's two failures.
 *   Every call is counted, so a spec can tell that nothing but the phrase it expects was drawn.
 * - `planWrittenPhraseFit`, for a FIFO of forced verdicts `queueFitVerdicts()` fills: each call
 *   consumes one, and once the queue is empty the real planner answers. A forced `notes_too_wide`
 *   is what the real planner returns for a dense phrase in a small window, so a spec can drive the
 *   idle fit retries with any phrase at any window size. Every call is counted.
 * - `planStaffRoomForKey`, only to count its calls, so a spec can wait for a room check to have
 *   run before asserting that it started nothing.
 */
import { NotationError } from '../../../src/notation/notation-error'
import {
  loadVexflowEngraver as loadRealVexflowEngraver,
  type VexflowEngraverModule,
} from '../../../src/notation/vexflow-engraver-loader'

let armedFailureCode: WorkspaceHarnessNotationFailureCode | null = null
const forcedFitVerdicts: WorkspaceHarnessFitVerdict[] = []
let fitChecksRun = 0
let engravingsRun = 0
let roomChecksRun = 0
let wrappedModule: VexflowEngraverModule | null = null

/** Intent: arm exactly one forced failure, with this code, for the next engraving call. */
export function armNextNotationFailure(
  code: WorkspaceHarnessNotationFailureCode = 'notation_engraving_failed',
): void {
  armedFailureCode = code
}

/** Intent: append forced verdicts the next `planWrittenPhraseFit()` calls return, in order. */
export function queueForcedFitVerdicts(verdicts: readonly WorkspaceHarnessFitVerdict[]): void {
  forcedFitVerdicts.push(...verdicts)
}

/** Intent: how many fit checks have run since the page loaded, forced or real. */
export function fitCheckCount(): number {
  return fitChecksRun
}

/**
 * Intent: how many engravings (draws and redraws, of a whole phrase or of one system part) have
 * been attempted since the page loaded.
 */
export function engravingCount(): number {
  return engravingsRun
}

/** Intent: how many phrase-independent room checks have run since the page loaded. */
export function roomCheckCount(): number {
  return roomChecksRun
}

/**
 * Intent: count one engraving attempt and, when a failure is armed, disarm it and throw it in
 * place of the real engraving.
 */
function countEngravingOrFail(): void {
  engravingsRun += 1
  if (armedFailureCode === null) return
  const code = armedFailureCode
  armedFailureCode = null
  throw new NotationError(
    code,
    `Workspace harness injected a forced notation failure (${code}).`,
    {},
  )
}

/** Intent: the aliased drop-in for the real loader, wrapping both engravings and both checks. */
export async function loadVexflowEngraver(): Promise<VexflowEngraverModule> {
  const real = await loadRealVexflowEngraver()
  if (wrappedModule === null) {
    wrappedModule = {
      ...real,
      engraveWrittenPhrase: (...args) => {
        countEngravingOrFail()
        return real.engraveWrittenPhrase(...args)
      },
      engravePhraseSystem: (...args) => {
        countEngravingOrFail()
        return real.engravePhraseSystem(...args)
      },
      planWrittenPhraseFit: (...args) => {
        fitChecksRun += 1
        const forced = forcedFitVerdicts.shift()
        if (forced !== undefined) return { kind: forced }
        return real.planWrittenPhraseFit(...args)
      },
      planStaffRoomForKey: (...args) => {
        roomChecksRun += 1
        return real.planStaffRoomForKey(...args)
      },
    }
  }
  return wrappedModule
}
