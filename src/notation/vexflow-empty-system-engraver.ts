/**
 * Jam's empty system: one staff system with no notes, engraved into the top system position before
 * a doodle (the Notation Contract's "The empty system"). It carries the instrument's clef, the key
 * signature a phrase in the same written key and collection would carry, drawn by the phrase's own
 * helper, and the 4/4 time signature; its staff lines run to the system's end, with the opening line
 * at the system's start that every phrase system draws and no other barline (none between
 * measures, none at the end), no measure and no chord symbol. It is planned exactly as a phrase
 * whose four measures all take the engraver's minimum measure width (./notation-layout-policy.ts,
 * `planSystemLayout`), with the phrase's own leading width and system padding, and placed in its
 * position by the instrument's written range (`planStaffPlacement`), so phrase 1 later enters at
 * the same scale and in the same place, no staff line moving. Re-exported by ./vexflow-engraver.ts, so it ships in the lazy
 * engraver chunk; with that file, ./vexflow-mapping.ts, ./vexflow-two-system-engraver.ts and
 * ./vexflow-check-note-engraver.ts, one of the only five files allowed to import 'vexflow'.
 */
import { Barline, Stave } from 'vexflow/bravura'

import { NotationError } from './notation-error'
import {
  NOTATION_MIN_MEASURE_WIDTH_UNITS,
  NOTATION_SYSTEM_POSITION_UNITS,
  planStaffPlacement,
  planSystemLayout,
  type StaffViewport,
  type SystemLayoutOutcome,
  type SystemLayoutPlan,
  type WrittenRangeInClef,
} from './notation-layout-policy'
import type { StaffKeySignature, StaffNoRoomCause } from './staff-fit-types'
import {
  addClefAndKey,
  assertSystemWidthBounds,
  finishSystemSvg,
  measureLeadingWidth,
  openSystemSvg,
  SYSTEM_PADDING_UNITS,
} from './vexflow-two-system-engraver'

/** What the empty system shows: the instrument's written range in its clef, and the key signature. */
// @spec-link [[rule_jam_idle_shows_no_phrase]]
export interface EmptySystemStaff {
  /** The selected instrument's written range in its clef: the clef drawn and the staff's placement. */
  readonly rangeInClef: WrittenRangeInClef
  /** The key signature the written key and collection spell, as for a phrase. */
  readonly signature: StaffKeySignature
}

/**
 * The empty system's engraving: its SVG with the geometry its plan gives it, or no room for the
 * staff at the legibility floor (the window's, since an empty system has no notes to be too wide).
 */
// @spec-link [[rule_jam_idle_shows_no_phrase]]
export type EngravedEmptySystem =
  | {
      readonly kind: 'engraved'
      readonly svg: SVGSVGElement
      readonly staffSpacePx: number
      /** Each reserved system position's block size, in CSS px, as for a phrase. */
      readonly positionBlockPx: number
    }
  | { readonly kind: 'no_room'; readonly cause: StaffNoRoomCause }

/** The four measures of the plan, each at the engraver's minimum measure width. */
const EMPTY_MEASURE_MIN_WIDTHS = [
  NOTATION_MIN_MEASURE_WIDTH_UNITS,
  NOTATION_MIN_MEASURE_WIDTH_UNITS,
  NOTATION_MIN_MEASURE_WIDTH_UNITS,
  NOTATION_MIN_MEASURE_WIDTH_UNITS,
] as const

/**
 * Intent: run `work`, turning any failure into a typed NotationError (a VexFlow `RuntimeError`
 * wrapped as `notation_engraving_failed`, with the original as `cause`) and leaving `host` empty.
 */
function typedEngraving<T>(host: HTMLElement, work: () => T): T {
  try {
    return work()
  } catch (error) {
    host.replaceChildren()
    if (error instanceof NotationError) throw error
    throw new NotationError(
      'notation_engraving_failed',
      `VexFlow engraving failed: ${error instanceof Error ? error.message : String(error)}`,
      {},
      error,
    )
  }
}

/**
 * Intent: plan the empty system as the planner plans a phrase whose four measures all take the
 * minimum measure width, with the leading width and the system padding a phrase's first system
 * has for this clef and key signature, in the viewport's layout and the shared position size.
 */
// @spec-link [[module_notation_layout_preflight]]
function planEmptySystem(
  staff: EmptySystemStaff,
  containerWidthPx: number,
  viewport: StaffViewport,
  systemPositionUnits: number,
): SystemLayoutOutcome {
  return planSystemLayout({
    containerWidthPx,
    leadingWidth: measureLeadingWidth(staff.rangeInClef.clef, staff.signature),
    measureMinWidths: EMPTY_MEASURE_MIN_WIDTHS,
    systemPadding: SYSTEM_PADDING_UNITS,
    viewport,
    systemPositionUnits,
  })
}

/**
 * Intent: draw the empty system into `host`: one stave as wide as the system, its top line where
 * the instrument's placement puts a phrase's, carrying the clef, the key signature and 4/4, with the
 * opening line a phrase's first stave keeps (the stave's default start barline) and no end barline.
 */
// @spec-link [[rule_jam_idle_shows_no_phrase]]
function drawEmptySystem(host: HTMLElement, staff: EmptySystemStaff, plan: SystemLayoutPlan): void {
  const context = openSystemSvg(host, plan).getContext()
  const { staffTopLineUnits } = planStaffPlacement(staff.rangeInClef, plan.systemPositionUnits)
  // As a phrase's staves: no space above the top line, so the stave's y is the top line itself.
  const stave = new Stave(0, staffTopLineUnits, plan.systemWidthUnits, { spaceAboveStaffLn: 0 })
  addClefAndKey(stave, staff.rangeInClef.clef, staff.signature)
  stave.addTimeSignature('4/4')
  stave.setEndBarType(Barline.type.NONE)
  stave.setContext(context).draw()
}

/**
 * Engrave the empty system into `host`, replacing its content, for the container width, the
 * viewport (its layout and height budget) and the shared system-position size
 * (`planSystemPositionUnits`; the built-in size by default): at the scale and the placement a
 * phrase's top system would get there, in an SVG marked like a score system (`staff-svg`, so the
 * stylesheet recolours it). Returns `no_room` with its cause, leaving `host` empty, when the window
 * cannot hold the staff layout at the legibility floor. Call it once `ensureNotationFonts()` has
 * resolved, as the score does. An unusable width throws `notation_container_unavailable`; any
 * other failure leaves `host` empty and throws a typed NotationError (`notation_engraving_failed`
 * for a non-NotationError).
 */
// @spec-link [[rule_jam_idle_shows_no_phrase]]
// @spec-link [[module_notation_layout_preflight]]
export function engraveEmptySystem(
  host: HTMLElement,
  staff: EmptySystemStaff,
  containerWidthPx: number,
  viewport: StaffViewport,
  systemPositionUnits: number = NOTATION_SYSTEM_POSITION_UNITS,
): EngravedEmptySystem {
  host.replaceChildren()
  const outcome = typedEngraving(host, () =>
    planEmptySystem(staff, containerWidthPx, viewport, systemPositionUnits),
  )
  if (outcome.kind === 'no_room') return { kind: 'no_room', cause: outcome.cause }
  if (outcome.kind !== 'fits') {
    throw new Error('An empty system has no notes, so its measures can never be too wide.')
  }
  const plan = outcome.plan
  return typedEngraving(host, () => {
    drawEmptySystem(host, staff, plan)
    const svg = finishSystemSvg(host, plan)
    assertSystemWidthBounds(svg, plan, containerWidthPx)
    return {
      kind: 'engraved',
      svg,
      staffSpacePx: plan.staffSpacePx,
      positionBlockPx: plan.positionBlockPx,
    }
  })
}
