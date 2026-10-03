/**
 * The click track, clock-free: one click per quarter note from the session's start, beat 1
 * accented, the first measure routed as the count-in, and a half-open window rule that makes any
 * split of the timeline into windows give the same clicks, with no beat doubled or dropped.
 */

import { describe, expect, it } from 'vitest'

import type { ScheduledClick } from '@/audio/audio-ports'
import {
  beatAt,
  clicksBetween,
  countInEndsAt,
  createClickPlan,
  tempoAtBeat,
  withTempoFrom,
  type ClickPlan,
} from '@/audio/click-track'

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

/** Beats per four-measure phrase in 4/4. */
const PHRASE_BEATS = 16

/** Intent: the first beat of phrase `n` (from 1): after the four count-in beats. */
function phraseBeat(n: number): number {
  return 4 + (n - 1) * PHRASE_BEATS
}

/** Intent: a plan started at `startAt` and `tempos[0]`, phrase n + 1 at `tempos[n]`. */
function phrasePlan(startAt: number, tempos: readonly number[]): ClickPlan {
  let plan = createClickPlan(startAt, tempos[0]!)
  tempos.slice(1).forEach((tempo, index) => {
    plan = withTempoFrom(plan, phraseBeat(index + 2), tempo)
  })
  return plan
}

/**
 * Intent: the closed-form time of beat `k` for a plan built by `phrasePlan`: the count-in at the
 * starting tempo, then whole phrases at their own tempo, then the part phrase `k` falls in.
 */
function closedFormBeat(startAt: number, tempos: readonly number[], k: number): number {
  let at = startAt + (Math.min(k, 4) * 60) / tempos[0]!
  let beat = Math.min(k, 4)
  for (let phrase = 0; beat < k; phrase += 1) {
    const tempo = tempos[Math.min(phrase, tempos.length - 1)]!
    const beats = Math.min(PHRASE_BEATS, k - beat)
    at += (beats * 60) / tempo
    beat += beats
  }
  return at
}

// @test-link [[rule_click_track]]
// @test-link [[service_workspace_session_flow]]
describe('click track over a tempo map', () => {
  const TEMPOS = [90, 95, 100] as const

  // @test-link [[rule_click_track]]
  // @test-link [[service_workspace_session_flow]]
  it('puts every beat across 90 → 95 → 100 at the closed-form sum of its segments', () => {
    const plan = phrasePlan(2.3, TEMPOS)
    for (let k = 0; k <= phraseBeat(4) + 3; k += 1) {
      expect(beatAt(plan, k)).toBeCloseTo(closedFormBeat(2.3, TEMPOS, k), 12)
    }
  })

  // @test-link [[rule_click_track]]
  // @test-link [[service_workspace_session_flow]]
  it('never moves the change beat itself, nor any beat before it, when a change is added', () => {
    const before = phrasePlan(2.3, [90, 95])
    const after = withTempoFrom(before, phraseBeat(3), 100)
    for (let k = 0; k <= phraseBeat(3); k += 1) expect(beatAt(after, k)).toBe(beatAt(before, k))
    expect(beatAt(after, phraseBeat(3) + 1)).toBe(beatAt(before, phraseBeat(3)) + 60 / 100)
  })

  // @test-link [[rule_click_track]]
  // @test-link [[service_workspace_session_flow]]
  it('keeps the count-in at the starting tempo', () => {
    const plan = phrasePlan(1, TEMPOS)
    expect(countInEndsAt(plan)).toBe(countInEndsAt(createClickPlan(1, 90)))
    expect(clicksBetween(plan, 1, countInEndsAt(plan)).map((c) => c.at)).toEqual(
      clicksBetween(createClickPlan(1, 90), 1, countInEndsAt(plan)).map((c) => c.at),
    )
  })

  // @test-link [[rule_click_track]]
  // @test-link [[service_workspace_session_flow]]
  it('inverts beatAt across the changes, with firstBeatFrom', () => {
    const plan = phrasePlan(0.4, TEMPOS)
    for (let k = 0; k <= phraseBeat(4) + 3; k += 1) {
      const at = beatAt(plan, k)
      expect(clicksBetween(plan, at, at + 1e-6).map((c) => c.at)).toEqual([at])
      expect(clicksBetween(plan, at - 1e-6, at).map((c) => c.at)).toEqual([])
    }
  })

  // @test-link [[rule_click_track]]
  // @test-link [[service_workspace_session_flow]]
  it('clicks through a change with no gap or double, its spacing switching at the change beat', () => {
    const plan = phrasePlan(0.1, TEMPOS)
    const end = beatAt(plan, phraseBeat(4)) - 0.01
    const whole = clicksBetween(plan, 0, end)
    expect(whole).toHaveLength(phraseBeat(4))
    whole.forEach((click, k) => {
      expect(click.at).toBe(beatAt(plan, k))
      expect(click.accent).toBe(k % 4 === 0)
      expect(click.route).toBe(k < 4 ? 'count-in' : 'click')
    })
    const gaps = whole.slice(1).map((click, k) => click.at - whole[k]!.at)
    gaps.forEach((gap, k) => {
      const tempo = k + 1 <= phraseBeat(2) ? 90 : k + 1 <= phraseBeat(3) ? 95 : 100
      expect(gap).toBeCloseTo(60 / tempo, 9)
    })
    const boundaries = [0]
    for (let t = 0.07; t < end; t += 0.07) boundaries.push(t)
    boundaries.push(end)
    expect(clicksOverWindows(plan, boundaries)).toEqual(whole)
  })

  // @test-link [[rule_click_track]]
  // @test-link [[service_workspace_session_flow]]
  it('reads the tempo in effect at each beat', () => {
    const plan = phrasePlan(0, TEMPOS)
    expect(tempoAtBeat(plan, 0)).toBe(90)
    expect(tempoAtBeat(plan, phraseBeat(2) - 1)).toBe(90)
    expect(tempoAtBeat(plan, phraseBeat(2))).toBe(95)
    expect(tempoAtBeat(plan, phraseBeat(3))).toBe(100)
    expect(tempoAtBeat(plan, 1000)).toBe(100)
  })

  // @test-link [[rule_click_track]]
  // @test-link [[service_workspace_session_flow]]
  it('refuses a change not after the last, inside the count-in, or off a whole 60..240 BPM', () => {
    const plan = phrasePlan(0, TEMPOS)
    expect(() => withTempoFrom(plan, phraseBeat(3), 110)).toThrow(/after/)
    expect(() => withTempoFrom(plan, phraseBeat(2), 110)).toThrow(/after/)
    const fresh = createClickPlan(0, 90)
    for (const beat of [0, 3, -1]) {
      expect(() => withTempoFrom(fresh, beat, 100)).toThrow(/count-in/)
    }
    for (const beat of [4.5, Number.NaN]) {
      expect(() => withTempoFrom(fresh, beat, 100)).toThrow(/beat/)
    }
    for (const tempo of [59, 241, 100.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => withTempoFrom(fresh, phraseBeat(2), tempo)).toThrow(/tempo/)
    }
    expect(withTempoFrom(fresh, phraseBeat(2), 60).tempoChanges).toHaveLength(1)
    expect(withTempoFrom(fresh, phraseBeat(2), 240).tempoChanges).toHaveLength(1)
  })

  // @test-link [[rule_click_track]]
  it('leaves a plan unchanged by a change to the tempo already in effect', () => {
    const fresh = createClickPlan(0.1, 120)
    expect(fresh.tempoChanges).toEqual([])
    expect(withTempoFrom(fresh, phraseBeat(2), 120)).toBe(fresh)
    const risen = withTempoFrom(fresh, phraseBeat(2), 125)
    expect(withTempoFrom(risen, phraseBeat(3), 125)).toBe(risen)
  })

  // @test-link [[rule_click_track]]
  // @test-link [[service_workspace_session_flow]]
  it('keeps 20 phrases rising +5 from 60 to 160 BPM within 1e-9 s of the closed form', () => {
    const tempos = Array.from({ length: 21 }, (_, index) => 60 + 5 * index)
    const plan = phrasePlan(7.25, tempos)
    let expected = 7.25 + (4 * 60) / 60
    for (let n = 1; n <= 21; n += 1) {
      expect(Math.abs(beatAt(plan, phraseBeat(n)) - expected)).toBeLessThan(1e-9)
      expected += (PHRASE_BEATS * 60) / tempos[n - 1]!
    }
    expect(tempoAtBeat(plan, phraseBeat(21))).toBe(160)
  })
})
