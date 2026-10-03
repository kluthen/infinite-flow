/**
 * The session's rolling display as a pure plan: where the playhead is on heard time, what each of
 * the two system positions shows in the held layout, what readied material waits, and how much is
 * on screen ahead of the measure being played. Eight-phrase walks pin the expected tables and the
 * one invariant the design rests on: a position changes only once the playhead has left it.
 */

import { describe, expect, it } from 'vitest'

import type { MeasureIndex } from '@/domain/events/measure'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import {
  isPhraseOnScreen,
  phrasesShownOrWaiting,
  playheadAt,
  readAheadMeasures,
  slotKey,
  systemsAt,
  waitingMaterial,
  type PlayheadPosition,
  type PlayheadTempoMap,
  type RollingSystems,
  type SystemSlot,
} from '@/session/rolling-display'
import { measureSeconds } from '@/session/session-timing'
import { phraseFirstBeat, phraseStartsAt } from '@/audio/backing-track'
import { createClickPlan, withTempoFrom, type ClickPlan } from '@/audio/click-track'

const PHRASES = 8
const START = 7.3

/** One moment of a walk: the playhead (null in the count-in) and the latest readied phrase. */
interface WalkState {
  readonly playhead: PlayheadPosition | null
  readonly latestReady: number
}

/** Intent: a playhead position, checked to be a legal measure index. */
function at(phraseNumber: number, measure: number): PlayheadPosition {
  if (![0, 1, 2, 3].includes(measure)) throw new Error(`bad test measure ${measure}`)
  return { phraseNumber, measureIndex: measure as MeasureIndex }
}

/** Intent: a slot as a short label: phrase number and w/o/c for whole/opening/closing, or '-'. */
function label(slot: SystemSlot | null): string {
  if (slot === null) return '-'
  return `${slot.phraseNumber}${slot.part[0]}`
}

/** Intent: what the two positions show, as `top/bottom` labels. */
function render(state: WalkState, layout: StaffLayout): string {
  const systems = systemsAt(layout, state.playhead, state.latestReady)
  return `${label(systems.top)}/${label(systems.bottom)}`
}

/**
 * Intent: the worst-case walk. Phrase 2 is readied during the count-in; phrase n+1 (n >= 2) is
 * readied only just before the deadline, the start of phrase n's last measure, so it appears in
 * measure 2 as a separate state right before the measure-3 barline.
 */
function worstWalk(): WalkState[] {
  const states: WalkState[] = [
    { playhead: null, latestReady: 1 },
    { playhead: null, latestReady: 2 },
  ]
  for (let n = 1; n <= PHRASES; n += 1) {
    for (let m = 0; m < 4; m += 1) {
      const late = n >= 2 && m === 3
      if (late) states.push({ playhead: at(n, 2), latestReady: n + 1 })
      states.push({ playhead: at(n, m), latestReady: n === 1 ? 2 : late ? n + 1 : n })
    }
  }
  return states
}

/**
 * Intent: the early walk. Phrase n+1 is readied as phrase n starts sounding; on context time that
 * is while the heard playhead is still in phrase n-1's last measure, so latestReady reaches p+2
 * there (the heard-time lag), as a second state after that measure's barline.
 */
function earlyWalk(): WalkState[] {
  const states: WalkState[] = [{ playhead: null, latestReady: 2 }]
  for (let n = 1; n <= PHRASES; n += 1) {
    for (let m = 0; m < 4; m += 1) {
      states.push({ playhead: at(n, m), latestReady: n + 1 })
      if (m === 3) states.push({ playhead: at(n, m), latestReady: n + 2 })
    }
  }
  return states
}

/** Intent: the position holding the playhead in a layout (none in the count-in). */
function playheadPosition(layout: StaffLayout, playhead: PlayheadPosition | null) {
  if (playhead === null) return null
  if (layout === 'one-system') return playhead.phraseNumber % 2 === 1 ? 'top' : 'bottom'
  return playhead.measureIndex < 2 ? 'top' : 'bottom'
}

/** Intent: the absolute measure (0-based across the session) a slot ends on. */
function slotLastMeasure(slot: SystemSlot): number {
  return (slot.phraseNumber - 1) * 4 + (slot.part === 'opening' ? 1 : 3)
}

/** Intent: the absolute measure the playhead is on (-1 in the count-in). */
function absolute(playhead: PlayheadPosition | null): number {
  return playhead === null ? -1 : (playhead.phraseNumber - 1) * 4 + playhead.measureIndex
}

/** Intent: one walk's states grouped per line: the count-in, then one line per phrase. */
function table(states: readonly WalkState[], layout: StaffLayout): string[] {
  const lines = new Map<number, string[]>()
  for (const state of states) {
    const line = state.playhead?.phraseNumber ?? 0
    lines.set(line, [...(lines.get(line) ?? []), render(state, layout)])
  }
  return [...lines.values()].map((cells) => cells.join(' '))
}

const EXPECTED: Record<StaffLayout, Record<'worst' | 'early', string[]>> = {
  'one-system': {
    // per phrase: m0 m1 m2 (m2 readied) m3
    worst: [
      '1w/- 1w/2w',
      '1w/2w 1w/2w 1w/2w 1w/2w',
      '-/2w -/2w -/2w 3w/2w 3w/2w',
      '3w/- 3w/- 3w/- 3w/4w 3w/4w',
      '-/4w -/4w -/4w 5w/4w 5w/4w',
      '5w/- 5w/- 5w/- 5w/6w 5w/6w',
      '-/6w -/6w -/6w 7w/6w 7w/6w',
      '7w/- 7w/- 7w/- 7w/8w 7w/8w',
      '-/8w -/8w -/8w 9w/8w 9w/8w',
    ],
    // per phrase: m0 m1 m2 m3 (m3 lagged)
    early: [
      '1w/2w',
      '1w/2w 1w/2w 1w/2w 1w/2w 1w/2w',
      '3w/2w 3w/2w 3w/2w 3w/2w 3w/2w',
      '3w/4w 3w/4w 3w/4w 3w/4w 3w/4w',
      '5w/4w 5w/4w 5w/4w 5w/4w 5w/4w',
      '5w/6w 5w/6w 5w/6w 5w/6w 5w/6w',
      '7w/6w 7w/6w 7w/6w 7w/6w 7w/6w',
      '7w/8w 7w/8w 7w/8w 7w/8w 7w/8w',
      '9w/8w 9w/8w 9w/8w 9w/8w 9w/8w',
    ],
  },
  split: {
    worst: [
      '1o/1c 1o/1c',
      '1o/1c 1o/1c 2o/1c 2o/1c',
      '2o/2c 2o/2c -/2c 3o/2c 3o/2c',
      '3o/3c 3o/3c -/3c 4o/3c 4o/3c',
      '4o/4c 4o/4c -/4c 5o/4c 5o/4c',
      '5o/5c 5o/5c -/5c 6o/5c 6o/5c',
      '6o/6c 6o/6c -/6c 7o/6c 7o/6c',
      '7o/7c 7o/7c -/7c 8o/7c 8o/7c',
      '8o/8c 8o/8c -/8c 9o/8c 9o/8c',
    ],
    early: [
      '1o/1c',
      '1o/1c 1o/1c 2o/1c 2o/1c 2o/1c',
      '2o/2c 2o/2c 3o/2c 3o/2c 3o/2c',
      '3o/3c 3o/3c 4o/3c 4o/3c 4o/3c',
      '4o/4c 4o/4c 5o/4c 5o/4c 5o/4c',
      '5o/5c 5o/5c 6o/5c 6o/5c 6o/5c',
      '6o/6c 6o/6c 7o/6c 7o/6c 7o/6c',
      '7o/7c 7o/7c 8o/7c 8o/7c 8o/7c',
      '8o/8c 8o/8c 9o/8c 9o/8c 9o/8c',
    ],
  },
}

const LAYOUTS: readonly StaffLayout[] = ['one-system', 'split']
const WALKS = { worst: worstWalk, early: earlyWalk } as const

// @test-link [[module_session_rolling_display]]
// @test-link [[rule_look_ahead_deadline]]
// @test-link [[rule_session_layout_fixed_at_start]]
// @test-link [[rule_phrase_one_is_idle_phrase]]
describe.each(LAYOUTS)('eight phrases in the %s layout', (layout) => {
  describe.each(['worst', 'early'] as const)('with %s-case readiness', (readiness) => {
    const states = WALKS[readiness]()

    // @test-link [[module_session_rolling_display]]
    // @test-link [[rule_phrase_one_is_idle_phrase]]
    it('shows the expected systems at every barline and readiness change', () => {
      expect(table(states, layout)).toEqual(EXPECTED[layout][readiness])
    })

    // @test-link [[module_session_rolling_display]]
    // @test-link [[rule_look_ahead_deadline]]
    it('keeps at least one measure on screen after the one being played', () => {
      for (const { playhead, latestReady } of states) {
        if (playhead === null) continue
        expect(readAheadMeasures(layout, playhead, latestReady)).toBeGreaterThanOrEqual(1)
      }
    })

    // @test-link [[module_session_rolling_display]]
    // @test-link [[rule_session_layout_fixed_at_start]]
    it('keeps every phrase part in its home position', () => {
      for (const { playhead, latestReady } of states) {
        const { top, bottom } = systemsAt(layout, playhead, latestReady)
        const home = (slot: SystemSlot): 'top' | 'bottom' =>
          layout === 'one-system'
            ? slot.phraseNumber % 2 === 1
              ? 'top'
              : 'bottom'
            : slot.part === 'opening'
              ? 'top'
              : 'bottom'
        if (top !== null) expect(home(top)).toBe('top')
        if (bottom !== null) expect(home(bottom)).toBe('bottom')
      }
    })

    // @test-link [[module_session_rolling_display]]
    it('never changes a position before the playhead has left it', () => {
      for (let i = 0; i < states.length; i += 1) {
        const now = states[i]!
        const systems = systemsAt(layout, now.playhead, now.latestReady)
        const here = playheadPosition(layout, now.playhead)
        if (here !== null) {
          const held = systems[here]
          expect(held).not.toBeNull()
          expect(held!.phraseNumber).toBe(now.playhead!.phraseNumber)
          expect(slotLastMeasure(held!)).toBeGreaterThanOrEqual(absolute(now.playhead))
        }
        if (i === 0) continue
        const before = states[i - 1]!
        const previous = systemsAt(layout, before.playhead, before.latestReady)
        for (const position of ['top', 'bottom'] as const) {
          const old = previous[position]
          const changed =
            (old && slotKey(old)) !== (systems[position] && slotKey(systems[position]))
          if (!changed) continue
          expect(position).not.toBe(here)
          if (old !== null) expect(slotLastMeasure(old)).toBeLessThan(absolute(now.playhead))
        }
      }
    })
  })
})

/** Intent: the waiting slots as short labels. */
function waiting(layout: StaffLayout, playhead: PlayheadPosition | null, latest: number): string[] {
  return waitingMaterial(layout, playhead, latest).map(label)
}

// @test-link [[module_session_rolling_display]]
// @test-link [[rule_session_ends_when_staff_too_small]]
describe('waiting material', () => {
  // @test-link [[module_session_rolling_display]]
  it('in one system, waits nothing at p+1 and waits p+2 whole in the lag case', () => {
    expect(waiting('one-system', at(3, 1), 4)).toEqual([])
    expect(phrasesShownOrWaiting('one-system', at(3, 1), 4)).toEqual([3, 4])
    expect(waiting('one-system', at(3, 3), 5)).toEqual(['5w'])
    expect(phrasesShownOrWaiting('one-system', at(3, 3), 5)).toEqual([3, 4, 5])
    expect(waiting('one-system', at(4, 0), 5)).toEqual([])
  })

  // @test-link [[module_session_rolling_display]]
  it('in split, waits the next phrase whole in measures 1-2 and its closing from measure 3', () => {
    expect(waiting('split', at(3, 1), 3)).toEqual([])
    expect(waiting('split', at(3, 1), 4)).toEqual(['4o', '4c'])
    expect(phrasesShownOrWaiting('split', at(3, 1), 4)).toEqual([3, 4])
    expect(waiting('split', at(3, 2), 3)).toEqual([])
    expect(phrasesShownOrWaiting('split', at(3, 2), 3)).toEqual([3])
    expect(waiting('split', at(3, 2), 4)).toEqual(['4c'])
    expect(waiting('split', at(3, 3), 5)).toEqual(['4c', '5o', '5c'])
    expect(phrasesShownOrWaiting('split', at(3, 3), 5)).toEqual([3, 4, 5])
  })

  // @test-link [[module_session_rolling_display]]
  // @test-link [[rule_phrase_one_is_idle_phrase]]
  it('in the count-in, phrase 2 waits whole in split and shows below in one system', () => {
    expect(waiting('split', null, 1)).toEqual([])
    expect(waiting('split', null, 2)).toEqual(['2o', '2c'])
    expect(phrasesShownOrWaiting('split', null, 2)).toEqual([1, 2])
    expect(waiting('one-system', null, 2)).toEqual([])
    expect(render({ playhead: null, latestReady: 2 }, 'one-system')).toBe('1w/2w')
    expect(phrasesShownOrWaiting('one-system', null, 1)).toEqual([1])
  })
})

// @test-link [[module_session_rolling_display]]
// @test-link [[rule_look_ahead_deadline]]
describe('read-ahead', () => {
  // @test-link [[rule_look_ahead_deadline]]
  it('counts the rest of the playhead system and the next slot in reading order', () => {
    expect(readAheadMeasures('split', at(2, 0), 2)).toBe(3)
    expect(readAheadMeasures('split', at(2, 1), 2)).toBe(2)
    expect(readAheadMeasures('split', at(2, 2), 2)).toBe(1)
    expect(readAheadMeasures('split', at(2, 3), 3)).toBe(2)
    expect(readAheadMeasures('split', at(2, 3), 2)).toBe(0)
    expect(readAheadMeasures('one-system', at(2, 3), 3)).toBe(4)
    expect(readAheadMeasures('one-system', at(2, 0), 2)).toBe(3)
    expect(readAheadMeasures('one-system', at(2, 3), 2)).toBe(0)
  })
})

/** Intent: the barline k's time, by multiplication. */
function barline(ms: number, k: number): number {
  return START + k * ms
}

/** Intent: a tempo map of one tempo for the whole session, from phrase 1's first barline. */
function oneTempo(startsAt: number, ms: number): PlayheadTempoMap {
  return [{ phraseNumber: 1, startsAt, measureSeconds: ms }]
}

/**
 * Intent: the transport's click plan from `START - one measure` at 90 BPM, with phrase 3 on at 95
 * BPM, and the playhead's tempo map over it: phrase 1 from its start at 90 BPM, phrase 3 from its
 * start at 95 BPM.
 */
function risenAtPhraseThree(): { readonly plan: ClickPlan; readonly map: PlayheadTempoMap } {
  const counted = createClickPlan(START - measureSeconds(90), 90)
  const plan = withTempoFrom(counted, phraseFirstBeat(counted, 3), 95)
  return {
    plan,
    map: [
      { phraseNumber: 1, startsAt: phraseStartsAt(plan, 1), measureSeconds: measureSeconds(90) },
      { phraseNumber: 3, startsAt: phraseStartsAt(plan, 3), measureSeconds: measureSeconds(95) },
    ],
  }
}

// @test-link [[module_session_rolling_display]]
// @test-link [[rule_playhead_follows_audio_clock]]
describe('playheadAt', () => {
  // @test-link [[rule_playhead_follows_audio_clock]]
  it.each([120, 240, 97])(
    'lands on the new measure exactly at every barline for five minutes at %i BPM',
    (tempo) => {
      const ms = measureSeconds(tempo)
      const count = Math.floor(300 / ms)
      for (let k = 0; k <= count; k += 1) {
        const expected = { phraseNumber: 1 + Math.floor(k / 4), measureIndex: k % 4 }
        expect(playheadAt(barline(ms, k), oneTempo(START, ms))).toEqual(expected)
        expect(playheadAt(barline(ms, k) + ms / 2, oneTempo(START, ms))).toEqual(expected)
        if (k === 0) continue
        const previous = { phraseNumber: 1 + Math.floor((k - 1) / 4), measureIndex: (k - 1) % 4 }
        expect(playheadAt(barline(ms, k) - 1e-6, oneTempo(START, ms))).toEqual(previous)
      }
    },
  )

  // @test-link [[rule_playhead_follows_audio_clock]]
  // @test-link [[module_session_rolling_display]]
  it('maps heard time through a tempo change: phrases 1 and 2 at 90 BPM, phrase 3 on at 95', () => {
    const { plan, map } = risenAtPhraseThree()
    const slow = measureSeconds(90)
    const fast = measureSeconds(95)
    const phraseOneAt = phraseStartsAt(plan, 1)
    const phraseThreeAt = phraseStartsAt(plan, 3)
    for (let k = 0; k < 8; k += 1) {
      const expected = { phraseNumber: 1 + Math.floor(k / 4), measureIndex: k % 4 }
      expect(playheadAt(phraseOneAt + k * slow, map)).toEqual(expected)
      expect(playheadAt(phraseOneAt + (k + 0.5) * slow, map)).toEqual(expected)
      if (k > 0) expect(playheadAt(phraseOneAt + k * slow - 1e-6, map)).not.toEqual(expected)
    }
    expect(playheadAt(phraseThreeAt - 1e-6, map)).toEqual({ phraseNumber: 2, measureIndex: 3 })
    expect(playheadAt(phraseThreeAt, map)).toEqual({ phraseNumber: 3, measureIndex: 0 })
    for (let m = 1; m < 8; m += 1) {
      const expected = { phraseNumber: 3 + Math.floor(m / 4), measureIndex: m % 4 }
      const previous = { phraseNumber: 3 + Math.floor((m - 1) / 4), measureIndex: (m - 1) % 4 }
      expect(playheadAt(phraseThreeAt + m * fast, map)).toEqual(expected)
      expect(playheadAt(phraseThreeAt + m * fast - 1e-6, map)).toEqual(previous)
    }
    // At 90 BPM phrase 3's second measure would only start 4 * 60 / 90 s after its start.
    expect(playheadAt(phraseThreeAt + (fast + slow) / 2, map)).toEqual({
      phraseNumber: 3,
      measureIndex: 1,
    })
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  // @test-link [[module_session_rolling_display]]
  it("starts each tempo segment exactly at the transport's phrase start, whatever the rounding", () => {
    for (const startingTempo of [61, 90, 97, 113, 235]) {
      let plan = createClickPlan(START, startingTempo)
      const map: PlayheadTempoMap[number][] = [
        {
          phraseNumber: 1,
          startsAt: phraseStartsAt(plan, 1),
          measureSeconds: measureSeconds(startingTempo),
        },
      ]
      for (let n = 2; n <= 30; n += 1) {
        const tempo = startingTempo + n - 1
        if (tempo > 240) break
        plan = withTempoFrom(plan, phraseFirstBeat(plan, n), tempo)
        map.push({
          phraseNumber: n,
          startsAt: phraseStartsAt(plan, n),
          measureSeconds: measureSeconds(tempo),
        })
        expect(playheadAt(phraseStartsAt(plan, n), map)).toEqual({
          phraseNumber: n,
          measureIndex: 0,
        })
      }
    }
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('is null in the count-in, before phrase 1 first barline', () => {
    const ms = measureSeconds(120)
    expect(playheadAt(START - ms, oneTempo(START, ms))).toBeNull()
    expect(playheadAt(START - 1e-9, oneTempo(START, ms))).toBeNull()
    expect(playheadAt(START, oneTempo(START, ms))).toEqual({ phraseNumber: 1, measureIndex: 0 })
  })
})

// @test-link [[module_session_rolling_display]]
describe('isPhraseOnScreen', () => {
  // @test-link [[module_session_rolling_display]]
  it('tells when any part of a look-ahead phrase is on screen', () => {
    expect(isPhraseOnScreen('one-system', at(2, 0), 2, 3)).toBe(false)
    expect(isPhraseOnScreen('one-system', at(2, 2), 3, 3)).toBe(true)
    expect(isPhraseOnScreen('one-system', at(2, 0), 2, 1)).toBe(false)
    expect(isPhraseOnScreen('split', at(2, 1), 3, 3)).toBe(false)
    expect(isPhraseOnScreen('split', at(2, 2), 3, 3)).toBe(true)
    expect(isPhraseOnScreen('split', at(2, 3), 4, 4)).toBe(false)
    expect(isPhraseOnScreen('split', null, 2, 1)).toBe(true)
    expect(isPhraseOnScreen('split', null, 2, 2)).toBe(false)
    expect(isPhraseOnScreen('one-system', null, 2, 2)).toBe(true)
  })
})

// @test-link [[module_session_rolling_display]]
describe('caller errors', () => {
  // @test-link [[rule_playhead_follows_audio_clock]]
  it('playheadAt throws on non-finite times, a non-positive measure length or a broken map', () => {
    expect(() => playheadAt(Number.NaN, oneTempo(0, 2))).toThrow()
    expect(() => playheadAt(1, oneTempo(Number.POSITIVE_INFINITY, 2))).toThrow()
    expect(() => playheadAt(1, oneTempo(0, Number.NaN))).toThrow()
    expect(() => playheadAt(1, oneTempo(0, 0))).toThrow()
    expect(() => playheadAt(1, oneTempo(0, -2))).toThrow()
    expect(() => playheadAt(1, [])).toThrow()
    expect(() => playheadAt(1, [{ phraseNumber: 2, startsAt: 0, measureSeconds: 2 }])).toThrow()
    const first = { phraseNumber: 1, startsAt: 0, measureSeconds: 2 }
    expect(() =>
      playheadAt(1, [first, { phraseNumber: 1, startsAt: 8, measureSeconds: 1 }]),
    ).toThrow()
    expect(() =>
      playheadAt(1, [first, { phraseNumber: 3, startsAt: 0, measureSeconds: 1 }]),
    ).toThrow()
    expect(() =>
      playheadAt(1, [first, { phraseNumber: 2.5, startsAt: 8, measureSeconds: 1 }]),
    ).toThrow()
  })

  // @test-link [[module_session_rolling_display]]
  it('the plan throws on a readiness behind the playhead or an invalid playhead or layout', () => {
    const badMeasure: number = 4
    const badLayout: string = 'diagonal'
    expect(() => systemsAt('one-system', at(3, 0), 2)).toThrow()
    expect(() => systemsAt('split', null, 0)).toThrow()
    expect(() => systemsAt('split', null, 1.5)).toThrow()
    expect(() => systemsAt('split', { phraseNumber: 0, measureIndex: 0 }, 1)).toThrow()
    expect(() => systemsAt('split', { phraseNumber: 1.5, measureIndex: 0 }, 2)).toThrow()
    const bad = { phraseNumber: 1, measureIndex: badMeasure as MeasureIndex }
    expect(() => systemsAt('split', bad, 2)).toThrow()
    expect(() => systemsAt(badLayout as StaffLayout, null, 1)).toThrow()
    expect(() => waitingMaterial('split', at(2, 0), 1)).toThrow()
    expect(() => phrasesShownOrWaiting('one-system', at(2, 0), 1)).toThrow()
    expect(() => readAheadMeasures('split', at(2, 0), 1)).toThrow()
    expect(() => isPhraseOnScreen('split', at(2, 0), 1, 2)).toThrow()
    expect(() => isPhraseOnScreen('split', at(2, 0), 2, 0)).toThrow()
  })
})

// @test-link [[module_session_rolling_display]]
describe('slotKey', () => {
  // @test-link [[module_session_rolling_display]]
  it('names a slot by phrase number and part', () => {
    const systems: RollingSystems = systemsAt('split', at(4, 2), 5)
    expect(systems.top && slotKey(systems.top)).toBe('5:opening')
    expect(systems.bottom && slotKey(systems.bottom)).toBe('4:closing')
  })
})
