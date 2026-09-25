import { describe, expect, it } from 'vitest'
import type { HarmonyEvent } from '@/domain/harmony/harmony-types'
import {
  harmonyEventIndexAt,
  harmonyIdentityAtTick,
  soundingSpans,
  TICKS_PER_BAR,
  TICKS_PER_BEAT,
} from '@/domain/pitch/pitch-harmony'
import { PitchPlannerInputError } from '@/domain/pitch/pitch-types'
import { bar, chord, TONIC_EACH_BAR } from './validation/validation-fixtures'

// @test-link [[module_pitch_attack_timeline]]
describe('soundingSpans: attack extraction', () => {
  it('opens one span per fresh note, matching the rhythm order and absolute tick math', () => {
    const spans = soundingSpans({ bars: [bar(0, 'q q q q')] })
    expect(spans).toEqual([
      { barIndex: 0, startTick: 0, durationTicks: 4, start: 0, end: 4 },
      { barIndex: 0, startTick: 4, durationTicks: 4, start: 4, end: 8 },
      { barIndex: 0, startTick: 8, durationTicks: 4, start: 8, end: 12 },
      { barIndex: 0, startTick: 12, durationTicks: 4, start: 12, end: 16 },
    ])
  })

  it('offsets start/end by TICKS_PER_BAR per bar so later bars sit on one absolute timeline', () => {
    const spans = soundingSpans({ bars: [bar(0, 'q'), bar(1, 'q')] })
    expect(spans[1]).toMatchObject({
      barIndex: 1,
      startTick: 0,
      start: TICKS_PER_BAR,
      end: TICKS_PER_BAR + 4,
    })
  })

  it('closes the open attack on a rest without emitting a span of its own', () => {
    const spans = soundingSpans({ bars: [bar(0, 'q r:q q')] })
    expect(spans).toEqual([
      { barIndex: 0, startTick: 0, durationTicks: 4, start: 0, end: 4 },
      { barIndex: 0, startTick: 8, durationTicks: 4, start: 8, end: 12 },
    ])
  })

  it('folds a tie continuation into the attack it extends instead of opening a new one', () => {
    const spans = soundingSpans({ bars: [bar(0, 'q ~:q e')] })
    expect(spans).toEqual([
      { barIndex: 0, startTick: 0, durationTicks: 4, start: 0, end: 8 },
      { barIndex: 0, startTick: 8, durationTicks: 2, start: 8, end: 10 },
    ])
  })

  it('extends a tie continuation across a bar line onto the same open attack', () => {
    const spans = soundingSpans({ bars: [bar(0, 'q q q q'), bar(1, '~:q')] })
    expect(spans).toHaveLength(4)
    expect(spans[3]).toEqual({
      barIndex: 0,
      startTick: 12,
      durationTicks: 4,
      start: 12,
      end: TICKS_PER_BAR + 4,
    })
  })

  it('throws when a tie continuation has no open attack to extend (leading tie)', () => {
    expect(() => soundingSpans({ bars: [bar(0, '~:q q')] })).toThrow(PitchPlannerInputError)
  })

  it('throws when a tie continuation follows a rest that closed the attack', () => {
    expect(() => soundingSpans({ bars: [bar(0, 'r:q ~:q')] })).toThrow(PitchPlannerInputError)
  })
})

// @test-link [[module_pitch_attack_timeline]]
describe('harmonyEventIndexAt: harmony-event lookup', () => {
  it('resolves the first tick of the phrase to the first event', () => {
    const harmony = { identity: 'fixture', events: TONIC_EACH_BAR }
    expect(harmonyEventIndexAt(harmony, 0)).toBe(0)
  })

  it('resolves the last tick of the phrase to the final event', () => {
    const harmony = { identity: 'fixture', events: TONIC_EACH_BAR }
    const lastTick = 4 * TICKS_PER_BAR - 1
    expect(harmonyEventIndexAt(harmony, lastTick)).toBe(3)
  })

  it('crosses a bar boundary onto the next event exactly at the boundary tick', () => {
    const harmony = { identity: 'fixture', events: TONIC_EACH_BAR }
    expect(harmonyEventIndexAt(harmony, TICKS_PER_BAR - 1)).toBe(0)
    expect(harmonyEventIndexAt(harmony, TICKS_PER_BAR)).toBe(1)
  })

  it('resolves a mid-bar harmony change at the tick the new event begins', () => {
    const events: readonly HarmonyEvent[] = [chord(1, 0, 2), chord(5, 2, 2)]
    const harmony = { identity: 'fixture', events }
    const changeTick = 2 * TICKS_PER_BEAT
    expect(harmonyEventIndexAt(harmony, changeTick - 1)).toBe(0)
    expect(harmonyEventIndexAt(harmony, changeTick)).toBe(1)
  })

  it('throws for a tick no harmony event covers', () => {
    const events: readonly HarmonyEvent[] = [chord(1, 0, 4)]
    const harmony = { identity: 'fixture-uncovered', events }
    expect(() => harmonyEventIndexAt(harmony, 4 * TICKS_PER_BEAT)).toThrow(PitchPlannerInputError)
  })
})

// @test-link [[module_pitch_attack_timeline]]
describe('harmonyIdentityAtTick: stable identity at a tick', () => {
  it('derives identity from template id and bar/beat position, stable across ticks in the same event', () => {
    const harmony = { identity: 'fixture', events: TONIC_EACH_BAR }
    expect(harmonyIdentityAtTick(harmony, 0)).toBe(
      harmonyIdentityAtTick(harmony, TICKS_PER_BAR - 1),
    )
  })

  it('differs once the tick crosses into a different bar/beat event', () => {
    const harmony = { identity: 'fixture', events: TONIC_EACH_BAR }
    expect(harmonyIdentityAtTick(harmony, TICKS_PER_BAR - 1)).not.toBe(
      harmonyIdentityAtTick(harmony, TICKS_PER_BAR),
    )
  })

  it('matches for two distinct event objects sharing template id, bar, and beat (not object identity)', () => {
    const shared = chord(1, 0, 4)
    const duplicate: HarmonyEvent = { ...shared }
    const harmonyA = { identity: 'fixture-a', events: [shared] }
    const harmonyB = { identity: 'fixture-b', events: [duplicate] }
    expect(shared).not.toBe(duplicate)
    expect(harmonyIdentityAtTick(harmonyA, 0)).toBe(harmonyIdentityAtTick(harmonyB, 0))
  })

  it('throws for a tick no harmony event covers', () => {
    const events: readonly HarmonyEvent[] = [chord(1, 0, 4)]
    const harmony = { identity: 'fixture-uncovered', events }
    expect(() => harmonyIdentityAtTick(harmony, 4 * TICKS_PER_BEAT)).toThrow(PitchPlannerInputError)
  })
})
