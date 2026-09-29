/**
 * A fake `ViewportWidthProvider` for unit tests: the window's position against
 * `bp-tablet-landscape` is whatever the test says, and a crossing reaches subscribers only when the
 * test makes it, so width-dependent behaviour is tested without a browser or `matchMedia`.
 */
import type { ViewportWidthProvider } from '@/composables/viewport-width'

export interface FakeViewportWidth extends ViewportWidthProvider {
  /**
   * Move the window across `bp-tablet-landscape` (or keep it on its side) and tell every
   * subscriber, as the browser's media-query change event does.
   */
  readonly cross: (belowTabletLandscape: boolean) => void
  /**
   * Change what a read returns without telling subscribers: the window has moved but no change
   * event has arrived yet, so a test can prove a phrase takes the width read when it is generated.
   */
  readonly setWithoutNotifying: (belowTabletLandscape: boolean) => void
  /** How many subscribers are listening now. */
  readonly listenerCount: () => number
}

/** Intent: build a fake width provider starting on the given side of `bp-tablet-landscape`. */
export function createFakeViewportWidth(initiallyBelowTabletLandscape = false): FakeViewportWidth {
  let below = initiallyBelowTabletLandscape
  const listeners = new Set<() => void>()
  return {
    isBelowTabletLandscape: () => below,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    cross: (belowTabletLandscape) => {
      below = belowTabletLandscape
      for (const listener of [...listeners]) listener()
    },
    setWithoutNotifying: (belowTabletLandscape) => {
      below = belowTabletLandscape
    },
    listenerCount: () => listeners.size,
  }
}
