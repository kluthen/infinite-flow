/**
 * The single ambient declaration of the scratch fields the workspace specs stash on `window` to
 * observe the `generation-status` live region's text transitions without racing its updates: a
 * `MutationObserver` records every text value the region takes on into `__statusLog` before an
 * action starts, so a fast generation can never skip past the check. The measurement specs add
 * their in-page timestamps and main-thread probes here too.
 */

interface Window {
  __statusLog?: string[]
  /** In-page click and "Phrase ready" timestamps of the current timed generation cycle. */
  __phraseTiming?: { clickAt: number | null; readyAt: number | null }
  /** The engraving measurement's main-thread probes: long tasks, long frames and a heartbeat. */
  __mainThread?: {
    longTasks: { startTime: number; duration: number }[]
    longFrames: {
      startTime: number
      duration: number
      scripts: { startTime: number; duration: number; invoker: string; invokerType: string }[]
    }[]
    heartbeat: { running: boolean; last: number; maxGap: number }
  }
  /** When a resize-triggered redraw swapped the engraved staff into the visible score. */
  __redrawStamps?: { swappedAt: number | null }
}
