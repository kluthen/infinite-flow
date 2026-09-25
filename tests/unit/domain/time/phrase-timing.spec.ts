import { describe, expect, it } from 'vitest'

import { WHOLE_NOTE, equalsRational, makeRational, sumRational } from '@/domain/time/rational'
import { BAR_START_TICKS, PHRASE_TICKS, TICKS_PER_BAR, sixteenthTicksOf } from '@/domain/time/ticks'

// @test-link [[entity_exact_musical_time]]
describe('four-measure phrase timing', () => {
  it('sums four 4/4 bars to exactly 4 whole notes using exact rational equality', () => {
    const bars = [WHOLE_NOTE, WHOLE_NOTE, WHOLE_NOTE, WHOLE_NOTE]

    const phraseTotal = sumRational(bars)

    expect(equalsRational(phraseTotal, makeRational(4, 1))).toBe(true)
  })

  it('agrees the derived tick view of the phrase total is the documented 64 ticks', () => {
    const phraseTotal = sumRational([WHOLE_NOTE, WHOLE_NOTE, WHOLE_NOTE, WHOLE_NOTE])

    expect(sixteenthTicksOf(phraseTotal)).toBe(PHRASE_TICKS)
  })

  it('agrees bar-start positions derive to the documented 0,16,32,48 ticks', () => {
    const barStarts = [0, 1, 2, 3].map((barIndex) => makeRational(barIndex, 1))

    const ticks = barStarts.map((position) => sixteenthTicksOf(position))

    expect(ticks).toStrictEqual([...BAR_START_TICKS])
    expect(TICKS_PER_BAR).toBe(16)
  })
})
