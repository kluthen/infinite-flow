/**
 * The pure staff layout planner for a four-measure written phrase. At Idle the layout is chosen by
 * the viewport's width alone: from the 64rem tablet-landscape breakpoint up, one staff system holds
 * all four measures; below it, the split layout puts bars 1-2 on a top system and bars 3-4 on a
 * bottom one, for every phrase. A running session draws the layout it held at Start instead,
 * whatever the width now selects. The height budget belongs to the window, not to the layout:
 * below the breakpoint the window gives one, from it up none. The staff area always reserves two
 * system positions of one block size, set from the viewport and never from a phrase. The planner
 * picks one uniform engraving scale that fits the width and, where the window gives a height
 * budget, the height too, never below a named legibility floor and never above a named maximum, and tells its two failures apart: no room for the staff
 * (the window, whatever the phrase) and notes too wide (this phrase). This module never touches
 * vexflow or the DOM so the arithmetic can be tested in isolation from the rendering adapter.
 */
import type { InstrumentMidiRange } from '../domain/notation/written-phrase-types'
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
 * The block size of one system position, in engraving units at scale 1: 16 staff spaces, the same
 * for both positions and every instrument profile, so a position's size depends on the scale
 * alone, never on a phrase or a profile. It holds the tallest ink any one profile's written range
 * can produce, start marker included (see `planStaffPlacement`), with at least 0.8 staff space
 * clear at each end. The tallest is the C MIDI keyboard's (written C3 to C5), about 14.4 spaces:
 * from the start marker over the chord symbol over an up-stemmed written C5 inside a beam group,
 * down to written C3. The saxophones' (written C4 to C6) spans about 13.7: from the start marker
 * over the chord symbol over an up-stemmed written E5 inside a beam group, down to the beam under a
 * down-stemmed group reaching written F4. 15 spaces would leave about 0.3 space at each end for
 * the keyboard and 0.65 for the saxophones; 16 leaves 0.8 and 1.15. 16 is also the most that keeps two systems on a landscape phone with its browser
 * toolbar showing: two positions at the 5 px legibility floor take 160 px. A future profile whose
 * ink needs more makes this one size larger for every profile.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_SYSTEM_POSITION_UNITS = 160

/** Engraving units per diatonic step: a line to the next space is half a staff space. */
const UNITS_PER_DIATONIC_STEP = NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE / 2
/** Semitones above C of the seven natural letters, C to B. */
const NATURAL_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const
/** The treble staff's top line, written F5, as a diatonic step count (octave × 7 + letter). */
const TREBLE_TOP_LINE_STEP = 5 * 7 + 3
/**
 * The treble staff's middle line, written B4, as a diatonic step count: a note on or above it has
 * its stem down, one below it up, and a beam group's stems point away from its note farthest from it.
 */
// @spec-link [[module_notation_stem_direction]]
const TREBLE_MIDDLE_LINE_STEP = 4 * 7 + 6

/**
 * A stem's length, in engraving units from its notehead's centre to its tip: 3.5 staff spaces,
 * VexFlow's default, up or down. Measured on real engraved phrases.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_STEM_LENGTH_UNITS = 35

/**
 * How far a chord symbol's ink reaches above the tip of its own note's up stem: about 1.7 staff
 * spaces. VexFlow sets a chord symbol 5 units (half a space) over its note's stem tip, 10 over its
 * notehead's centre, or at the staff's text line (one space above the top line), whichever is
 * highest, and its ink rises about 12 units over that (12 to 12.8 measured). The stem tip is the
 * note's own, at the stem's unextended length: a beam lengthens stems only when it is drawn, after
 * the chord symbol is placed, so a chord symbol never sits over a beam, and a rising up-stemmed
 * beam can run through the chord symbol of a lower note in its group.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_CHORD_SYMBOL_OVER_STEM_TIP_UNITS = 17

/**
 * How far the beam of a down-stemmed beam group reaches below its lowest note's stem tip: about
 * half a staff space for the beam's slope and stroke. Measured on real engraved phrases.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_DOWN_BEAM_BELOW_STEM_TIP_UNITS = 5

/**
 * The widest a generated beam group ever spans, in diatonic steps: 7, one octave. Every phrase's
 * notes stay inside one register window of 12 semitones (the first-release window policy's
 * 12-semitone span, `src/domain/profile/instrument-profiles.ts`, applied to every pitch candidate
 * in `src/domain/pitch/pitch-candidates.ts`), a phrase spells each pitch class with one letter
 * (`src/domain/notation/pitch-spelling.ts`), and a beam group lies inside one phrase. So a beam
 * group's notes on the side of the middle line its stems point towards (above it for an
 * up-stemmed group, below it for a down-stemmed one) sit at most 3 steps from the line: the
 * group's farthest note, on the other side, is at least as far, and the two span at most 7 steps.
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[module_notation_stem_direction]]
export const NOTATION_BEAM_GROUP_MAX_SPAN_STEPS = 7

/**
 * How far ink reaches beyond a range's outermost written notes, in engraving units from that
 * note's staff position (its notehead's centre). Above the highest note, about 2.2 spaces: a lone
 * note above the middle line has its stem down, away from its chord symbol, which sits one space
 * over the notehead's centre and is about 1.2 spaces tall. Below the lowest note, about 0.7 space:
 * the notehead's lower half and the stroke of its ledger line, its stem pointing up, away from it.
 * A beam group can turn a note's stem towards its chord symbol or under it; `planStaffPlacement`
 * counts those reaches on their own. Measured on real engraved phrases.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_HIGH_NOTE_INK_ABOVE_UNITS = 22
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_LOW_NOTE_INK_BELOW_UNITS = 7

/** Intent: how far a diatonic step sits above the staff's top line, in engraving units (below: negative). */
function unitsAboveTopLine(step: number): number {
  return (step - TREBLE_TOP_LINE_STEP) * UNITS_PER_DIATONIC_STEP
}

/**
 * Intent: how far above the top line the ink of the chord symbol on an up-stemmed note on `step`
 * reaches: over that note's own stem tip, at the stem's unextended length, beamed or not.
 */
// @spec-link [[module_notation_layout_preflight]]
function upStemChordReach(step: number): number {
  return (
    unitsAboveTopLine(step) + NOTATION_STEM_LENGTH_UNITS + NOTATION_CHORD_SYMBOL_OVER_STEM_TIP_UNITS
  )
}

/** Intent: how far below the top line the tip of a down stem from a note on `step` reaches. */
// @spec-link [[module_notation_layout_preflight]]
function downStemReach(step: number): number {
  return -unitsAboveTopLine(step) + NOTATION_STEM_LENGTH_UNITS
}

/**
 * The staff's own reach, in engraving units from its top line, for ink a phrase can draw whatever
 * its range. Above: the chord symbol on the highest note whose stem is up by its own position,
 * written A4, one step under the middle line; its stem tip is one space above the top line, so the
 * chord symbol sits half a space over that and its ink reaches about 2.7 spaces (a chord symbol on
 * a down-stemmed note within the staff sits at the staff's text line and reaches about 2.2). Below: the tip of the lowest lone down stem, from written B4 on the
 * middle line, 5.5 spaces.
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[module_notation_stem_direction]]
export const NOTATION_STAFF_INK_ABOVE_TOP_LINE_UNITS = upStemChordReach(TREBLE_MIDDLE_LINE_STEP - 1)
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[module_notation_stem_direction]]
export const NOTATION_STAFF_INK_BELOW_TOP_LINE_UNITS = downStemReach(TREBLE_MIDDLE_LINE_STEP)

/**
 * The room, in engraving units, kept above the highest ink for the start marker, the small
 * triangle drawn over phrase 1's first attacked note at idle: the marker itself, one staff space
 * tall, and half a space clear of the ink under it. The marker sits between the note's own ink
 * and its chord symbol where they leave 2 spaces for it, and above the chord symbol where they do
 * not, which on real phrases is every time: VexFlow sets a chord symbol less than a space over an
 * up stem's tip, else about one space over the notehead's centre or the staff, whichever is
 * higher. A phrase starting on the note whose chord symbol is the highest ink so puts the marker
 * over it. The placement keeps this room for every phrase, since it never depends on a phrase's
 * notes.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_START_MARKER_RESERVE_UNITS = 15

/**
 * Where the staff sits in a system position for one written range, and the ink extent it was
 * placed for, all in engraving units from the position's top edge.
 */
export interface StaffPlacement {
  /** The staff's top line. Its bottom line is 40 units (4 staff spaces) lower. */
  readonly staffTopLineUnits: number
  /** The highest ink the range can produce: the start marker's room over its highest chord symbols. */
  readonly inkTopUnits: number
  /** The lowest ink the range can produce: its lowest notes with their ledger lines, or a down stem or beam. */
  readonly inkBottomUnits: number
}

/**
 * Intent: the diatonic step (octave × 7 + letter index, C4 = 28) of a MIDI note's natural
 * spelling, moving to the nearest natural letter below (`down`) or above (`up`) when the note is
 * a black key, so a range's outer notes are placed where their plainer spelling sits.
 */
function naturalStep(midi: number, direction: 'down' | 'up'): number {
  let natural = midi
  while (!(NATURAL_SEMITONES as readonly number[]).includes(((natural % 12) + 12) % 12)) {
    natural += direction === 'down' ? -1 : 1
  }
  const letterIndex = (NATURAL_SEMITONES as readonly number[]).indexOf(((natural % 12) + 12) % 12)
  return (Math.floor(natural / 12) - 1) * 7 + letterIndex
}

/**
 * Intent: how far from the middle line, in diatonic steps, a beam group's note can sit on the side
 * its stems point towards, for a range from `lowestStep` to `highestStep`. Inside a beam group a
 * note on or above the middle line can carry an up stem (as C5 in [C5 G4]), whose chord symbol
 * then sits over that note's own stem tip, and a note below it a down stem, which the group's beam
 * extends under. At most half the widest group span, rounded down (the group's farthest note, on
 * the other side, is at least as far), and only as far as the range reaches on both sides; 0 when
 * it does not cross the line.
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[module_notation_stem_direction]]
function beamGroupReachTowardStems(lowestStep: number, highestStep: number): number {
  return Math.max(
    0,
    Math.min(
      Math.floor(NOTATION_BEAM_GROUP_MAX_SPAN_STEPS / 2),
      highestStep - TREBLE_MIDDLE_LINE_STEP,
      TREBLE_MIDDLE_LINE_STEP - lowestStep,
    ),
  )
}

/**
 * Place the staff inside its system position for an instrument's written range, derived from the
 * range alone (and the widest beam group span any phrase can produce) and never from a phrase's
 * notes, so a refill or a new phrase never moves a staff line and only a profile switch can. Stems
 * follow the written phrase's rule: down on or above the middle line, up below it, a beam group's
 * all one way. The ink the range can produce reaches above the top line by the most of the staff's
 * own reach, the chord symbol on its highest note (stem down, away from it), and the chord symbol
 * on the highest up-stemmed note a beam group can hold, set over that note's own stem tip (the
 * highest chord reach of all: up to written E5, 3 steps over the middle line), plus the start
 * marker's room; and below by the most of its lowest
 * note's ink, the staff's own down-stem reach, and the beam under the lowest note a down-stemmed
 * beam group can hold. The staff is placed so that this ink sits centred in the position, with
 * equal room above and below. A range that reaches high (the saxophones, written C4 to C6) so gets
 * more room above the staff, one that reaches low (the C MIDI keyboard, written C3 to C5) more
 * room below. The outer notes are placed by their natural spelling, a black key by its natural
 * neighbour outward. The first-release ranges all end on C, which no written key respells one
 * letter further out (B♯ needs seven sharps, and the fewest-accidental key spelling never uses
 * seven).
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[module_notation_stem_direction]]
export function planStaffPlacement(range: InstrumentMidiRange): StaffPlacement {
  const highestStep = naturalStep(range.maxMidi, 'up')
  const lowestStep = naturalStep(range.minMidi, 'down')
  const groupStepsTowardStems = beamGroupReachTowardStems(lowestStep, highestStep)
  const inkAbove =
    Math.max(
      NOTATION_STAFF_INK_ABOVE_TOP_LINE_UNITS,
      unitsAboveTopLine(highestStep) + NOTATION_HIGH_NOTE_INK_ABOVE_UNITS,
      upStemChordReach(TREBLE_MIDDLE_LINE_STEP + groupStepsTowardStems),
    ) + NOTATION_START_MARKER_RESERVE_UNITS
  const inkBelow = Math.max(
    -unitsAboveTopLine(lowestStep) + NOTATION_LOW_NOTE_INK_BELOW_UNITS,
    NOTATION_STAFF_INK_BELOW_TOP_LINE_UNITS,
    downStemReach(TREBLE_MIDDLE_LINE_STEP - groupStepsTowardStems) +
      NOTATION_DOWN_BEAM_BELOW_STEM_TIP_UNITS,
  )
  const inkTopUnits = (NOTATION_SYSTEM_POSITION_UNITS - inkAbove - inkBelow) / 2
  return {
    staffTopLineUnits: inkTopUnits + inkAbove,
    inkTopUnits,
    inkBottomUnits: inkTopUnits + inkAbove + inkBelow,
  }
}

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
 * (src/styles/theme.css) as a width-only `matchMedia` query: while it matches, the window gives the
 * staff a height budget to fit as well as the width, and the Idle staff uses the split layout. The stylesheet's phone staff block
 * in src/styles/components.css uses the same query, so both always agree on the side.
 */
// @spec-link [[module_notation_layout_preflight]]
export const NOTATION_PHONE_LAYOUT_MEDIA_QUERY = '(max-width: 63.9375rem)'

/**
 * The same `--breakpoint-tablet-landscape` (src/styles/theme.css) as a number of rem, for pure
 * code that judges a width it is given: a width below it selects the split layout, as
 * `NOTATION_PHONE_LAYOUT_MEDIA_QUERY` does.
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

/**
 * Intent: the viewport a session draws in: its held layout, with the window's own height budget
 * kept as it is, so a held layout is sized and judged against the window it is shown in.
 */
// @spec-link [[rule_session_layout_fixed_at_start]]
// @spec-link [[module_notation_layout_preflight]]
export function heldViewport(windowViewport: StaffViewport, held: StaffLayout): StaffViewport {
  return { layout: held, heightBudgetPx: windowViewport.heightBudgetPx }
}

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

/** The phrase-independent inputs of the room check: the container and the layout's fixed parts. */
export interface StaffRoomInput {
  readonly containerWidthPx: number
  /** The leading clef, key signature and time signature width, in engraving units at scale 1. */
  readonly leadingWidth: number
  readonly systemPadding: number
  readonly viewport: StaffViewport
}

/** Whether the window has room for the staff, whatever phrase it holds, and how its positions size. */
export type StaffRoomOutcome = StaffPositionsOutcome

/** The phrase-independent inputs of the width half of the room check, for one named layout. */
export interface StaffWidthRoomInput {
  readonly containerWidthPx: number
  /** The leading clef, key signature and time signature width, in engraving units at scale 1. */
  readonly leadingWidth: number
  readonly systemPadding: number
  readonly layout: StaffLayout
}

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

/** Intent: guard the window's height budget is a finite pixel measurement (it may be negative: no room). */
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
 * Size the two reserved system positions for a viewport, independent of any phrase and of the
 * layout drawn. With no height budget (the window from the breakpoint up), where the scale fits
 * the width only, the positions take the maximum scale, so any phrase fits them; the frame keeps
 * its fixed minimum block size and grows past it to hold both. With a budget (the window below
 * it), both positions together must fit it, in either layout: the scale ceiling is the largest
 * that does, capped at the maximum, and a budget too short for the legibility floor leaves the
 * staff no room.
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
export function planStaffPositions(viewport: StaffViewport): StaffPositionsOutcome {
  if (viewport.heightBudgetPx === null) {
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
 * Check, independent of any phrase, whether the window has room for the staff at the legibility
 * floor, in the viewport's layout: first the height (where the window gives a height budget, two
 * systems must fit it), then the width of the layout's fixed parts (the leading clef, key
 * signature and time signature, every measure at the minimum measure width, and the padding). No
 * phrase can fit where this finds no room; `planSystemLayout` runs this same check first, so both
 * always agree.
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[module_idle_fit_round]]
export function planStaffRoom(input: StaffRoomInput): StaffRoomOutcome {
  assertContainerWidth(input.containerWidthPx)

  const positions = planStaffPositions(input.viewport)
  if (positions.kind === 'no_room') return positions

  const tooNarrow = planStaffWidthRoom({
    containerWidthPx: input.containerWidthPx,
    leadingWidth: input.leadingWidth,
    systemPadding: input.systemPadding,
    layout: input.viewport.layout,
  })
  return tooNarrow ?? positions
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

/**
 * Plan the four-measure written phrase in the viewport's layout, never trying the other one. One
 * system needs the leading width (clef, key signature, time signature) plus its measure
 * count (four, or two in the split layout) times the widest measure's minimum width, never less
 * than the minimum measure width, plus padding; every measure gets that one width, so they read as
 * visibly equal and the split layout's columns align. The scale is the smallest of the maximum,
 * the width fit and (where the window gives a height budget) the height fit. Failures are returned, not thrown, as two
 * distinct outcomes: "no room" when the window cannot hold the staff whatever the phrase (too short
 * for two systems at the floor, or too narrow for the fixed parts with every measure at the minimum
 * width), checked first; "notes too wide" when there is room but this phrase needs more width.
 */
// @spec-link [[module_notation_layout_preflight]]
export function planSystemLayout(input: SystemLayoutInput): SystemLayoutOutcome {
  const positions = planStaffRoom(input)
  if (positions.kind === 'no_room') return positions

  const layout = input.viewport.layout
  const measuresPerSystem = layout === 'one-system' ? 4 : 2
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
