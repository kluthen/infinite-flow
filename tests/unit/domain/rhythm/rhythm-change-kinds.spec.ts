import { describe, expect, it } from 'vitest'

import { RHYTHM_CHANGE_KINDS } from '@/domain/generation/request-rhythm-lock'
import {
  classifyMeasureChange,
  rhythmChangeBetween,
  type RhythmChangeKind,
} from '@/domain/rhythm/rhythm-change-kinds'
import type { BarIndex, RhythmBar } from '@/domain/rhythm/rhythm-types'

import { bar } from './rhythm-bar-fixture'

/** Intent: a four-measure phrase repeating one measure spec. */
function repeated(spec: string): readonly RhythmBar[] {
  return ([0, 1, 2, 3] as const).map((index) => bar(spec, index))
}

/** Intent: a copy of `base` with the given measures rewritten as `spec`. */
function rewrite(
  base: readonly RhythmBar[],
  measures: readonly BarIndex[],
  spec: string,
): readonly RhythmBar[] {
  return base.map((written, index) =>
    measures.includes(index as BarIndex) ? bar(spec, index as BarIndex, 'rewritten') : written,
  )
}

/** One hand-written example of each kind: the locked measure, the candidate and the edit. */
const KINDS: readonly {
  readonly kind: RhythmChangeKind
  readonly name: string
  readonly locked: string
  readonly candidate: string
  readonly tick: number
  readonly delta: number
}[] = [
  {
    kind: 'split_note',
    name: 'split',
    locked: 'n4 n4 n4 n4',
    candidate: 'n4 n2 n2 n4 n4',
    tick: 6,
    delta: 0,
  },
  {
    kind: 'merge_notes',
    name: 'merge',
    locked: 'n4 n2 n2 n4 n4',
    candidate: 'n4 n4 n4 n4',
    tick: 6,
    delta: 0,
  },
  {
    kind: 'note_rest',
    name: 'note to rest',
    locked: 'n4 n4 n4 n4',
    candidate: 'n4 r4 n4 n4',
    tick: 4,
    delta: 0,
  },
  {
    kind: 'note_rest',
    name: 'rest to note',
    locked: 'n4 r4 n4 n4',
    candidate: 'n4 n4 n4 n4',
    tick: 4,
    delta: 0,
  },
  {
    kind: 'move_note_start',
    name: 'dotting by an eighth',
    locked: 'n4 n4 n4 n4',
    candidate: 'n6 n2 n4 n4',
    tick: 4,
    delta: 2,
  },
  {
    kind: 'move_note_start',
    name: 'pulling by a sixteenth',
    locked: 'n4 n4 n4 n4',
    candidate: 'n3 n5 n4 n4',
    tick: 4,
    delta: -1,
  },
  {
    kind: 'move_rest',
    name: 'rest later by a sixteenth',
    locked: 'n2 r2 n4 n4 n4',
    candidate: 'n3 r2 n3 n4 n4',
    tick: 2,
    delta: 1,
  },
  {
    kind: 'move_rest',
    name: 'rest earlier by an eighth',
    locked: 'n6 r2 n4 n4',
    candidate: 'n4 r2 n6 n4',
    tick: 6,
    delta: -2,
  },
]

// @test-link [[rule_rhythm_change_kinds]]
describe('rhythm change kinds: in one measure', () => {
  it('the examples exercise every kind the request names, and no other', () => {
    const exercised = [...new Set(KINDS.map((example) => example.kind))].sort()
    expect(exercised).toEqual([...RHYTHM_CHANGE_KINDS].sort())
  })

  it.each(
    KINDS.flatMap((example) => ([0, 1, 2, 3] as const).map((measure) => ({ ...example, measure }))),
  )('$name in measure $measure is $kind', ({ kind, locked, candidate, tick, delta, measure }) => {
    const base = repeated(locked)
    expect(classifyMeasureChange(bar(locked), bar(candidate))).toEqual({
      type: 'edit',
      kind,
      tick,
      delta,
    })
    expect(rhythmChangeBetween(base, rewrite(base, [measure], candidate))).toEqual({
      kind,
      form: 'one_measure',
      measures: [measure],
      tick,
      delta,
    })
  })
})

// @test-link [[rule_rhythm_change_kinds]]
describe('rhythm change kinds: repeated in measures k and k+2', () => {
  it.each(KINDS.flatMap((example) => ([0, 1] as const).map((k) => ({ ...example, k }))))(
    '$name in measures $k and its answer is $kind, repeated',
    ({ kind, locked, candidate, tick, delta, k }) => {
      const base = repeated(locked)
      const answer = (k + 2) as BarIndex
      expect(rhythmChangeBetween(base, rewrite(base, [k, answer], candidate))).toEqual({
        kind,
        form: 'repeated',
        measures: [k, answer],
        tick,
        delta,
      })
    },
  )
})

// @test-link [[rule_rhythm_change_kinds]]
describe('rhythm change kinds: ties', () => {
  it('a tie inside the edited span does not stop the edit', () => {
    expect(classifyMeasureChange(bar('n4 n2 ~n2 n4 n4'), bar('n4 n2 n2 n4 n4'))).toEqual({
      type: 'edit',
      kind: 'split_note',
      tick: 6,
      delta: 0,
    })
  })

  it('bars equal as written are the same; equal starts written with other ties are a tie', () => {
    expect(classifyMeasureChange(bar('n4 n4 n8'), bar('n4 n4 n8', 0, 'other'))).toEqual({
      type: 'same',
    })
    expect(classifyMeasureChange(bar('n4 n4 n8'), bar('n4 n4 n4 ~n4'))).toEqual({ type: 'tie' })
  })
})

// @test-link [[rule_rhythm_change_kinds]]
describe('rhythm change kinds: pairs that are not one change', () => {
  const base = repeated('n4 n4 n4 n4')

  it('identical bars', () => {
    expect(rhythmChangeBetween(base, repeated('n4 n4 n4 n4'))).toBeUndefined()
  })

  it('a tie-only difference', () => {
    expect(rhythmChangeBetween(base, rewrite(base, [1], 'n4 n2 ~n2 n4 n4'))).toBeUndefined()
    expect(rhythmChangeBetween(base, rewrite(base, [1, 3], 'n4 n2 ~n2 n4 n4'))).toBeUndefined()
  })

  it('a kind plus a tie added elsewhere in the measure', () => {
    expect(classifyMeasureChange(bar('n4 n4 n4 n4'), bar('n4 r4 n2 ~n2 n4'))).toEqual({
      type: 'other',
    })
    expect(rhythmChangeBetween(base, rewrite(base, [0], 'n4 r4 n2 ~n2 n4'))).toBeUndefined()
  })

  it('a kind plus a tie added in another measure', () => {
    const candidate = rewrite(rewrite(base, [0], 'n4 r4 n4 n4'), [1], 'n4 n2 ~n2 n4 n4')
    expect(rhythmChangeBetween(base, candidate)).toBeUndefined()
  })

  it('two different edits, in one measure or in two', () => {
    expect(classifyMeasureChange(bar('n4 n4 n4 n4'), bar('n4 r4 n4 r4'))).toEqual({ type: 'other' })
    const candidate = rewrite(rewrite(base, [0], 'n4 r4 n4 n4'), [1], 'n4 n2 n2 n4 n4')
    expect(rhythmChangeBetween(base, candidate)).toBeUndefined()
  })

  it('the same edit in measures 1 and 2, which are not a gesture and its answer', () => {
    expect(rhythmChangeBetween(base, rewrite(base, [1, 2], 'n4 r4 n4 n4'))).toBeUndefined()
  })

  it('an edit in measure k and, in k+2, the same kind at another tick or another kind', () => {
    const otherTick = rewrite(rewrite(base, [0], 'n4 r4 n4 n4'), [2], 'n4 n4 r4 n4')
    expect(rhythmChangeBetween(base, otherTick)).toBeUndefined()
    const otherKind = rewrite(rewrite(base, [1], 'n4 r4 n4 n4'), [3], 'n4 n2 n2 n4 n4')
    expect(rhythmChangeBetween(base, otherKind)).toBeUndefined()
  })

  it('an edit in measure k and the same kind with another shift in k+2', () => {
    expect(classifyMeasureChange(bar('n4 n4 n4 n4'), bar('n5 n3 n4 n4'))).toEqual({
      type: 'edit',
      kind: 'move_note_start',
      tick: 4,
      delta: 1,
    })
    expect(classifyMeasureChange(bar('n4 n4 n4 n4'), bar('n6 n2 n4 n4'))).toEqual({
      type: 'edit',
      kind: 'move_note_start',
      tick: 4,
      delta: 2,
    })
    const otherShift = rewrite(rewrite(base, [0], 'n5 n3 n4 n4'), [2], 'n6 n2 n4 n4')
    expect(rhythmChangeBetween(base, otherShift)).toBeUndefined()
  })

  it('a note start moved by three sixteenths', () => {
    expect(classifyMeasureChange(bar('n4 n4 n4 n4'), bar('n7 n1 n4 n4'))).toEqual({ type: 'other' })
  })

  it('a note and the rest beside it trading places', () => {
    expect(classifyMeasureChange(bar('n4 n2 r2 n4 n4'), bar('n4 r2 n2 n4 n4'))).toEqual({
      type: 'other',
    })
  })

  it('a rest start moving alone, which moves the boundary between a note and a rest', () => {
    expect(classifyMeasureChange(bar('n4 n2 r2 n4 n4'), bar('n4 n3 r1 n4 n4'))).toEqual({
      type: 'other',
    })
  })

  it('a note start after a rest moving alone, which changes the rest length', () => {
    expect(classifyMeasureChange(bar('n4 r2 n2 n4 n4'), bar('n4 r3 n1 n4 n4'))).toEqual({
      type: 'other',
    })
  })

  it('a split whose new start lies inside a rest', () => {
    expect(classifyMeasureChange(bar('n4 r4 n8'), bar('n4 r2 n2 n8'))).toEqual({ type: 'other' })
  })

  it('rejects phrases that are not four measures', () => {
    expect(() => rhythmChangeBetween(base.slice(1), base.slice(1))).toThrow(/four/)
    expect(() => rhythmChangeBetween(base, base.slice(1))).toThrow(/four/)
  })
})
