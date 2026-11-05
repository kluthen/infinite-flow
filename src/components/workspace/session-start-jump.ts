/**
 * The one instant jump a session start makes, before the count-in's first click. From
 * bp-tablet-landscape up (the one-system layout held), the page jumps to the top of the workspace
 * only when the top edge of `staff-viewport` is outside the viewport. Below it (the split layout
 * held), the page moves by the least distance that puts the whole of `session-cue-row` and
 * `staff-viewport` inside the viewport. The arithmetic is pure; `jumpForSessionStart` measures the
 * page and scrolls it.
 */
import type { StaffLayout } from '@/notation/notation-layout-policy'

/** The page's geometry at the Start click, in viewport pixels (block axis). */
// @spec-link [[service_session_start]]
export interface SessionJumpGeometry {
  readonly viewportBlockSize: number
  /** The top of the phrase workspace (the app's layout root). */
  readonly workspaceTop: number
  readonly cueRowTop: number
  readonly staffViewportTop: number
  readonly staffViewportBottom: number
}

/** The window as the jump uses it: its instant scroll and the viewport's block size. */
// @spec-link [[service_session_start]]
export interface SessionJumpView {
  readonly scrollBy: (options: ScrollToOptions) => void
  readonly viewportBlockSize: () => number
}

/** The elements the jump measures. */
// @spec-link [[service_session_start]]
export interface SessionJumpParts {
  readonly workspace: Element
  readonly cueRow: Element
  readonly staffViewport: Element
}

/**
 * Intent: how far to scroll the page (positive: down), 0 for no jump, for the layout the session
 * holds. Below bp-tablet-landscape the cue row is never scrolled above the viewport, whatever the
 * staff's height (the phone scale rule guarantees both fit together).
 */
// @spec-link [[service_session_start]]
// @spec-link [[req_landscape_phrase_workspace]]
export function sessionStartJumpDelta(layout: StaffLayout, geometry: SessionJumpGeometry): number {
  const { viewportBlockSize, cueRowTop, staffViewportTop, staffViewportBottom } = geometry
  if (layout === 'one-system') {
    const staffTopInView = staffViewportTop >= 0 && staffViewportTop < viewportBlockSize
    return staffTopInView ? 0 : geometry.workspaceTop
  }
  if (cueRowTop < 0) return cueRowTop
  if (staffViewportBottom > viewportBlockSize) {
    return Math.min(staffViewportBottom - viewportBlockSize, cueRowTop)
  }
  return 0
}

/** Intent: measure the page and make the start's one jump, instantly; no scroll when none is needed. */
// @spec-link [[service_session_start]]
export function jumpForSessionStart(
  view: SessionJumpView,
  parts: SessionJumpParts,
  layout: StaffLayout,
): void {
  const staffBox = parts.staffViewport.getBoundingClientRect()
  const delta = sessionStartJumpDelta(layout, {
    viewportBlockSize: view.viewportBlockSize(),
    workspaceTop: parts.workspace.getBoundingClientRect().top,
    cueRowTop: parts.cueRow.getBoundingClientRect().top,
    staffViewportTop: staffBox.top,
    staffViewportBottom: staffBox.bottom,
  })
  if (delta !== 0) view.scrollBy({ top: delta, behavior: 'instant' })
}

/** Which staff a start's jump brings into place: session mode's, Jam's empty one, or Jam's own. */
export type StartStaff = 'session' | 'jam-empty' | 'jam-kept-doodle'

/**
 * Intent: the staff viewport of the mounted workspace `root` a start's jump brings into place:
 * session mode's, the first in DOM order; Jam's empty staff's, the one showing `staff-jam`; or, with
 * a doodle kept, the one in sight, Jam's staff showing phrase 1 written from it. It must be there.
 */
// @spec-link [[service_session_start]]
export function startStaffViewport(root: Element, staff: StartStaff): Element {
  const viewports = [...root.querySelectorAll('.staff-viewport')]
  const found =
    staff === 'session'
      ? viewports[0]
      : staff === 'jam-empty'
        ? viewports.find((viewport) => viewport.querySelector('.staff-jam') !== null)
        : viewports.find((viewport) => !viewport.classList.contains('is-out-of-sight'))
  if (found === undefined) throw new Error(`session start jump: no ${staff} staff viewport`)
  return found
}
