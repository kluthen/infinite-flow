import { describe, expect, it } from 'vitest'

import { ADOPTED_INSTRUMENT_PROFILES } from '@/domain/profile/instrument-profiles'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import { NotationError } from '@/notation/notation-error'
import {
  NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE,
  NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX,
  NOTATION_MAX_STAFF_SPACE_PX,
  NOTATION_MIN_MEASURE_WIDTH_UNITS,
  NOTATION_SYSTEM_POSITION_UNITS,
  heldViewport,
  planStaffPlacement,
  planStaffPositions,
  planStaffRoom,
  planSystemLayout,
  type StaffViewport,
  type SystemLayoutInput,
  type SystemLayoutOutcome,
  type SystemLayoutPlan,
} from '@/notation/notation-layout-policy'

const MAX_SCALE = NOTATION_MAX_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
const FLOOR_SCALE =
  NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE

const ONE_SYSTEM: StaffViewport = { layout: 'one-system', heightBudgetPx: null }

/** Intent: a split-layout viewport whose height budget holds both systems at exactly `scale`. */
function splitViewportAtScale(scale: number): StaffViewport {
  return { layout: 'split', heightBudgetPx: 2 * NOTATION_SYSTEM_POSITION_UNITS * scale }
}

/** A split-layout viewport tall enough that the height never limits the scale. */
const TALL_SPLIT: StaffViewport = splitViewportAtScale(MAX_SCALE * 4)

const base = {
  leadingWidth: 60,
  measureMinWidths: [80, 80, 80, 80] as const,
  systemPadding: 10,
}

/** Intent: the raw units one system needs for `measuresPerSystem` measures of the given widths. */
function requiredUnitsFor(
  measuresPerSystem: 2 | 4,
  measureMinWidths: readonly number[] = base.measureMinWidths,
): number {
  const widest = Math.max(NOTATION_MIN_MEASURE_WIDTH_UNITS, ...measureMinWidths)
  return base.leadingWidth + measuresPerSystem * widest + base.systemPadding
}

/** Intent: the raw units of the layout's fixed parts, every measure at the minimum measure width. */
function fixedUnitsFor(measuresPerSystem: 2 | 4): number {
  return (
    base.leadingWidth + measuresPerSystem * NOTATION_MIN_MEASURE_WIDTH_UNITS + base.systemPadding
  )
}

/** Intent: run the planner over the shared base input with the given overrides. */
function plan(overrides: Partial<SystemLayoutInput> & Pick<SystemLayoutInput, 'viewport'>) {
  return planSystemLayout({ ...base, containerWidthPx: 1000, ...overrides })
}

/** Intent: unwrap a fitting outcome, failing the test with the outcome when it did not fit. */
function expectFits(outcome: SystemLayoutOutcome): SystemLayoutPlan {
  if (outcome.kind !== 'fits') throw new Error(`Expected a fit, got ${JSON.stringify(outcome)}`)
  return outcome.plan
}

// @test-link [[module_notation_layout_preflight]]
describe('planSystemLayout: layout chosen by the breakpoint alone', () => {
  it('returns the one-system layout from the tablet-landscape breakpoint up', () => {
    const fitted = expectFits(plan({ viewport: ONE_SYSTEM, containerWidthPx: 5000 }))

    expect(fitted.layout).toBe('one-system')
    expect(fitted.systemCount).toBe(1)
    expect(fitted.measuresPerSystem).toBe(4)
    expect(fitted.requiredUnits).toBe(requiredUnitsFor(4))
  })

  it('returns the split layout below the breakpoint, even for a phrase that one system would hold', () => {
    // Wide enough for all four measures on one line at the maximum scale: v1 would have kept one
    // system here. v2 never tries one system below the breakpoint.
    const containerWidthPx = requiredUnitsFor(4) * MAX_SCALE * 2
    const fitted = expectFits(plan({ viewport: TALL_SPLIT, containerWidthPx }))

    expect(fitted.layout).toBe('split')
    expect(fitted.systemCount).toBe(2)
    expect(fitted.measuresPerSystem).toBe(2)
    expect(fitted.requiredUnits).toBe(requiredUnitsFor(2))
  })

  it('never falls back to the split layout from the breakpoint up: a phrase too wide for one system is "notes too wide"', () => {
    // Room for two measures per line at the floor, not for four.
    const containerWidthPx = requiredUnitsFor(2) * FLOOR_SCALE * 1.5
    expect(containerWidthPx).toBeLessThan(requiredUnitsFor(4) * FLOOR_SCALE)

    const outcome = plan({ viewport: ONE_SYSTEM, containerWidthPx })

    expect(outcome.kind).toBe('notes_too_wide')
  })
})

// @test-link [[module_notation_layout_preflight]]
describe('planSystemLayout: the scale fits the width and, below the breakpoint, the height', () => {
  it('fits at the maximum scale on a very wide, very tall container', () => {
    for (const viewport of [ONE_SYSTEM, TALL_SPLIT]) {
      const fitted = expectFits(plan({ viewport, containerWidthPx: 20000 }))
      expect(fitted.scale).toBe(MAX_SCALE)
      expect(fitted.staffSpacePx).toBe(NOTATION_MAX_STAFF_SPACE_PX)
    }
  })

  it('takes the width-fit scale when the height leaves more room', () => {
    const midScale = (MAX_SCALE + FLOOR_SCALE) / 2
    const containerWidthPx = requiredUnitsFor(2) * midScale
    const fitted = expectFits(plan({ viewport: TALL_SPLIT, containerWidthPx }))

    expect(fitted.scale).toBeCloseTo(midScale, 10)
  })

  it('lowers the scale in a shorter window, the width unchanged', () => {
    const containerWidthPx = requiredUnitsFor(2) * MAX_SCALE * 2
    const tall = expectFits(plan({ viewport: splitViewportAtScale(MAX_SCALE), containerWidthPx }))
    const heightScale = (MAX_SCALE + FLOOR_SCALE) / 2
    const short = expectFits(
      plan({ viewport: splitViewportAtScale(heightScale), containerWidthPx }),
    )

    expect(tall.scale).toBe(MAX_SCALE)
    expect(short.scale).toBeCloseTo(heightScale, 10)
    expect(short.scale).toBeLessThan(tall.scale)
    // The system still spans the container: the measures widen to fill it at the lower scale.
    expect(short.systemWidthUnits * short.scale).toBeCloseTo(containerWidthPx, 6)
  })

  it('takes the smaller of the width and height scales, never above the maximum', () => {
    const widthScale = FLOOR_SCALE * 1.2
    const heightScale = FLOOR_SCALE * 1.6
    const containerWidthPx = requiredUnitsFor(2) * widthScale
    const fitted = expectFits(
      plan({ viewport: splitViewportAtScale(heightScale), containerWidthPx }),
    )

    expect(fitted.scale).toBeCloseTo(widthScale, 10)
  })

  it('fits exactly at the legibility floor, on either side', () => {
    const atWidthFloor = expectFits(
      plan({ viewport: TALL_SPLIT, containerWidthPx: requiredUnitsFor(2) * FLOOR_SCALE }),
    )
    const atHeightFloor = expectFits(
      plan({ viewport: splitViewportAtScale(FLOOR_SCALE), containerWidthPx: 5000 }),
    )

    expect(atWidthFloor.staffSpacePx).toBeCloseTo(NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX, 10)
    expect(atHeightFloor.staffSpacePx).toBeCloseTo(NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX, 10)
  })

  it('gives every measure the widest measure width, never less than the minimum measure width', () => {
    const measureMinWidths = [5, 10, 5, 10] as const
    const containerWidthPx = requiredUnitsFor(4, measureMinWidths) * FLOOR_SCALE * 1.1
    const fitted = expectFits(plan({ viewport: ONE_SYSTEM, measureMinWidths, containerWidthPx }))

    expect(fitted.requiredUnits).toBe(fixedUnitsFor(4))
    expect(fitted.measureContentWidthUnits).toBeGreaterThanOrEqual(NOTATION_MIN_MEASURE_WIDTH_UNITS)
  })
})

// @test-link [[module_notation_layout_preflight]]
describe('planSystemLayout: two distinct typed failures', () => {
  it('gives "no room" (too short) for a window too short for two systems at the floor, whatever the phrase', () => {
    const viewport = splitViewportAtScale(FLOOR_SCALE * 0.99)
    for (const measureMinWidths of [
      [1, 1, 1, 1],
      [400, 400, 400, 400],
    ] as const) {
      const outcome = plan({ viewport, measureMinWidths, containerWidthPx: 20000 })
      expect(outcome).toMatchObject({ kind: 'no_room', cause: 'too_short' })
      if (outcome.kind !== 'no_room') continue
      expect(outcome.details.requiredHeightPx).toBeCloseTo(
        2 * NOTATION_SYSTEM_POSITION_UNITS * FLOOR_SCALE,
        10,
      )
    }
  })

  it('gives "no room" (too narrow) for a container that cannot hold the fixed parts at the floor, whatever the phrase', () => {
    for (const [viewport, measuresPerSystem] of [
      [ONE_SYSTEM, 4],
      [TALL_SPLIT, 2],
    ] as const) {
      const containerWidthPx = fixedUnitsFor(measuresPerSystem) * FLOOR_SCALE - 1
      for (const measureMinWidths of [
        [1, 1, 1, 1],
        [400, 400, 400, 400],
      ] as const) {
        const outcome = plan({ viewport, measureMinWidths, containerWidthPx })
        expect(outcome).toMatchObject({ kind: 'no_room', cause: 'too_narrow' })
        if (outcome.kind !== 'no_room') continue
        expect(outcome.details.containerWidthPx).toBe(containerWidthPx)
        expect(outcome.details.requiredWidthPx).toBeCloseTo(
          fixedUnitsFor(measuresPerSystem) * FLOOR_SCALE,
          10,
        )
      }
    }
  })

  it('gives "notes too wide" when the window has room but this phrase\'s measures need more width than the floor allows', () => {
    const containerWidthPx = fixedUnitsFor(2) * FLOOR_SCALE * 1.5
    const sparse = plan({ viewport: TALL_SPLIT, measureMinWidths: [1, 1, 1, 1], containerWidthPx })
    const dense = plan({
      viewport: TALL_SPLIT,
      measureMinWidths: [400, 400, 400, 400],
      containerWidthPx,
    })

    expect(sparse.kind).toBe('fits')
    expect(dense.kind).toBe('notes_too_wide')
    if (dense.kind !== 'notes_too_wide') return
    expect(dense.details.containerWidthPx).toBe(containerWidthPx)
    expect(dense.details.requiredUnits).toBe(requiredUnitsFor(2, [400]))
    expect(dense.details.requiredWidthPx).toBeCloseTo(requiredUnitsFor(2, [400]) * FLOOR_SCALE, 10)
  })

  it('reports "no room" before "notes too wide" when both hold', () => {
    const outcome = plan({
      viewport: splitViewportAtScale(FLOOR_SCALE / 2),
      measureMinWidths: [400, 400, 400, 400],
      containerWidthPx: 50,
    })

    expect(outcome).toMatchObject({ kind: 'no_room' })
  })

  it('rejects a non-finite or non-positive container width as notation_container_unavailable', () => {
    for (const containerWidthPx of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
      let caught: unknown
      try {
        plan({ viewport: ONE_SYSTEM, containerWidthPx })
      } catch (error) {
        caught = error
      }

      expect(caught).toBeInstanceOf(NotationError)
      expect((caught as NotationError).code).toBe('notation_container_unavailable')
    }
  })

  it('rejects a non-finite height budget as notation_container_unavailable', () => {
    for (const heightBudgetPx of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => plan({ viewport: { layout: 'split', heightBudgetPx } })).toThrow(NotationError)
    }
  })
})

// @test-link [[module_notation_layout_preflight]]
describe('planStaffPositions: two reserved positions sized by the viewport, never by a phrase', () => {
  it('sizes both positions at the maximum scale from the breakpoint up', () => {
    expect(planStaffPositions(ONE_SYSTEM)).toEqual({
      kind: 'room',
      scaleCeiling: MAX_SCALE,
      positionBlockPx: NOTATION_SYSTEM_POSITION_UNITS * MAX_SCALE,
    })
  })

  it('sizes both positions at the height-fit scale below the breakpoint, capped at the maximum', () => {
    const heightScale = (MAX_SCALE + FLOOR_SCALE) / 2
    const positions = planStaffPositions(splitViewportAtScale(heightScale))
    expect(positions.kind).toBe('room')
    if (positions.kind !== 'room') return
    expect(positions.scaleCeiling).toBeCloseTo(heightScale, 10)
    expect(positions.positionBlockPx * 2).toBeCloseTo(
      2 * NOTATION_SYSTEM_POSITION_UNITS * heightScale,
      6,
    )
    expect(planStaffPositions(TALL_SPLIT)).toMatchObject({ scaleCeiling: MAX_SCALE })
  })

  it('gives "no room" (too short) below the floor', () => {
    expect(planStaffPositions(splitViewportAtScale(FLOOR_SCALE * 0.99))).toMatchObject({
      kind: 'no_room',
      cause: 'too_short',
    })
  })

  it('gives every fitting plan the same position block size for one viewport, sparse or dense', () => {
    const viewport = splitViewportAtScale((MAX_SCALE + FLOOR_SCALE) / 2)
    const containerWidthPx = requiredUnitsFor(2, [300]) * FLOOR_SCALE * 1.2
    const sparse = expectFits(plan({ viewport, measureMinWidths: [1, 1, 1, 1], containerWidthPx }))
    const dense = expectFits(
      plan({ viewport, measureMinWidths: [300, 300, 300, 300], containerWidthPx }),
    )
    const positions = planStaffPositions(viewport)

    expect(dense.scale).toBeLessThan(sparse.scale)
    expect(positions.kind).toBe('room')
    if (positions.kind !== 'room') return
    expect(sparse.positionBlockPx).toBe(positions.positionBlockPx)
    expect(dense.positionBlockPx).toBe(positions.positionBlockPx)
  })
})

// @test-link [[module_notation_layout_preflight]]
describe('planStaffPositions: the height budget belongs to the window, whatever layout is drawn', () => {
  it('gives "no room" (too short) to a one-system layout drawn in a window too short for two systems at the floor', () => {
    const viewport: StaffViewport = {
      layout: 'one-system',
      heightBudgetPx: 2 * NOTATION_SYSTEM_POSITION_UNITS * FLOOR_SCALE * 0.99,
    }
    expect(planStaffPositions(viewport)).toMatchObject({ kind: 'no_room', cause: 'too_short' })
    expect(plan({ viewport, containerWidthPx: 20000 })).toMatchObject({
      kind: 'no_room',
      cause: 'too_short',
    })
  })

  it('caps a one-system layout with a height budget at the height-fit scale, never above the maximum', () => {
    const heightScale = (MAX_SCALE + FLOOR_SCALE) / 2
    const budgeted: StaffViewport = {
      layout: 'one-system',
      heightBudgetPx: 2 * NOTATION_SYSTEM_POSITION_UNITS * heightScale,
    }
    const positions = planStaffPositions(budgeted)
    expect(positions.kind).toBe('room')
    if (positions.kind !== 'room') return
    expect(positions.scaleCeiling).toBeCloseTo(heightScale, 10)
    expect(positions.positionBlockPx).toBeCloseTo(NOTATION_SYSTEM_POSITION_UNITS * heightScale, 6)
    expect(
      planStaffPositions({ layout: 'one-system', heightBudgetPx: TALL_SPLIT.heightBudgetPx }),
    ).toMatchObject({ scaleCeiling: MAX_SCALE })

    const fitted = expectFits(plan({ viewport: budgeted, containerWidthPx: 20000 }))
    expect(fitted.layout).toBe('one-system')
    expect(fitted.scale).toBeCloseTo(heightScale, 10)
  })

  it('sizes a split layout with no height budget at the maximum scale', () => {
    const viewport: StaffViewport = { layout: 'split', heightBudgetPx: null }
    expect(planStaffPositions(viewport)).toEqual({
      kind: 'room',
      scaleCeiling: MAX_SCALE,
      positionBlockPx: NOTATION_SYSTEM_POSITION_UNITS * MAX_SCALE,
    })
    const fitted = expectFits(plan({ viewport, containerWidthPx: 20000 }))
    expect(fitted.layout).toBe('split')
    expect(fitted.scale).toBe(MAX_SCALE)
  })
})

// @test-link [[rule_session_layout_fixed_at_start]]
// @test-link [[module_notation_layout_preflight]]
describe("heldViewport: a held layout drawn in the window's height budget", () => {
  it("keeps the window's height budget and swaps in the held layout", () => {
    const shortSplit = splitViewportAtScale(FLOOR_SCALE * 1.2)
    expect(heldViewport(shortSplit, 'one-system')).toEqual({
      layout: 'one-system',
      heightBudgetPx: shortSplit.heightBudgetPx,
    })
    expect(heldViewport(ONE_SYSTEM, 'split')).toEqual({ layout: 'split', heightBudgetPx: null })
  })

  it('returns the window unchanged when the held layout is the one the window selects', () => {
    expect(heldViewport(TALL_SPLIT, 'split')).toEqual(TALL_SPLIT)
    expect(heldViewport(ONE_SYSTEM, 'one-system')).toEqual(ONE_SYSTEM)
  })
})

/** Intent: a profile's written range: its active concert range moved by its chromatic transposition. */
function writtenRangeOf(profile: InstrumentProfile): { minMidi: number; maxMidi: number } {
  return {
    minMidi: profile.concertRange.minMidi + profile.transposition.chromatic,
    maxMidi: profile.concertRange.maxMidi + profile.transposition.chromatic,
  }
}

/** One staff space, in engraving units. */
const SPACE = NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE

// @test-link [[module_notation_layout_preflight]]
describe('the shared system position size', () => {
  it('is 16 staff spaces, the most that keeps two systems on a toolbar-showing phone', () => {
    expect(NOTATION_SYSTEM_POSITION_UNITS).toBe(16 * SPACE)
  })

  it('needs 160 px of height budget for two systems at the legibility floor, and no more', () => {
    expect(planStaffPositions({ layout: 'split', heightBudgetPx: 160 })).toEqual({
      kind: 'room',
      scaleCeiling: FLOOR_SCALE,
      positionBlockPx: 80,
    })
    expect(planStaffPositions({ layout: 'split', heightBudgetPx: 159 })).toMatchObject({
      kind: 'no_room',
      cause: 'too_short',
      details: { requiredHeightPx: 160 },
    })
  })

  it('is 192 px per position from the breakpoint up, at the 12 px maximum', () => {
    expect(planStaffPositions(ONE_SYSTEM)).toMatchObject({ positionBlockPx: 192 })
  })
})

// @test-link [[module_notation_layout_preflight]]
describe("planStaffPlacement: the staff placed in its position by the profile's written range", () => {
  it("keeps every adopted profile's ink, start marker included, about one staff space inside the position at both ends", () => {
    for (const profile of ADOPTED_INSTRUMENT_PROFILES) {
      const placement = planStaffPlacement(writtenRangeOf(profile))
      expect(placement.inkTopUnits, profile.id).toBeGreaterThanOrEqual(0.8 * SPACE)
      expect(
        NOTATION_SYSTEM_POSITION_UNITS - placement.inkBottomUnits,
        profile.id,
      ).toBeGreaterThanOrEqual(0.8 * SPACE)
      // Centred: the room above the ink equals the room below it.
      expect(placement.inkTopUnits).toBeCloseTo(
        NOTATION_SYSTEM_POSITION_UNITS - placement.inkBottomUnits,
        10,
      )
    }
  })

  it("places the saxophones' staff (written C4-C6) lower than the keyboard's (written C3-C5)", () => {
    const [keyboard, tenor, alto] = ADOPTED_INSTRUMENT_PROFILES.map((profile) =>
      planStaffPlacement(writtenRangeOf(profile)),
    )
    expect(writtenRangeOf(ADOPTED_INSTRUMENT_PROFILES[0]!)).toEqual({ minMidi: 48, maxMidi: 72 })
    expect(writtenRangeOf(ADOPTED_INSTRUMENT_PROFILES[1]!)).toEqual({ minMidi: 60, maxMidi: 84 })
    expect(tenor!.staffTopLineUnits).toBeCloseTo(73.5, 10)
    expect(alto).toEqual(tenor)
    expect(keyboard!.staffTopLineUnits).toBeCloseTo(60, 10)
  })

  it('derives the placement from the range alone: a range reaching higher gets more room above the staff', () => {
    // Two-octave ranges, whose phrases' beam groups span at most an octave, as the base's.
    const base = planStaffPlacement({ minMidi: 60, maxMidi: 84 })
    const higher = planStaffPlacement({ minMidi: 64, maxMidi: 88 })
    // Written E3: low enough that its ledger lines, not a down-stemmed beam, set the lowest ink.
    const lower = planStaffPlacement({ minMidi: 52, maxMidi: 76 })
    expect(higher.staffTopLineUnits).toBeGreaterThan(base.staffTopLineUnits)
    expect(lower.staffTopLineUnits).toBeLessThan(base.staffTopLineUnits)
  })

  it('places a black-key range end by its plainer natural neighbour, outward', () => {
    // Written B-flat 5 (82) sits no higher than B5; written C-sharp 4 (61) no lower than C4.
    expect(planStaffPlacement({ minMidi: 61, maxMidi: 82 })).toEqual(
      planStaffPlacement({ minMidi: 60, maxMidi: 83 }),
    )
  })
})

/**
 * Staff positions of written notes, in engraving units below the staff's top line (written F5;
 * negative above it): a diatonic step is half a staff space.
 */
const POSITION = { E5: 5, C5: 15, B4: 20, F4: 35 } as const
/** A stem's measured length, and a chord symbol's top over its own note's unextended up stem tip. */
const STEM = 35
const CHORD_OVER_UP_STEM_TIP = 16.7
/** The measured reach of a down-stemmed beam under its lowest note's stem tip (slope and stroke). */
const DOWN_BEAM_UNDER_TIP = 5
/** The start marker's top over the ink under it: one staff space tall, half a space clear. */
const MARKER_OVER_INK = 15

/**
 * Intent: the placement of a profile's written range, by profile id, with the margins its
 * estimated ink leaves at both ends of the system position.
 */
function placementOf(profileId: string) {
  const profile = ADOPTED_INSTRUMENT_PROFILES.find((entry) => entry.id === profileId)!
  return planStaffPlacement(writtenRangeOf(profile))
}

// @test-link [[module_notation_layout_preflight]]
describe("planStaffPlacement: the estimated ink covers the beam groups a profile's phrases can hold", () => {
  it("covers the saxophones' down-stemmed beam group bottoming at written F4 (as [F4 E5]), at least 0.8 space inside the position", () => {
    for (const profileId of ['bb-tenor', 'eb-alto']) {
      const placement = placementOf(profileId)
      const beamBottom = placement.staffTopLineUnits + POSITION.F4 + STEM + DOWN_BEAM_UNDER_TIP
      expect(placement.inkBottomUnits, profileId).toBeGreaterThanOrEqual(beamBottom)
      expect(NOTATION_SYSTEM_POSITION_UNITS - beamBottom, profileId).toBeGreaterThanOrEqual(
        0.8 * SPACE,
      )
    }
  })

  it("covers the start marker over the keyboard's chord symbol over an up-stemmed note inside a beam group (written C5 in [C5 G4]), at least 0.8 space inside the position", () => {
    const placement = placementOf('c-keyboard')
    const markerTop =
      placement.staffTopLineUnits + POSITION.C5 - STEM - CHORD_OVER_UP_STEM_TIP - MARKER_OVER_INK
    expect(placement.inkTopUnits).toBeLessThanOrEqual(markerTop)
    expect(markerTop).toBeGreaterThanOrEqual(0.8 * SPACE)
  })

  it("covers the start marker over the saxophones' chord symbol over an up-stemmed note inside a beam group (written E5 in [E5 E4], the highest any can be)", () => {
    const placement = placementOf('bb-tenor')
    const markerTop =
      placement.staffTopLineUnits + POSITION.E5 - STEM - CHORD_OVER_UP_STEM_TIP - MARKER_OVER_INK
    expect(placement.inkTopUnits).toBeLessThanOrEqual(markerTop)
    expect(markerTop).toBeGreaterThanOrEqual(0.8 * SPACE)
  })

  it("covers a lone down stem from written B4, which reaches below the staff's bottom line, for every adopted profile", () => {
    for (const profile of ADOPTED_INSTRUMENT_PROFILES) {
      const placement = planStaffPlacement(writtenRangeOf(profile))
      expect(placement.inkBottomUnits, profile.id).toBeGreaterThanOrEqual(
        placement.staffTopLineUnits + POSITION.B4 + STEM,
      )
    }
  })
})

/** Intent: run the phrase-independent room check over the shared base fixed parts. */
function room(containerWidthPx: number, viewport: StaffViewport) {
  return planStaffRoom({
    containerWidthPx,
    leadingWidth: base.leadingWidth,
    systemPadding: base.systemPadding,
    viewport,
  })
}

// @test-link [[module_idle_fit_round]]
// @test-link [[module_notation_layout_preflight]]
describe('planStaffRoom: whether the window has room for the staff, whatever the phrase', () => {
  it("gives room, with the positions' scale ceiling and block size, when the fixed parts fit at the floor", () => {
    expect(room(fixedUnitsFor(4) * FLOOR_SCALE, ONE_SYSTEM)).toEqual({
      kind: 'room',
      scaleCeiling: MAX_SCALE,
      positionBlockPx: NOTATION_SYSTEM_POSITION_UNITS * MAX_SCALE,
    })
    const viewport = splitViewportAtScale(FLOOR_SCALE * 1.5)
    expect(room(fixedUnitsFor(2) * FLOOR_SCALE, viewport)).toEqual({
      kind: 'room',
      scaleCeiling: FLOOR_SCALE * 1.5,
      positionBlockPx: NOTATION_SYSTEM_POSITION_UNITS * FLOOR_SCALE * 1.5,
    })
  })

  it('gives "no room" (too short) for a window too short for two systems at the floor, checked before the width', () => {
    const outcome = room(10, splitViewportAtScale(FLOOR_SCALE * 0.99))
    expect(outcome).toMatchObject({ kind: 'no_room', cause: 'too_short' })
    if (outcome.kind !== 'no_room') return
    expect(outcome.details.requiredHeightPx).toBeCloseTo(
      2 * NOTATION_SYSTEM_POSITION_UNITS * FLOOR_SCALE,
      10,
    )
  })

  it('gives "no room" (too narrow) for a container that cannot hold the fixed parts at the floor', () => {
    for (const [viewport, measuresPerSystem] of [
      [ONE_SYSTEM, 4],
      [TALL_SPLIT, 2],
    ] as const) {
      const containerWidthPx = fixedUnitsFor(measuresPerSystem) * FLOOR_SCALE - 1
      const outcome = room(containerWidthPx, viewport)
      expect(outcome).toMatchObject({ kind: 'no_room', cause: 'too_narrow' })
      if (outcome.kind !== 'no_room') continue
      expect(outcome.details).toEqual({
        containerWidthPx,
        requiredWidthPx: fixedUnitsFor(measuresPerSystem) * FLOOR_SCALE,
        floor: NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX,
      })
    }
  })

  it('rejects a non-finite or non-positive container width as notation_container_unavailable', () => {
    for (const containerWidthPx of [0, Number.NaN]) {
      expect(() => room(containerWidthPx, ONE_SYSTEM)).toThrow(NotationError)
    }
  })

  it('gives the same "no room" outcome planSystemLayout gives, for any phrase', () => {
    for (const [containerWidthPx, viewport] of [
      [fixedUnitsFor(4) * FLOOR_SCALE - 1, ONE_SYSTEM],
      [fixedUnitsFor(2) * FLOOR_SCALE - 1, TALL_SPLIT],
      [20000, splitViewportAtScale(FLOOR_SCALE * 0.5)],
    ] as const) {
      const outcome = room(containerWidthPx, viewport)
      expect(outcome.kind).toBe('no_room')
      for (const measureMinWidths of [
        [1, 1, 1, 1],
        [400, 400, 400, 400],
      ] as const) {
        expect(plan({ viewport, measureMinWidths, containerWidthPx })).toEqual(outcome)
      }
    }
  })
})
