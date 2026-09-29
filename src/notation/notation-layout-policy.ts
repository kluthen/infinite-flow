/**
 * The pure staff layout planner for a four-measure written phrase. The layout is chosen by the
 * viewport's width alone: from the 64rem tablet-landscape breakpoint up, one staff system holds all
 * four measures; below it, the split layout puts bars 1-2 on a top system and bars 3-4 on a bottom
 * one, for every phrase. The staff area always reserves two system positions of one block size,
 * set from the viewport and never from a phrase. The planner picks one uniform engraving scale
 * that fits the width and, below the breakpoint, the height too, never below a named legibility
 * floor and never above a named maximum, and tells its two failures apart: no room for the staff
 * (the window, whatever the phrase) and notes too wide (this phrase). This module never touches
 * vexflow or the DOM so the arithmetic can be tested in isolation from the rendering adapter.
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
 * The block size of one system position, in engraving units at scale 1: 17.5 staff spaces, the
 * same for both positions and every instrument profile, so a position's size depends on the scale
 * alone, never on a phrase. It is the staff's top-line offset below (8 spaces of headroom) plus 9.5
 * spaces from the top line down: the staff itself (4 spaces) and the room under it. Calibrated on
 * the ink of real engraved phrases (see docs/notation-engraving.md): the highest ink, chord symbols
 * over the saxophones' highest written notes (up to C6), reaches about 7.2 spaces above the top
 * line; the lowest, the C MIDI keyboard's lowest written notes (down to C3) with their ledger
 * lines, about 8.5 spaces below it.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_SYSTEM_POSITION_UNITS = 175

/**
 * Where the staff's top line sits inside its system position, in engraving units from the
 * position's top edge: the headroom kept for chord symbols and high ledger-line notes.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_STAFF_TOP_LINE_UNITS = 80

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
 * Mirrors the workspace's own `--breakpoint-tablet-landscape: 64rem` breakpoint
 * (src/styles/theme.css) as a width-only `matchMedia` query: while it matches, the staff uses the
 * split layout and fits the height budget as well as the width. The stylesheet's phone staff block
 * in src/styles/components.css uses the same query, so both always agree on the side.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_PHONE_LAYOUT_MEDIA_QUERY = '(max-width: 63.9375rem)'

/** The two staff layouts: one system of four measures, or two systems of two measures each. */
export type StaffLayout = 'one-system' | 'split'

/**
 * The viewport as the planner sees it: the layout its width selects and, for the split layout
 * only, the height budget (CSS px) the two system positions must fit in together.
 */
export type StaffViewport =
  { readonly layout: 'one-system' } | { readonly layout: 'split'; readonly heightBudgetPx: number }

/** The window cannot hold the staff at the legibility floor, whatever phrase it holds. */
export interface StaffNoRoom {
  readonly kind: 'no_room'
  readonly cause: 'too_narrow' | 'too_short'
  readonly details: Readonly<Record<string, number>>
}

/** The window has room, but this phrase's measures need more width than the floor allows. */
export interface StaffNotesTooWide {
  readonly kind: 'notes_too_wide'
  readonly details: Readonly<Record<string, number>>
}

/** The phrase-independent sizing of the two reserved system positions for one viewport. */
export type StaffPositionsOutcome =
  | { readonly kind: 'room'; readonly scaleCeiling: number; readonly positionBlockPx: number }
  | StaffNoRoom

/** The exact budget inputs for a four-measure phrase, in engraving units at scale 1. */
export interface SystemLayoutInput {
  readonly containerWidthPx: number
  readonly leadingWidth: number
  readonly measureMinWidths: readonly [number, number, number, number]
  readonly systemPadding: number
  readonly viewport: StaffViewport
}

/**
 * The resolved layout: one uniform scale for the whole phrase and one system's width, shared by
 * both systems in the split layout so their measure columns align.
 */
export interface SystemLayoutPlan {
  readonly layout: StaffLayout
  readonly systemCount: 1 | 2
  readonly measuresPerSystem: 2 | 4
  readonly scale: number
  readonly staffSpacePx: number
  readonly systemWidthUnits: number
  readonly measureContentWidthUnits: number
  /** Raw engraving units (scale 1) one system of this layout requires for this phrase. */
  readonly requiredUnits: number
  /** Each system position's block size, in CSS px: the same for every phrase in this viewport. */
  readonly positionBlockPx: number
}

/** What the planner decides for one phrase in one viewport. */
export type SystemLayoutOutcome =
  { readonly kind: 'fits'; readonly plan: SystemLayoutPlan } | StaffNoRoom | StaffNotesTooWide

const MAX_SCALE = NOTATION_MAX_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
const FLOOR_SCALE =
  NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE

/** Intent: guard the container width is a usable, positive, finite pixel measurement. */
function assertContainerWidth(containerWidthPx: number): void {
  if (!Number.isFinite(containerWidthPx) || containerWidthPx <= 0) {
    throw new NotationError(
      'notation_container_unavailable',
      'Notation container width is unavailable (non-finite or non-positive).',
      { containerWidthPx },
    )
  }
}

/** Intent: guard the split layout's height budget is a finite pixel measurement (it may be negative: no room). */
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
 * Size the two reserved system positions for a viewport, independent of any phrase. From the
 * breakpoint up, where the scale fits the width only, the positions take the maximum scale, so
 * any phrase fits them; the frame keeps its fixed minimum block size and grows past it to hold
 * both. Below it, both positions together must fit the height budget: the scale ceiling is the
 * largest that does, capped at the maximum, and a budget too short for the legibility floor
 * leaves the staff no room.
 */
// @spec-link [[module_notation_layout_preflight]]
export function planStaffPositions(viewport: StaffViewport): StaffPositionsOutcome {
  if (viewport.layout === 'one-system') {
    return {
      kind: 'room',
      scaleCeiling: MAX_SCALE,
      positionBlockPx: NOTATION_SYSTEM_POSITION_UNITS * MAX_SCALE,
    }
  }
  assertHeightBudget(viewport.heightBudgetPx)
  const heightScale = viewport.heightBudgetPx / (2 * NOTATION_SYSTEM_POSITION_UNITS)
  if (heightScale < FLOOR_SCALE) {
    return {
      kind: 'no_room',
      cause: 'too_short',
      details: {
        heightBudgetPx: viewport.heightBudgetPx,
        requiredHeightPx: 2 * NOTATION_SYSTEM_POSITION_UNITS * FLOOR_SCALE,
        floor: NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX,
      },
    }
  }
  const scaleCeiling = Math.min(MAX_SCALE, heightScale)
  return {
    kind: 'room',
    scaleCeiling,
    positionBlockPx: NOTATION_SYSTEM_POSITION_UNITS * scaleCeiling,
  }
}

/**
 * Plan the four-measure written phrase in the layout its viewport selects, never trying the other
 * one. One system needs the leading width (clef, key signature, time signature) plus its measure
 * count (four, or two in the split layout) times the widest measure's minimum width, never less
 * than the minimum measure width, plus padding; every measure gets that one width, so they read as
 * visibly equal and the split layout's columns align. The scale is the smallest of the maximum,
 * the width fit and (split layout) the height fit. Failures are returned, not thrown, as two
 * distinct outcomes: "no room" when the window cannot hold the staff whatever the phrase (too short
 * for two systems at the floor, or too narrow for the fixed parts with every measure at the minimum
 * width), checked first; "notes too wide" when there is room but this phrase needs more width.
 */
// @spec-link [[module_notation_layout_preflight]]
export function planSystemLayout(input: SystemLayoutInput): SystemLayoutOutcome {
  assertContainerWidth(input.containerWidthPx)

  const positions = planStaffPositions(input.viewport)
  if (positions.kind === 'no_room') return positions

  const layout = input.viewport.layout
  const measuresPerSystem = layout === 'one-system' ? 4 : 2
  const fixedUnits =
    input.leadingWidth + measuresPerSystem * NOTATION_MIN_MEASURE_WIDTH_UNITS + input.systemPadding
  if (input.containerWidthPx < fixedUnits * FLOOR_SCALE) {
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

  const widestMeasureUnits = Math.max(NOTATION_MIN_MEASURE_WIDTH_UNITS, ...input.measureMinWidths)
  const requiredUnits =
    input.leadingWidth + measuresPerSystem * widestMeasureUnits + input.systemPadding
  const widthScale = input.containerWidthPx / requiredUnits
  if (widthScale < FLOOR_SCALE) {
    return {
      kind: 'notes_too_wide',
      details: {
        containerWidthPx: input.containerWidthPx,
        requiredWidthPx: requiredUnits * FLOOR_SCALE,
        requiredUnits,
        floor: NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX,
      },
    }
  }

  const scale = Math.min(positions.scaleCeiling, widthScale)
  const systemWidthUnits = input.containerWidthPx / scale
  return {
    kind: 'fits',
    plan: {
      layout,
      systemCount: layout === 'one-system' ? 1 : 2,
      measuresPerSystem,
      scale,
      staffSpacePx: scale * NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE,
      systemWidthUnits,
      measureContentWidthUnits:
        (systemWidthUnits - input.leadingWidth - input.systemPadding) / measuresPerSystem,
      requiredUnits,
      positionBlockPx: positions.positionBlockPx,
    },
  }
}
