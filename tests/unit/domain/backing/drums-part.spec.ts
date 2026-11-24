/**
 * The Drums (foundation) part: one groove, the same in every measure of the phrase — kick on beats
 * 1 and 3, snare on beats 2 and 4, closed hi-hat on every eighth — each note an eighth long, at its
 * sound's velocity; never before the phrase's start nor after its end; deterministic.
 */

import { describe, expect, it } from 'vitest'

import {
  makeAccompanimentPart,
  type DrumSound,
  type PartNote,
} from '@/domain/backing/accompaniment-part'
import { drumsPart } from '@/domain/backing/drums-part'
import {
  addRational,
  compareRational,
  makeRational,
  subtractRational,
  type Rational,
} from '@/domain/time/rational'

/** A whole-note fraction. */
function r(numerator: number, denominator: number): Rational {
  return makeRational(numerator, denominator)
}

/** One expected drum note of the first measure: its eighth (0-7), sound and velocity. */
interface GrooveHit {
  readonly eighth: number
  readonly drum: DrumSound
  readonly velocity: number
}

/** The groove of one measure, in start order, kick or snare before the hi-hat at the same start. */
const GROOVE: readonly GrooveHit[] = [
  { eighth: 0, drum: 'kick', velocity: 100 },
  { eighth: 0, drum: 'closed-hi-hat', velocity: 70 },
  { eighth: 1, drum: 'closed-hi-hat', velocity: 50 },
  { eighth: 2, drum: 'snare', velocity: 90 },
  { eighth: 2, drum: 'closed-hi-hat', velocity: 70 },
  { eighth: 3, drum: 'closed-hi-hat', velocity: 50 },
  { eighth: 4, drum: 'kick', velocity: 100 },
  { eighth: 4, drum: 'closed-hi-hat', velocity: 70 },
  { eighth: 5, drum: 'closed-hi-hat', velocity: 50 },
  { eighth: 6, drum: 'snare', velocity: 90 },
  { eighth: 6, drum: 'closed-hi-hat', velocity: 70 },
  { eighth: 7, drum: 'closed-hi-hat', velocity: 50 },
]

/** A note as plain comparable data: start, length, drum sound and velocity. */
function plain(note: PartNote): unknown {
  return {
    start: note.start,
    duration: note.duration,
    sound: note.sound,
    velocity: note.velocity,
  }
}

/** The notes of measure `index` (0-3), shifted back to start from 0. */
function measureNotes(notes: readonly PartNote[], index: number): unknown[] {
  const measureStart = r(index, 1)
  const measureEnd = r(index + 1, 1)
  return notes
    .filter(
      (note) =>
        compareRational(note.start, measureStart) >= 0 &&
        compareRational(note.start, measureEnd) < 0,
    )
    .map((note) => plain({ ...note, start: subtractRational(note.start, measureStart) }))
}

describe('drumsPart', () => {
  // @test-link [[req_drum_part]]
  it('places twelve notes in each of the four measures, 48 in all', () => {
    expect(drumsPart()).toHaveLength(48)
  })

  // @test-link [[req_drum_part]]
  it('plays kick on beats 1 and 3, snare on 2 and 4, hi-hat on every eighth, each an eighth long', () => {
    const expected = GROOVE.map((hit) => ({
      start: r(hit.eighth, 8),
      duration: r(1, 8),
      sound: { kind: 'drum', drum: hit.drum },
      velocity: hit.velocity,
    }))
    expect(measureNotes(drumsPart(), 0)).toEqual(expected)
  })

  // @test-link [[req_drum_part]]
  it('plays the same groove at the same velocities in every measure', () => {
    const notes = drumsPart()
    const first = measureNotes(notes, 0)
    for (const index of [1, 2, 3]) expect(measureNotes(notes, index)).toEqual(first)
  })

  // @test-link [[req_drum_part]]
  it('never sounds before the phrase starts nor after it ends, so it never counts in', () => {
    for (const note of drumsPart()) {
      expect(compareRational(note.start, r(0, 1))).toBeGreaterThanOrEqual(0)
      expect(compareRational(addRational(note.start, note.duration), r(4, 1))).toBeLessThanOrEqual(
        0,
      )
    }
  })

  // @test-link [[req_drum_part]]
  it('gives only drum notes, in start order, a valid drums part', () => {
    const notes = drumsPart()
    expect(notes.every((note) => note.sound.kind === 'drum')).toBe(true)
    expect(makeAccompanimentPart('drums', notes).notes).toHaveLength(48)
  })

  // @test-link [[req_drum_part]]
  it('makes no random draw: two calls give equal notes', () => {
    expect(drumsPart()).toEqual(drumsPart())
  })
})
