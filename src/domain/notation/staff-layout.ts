/**
 * The staff layout's window arithmetic, shared by the notation planner and the session: the
 * engraving scale's named sizes, the breakpoints a width is judged against, the two staff layouts
 * and the viewport the planner sees, and the phrase-independent room checks (the two reserved
 * system positions against the window's height budget, and a layout's fixed parts against its
 * width). Pure arithmetic on sizes the caller measures; the phrase planner itself stays in
 * `src/notation/notation-layout-policy.ts`, which builds on this.
 */
import { NotationError } from './notation-error'

/** VexFlow engraving units per staff space at its native scale of 1. */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE = 10

/**
 * The smallest staff-space size, in CSS pixels, at which the engraved phrase is still legible:
 * 5 px (about 1.3 mm at the CSS reference pixel), the size of a pocket or choral score and below a
 * standard part (about 7 px). Never engrave below this floor. Chosen from the calibration recorded
 * in docs/notation-engraving.md and signed off as the product legibility floor on 2026-09-24.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX = 5

/**
 * The largest staff-space size, in CSS pixels, the layout will ever grow to on a wide container:
 * 12 px, a large part size, so sparse phrases on wide desktops do not balloon past comfortable
 * reading size. An engineering choice, not a product constraint.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_MAX_STAFF_SPACE_PX = 12

/**
 * The built-in block size of one system position, in engraving units at scale 1: 16 staff
 * spaces, the size the three built-in profiles need, and the size of both positions whenever no
 * saved my instrument needs more. It is the floor of the shared size `planSystemPositionUnits`
 * gives: the same for both positions and every instrument choice, so a position's size depends on
 * the scale alone, never on a phrase or the selected profile. It holds the tallest ink any
 * built-in profile's written range can produce, start marker included (see `planStaffPlacement`),
 * with at least 0.8 staff space clear at each end. The tallest is the C MIDI keyboard's (written
 * C3 to C5), about 14.4 spaces: from the start marker over the chord symbol over an up-stemmed
 * written C5 inside a beam group, down to written C3. The saxophones' (written C4 to C6) spans
 * about 13.7: from the start marker over the chord symbol over an up-stemmed written E5 inside a
 * beam group, down to the beam under a down-stemmed group reaching written F4. 15 spaces would
 * leave about 0.3 space at each end for the keyboard and 0.65 for the saxophones; 16 leaves 0.8
 * and 1.15. 16 is also the most that keeps two systems on a landscape phone with its browser
 * toolbar showing: two positions at the 5 px legibility floor take 160 px. A saved my instrument
 * whose ink needs more makes the shared size larger for every instrument choice.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_SYSTEM_POSITION_UNITS = 160

/**
 * The narrowest content width, in engraving units, the engraver ever gives a measure: about a
 * measure holding one whole note or rest with its margins. A measure whose own minimum width is
 * smaller is drawn at this width. It also sizes the layout's fixed parts for the "no room" test:
 * a container that cannot hold the leading clef/key/time signatures plus every measure at this
 * width, at the legibility floor, has no room for any phrase.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_MIN_MEASURE_WIDTH_UNITS = 40

/**
 * The workspace's `--breakpoint-tablet-landscape` (src/styles/theme.css) as a number of rem, for
 * pure code that judges a width it is given: a width below it selects the split layout, as the
 * `NOTATION_PHONE_LAYOUT_MEDIA_QUERY` of `src/notation/notation-layout-policy.ts` does.
 */
// @spec-link [[module_notation_layout_preflight]]
export const BREAKPOINT_TABLET_LANDSCAPE_REM = 64

/**
 * `--breakpoint-desktop` (src/styles/theme.css) as a number of rem: below it, a portrait-shaped
 * view hides the workspace behind the rotate-device notice (the portrait guard in
 * src/styles/components.css, `(max-width: 89.9375rem) and (orientation: portrait)`).
 */
// @spec-link [[rule_session_ends_on_portrait_view]]
export const BREAKPOINT_DESKTOP_REM = 90

/** The two staff layouts: one system of four measures, or two systems of two measures each. */
export type StaffLayout = 'one-system' | 'split'

/**
 * What one system position holds of a phrase: bars 1-4 (the one-system layout's `whole`), or the
 * split layout's bars 1-2 (`opening`) or bars 3-4 (`closing`).
 */
// @spec-link [[module_session_rolling_display]]
export type SystemPart = 'whole' | 'opening' | 'closing'

/**
 * The viewport as the planner sees it: the layout drawn and the window's height budget (CSS px)
 * the two system positions must fit in together. The budget is the window's, whatever the layout:
 * non-null exactly while the window is below bp-tablet-landscape, null from it up. At Idle the
 * layout is the one the width selects (split with a budget below, one system without one from the
 * breakpoint up); a running session draws its held layout in the window's budget (`heldViewport`).
 */
// @spec-link [[module_notation_layout_preflight]]
export interface StaffViewport {
  readonly layout: StaffLayout
  readonly heightBudgetPx: number | null
}

/** The window cannot hold the staff at the legibility floor, whatever phrase it holds. */
export interface StaffNoRoom {
  readonly kind: 'no_room'
  readonly cause: 'too_narrow' | 'too_short'
  readonly details: Readonly<Record<string, number>>
}

/** The phrase-independent sizing of the two reserved system positions for one viewport. */
export type StaffPositionsOutcome =
  | { readonly kind: 'room'; readonly scaleCeiling: number; readonly positionBlockPx: number }
  | StaffNoRoom

/** The phrase-independent inputs of the width half of the room check, for one named layout. */
export interface StaffWidthRoomInput {
  readonly containerWidthPx: number
  /** The leading clef, key signature and time signature width, in engraving units at scale 1. */
  readonly leadingWidth: number
  readonly systemPadding: number
  readonly layout: StaffLayout
}

/** The largest and the smallest engraving scale: the maximum and the floor staff-space sizes. */
export const MAX_SCALE = NOTATION_MAX_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
export const FLOOR_SCALE =
  NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE

/**
 * Guard a system-position size is one the planner can hold: finite, at least the built-in
 * size, and a whole number of staff spaces. Any other value is a caller's programming error.
 */
export function assertSystemPositionUnits(systemPositionUnits: number): void {
  if (
    !Number.isFinite(systemPositionUnits) ||
    systemPositionUnits < NOTATION_SYSTEM_POSITION_UNITS ||
    systemPositionUnits % NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE !== 0
  ) {
    throw new Error(
      `A system position of ${systemPositionUnits} units is not a whole number of staff spaces ` +
        `at least ${NOTATION_SYSTEM_POSITION_UNITS} units tall.`,
    )
  }
}

/** Guard the container width is a usable, positive, finite pixel measurement. */
export function assertContainerWidth(containerWidthPx: number): void {
  if (!Number.isFinite(containerWidthPx) || containerWidthPx <= 0) {
    throw new NotationError(
      'notation_container_unavailable',
      'Notation container width is unavailable (non-finite or non-positive).',
      { containerWidthPx },
    )
  }
}

/** Guard the window's height budget is a finite pixel measurement (it may be negative: no room). */
function assertHeightBudget(heightBudgetPx: number): void {
  if (!Number.isFinite(heightBudgetPx)) {
    throw new NotationError(
      'notation_container_unavailable',
      'Notation height budget is unavailable (non-finite).',
      { heightBudgetPx },
    )
  }
}

/**
 * Size the two reserved system positions for a viewport and the shared system-position size (in
 * engraving units, `planSystemPositionUnits`; the built-in size by default), independent of any
 * phrase and of the layout drawn. With no height budget (the window from the breakpoint up), where
 * the scale fits the width only, the positions take the maximum scale, so any phrase fits them;
 * the frame keeps its fixed minimum block size and grows past it to hold both. With a budget (the
 * window below it), both positions together must fit it, in either layout: the scale ceiling is
 * the largest that does, capped at the maximum, and a budget too short for the legibility floor
 * leaves the staff no room. A taller shared size so needs a taller window for the same scale.
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
export function planStaffPositions(
  viewport: StaffViewport,
  systemPositionUnits: number = NOTATION_SYSTEM_POSITION_UNITS,
): StaffPositionsOutcome {
  assertSystemPositionUnits(systemPositionUnits)
  if (viewport.heightBudgetPx === null) {
    return {
      kind: 'room',
      scaleCeiling: MAX_SCALE,
      positionBlockPx: systemPositionUnits * MAX_SCALE,
    }
  }
  assertHeightBudget(viewport.heightBudgetPx)
  const heightScale = viewport.heightBudgetPx / (2 * systemPositionUnits)
  if (heightScale < FLOOR_SCALE) {
    return {
      kind: 'no_room',
      cause: 'too_short',
      details: {
        heightBudgetPx: viewport.heightBudgetPx,
        requiredHeightPx: 2 * systemPositionUnits * FLOOR_SCALE,
        floor: NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX,
      },
    }
  }
  const scaleCeiling = Math.min(MAX_SCALE, heightScale)
  return {
    kind: 'room',
    scaleCeiling,
    positionBlockPx: systemPositionUnits * scaleCeiling,
  }
}

/**
 * The width half of `planStaffRoom`, for a layout named by the caller rather than selected by the
 * viewport: whether the container can hold the layout's fixed parts (the leading clef, key
 * signature and time signature, every measure at the minimum measure width, and the padding) at
 * the legibility floor. Returns the too-narrow outcome, or null when the width has room. A session
 * holding a layout across a breakpoint crossing judges its own layout's width with it.
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
export function planStaffWidthRoom(input: StaffWidthRoomInput): StaffNoRoom | null {
  assertContainerWidth(input.containerWidthPx)
  const measuresPerSystem = input.layout === 'one-system' ? 4 : 2
  const fixedUnits =
    input.leadingWidth + measuresPerSystem * NOTATION_MIN_MEASURE_WIDTH_UNITS + input.systemPadding
  if (input.containerWidthPx >= fixedUnits * FLOOR_SCALE) return null
  return {
    kind: 'no_room',
    cause: 'too_narrow',
    details: {
      containerWidthPx: input.containerWidthPx,
      requiredWidthPx: fixedUnits * FLOOR_SCALE,
      floor: NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX,
    },
  }
}
