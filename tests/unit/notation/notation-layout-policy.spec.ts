import { describe, expect, it } from 'vitest'

import { NotationError } from '@/notation/notation-error'
import {
  NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE,
  NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX,
  NOTATION_MAX_STAFF_SPACE_PX,
  planSystemLayout,
} from '@/notation/notation-layout-policy'

const baseInput = {
  leadingWidth: 60,
  measureMinWidths: [80, 80, 80, 80] as const,
  systemPadding: 10,
  allowTwoSystems: false,
}

function requiredUnitsFor(measureMinWidths: readonly [number, number, number, number]): number {
  return baseInput.leadingWidth + 4 * Math.max(...measureMinWidths) + baseInput.systemPadding
}

function requiredUnitsTwoSystemsFor(
  measureMinWidths: readonly [number, number, number, number],
): number {
  return baseInput.leadingWidth + 2 * Math.max(...measureMinWidths) + baseInput.systemPadding
}

// @test-link [[module_notation_layout_preflight]]
describe('planSystemLayout', () => {
  it('fits at the maximum scale on a very wide container', () => {
    const requiredUnits = requiredUnitsFor(baseInput.measureMinWidths)
    const maxScale = NOTATION_MAX_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
    const plan = planSystemLayout({
      ...baseInput,
      containerWidthPx: requiredUnits * maxScale * 10,
    })

    expect(plan.scale).toBe(maxScale)
    expect(plan.staffSpacePx).toBe(NOTATION_MAX_STAFF_SPACE_PX)
    expect(plan.systemCount).toBe(1)
  })

  it('shrinks the scale between the maximum and the legibility floor for a mid-width container', () => {
    const requiredUnits = requiredUnitsFor(baseInput.measureMinWidths)
    const maxScale = NOTATION_MAX_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
    const floorScale =
      NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
    const midScale = (maxScale + floorScale) / 2
    const plan = planSystemLayout({ ...baseInput, containerWidthPx: requiredUnits * midScale })

    expect(plan.scale).toBeCloseTo(midScale, 10)
    expect(plan.scale).toBeLessThan(maxScale)
    expect(plan.scale).toBeGreaterThan(floorScale)
  })

  it('fits exactly at the legibility floor boundary', () => {
    const requiredUnits = requiredUnitsFor(baseInput.measureMinWidths)
    const floorScale =
      NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
    const plan = planSystemLayout({ ...baseInput, containerWidthPx: requiredUnits * floorScale })

    expect(plan.scale).toBeCloseTo(floorScale, 10)
    expect(plan.staffSpacePx).toBeCloseTo(NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX, 10)
    expect(plan.systemCount).toBe(1)
  })

  it('throws notation_below_legibility_floor with numeric details just below the floor when two systems are not allowed', () => {
    const requiredUnits = requiredUnitsFor(baseInput.measureMinWidths)
    const floorScale =
      NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
    const containerWidthPx = requiredUnits * floorScale - 1

    let caught: unknown
    try {
      planSystemLayout({ ...baseInput, containerWidthPx })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(NotationError)
    const error = caught as NotationError
    expect(error.code).toBe('notation_below_legibility_floor')
    expect(error.details.containerWidthPx).toBe(containerWidthPx)
    expect(error.details.floor).toBe(NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX)
    expect(error.details.requiredWidthPx).toBeGreaterThan(containerWidthPx)
    expect(error.details.requiredUnits).toBe(requiredUnits)
    expect(error.details.requiredUnitsTwoSystems).toBeUndefined()
  })

  it('exposes requiredUnits on a successful plan, for calibration', () => {
    const requiredUnits = requiredUnitsFor(baseInput.measureMinWidths)
    const maxScale = NOTATION_MAX_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
    const plan = planSystemLayout({
      ...baseInput,
      containerWidthPx: requiredUnits * maxScale * 10,
    })

    expect(plan.requiredUnits).toBe(requiredUnits)
  })

  it('rejects a non-finite or non-positive container width as notation_container_unavailable', () => {
    for (const containerWidthPx of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
      let caught: unknown
      try {
        planSystemLayout({ ...baseInput, containerWidthPx })
      } catch (error) {
        caught = error
      }

      expect(caught).toBeInstanceOf(NotationError)
      expect((caught as NotationError).code).toBe('notation_container_unavailable')
    }
  })

  it('gives all four measures visibly equal content width regardless of their individual minimums', () => {
    const measureMinWidths = [40, 90, 60, 70] as const
    const requiredUnits = requiredUnitsFor(measureMinWidths)
    const maxScale = NOTATION_MAX_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
    const plan = planSystemLayout({
      ...baseInput,
      measureMinWidths,
      containerWidthPx: requiredUnits * maxScale * 3,
    })

    // One scale, one measureContentWidthUnits shared by all four measure slots.
    expect(plan.measureContentWidthUnits).toBeGreaterThanOrEqual(Math.max(...measureMinWidths))
  })

  it('falls back to two systems when one system fails the floor and two systems are allowed', () => {
    const requiredUnits = requiredUnitsFor(baseInput.measureMinWidths)
    const requiredUnitsTwoSystems = requiredUnitsTwoSystemsFor(baseInput.measureMinWidths)
    const floorScale =
      NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
    // Wide enough to clear the floor for two systems, but not for one.
    const containerWidthPx = requiredUnitsTwoSystems * floorScale * 1.5
    expect(containerWidthPx).toBeLessThan(requiredUnits * floorScale)

    const plan = planSystemLayout({
      ...baseInput,
      allowTwoSystems: true,
      containerWidthPx,
    })

    expect(plan.systemCount).toBe(2)
    expect(plan.scale).toBeGreaterThanOrEqual(floorScale)
    expect(plan.requiredUnits).toBe(requiredUnits)
    expect(plan.requiredUnitsTwoSystems).toBe(requiredUnitsTwoSystems)
  })

  it('fits exactly at the two-system legibility floor boundary', () => {
    const requiredUnitsTwoSystems = requiredUnitsTwoSystemsFor(baseInput.measureMinWidths)
    const floorScale =
      NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
    const containerWidthPx = requiredUnitsTwoSystems * floorScale

    const plan = planSystemLayout({
      ...baseInput,
      allowTwoSystems: true,
      containerWidthPx,
    })

    expect(plan.systemCount).toBe(2)
    expect(plan.scale).toBeCloseTo(floorScale, 10)
  })

  it('throws with only the one-system requirement when two systems are not allowed, even though a narrower two-system budget would fit', () => {
    const requiredUnits = requiredUnitsFor(baseInput.measureMinWidths)
    const requiredUnitsTwoSystems = requiredUnitsTwoSystemsFor(baseInput.measureMinWidths)
    const floorScale =
      NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
    const containerWidthPx = requiredUnitsTwoSystems * floorScale * 1.5
    expect(containerWidthPx).toBeLessThan(requiredUnits * floorScale)

    let caught: unknown
    try {
      planSystemLayout({ ...baseInput, allowTwoSystems: false, containerWidthPx })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(NotationError)
    const error = caught as NotationError
    expect(error.code).toBe('notation_below_legibility_floor')
    expect(error.details.requiredUnitsTwoSystems).toBeUndefined()
  })

  it('throws notation_below_legibility_floor with both one- and two-system requirements when neither fits', () => {
    const requiredUnits = requiredUnitsFor(baseInput.measureMinWidths)
    const requiredUnitsTwoSystems = requiredUnitsTwoSystemsFor(baseInput.measureMinWidths)
    const floorScale =
      NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
    const containerWidthPx = requiredUnitsTwoSystems * floorScale - 1

    let caught: unknown
    try {
      planSystemLayout({ ...baseInput, allowTwoSystems: true, containerWidthPx })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(NotationError)
    const error = caught as NotationError
    expect(error.code).toBe('notation_below_legibility_floor')
    expect(error.details.requiredUnits).toBe(requiredUnits)
    expect(error.details.requiredUnitsTwoSystems).toBe(requiredUnitsTwoSystems)
    expect(error.details.requiredWidthPx).toBeGreaterThan(containerWidthPx)
    expect(error.details.requiredWidthPxTwoSystems).toBeGreaterThan(containerWidthPx)
  })
})
