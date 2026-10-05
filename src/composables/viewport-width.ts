/**
 * The injected seam through which the workspace session learns where the window stands against
 * the tablet-landscape layout's width (`bp-tablet-landscape`, 64rem). The session reads it when
 * each phrase is generated, so the phrase takes the note density that width gives at that moment,
 * and subscribes to its crossings so the controls and the unsupported-rhythm block follow the
 * window at Idle. Production supplies a `matchMedia`-backed provider
 * (`src/components/workspace/browser-viewport-width.ts`); a test supplies a fake it moves by hand.
 */

/** Where the window stands against `bp-tablet-landscape`, read now or on each crossing. */
// @spec-link [[module_idle_window_width_density]]
// @spec-link [[rule_generated_density_follows_window_width]]
export interface ViewportWidthProvider {
  /** Whether the window is narrower than `bp-tablet-landscape` right now. */
  readonly isBelowTabletLandscape: () => boolean
  /**
   * Call `listener` after every crossing of `bp-tablet-landscape`, in either direction. Returns
   * the function that stops it.
   */
  readonly subscribe: (listener: () => void) => () => void
}
