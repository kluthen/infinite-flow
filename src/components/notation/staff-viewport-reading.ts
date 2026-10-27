/**
 * How a staff reads its viewport from the page and sizes its two reserved system positions: the
 * layout the window's width selects and, below the tablet-landscape breakpoint, the height budget
 * the enclosing `staff-frame` gives (its computed `max-block-size`, built from the small viewport
 * height, minus its block padding and border); then each position's block size for that viewport
 * and the shared system-position size, from the notation layout's planner. Shared by the session's
 * staff (./PhraseScore.vue) and Jam's empty system, so both size their positions alike.
 */
import {
  NOTATION_PHONE_LAYOUT_MEDIA_QUERY,
  planStaffPositions,
  type StaffViewport,
} from '@/notation/notation-layout-policy'

/** Intent: find the enclosing `staff-frame`, whose computed style carries the height budget. */
function staffFrame(root: HTMLElement): HTMLElement {
  const frame = root.closest<HTMLElement>('.staff-frame')
  if (!frame) {
    throw new Error('A staff must be mounted inside a .staff-frame, which holds its height budget.')
  }
  return frame
}

/**
 * Intent: read the viewport as the planner needs it, for a staff whose root is `root`: from the
 * breakpoint up, the one-system layout with no height budget; below it, the split layout in the
 * window's height budget, which is the frame's computed `max-block-size` (viewport units already
 * resolved to CSS px) minus its block padding and border; a frame without a maximum there means
 * the stylesheet and the notation layout disagree on the breakpoint, which is a defect, not a
 * state to paper over.
 */
// @spec-link [[module_notation_layout_preflight]]
export function readStaffViewport(root: HTMLElement): StaffViewport {
  if (!window.matchMedia(NOTATION_PHONE_LAYOUT_MEDIA_QUERY).matches) {
    return { layout: 'one-system', heightBudgetPx: null }
  }
  const style = getComputedStyle(staffFrame(root))
  if (style.maxBlockSize === 'none') {
    throw new Error('staff-frame has no max-block-size below the tablet-landscape breakpoint.')
  }
  const chrome = [
    style.paddingBlockStart,
    style.paddingBlockEnd,
    style.borderBlockStartWidth,
    style.borderBlockEndWidth,
  ].reduce((sum, value) => sum + parseFloat(value), 0)
  return { layout: 'split', heightBudgetPx: parseFloat(style.maxBlockSize) - chrome }
}

/**
 * Intent: each reserved position's block size, in CSS px, for the viewport and the shared
 * system-position size, whatever the staff shows. With no room in the window's height budget, the
 * two positions share the whole budget, so the frame sits at its maximum; only a height budget
 * can leave no room for the positions.
 */
// @spec-link [[module_notation_layout_preflight]]
export function staffPositionBlockPx(
  viewport: StaffViewport,
  systemPositionUnits: number | undefined,
): number {
  const positions = planStaffPositions(viewport, systemPositionUnits)
  if (positions.kind === 'room') return positions.positionBlockPx
  if (viewport.heightBudgetPx === null) {
    throw new Error('staff positions have no room without a height budget.')
  }
  return Math.max(0, viewport.heightBudgetPx) / 2
}
