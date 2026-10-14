/**
 * The staff's drawing code loaded on demand: the positions' keeper (./session-staff-positions.ts)
 * and the overlays' drawing (notation/score-overlays.ts). Nothing in them is needed before the
 * first draw: the positions only receive an engraving once the lazy engraver has loaded, a session
 * only once the player has started one, and the overlays are only drawn on an engraved score. The
 * keeper this module gives PhraseScore answers at once and holds the same contract: it creates the
 * real keeper as soon as the code has loaded (at once when an earlier PhraseScore already loaded
 * it), and PhraseScore waits for `ready()` with the engraver, so every Idle engraving, and every
 * overlay drawn on it, finds the code loaded. A session entered before the load ends is entered
 * once it has, with the session then current; a load failure is a NotationError, reported as a
 * session staff failure during a session and through the engraver's wait at Idle, and retried by
 * the next wait.
 */
import { NotationError } from '@/notation/notation-error'
import type { ScoreOverlays } from '@/notation/score-overlay-state'
import type { SessionStaff } from './session-staff'
import type { StaffPositions, StaffPositionsEnvironment } from './session-staff-positions'

/** The drawing code, once loaded. */
interface StaffDrawingCode {
  readonly createStaffPositions: typeof import('./session-staff-positions').createStaffPositions
  readonly applyScoreOverlays: typeof import('@/notation/score-overlays').applyScoreOverlays
}

/** The positions' keeper while its code may still be loading, with the Idle score's overlays. */
export interface LoadingStaffDrawing extends StaffPositions {
  /** Resolves once the code has loaded; rejects with a NotationError when the load fails. */
  readonly ready: () => Promise<void>
  /** Draw an overlay state on the Idle score's systems; the code is loaded by then. */
  readonly drawOverlays: (
    svgs: readonly SVGSVGElement[],
    phraseNumber: number,
    overlays: ScoreOverlays,
  ) => void
}

let codePromise: Promise<StaffDrawingCode> | null = null
let loadedCode: StaffDrawingCode | null = null

/** Intent: a readable message from whatever the failed `import()` rejected with. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Intent: load the drawing code once, kept once loaded; a failed load is a NotationError, and the
 * next call loads again.
 */
function loadStaffDrawingCode(): Promise<StaffDrawingCode> {
  if (codePromise === null) {
    codePromise = Promise.all([
      import('./session-staff-positions'),
      import('@/notation/score-overlays'),
    ]).then(
      ([positions, overlays]) => {
        loadedCode = {
          createStaffPositions: positions.createStaffPositions,
          applyScoreOverlays: overlays.applyScoreOverlays,
        }
        return loadedCode
      },
      (cause: unknown) => {
        codePromise = null
        throw new NotationError(
          'notation_engraving_failed',
          `Failed to load the staff drawing module: ${errorMessage(cause)}`,
          {},
          cause,
        )
      },
    )
  }
  return codePromise
}

/**
 * Intent: the positions' keeper for one PhraseScore, its code loaded on demand. `session` gives
 * the session the staff shows now, or null at Idle: the one a session entered before the load
 * shows once it ends.
 */
// @spec-link [[module_session_staff_refill]]
export function createLoadingStaffDrawing(
  env: StaffPositionsEnvironment,
  session: () => SessionStaff | null,
): LoadingStaffDrawing {
  let code: StaffDrawingCode | null = loadedCode
  let positions: StaffPositions | null = code?.createStaffPositions(env) ?? null
  let sessionWaiting = false

  /** Intent: create the real keeper once the code has loaded. */
  async function ready(): Promise<void> {
    if (code !== null) return
    const loaded = await loadStaffDrawingCode()
    code ??= loaded
    positions ??= loaded.createStaffPositions(env)
  }

  /**
   * Intent: enter the session current once the code has loaded, once however many session changes
   * arrive before it; a failed load during a session is a session staff failure.
   */
  function enterOnceReady(): void {
    if (sessionWaiting) return
    sessionWaiting = true
    ready().then(
      () => {
        sessionWaiting = false
        const current = session()
        if (current !== null) positions?.enter(current)
      },
      (error: unknown) => {
        sessionWaiting = false
        if (!(error instanceof NotationError)) throw error
        if (session() !== null) env.failed(error)
      },
    )
  }

  /** Intent: the loaded code, which the Idle score always finds, since it waits for `ready()`. */
  function idleCode(): { readonly code: StaffDrawingCode; readonly positions: StaffPositions } {
    if (code === null || positions === null) {
      throw new Error('The Idle score reached the staff drawing code before it had loaded.')
    }
    return { code, positions }
  }

  return {
    ready,
    showIdle: (staged, svgs, phrase, phraseNumber, inputs) =>
      idleCode().positions.showIdle(staged, svgs, phrase, phraseNumber, inputs),
    drawOverlays: (svgs, phraseNumber, overlays) =>
      idleCode().code.applyScoreOverlays(svgs, phraseNumber, overlays),
    // Before the keeper exists, nothing has been shown in the positions: there is nothing to clear.
    clear: () => positions?.clear(),
    enter: (staff) => (positions === null ? enterOnceReady() : positions.enter(staff)),
    update: (staff) => (positions === null ? enterOnceReady() : positions.update(staff)),
    // Before the keeper exists, the session waiting for it is drawn with the inputs and the marks
    // current once it is entered.
    relayout: () => positions?.relayout(),
    redrawMarks: () => positions?.redrawMarks(),
    leave: () => positions?.leave(),
  }
}
