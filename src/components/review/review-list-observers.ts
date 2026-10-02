/**
 * What the Review's list reports to its engraving scheduler (./review-engraving-window.ts): which
 * items are near the visible area and which are far from it, from two intersection observers on
 * the page's viewport, and when the list's width changes, from a resize observer on the list.
 * Also how far an item is from the visible area, which orders the engravings.
 */
import type { ReviewEngravingWindow } from './review-engraving-window'

/** Near: within one viewport height above or below the visible area. */
// @spec-link [[req_last_session_review]]
export const REVIEW_NEAR_ROOT_MARGIN = '100% 0px'

/** Retained: within three viewport heights above or below the visible area. */
// @spec-link [[req_last_session_review]]
export const REVIEW_RETAINED_ROOT_MARGIN = '300% 0px'

/** Intent: an item's distance, in CSS px, from the visible area of the window; 0 when it shows. */
// @spec-link [[req_last_session_review]]
export function distanceFromVisibleArea(item: Element): number {
  const box = item.getBoundingClientRect()
  if (box.bottom < 0) return -box.bottom
  if (box.top > window.innerHeight) return box.top - window.innerHeight
  return 0
}

/**
 * Intent: observe every item of the list (its children, in order) for the scheduler, and the
 * list's width: a real width change invalidates the engravings, anything else (its block size
 * growing as positions are reserved) does not. Returns the function that stops observing.
 */
// @spec-link [[req_last_session_review]]
export function observeReviewList(list: HTMLElement, engraving: ReviewEngravingWindow): () => void {
  const items = Array.from(list.children)
  const indexes = new Map(items.map((item, index) => [item, index]))

  /** Intent: the list index of an observed item; any other target is a wiring defect. */
  function indexOf(target: Element): number {
    const index = indexes.get(target)
    if (index === undefined)
      throw new Error('The review list observed an element it does not hold.')
    return index
  }

  const nearObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) engraving.near(indexOf(entry.target), entry.isIntersecting)
    },
    { rootMargin: REVIEW_NEAR_ROOT_MARGIN },
  )
  const retainedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) engraving.retained(indexOf(entry.target), entry.isIntersecting)
    },
    { rootMargin: REVIEW_RETAINED_ROOT_MARGIN },
  )
  for (const item of items) {
    nearObserver.observe(item)
    retainedObserver.observe(item)
  }

  let widthPx = list.clientWidth
  const resizeObserver = new ResizeObserver(() => {
    const next = list.clientWidth
    if (next === widthPx) return
    widthPx = next
    engraving.invalidate()
  })
  resizeObserver.observe(list)

  return () => {
    nearObserver.disconnect()
    retainedObserver.disconnect()
    resizeObserver.disconnect()
  }
}
