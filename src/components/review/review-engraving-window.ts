/**
 * The Review's lazy-engraving scheduler, free of the DOM: it decides which phrases of the list are
 * engraved, and when, from what the page reports about each item. An item is engraved once it is
 * near the visible area (within one viewport height of it); an engraved item, or one showing a
 * note, is released (its content removed, its reserved space left blank) once it is far from it
 * (more than three viewport heights away). Engravings run one at a time, with a turn for the
 * browser between two, the queued item nearest the visible area first. A change of the engraving
 * inputs (the list's width, the staff viewport) re-engraves every engraved item still near and
 * retries every "wider window" note there, and releases the others, which engrave again when they
 * come near. However long the list, the work and the engraved items stay bounded by the items near
 * the visible area.
 */

/** How one engraving ended: drawn, too wide for the window now, or failed for another reason. */
// @spec-link [[req_last_session_review]]
export type ReviewEngravingOutcome = 'engraved' | 'needs-wider-window' | 'failed'

/** What an item shows: nothing yet (its reserved space blank), or an engraving's outcome. */
// @spec-link [[req_last_session_review]]
export type ReviewItemState = 'blank' | ReviewEngravingOutcome

/** What the scheduler asks of the page. */
// @spec-link [[req_last_session_review]]
export interface ReviewEngravingEnvironment {
  readonly itemCount: number
  /** Whether engraving may run now (false while the staff viewport is unknown). */
  canEngrave(): boolean
  /** The item's distance, in CSS px, from the visible area: 0 when any of it shows. */
  distance(index: number): number
  /**
   * Engrave the item at the current inputs, replacing whatever it shows, and resolve to the
   * outcome; null when it cannot be engraved now (its view is gone, or the viewport became
   * unknown meanwhile), leaving it as it was.
   */
  engrave(index: number): Promise<ReviewEngravingOutcome | null>
  /** Remove the item's engraving or note, leaving its reserved space blank. */
  release(index: number): void
  /** Resolve once the browser has had a turn, between two engravings. */
  nextTurn(): Promise<void>
}

/** The scheduler, fed by the page's observers. */
// @spec-link [[req_last_session_review]]
export interface ReviewEngravingWindow {
  /** The item came within (true) or went beyond (false) one viewport height of the visible area. */
  near(index: number, isNear: boolean): void
  /** The item is within (true) or beyond (false) three viewport heights of the visible area. */
  retained(index: number, isRetained: boolean): void
  /** The engraving inputs changed, or engraving became possible: redraw what needs it. */
  invalidate(): void
  stateOf(index: number): ReviewItemState
  /** Stop: no engraving starts after this, and none finishing is recorded. */
  dispose(): void
}

/**
 * Intent: create the scheduler for one list of `itemCount` items, every item blank. Work starts
 * on the next microtask after a report, so a whole observer callback's reports are queued before
 * the nearest item is picked.
 */
// @spec-link [[req_last_session_review]]
export function createReviewEngravingWindow(
  env: ReviewEngravingEnvironment,
): ReviewEngravingWindow {
  const { itemCount } = env
  const states: ReviewItemState[] = new Array<ReviewItemState>(itemCount).fill('blank')
  const near = new Uint8Array(itemCount)
  /** Bumped when an item is released, so an engraving of it under way is undone on finishing. */
  const releases = new Uint32Array(itemCount)
  /** The items not blank, so an input change visits only those. */
  const shown = new Set<number>()
  /** The near items waiting for an engraving. */
  const queued = new Set<number>()
  /** Bumped on every input change, so an engraving under way at the old inputs is redone. */
  let inputs = 0
  let running = false
  let scheduled = false
  let disposed = false

  /** Intent: refuse an index the list does not have: the caller's mapping is broken. */
  function assertIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= itemCount) {
      throw new RangeError(`Review item ${index} is outside the list of ${itemCount}.`)
    }
  }

  /** Intent: record what an item shows. */
  function setState(index: number, state: ReviewItemState): void {
    states[index] = state
    if (state === 'blank') shown.delete(index)
    else shown.add(index)
  }

  /** Intent: blank an item that shows something, and undo any engraving of it under way. */
  function release(index: number): void {
    releases[index] = (releases[index] ?? 0) + 1
    queued.delete(index)
    if (states[index] === 'blank') return
    setState(index, 'blank')
    env.release(index)
  }

  /** Intent: the queued item nearest the visible area, the earlier in the list on a tie. */
  function nearestQueued(): number | null {
    let best: number | null = null
    let bestDistance = Infinity
    for (const index of queued) {
      const distance = env.distance(index)
      if (distance < bestDistance || (distance === bestDistance && best !== null && index < best)) {
        best = index
        bestDistance = distance
      }
    }
    return best
  }

  /**
   * Intent: record an engraving that finished: undone if the item was released meanwhile, queued
   * again if the inputs changed meanwhile and it is still near.
   */
  function settle(
    index: number,
    outcome: ReviewEngravingOutcome,
    releasesAtStart: number,
    inputsAtStart: number,
  ): void {
    if (releases[index] !== releasesAtStart) {
      env.release(index)
      return
    }
    setState(index, outcome)
    if (inputs !== inputsAtStart && near[index] === 1) queued.add(index)
  }

  /** Intent: engrave the queued items one at a time, nearest first, until none is left. */
  async function run(): Promise<void> {
    running = true
    try {
      while (!disposed && env.canEngrave()) {
        const index = nearestQueued()
        if (index === null) return
        queued.delete(index)
        const releasesAtStart = releases[index]!
        const inputsAtStart = inputs
        const outcome = await env.engrave(index)
        if (disposed) return
        if (outcome === null) {
          // Not engraved: it waits, still queued if near, for the next report or input change.
          if (near[index] === 1 && releases[index] === releasesAtStart) queued.add(index)
          return
        }
        settle(index, outcome, releasesAtStart, inputsAtStart)
        await env.nextTurn()
      }
    } finally {
      running = false
    }
  }

  /** Intent: start the run on the next microtask unless one is running or about to. */
  function schedule(): void {
    if (scheduled || running || disposed) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      if (running || disposed) return
      void run()
    })
  }

  return {
    near(index, isNear) {
      assertIndex(index)
      near[index] = isNear ? 1 : 0
      if (!isNear) {
        queued.delete(index)
        return
      }
      if (states[index] === 'blank') queued.add(index)
      schedule()
    },
    retained(index, isRetained) {
      assertIndex(index)
      if (isRetained) return
      near[index] = 0
      release(index)
    },
    invalidate() {
      inputs += 1
      for (const index of [...shown]) {
        if (near[index] === 0) release(index)
        else if (states[index] !== 'failed') queued.add(index)
      }
      schedule()
    },
    stateOf(index) {
      assertIndex(index)
      return states[index]!
    },
    dispose() {
      disposed = true
      queued.clear()
    },
  }
}
