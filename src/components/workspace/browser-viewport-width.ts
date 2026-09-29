/**
 * The production `ViewportWidthProvider`: a `matchMedia` query for "narrower than
 * `bp-tablet-landscape`", the same `(max-width: 63.9375rem)` media condition the stylesheet's
 * below-tablet-landscape blocks use (`src/styles/components.css`), so the density rule and the
 * layout always agree on which side of 64rem the window is.
 */
import type { ViewportWidthProvider } from '@/composables/viewport-width'

/** The media query that matches while the window is narrower than `bp-tablet-landscape` (64rem). */
export const BELOW_TABLET_LANDSCAPE_MEDIA_QUERY = '(max-width: 63.9375rem)'

/** The part of a `MediaQueryList` the provider uses. */
export type ViewportMediaQuery = Pick<
  MediaQueryList,
  'matches' | 'addEventListener' | 'removeEventListener'
>

/**
 * Intent: adapt one media-query list to a `ViewportWidthProvider`: a read returns whether it
 * matches now, and a subscriber hears each of its `change` events, which fire on every crossing.
 */
// @spec-link [[rule_generated_density_follows_window_width]]
export function createMediaQueryViewportWidth(query: ViewportMediaQuery): ViewportWidthProvider {
  return {
    isBelowTabletLandscape: () => query.matches,
    subscribe: (listener) => {
      const onChange = (): void => listener()
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
  }
}

/** Intent: the provider for this browser window, from `window.matchMedia`. */
// @spec-link [[rule_generated_density_follows_window_width]]
export function createBrowserViewportWidth(): ViewportWidthProvider {
  return createMediaQueryViewportWidth(window.matchMedia(BELOW_TABLET_LANDSCAPE_MEDIA_QUERY))
}
