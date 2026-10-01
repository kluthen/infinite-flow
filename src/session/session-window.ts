/**
 * The session window rule, as pure arithmetic on sizes the caller measures: the staff layout a
 * session holds, chosen at Start by the window's width alone, and whether a window change ends the
 * session because the staff can no longer be shown. A portrait-shaped view below bp-desktop ends
 * it (the rotate-device notice replaces the workspace there); so does a size at which the HELD
 * layout has no room at the legibility floor, judged with the planner's own phrase-independent
 * room check: too narrow, or, only while the window is below bp-tablet-landscape, too short. The
 * held layout may differ from the one the current width would choose (a split layout held across
 * a bp-tablet-landscape crossing is still judged as split). This covers the window only; whether
 * the phrase material on screen still fits at the new size is the planner's per-phrase check.
 */
import {
  BREAKPOINT_DESKTOP_REM,
  BREAKPOINT_TABLET_LANDSCAPE_REM,
  planStaffPositions,
  planStaffWidthRoom,
  type StaffLayout,
} from '../notation/notation-layout-policy'

/** Why a window change ends the session; the engine's end cause for all three is `staff-not-shown`. */
// @spec-link [[rule_session_ends_on_portrait_view]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
export type SessionWindowEnd = 'portrait_view' | 'too_narrow' | 'too_short'

/**
 * The window and staff sizes the rule judges, all in CSS px. The caller must pass the SMALL
 * viewport height (100svh, browser toolbars showing), never the dynamic one, so a toolbar showing
 * or hiding changes no input and ends nothing; the height budget derives from it too.
 */
// @spec-link [[rule_session_ends_when_staff_too_small]]
export interface SessionWindowInput {
  /** The layout the session holds, from `sessionLayoutAtStart`. */
  readonly heldLayout: StaffLayout
  /** The viewport width. */
  readonly widthPx: number
  /** The small viewport height (100svh). */
  readonly smallHeightPx: number
  /** CSS px per rem in media queries (the browser's initial font size), to place the breakpoints. */
  readonly remPx: number
  /** The staff container's width at the new size, as the staff measures it. */
  readonly containerWidthPx: number
  /** The leading clef, key signature and time signature width, in engraving units at scale 1. */
  readonly leadingWidth: number
  /** The system padding, in engraving units at scale 1. */
  readonly systemPadding: number
  /**
   * Below bp-tablet-landscape, the split layout's height budget for its two system positions, as
   * the staff frame's phone `max-block-size` gives it (derived from the small viewport height);
   * null from bp-tablet-landscape up, where no height budget exists.
   */
  readonly heightBudgetPx: number | null
}

/** Intent: guard a measured size is a finite positive number, naming it in the error. */
function assertPositiveSize(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`session window: ${name} ${value} is not a finite positive number`)
  }
}

/** Intent: whether a width in CSS px is below a breakpoint given in rem. */
function isBelow(widthPx: number, breakpointRem: number, remPx: number): boolean {
  return widthPx < breakpointRem * remPx
}

/**
 * Intent: the staff layout a session holds, chosen at Start from the viewport width alone, never
 * from phrase 1: split below bp-tablet-landscape, one system from it up, as at Idle.
 */
// @spec-link [[rule_session_layout_fixed_at_start]]
export function sessionLayoutAtStart(widthPx: number, remPx: number): StaffLayout {
  assertPositiveSize('width', widthPx)
  assertPositiveSize('rem size', remPx)
  return isBelow(widthPx, BREAKPOINT_TABLET_LANDSCAPE_REM, remPx) ? 'split' : 'one-system'
}

/**
 * Intent: whether the window is portrait-shaped (height at least the width, as CSS
 * `orientation: portrait`) below bp-desktop: the rotate-device notice then replaces the workspace,
 * so a session cannot start, and one running ends. Throws on a non-positive size.
 */
// @spec-link [[rule_session_ends_on_portrait_view]]
// @spec-link [[rule_session_start_conditions]]
export function isPortraitBelowDesktop(
  shape: Pick<SessionWindowInput, 'widthPx' | 'smallHeightPx' | 'remPx'>,
): boolean {
  assertPositiveSize('width', shape.widthPx)
  assertPositiveSize('small viewport height', shape.smallHeightPx)
  assertPositiveSize('rem size', shape.remPx)
  const belowDesktop = isBelow(shape.widthPx, BREAKPOINT_DESKTOP_REM, shape.remPx)
  return belowDesktop && shape.smallHeightPx >= shape.widthPx
}

/**
 * Intent: the reason a window change ends the session, or null when the session keeps running.
 * First a portrait-shaped view (height at least the width, as CSS `orientation: portrait`) below
 * bp-desktop; then, in the planner's own order, the height room at the floor (only for a held
 * split layout while the window is below bp-tablet-landscape) and the held layout's width room
 * at the floor. The one-system
 * layout has no height requirement in the planner, so it can only end for being too narrow.
 * Throws on a non-positive size and on a window below bp-tablet-landscape given no height budget.
 */
// @spec-link [[rule_session_ends_on_portrait_view]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
// @spec-link [[rule_session_layout_fixed_at_start]]
export function windowEndsSession(input: SessionWindowInput): SessionWindowEnd | null {
  if (isPortraitBelowDesktop(input)) return 'portrait_view'

  const belowTabletLandscape = isBelow(input.widthPx, BREAKPOINT_TABLET_LANDSCAPE_REM, input.remPx)
  if (belowTabletLandscape && input.heightBudgetPx === null) {
    throw new Error('session window: no height budget below bp-tablet-landscape')
  }
  if (belowTabletLandscape && input.heldLayout === 'split' && input.heightBudgetPx !== null) {
    const positions = planStaffPositions({ layout: 'split', heightBudgetPx: input.heightBudgetPx })
    if (positions.kind === 'no_room') return 'too_short'
  }
  const tooNarrow = planStaffWidthRoom({
    containerWidthPx: input.containerWidthPx,
    leadingWidth: input.leadingWidth,
    systemPadding: input.systemPadding,
    layout: input.heldLayout,
  })
  return tooNarrow === null ? null : 'too_narrow'
}
