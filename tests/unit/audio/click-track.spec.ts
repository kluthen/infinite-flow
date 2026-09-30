/**
 * The click track, clock-free: one click per quarter note from the session's start, beat 1
 * accented, the first measure routed as the count-in, and a half-open window rule that makes any
 * split of the timeline into windows give the same clicks, with no beat doubled or dropped.
 */

import { describe, expect, it } from 'vitest'

import type { ScheduledClick } from '@/audio/audio-ports'
import { clicksBetween, countInEndsAt, createClickPlan, type ClickPlan } from '@/audio/click-track'

/** A count-in plus eight 4/4 bars: 36 beats. */
const SCRIPT_BEATS = 36

/** Intent: the clicks of a whole script, collected by splitting it at `boundaries`. */
function clicksOverWindows(plan: ClickPlan, boundaries: readonly number[]): ScheduledClick[] {
  const clicks: ScheduledClick[] = []
  for (let i = 1; i < boundaries.length; i += 1) {
    clicks.push(...clicksBetween(plan, boundaries[i - 1] ?? 0, boundaries[i] ?? 0))
  }
  return clicks
}

/** Intent: the end of the script (just before beat 36) for a plan. */
function scriptEnd(plan: ClickPlan): number {
  return plan.startAt + (SCRIPT_BEATS - 0.5) * (60 / plan.tempo)
}

/** Intent: check a click list is the exact 36-beat script at a tempo. */
function expectScript(clicks: readonly ScheduledClick[], startAt: number, tempo: number): void {
  expect(clicks).toHaveLength(SCRIPT_BEATS)
  clicks.forEach((click, k) => {
    expect(click.at).toBeCloseTo(startAt + (k * 60) / tempo, 9)
    expect(click.accent).toBe(k % 4 === 0)
    expect(click.route).toBe(k < 4 ? 'count-in' : 'click')
  })
}

// @test-link [[rule_click_track]]
// @test-link [[rule_count_in_always_clicks]]
describe('click track', () => {
  it.each([120, 60, 240])('plays a count-in plus eight bars at %i BPM', (tempo) => {
    const plan = createClickPlan(3.7, tempo)
    expect(plan.beatsPerMeasure).toBe(4)
    expect(plan.countInBeats).toBe(4)
    expectScript(clicksBetween(plan, 3.7, scriptEnd(plan)), 3.7, tempo)
  })

  it('ends the count-in one measure after the start', () => {
    expect(countInEndsAt(createClickPlan(1.25, 120))).toBeCloseTo(3.25, 9)
    expect(countInEndsAt(createClickPlan(0, 60))).toBeCloseTo(4, 9)
    expect(countInEndsAt(createClickPlan(0, 240))).toBeCloseTo(1, 9)
  })

  it('gives the same clicks for 0.025 s windows as for one window', () => {
    const plan = createClickPlan(0.1, 120)
    const end = scriptEnd(plan)
    const boundaries = [0]
    for (let k = 1; k * 0.025 < end; k += 1) boundaries.push(k * 0.025)
    boundaries.push(end)
    expect(clicksOverWindows(plan, boundaries)).toEqual(clicksBetween(plan, 0, end))
    expectScript(clicksOverWindows(plan, boundaries), 0.1, 120)
  })

  it.each([
    [0.3, 120],
    [0.77, 120],
    [0.3, 240],
    [0.77, 60],
  ])('gives the same clicks for %f s windows at %i BPM', (step, tempo) => {
    const plan = createClickPlan(0.1, tempo)
    const end = scriptEnd(plan)
    const boundaries = [0]
    for (let t = step; t < end; t += step) boundaries.push(t)
    boundaries.push(end)
    expectScript(clicksOverWindows(plan, boundaries), 0.1, tempo)
  })

  it('never doubles a beat that falls exactly on a window boundary', () => {
    const plan = createClickPlan(0, 120)
    expect(clicksBetween(plan, 0, 0.5).map((c) => c.at)).toEqual([0])
    expect(clicksBetween(plan, 0.5, 1).map((c) => c.at)).toEqual([0.5])
    expect(clicksBetween(plan, 0.5, 0.5)).toEqual([])
  })

  it('schedules nothing before the start', () => {
    expect(clicksBetween(createClickPlan(2, 120), 0, 2)).toEqual([])
  })

  it.each([0, -120, Number.NaN, Number.POSITIVE_INFINITY])('rejects a tempo of %f', (tempo) => {
    expect(() => createClickPlan(0, tempo)).toThrow()
  })

  it('rejects a non-finite start and a backwards window', () => {
    expect(() => createClickPlan(Number.NaN, 120)).toThrow()
    expect(() => clicksBetween(createClickPlan(0, 120), 1, 0.5)).toThrow()
  })
})
