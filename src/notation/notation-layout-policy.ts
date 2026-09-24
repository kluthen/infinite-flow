/**
 * The pure one-system layout budget for a four-measure written phrase: given the container width
 * and the measure/leading widths at VexFlow's engraving scale of 1, decide a single uniform scale
 * that keeps all four measures visibly equal in content width, never below a named legibility
 * floor and never above a named maximum. This module never touches vexflow or the DOM so the
 * budget arithmetic can be tested in isolation from the rendering adapter.
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
 * Mirrors the workspace's own `--bp-tablet-landscape: 64rem` breakpoint (ui_ux/ui_common.css) as a
 * `matchMedia` query: below this width, a landscape phone container is permitted to fall back to
 * the two-system phone layout when one system does not fit at the legibility floor. At 64rem and
 * above, only the one-system budget is ever tried.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_PHONE_LAYOUT_MEDIA_QUERY = '(max-width: 63.9375rem)'

/** The exact budget inputs for a four-measure phrase, in engraving units at scale 1. */
export interface SystemLayoutInput {
  readonly containerWidthPx: number
  readonly leadingWidth: number
  readonly measureMinWidths: readonly [number, number, number, number]
  readonly systemPadding: number
  /** Whether the current viewport permits falling back to the two-system phone layout. */
  readonly allowTwoSystems: boolean
}

/**
 * The resolved layout: a uniform scale, the chosen system count, and the resulting pixel/unit
 * widths. For `systemCount: 2`, `systemWidthUnits` and `measureContentWidthUnits` describe one
 * line (both lines share them, so measure columns align).
 */
export interface SystemLayoutPlan {
  readonly systemCount: 1 | 2
  readonly scale: number
  readonly staffSpacePx: number
  readonly systemWidthUnits: number
  readonly measureContentWidthUnits: number
  /** Raw engraving units (scale 1) one system requires: leading + 4x widest measure + padding. */
  readonly requiredUnits: number
  /** Raw engraving units (scale 1) one two-system line requires: leading + 2x widest + padding. */
  readonly requiredUnitsTwoSystems: number
}

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

const MAX_SCALE = NOTATION_MAX_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
const FLOOR_SCALE =
  NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE

/** Intent: fix the uniform scale for a required-units budget, clamped to the named maximum. */
function scaleFor(containerWidthPx: number, requiredUnits: number): number {
  return Math.min(MAX_SCALE, containerWidthPx / requiredUnits)
}

/** Intent: build the resolved plan for a chosen system count, its scale already known to clear the floor. */
function buildPlan(
  systemCount: 1 | 2,
  scale: number,
  input: SystemLayoutInput,
  requiredUnits: number,
  requiredUnitsTwoSystems: number,
): SystemLayoutPlan {
  const measuresPerLine = systemCount === 1 ? 4 : 2
  const staffSpacePx = scale * NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
  const systemWidthUnits = input.containerWidthPx / scale
  const measureContentWidthUnits =
    (systemWidthUnits - input.leadingWidth - input.systemPadding) / measuresPerLine

  return {
    systemCount,
    scale,
    staffSpacePx,
    systemWidthUnits,
    measureContentWidthUnits,
    requiredUnits,
    requiredUnitsTwoSystems,
  }
}

/**
 * Budget the four-measure written phrase: try one staff system holding all four measures at
 * visibly equal content width first (required width at scale 1 is the leading width, clef/key/time
 * on the first stave, plus four times the widest measure's minimum width plus system padding). If
 * that does not clear the legibility floor and `allowTwoSystems` permits it (the current viewport
 * is below the 64rem tablet-landscape breakpoint), retry as two staff systems of two measures each
 * sharing one line budget (leading width plus two times the widest measure plus padding, used for
 * both lines so bar 3 aligns under bar 1 and bar 4 under bar 2). Either way the uniform scale is
 * clamped to the named maximum and rejected below the named legibility floor rather than shrunk
 * further; when neither layout clears the floor, the typed failure carries both requirements.
 */
// @spec-link [[module_notation_layout_preflight]]
export function planSystemLayout(input: SystemLayoutInput): SystemLayoutPlan {
  assertContainerWidth(input.containerWidthPx)

  const widestMeasureUnits = Math.max(...input.measureMinWidths)
  const requiredUnits = input.leadingWidth + 4 * widestMeasureUnits + input.systemPadding
  const requiredUnitsTwoSystems = input.leadingWidth + 2 * widestMeasureUnits + input.systemPadding

  const oneSystemScale = scaleFor(input.containerWidthPx, requiredUnits)
  if (oneSystemScale >= FLOOR_SCALE) {
    return buildPlan(1, oneSystemScale, input, requiredUnits, requiredUnitsTwoSystems)
  }

  if (input.allowTwoSystems) {
    const twoSystemScale = scaleFor(input.containerWidthPx, requiredUnitsTwoSystems)
    if (twoSystemScale >= FLOOR_SCALE) {
      return buildPlan(2, twoSystemScale, input, requiredUnits, requiredUnitsTwoSystems)
    }
  }

  const details: Record<string, number> = {
    requiredWidthPx: requiredUnits * FLOOR_SCALE,
    requiredUnits,
    containerWidthPx: input.containerWidthPx,
    floor: NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX,
  }
  if (input.allowTwoSystems) {
    details.requiredWidthPxTwoSystems = requiredUnitsTwoSystems * FLOOR_SCALE
    details.requiredUnitsTwoSystems = requiredUnitsTwoSystems
  }

  throw new NotationError(
    'notation_below_legibility_floor',
    input.allowTwoSystems
      ? 'Written phrase cannot fit one or two staff systems at or above the legibility floor.'
      : 'Written phrase cannot fit one staff system at or above the legibility floor.',
    details,
  )
}
