import { describe, expect, it } from 'vitest'

import { deepFreeze } from '@/domain/events/deep-freeze'
import { describeWrittenPhrase } from '@/domain/notation/score-description'
import { noteStemDirection } from '@/domain/notation/stem-direction'
import type {
  WrittenChordSymbol,
  WrittenEvent,
  WrittenKey,
  WrittenMeasure,
  WrittenNote,
  WrittenPhrase,
  WrittenRest,
} from '@/domain/notation/written-phrase-types'

/** Intent: build a frozen quarter-note glyph at a given tick/pitch, with optional tie/accidental. */
function note(
  startTick: number,
  letter: WrittenNote['pitch']['letter'],
  alter: WrittenNote['pitch']['alter'],
  octave: number,
  overrides: Partial<Omit<WrittenNote, 'kind' | 'startTick' | 'pitch'>> = {},
): WrittenNote {
  return deepFreeze({
    kind: 'note',
    startTick,
    duration: { value: 'quarter', dots: 0, ticks: 4 },
    pitch: { letter, alter, octave },
    accidental: null,
    tieFromPrevious: false,
    tieToNext: false,
    sourceEventIndex: 0,
    stemDirection: noteStemDirection({ letter, alter, octave }),
    ...overrides,
  })
}

/** Intent: build a frozen rest glyph. */
function rest(
  startTick: number,
  overrides: Partial<Omit<WrittenRest, 'kind' | 'startTick'>> = {},
): WrittenRest {
  return deepFreeze({
    kind: 'rest',
    startTick,
    duration: { value: 'quarter', dots: 0, ticks: 4 },
    sourceEventIndex: 0,
    ...overrides,
  })
}

/** Intent: build a frozen chord symbol; `text` is unused by the description but required by type. */
function chord(
  startTick: number,
  root: WrittenChordSymbol['root'],
  suffix: string,
  bass: WrittenChordSymbol['bass'] = null,
): WrittenChordSymbol {
  return deepFreeze({ startTick, root, suffix, bass, text: `${root.letter}${suffix}` })
}

/** Intent: build a frozen written measure filling all four beats with the given events/chords. */
function measure(
  index: 0 | 1 | 2 | 3,
  events: readonly WrittenEvent[],
  chords: readonly WrittenChordSymbol[],
): WrittenMeasure {
  return deepFreeze({ index, events, beamGroups: [], chords })
}

const D_IONIAN_KEY: WrittenKey = deepFreeze({
  tonic: { letter: 'D', alter: 0 },
  collection: 'Ionian',
  label: 'D Ionian',
  scale: [],
  signature: {
    accidental: 'sharp',
    count: 2,
    letters: ['F', 'C'],
    ionianTonic: { letter: 'D', alter: 0 },
  },
})

const C_IONIAN_KEY: WrittenKey = deepFreeze({
  tonic: { letter: 'C', alter: 0 },
  collection: 'Ionian',
  label: 'C Ionian',
  scale: [],
  signature: { accidental: null, count: 0, letters: [], ionianTonic: { letter: 'C', alter: 0 } },
})

const F_AEOLIAN_1_FLAT_KEY: WrittenKey = deepFreeze({
  tonic: { letter: 'F', alter: 0 },
  collection: 'Aeolian',
  label: 'F Aeolian',
  scale: [],
  signature: {
    accidental: 'flat',
    count: 1,
    letters: ['B'],
    ionianTonic: { letter: 'A', alter: -1 },
  },
})

/** Intent: build a frozen four-measure written phrase; every measure defaults to four rests. */
function phrase(overrides: Partial<Pick<WrittenPhrase, 'key' | 'measures'>> = {}): WrittenPhrase {
  const defaultMeasures = [
    measure(0, [rest(0), rest(4), rest(8), rest(12)], [chord(0, { letter: 'C', alter: 0 }, '')]),
    measure(1, [rest(0), rest(4), rest(8), rest(12)], [chord(0, { letter: 'C', alter: 0 }, '')]),
    measure(2, [rest(0), rest(4), rest(8), rest(12)], [chord(0, { letter: 'C', alter: 0 }, '')]),
    measure(3, [rest(0), rest(4), rest(8), rest(12)], [chord(0, { letter: 'C', alter: 0 }, '')]),
  ] as const
  return deepFreeze({
    transposition: { chromatic: 0, diatonic: 0 },
    writtenRange: { minMidi: 48, maxMidi: 72 },
    clef: 'treble',
    timeSignature: { beats: 4, beatValue: 4 },
    key: C_IONIAN_KEY,
    measures: defaultMeasures,
    ...overrides,
  })
}

// @test-link [[module_notation_layout_preflight]]
describe('describeWrittenPhrase summary wording', () => {
  it('names 2 sharps and Ionian mode for a sharp key', () => {
    const result = describeWrittenPhrase(phrase({ key: D_IONIAN_KEY }))
    expect(result.summary).toBe(
      'Written notation, treble clef, key signature 2 sharps (D Ionian), 4/4 time, four measures.',
    )
  })

  it('names 1 flat (singular, no trailing s)', () => {
    const result = describeWrittenPhrase(phrase({ key: F_AEOLIAN_1_FLAT_KEY }))
    expect(result.summary).toContain('key signature 1 flat (F Aeolian)')
  })

  it('names no sharps or flats for a natural key', () => {
    const result = describeWrittenPhrase(phrase({ key: C_IONIAN_KEY }))
    expect(result.summary).toBe(
      'Written notation, treble clef, key signature no sharps or flats (C Ionian), 4/4 time, four measures.',
    )
  })

  it('always states treble clef and 4/4 time and four measures', () => {
    const result = describeWrittenPhrase(phrase())
    expect(result.summary).toContain('treble clef')
    expect(result.summary).toContain('4/4 time')
    expect(result.summary).toContain('four measures')
  })
})

// @test-link [[module_notation_layout_preflight]]
describe('describeWrittenPhrase measure wording', () => {
  it('produces exactly four measure strings', () => {
    const result = describeWrittenPhrase(phrase())
    expect(result.measures).toHaveLength(4)
  })

  it('announces the chord before its tick-0 event, then rests', () => {
    const p = phrase({
      measures: [
        measure(
          0,
          [rest(0), rest(4), rest(8), rest(12)],
          [chord(0, { letter: 'D', alter: 0 }, '')],
        ),
        measure(
          1,
          [rest(0), rest(4), rest(8), rest(12)],
          [chord(0, { letter: 'C', alter: 0 }, '')],
        ),
        measure(
          2,
          [rest(0), rest(4), rest(8), rest(12)],
          [chord(0, { letter: 'C', alter: 0 }, '')],
        ),
        measure(
          3,
          [rest(0), rest(4), rest(8), rest(12)],
          [chord(0, { letter: 'C', alter: 0 }, '')],
        ),
      ] as const,
    })
    const result = describeWrittenPhrase(p)
    expect(result.measures[0]).toBe(
      'Measure 1: chord D; rest quarter, rest quarter, rest quarter, rest quarter.',
    )
  })

  it('speaks notes with pitch, octave, duration, and a mid-measure chord change', () => {
    const measure0 = measure(
      0,
      [note(0, 'D', 0, 5), note(4, 'F', 1, 5, { tieToNext: true })],
      [chord(0, { letter: 'D', alter: 0 }, ''), chord(4, { letter: 'G', alter: 0 }, 'm')],
    )
    const p = phrase({
      measures: [measure0, phrase().measures[1], phrase().measures[2], phrase().measures[3]],
    })
    const result = describeWrittenPhrase(p)
    expect(result.measures[0]).toBe(
      'Measure 1: chord D; D 5 quarter; chord G minor; F sharp 5 quarter, tied to next.',
    )
  })

  it('speaks a slash chord as "over <bass>"', () => {
    const measure0 = measure(
      0,
      [rest(0), rest(4), rest(8), rest(12)],
      [chord(0, { letter: 'F', alter: 0 }, '', { letter: 'A', alter: 0 })],
    )
    const p = phrase({
      measures: [measure0, phrase().measures[1], phrase().measures[2], phrase().measures[3]],
    })
    const result = describeWrittenPhrase(p)
    expect(result.measures[0]).toContain('chord F over A;')
  })

  it('speaks dotted durations and a displayed natural sign', () => {
    const measure0 = measure(
      0,
      [
        note(0, 'C', 0, 4, {
          duration: { value: 'quarter', dots: 1, ticks: 6 },
          accidental: 'natural',
        }),
        note(6, 'D', 0, 4, { duration: { value: 'quarter', dots: 0, ticks: 4 } }),
        rest(10, { duration: { value: 'eighth', dots: 0, ticks: 2 } }),
        rest(12, { duration: { value: 'quarter', dots: 0, ticks: 4 } }),
      ],
      [chord(0, { letter: 'C', alter: 0 }, '')],
    )
    const p = phrase({
      measures: [measure0, phrase().measures[1], phrase().measures[2], phrase().measures[3]],
    })
    const result = describeWrittenPhrase(p)
    expect(result.measures[0]).toBe(
      'Measure 1: chord C; C natural 4 dotted quarter, D 4 quarter, rest eighth, rest quarter.',
    )
  })

  it('does not mutate its frozen input', () => {
    const input = phrase({ key: D_IONIAN_KEY })
    const before = JSON.parse(JSON.stringify(input))

    describeWrittenPhrase(input)

    expect(JSON.parse(JSON.stringify(input))).toEqual(before)
    expect(() => {
      ;(input as { key: unknown }).key = C_IONIAN_KEY
    }).toThrow()
  })
})
