import { describe, expect, it } from 'vitest'
import {
  INITIAL_CONTOUR_STATE,
  advanceContour,
  compileContourPlan,
  contourAccepts,
  contourAssignable,
  contourComplete,
  contourStep,
  initialContourTag,
} from '@/domain/pitch/pitch-contour'

// @test-link [[mechanic_pitch_contour_forward_check]]
describe('pitch-contour', () => {
  describe('initialContourTag', () => {
    // @test-link [[mechanic_pitch_contour_forward_check]]
    it('starts Arch with both peak patterns still open and every other contour at zero', () => {
      expect(initialContourTag('Arch')).toBe(0b11)
      expect(initialContourTag('Rising')).toBe(0)
      expect(initialContourTag('Falling')).toBe(0)
      expect(initialContourTag('Wandering')).toBe(0)
    })
  })

  describe('contourStep: Rising', () => {
    // @test-link [[mechanic_pitch_contour_forward_check]]
    it('rejects any downward step', () => {
      expect(contourStep('Rising', 1, -1, 0)).toBeUndefined()
    })

    it('records an upward step and tolerates a flat step', () => {
      expect(contourStep('Rising', 1, 1, 0)).toBe(1)
      expect(contourStep('Rising', 1, 0, 0)).toBe(0)
      expect(contourStep('Rising', 2, 0, 1)).toBe(1)
    })
  })

  describe('contourStep: Falling', () => {
    // @test-link [[mechanic_pitch_contour_forward_check]]
    it('mirrors Rising: rejects any upward step and records a downward step', () => {
      expect(contourStep('Falling', 1, 1, 0)).toBeUndefined()
      expect(contourStep('Falling', 1, -1, 0)).toBe(1)
      expect(contourStep('Falling', 1, 0, 0)).toBe(0)
    })
  })

  describe('contourStep: Wandering', () => {
    // @test-link [[mechanic_pitch_contour_forward_check]]
    it('records both a rise and a fall as they occur, and a flat step records neither', () => {
      expect(contourStep('Wandering', 1, 1, 0)).toBe(1)
      expect(contourStep('Wandering', 1, -1, 0)).toBe(2)
      expect(contourStep('Wandering', 1, 1, 2)).toBe(3)
      expect(contourStep('Wandering', 1, 0, 0)).toBe(0)
    })
  })

  describe('contourStep: Arch', () => {
    // @test-link [[mechanic_pitch_contour_forward_check]]
    it('keeps both peak patterns alive on an initial rise', () => {
      expect(contourStep('Arch', 1, 1, 0b11)).toBe(0b11)
    })

    it('kills both patterns on an initial fall', () => {
      expect(contourStep('Arch', 1, -1, 0b11)).toBeUndefined()
    })

    it('narrows to the checkpoint-2 peak pattern when checkpoint 2 falls', () => {
      expect(contourStep('Arch', 2, -1, 0b11)).toBe(0b01)
    })

    it('narrows to the checkpoint-3 peak pattern when checkpoint 2 keeps rising', () => {
      expect(contourStep('Arch', 2, 1, 0b11)).toBe(0b10)
    })

    it('rejects a flat move exactly at the point neither surviving pattern allows', () => {
      expect(contourStep('Arch', 2, 0, 0b11)).toBeUndefined()
    })
  })

  describe('contourAccepts', () => {
    // @test-link [[mechanic_pitch_contour_forward_check]]
    it('requires Wandering to have observed both a rise and a fall', () => {
      expect(contourAccepts('Wandering', 0b11)).toBe(true)
      expect(contourAccepts('Wandering', 0b01)).toBe(false)
      expect(contourAccepts('Wandering', 0b10)).toBe(false)
      expect(contourAccepts('Wandering', 0)).toBe(false)
    })

    it('accepts Rising/Falling/Arch on any nonzero surviving tag', () => {
      expect(contourAccepts('Rising', 1)).toBe(true)
      expect(contourAccepts('Rising', 0)).toBe(false)
      expect(contourAccepts('Arch', 0b10)).toBe(true)
    })
  })

  describe('contourAssignable', () => {
    // @test-link [[mechanic_pitch_contour_forward_check]]
    it('is false when fewer than four checkpoints are supplied', () => {
      expect(contourAssignable('Rising', [[60], [64], [67]])).toBe(false)
    })

    it('accepts a strictly rising checkpoint sequence and rejects a descending one for Rising', () => {
      expect(contourAssignable('Rising', [[48], [52], [55], [60]])).toBe(true)
      expect(contourAssignable('Rising', [[60], [55], [52], [48]])).toBe(false)
    })

    it('accepts a strictly falling checkpoint sequence and rejects an ascending one for Falling', () => {
      expect(contourAssignable('Falling', [[60], [55], [52], [48]])).toBe(true)
      expect(contourAssignable('Falling', [[48], [52], [55], [60]])).toBe(false)
    })

    it('accepts an Arch peaking at checkpoint 2 or checkpoint 3', () => {
      expect(contourAssignable('Arch', [[48], [55], [52], [48]])).toBe(true)
      expect(contourAssignable('Arch', [[48], [52], [55], [48]])).toBe(true)
    })

    it('rejects an Arch whose peak repeats across two checkpoints instead of staying unique', () => {
      expect(contourAssignable('Arch', [[48], [55], [55], [48]])).toBe(false)
    })

    it('rejects an Arch that never comes back down', () => {
      expect(contourAssignable('Arch', [[48], [52], [55], [60]])).toBe(false)
    })

    it('accepts Wandering only when both a rise and a fall occur across the checkpoints', () => {
      expect(contourAssignable('Wandering', [[60], [65], [60], [65]])).toBe(true)
      expect(contourAssignable('Wandering', [[48], [52], [55], [60]])).toBe(false)
    })

    it('picks a feasible path through wide per-checkpoint domains without a full cartesian search', () => {
      const wideValues = (offset: number) =>
        Array.from({ length: 60 }, (_, index) => 40 + offset + index)
      const choices = [wideValues(0), wideValues(0), wideValues(0), wideValues(0)]
      const start = performance.now()
      const result = contourAssignable('Wandering', choices)
      const elapsedMs = performance.now() - start
      expect(result).toBe(true)
      expect(elapsedMs).toBeLessThan(500)
    })
  })

  describe('compileContourPlan + advanceContour + contourComplete: Rising integration', () => {
    const checkpointAttackIndices = [0, 4, 8, 12]
    const domains = [[60], [64], [67], [72]]
    const finalMidis = [74]
    const reach = (intervals: number) => intervals * 2

    // @test-link [[mechanic_pitch_contour_forward_check]]
    it('walks a strictly rising checkpoint chain to completion and accepts the open final endpoint', () => {
      const plan = compileContourPlan({
        contour: 'Rising',
        checkpointAttackIndices,
        domains,
        finalAttackIndex: 13,
        finalMidis,
        reach,
      })
      expect(plan.impossible).toBe(false)

      let state = advanceContour(plan, INITIAL_CONTOUR_STATE, 0, 60, reach)
      expect(state).toEqual({ lastCheckpoint: 0, lastMidi: 60, tag: 0 })
      // A non-checkpoint attack within reach of the next checkpoint leaves the tag untouched.
      state = advanceContour(plan, state!, 2, 61, reach)
      expect(state).toEqual({ lastCheckpoint: 0, lastMidi: 60, tag: 0 })
      state = advanceContour(plan, state!, 4, 64, reach)
      expect(state).toEqual({ lastCheckpoint: 1, lastMidi: 64, tag: 1 })
      state = advanceContour(plan, state!, 8, 67, reach)
      expect(state).toEqual({ lastCheckpoint: 2, lastMidi: 67, tag: 1 })
      state = advanceContour(plan, state!, 12, 72, reach)
      expect(state).toEqual({ lastCheckpoint: 3, lastMidi: 72, tag: 1 })
      expect(contourComplete(plan, state!)).toBe(true)
      expect(advanceContour(plan, state!, 13, 74, reach)).toEqual(state)
    })

    it('rejects an intermediate note too far from every value that keeps the next checkpoint viable', () => {
      const plan = compileContourPlan({
        contour: 'Rising',
        checkpointAttackIndices,
        domains,
        finalAttackIndex: 13,
        finalMidis,
        reach,
      })
      const first = advanceContour(plan, INITIAL_CONTOUR_STATE, 0, 60, reach)!
      // Positive control: a value within reach of the next checkpoint (64) is accepted unchanged.
      expect(advanceContour(plan, first, 2, 62, reach)).toEqual(first)
      expect(advanceContour(plan, first, 2, 90, reach)).toBeUndefined()
    })

    it('rejects a checkpoint value that breaks the selected contour', () => {
      const generousReach = () => 100
      const fallingPlan = compileContourPlan({
        contour: 'Falling',
        checkpointAttackIndices,
        domains: [[60], [55, 70], [52], [48]],
        finalAttackIndex: 13,
        finalMidis: [45],
        reach: generousReach,
      })
      const fallingFirst = advanceContour(fallingPlan, INITIAL_CONTOUR_STATE, 0, 60, generousReach)
      expect(fallingFirst).toEqual({ lastCheckpoint: 0, lastMidi: 60, tag: 0 })
      // 55 continues the fall; 70 would reverse it and must be rejected at the same checkpoint.
      expect(advanceContour(fallingPlan, fallingFirst!, 4, 55, generousReach)).toEqual({
        lastCheckpoint: 1,
        lastMidi: 55,
        tag: 1,
      })
      expect(advanceContour(fallingPlan, fallingFirst!, 4, 70, generousReach)).toBeUndefined()
    })

    // @test-link [[mechanic_pitch_contour_forward_check]]
    it('marks the plan impossible when fewer than four checkpoints are supplied, and advanceContour always fails', () => {
      const plan = compileContourPlan({
        contour: 'Rising',
        checkpointAttackIndices: [0, 4, 8],
        domains: [[60], [64], [67]],
        finalAttackIndex: 13,
        finalMidis,
        reach,
      })
      expect(plan.impossible).toBe(true)
      expect(contourComplete(plan, INITIAL_CONTOUR_STATE)).toBe(false)
      expect(advanceContour(plan, INITIAL_CONTOUR_STATE, 0, 60, reach)).toBeUndefined()
    })
  })

  describe('INITIAL_CONTOUR_STATE', () => {
    // @test-link [[mechanic_pitch_contour_forward_check]]
    it('starts before the first checkpoint with a zero tag', () => {
      expect(INITIAL_CONTOUR_STATE).toEqual({ lastCheckpoint: -1, lastMidi: 0, tag: 0 })
      expect(Object.isFrozen(INITIAL_CONTOUR_STATE)).toBe(true)
    })
  })
})
