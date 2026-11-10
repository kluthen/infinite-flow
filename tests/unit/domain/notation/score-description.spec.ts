import { describe, expect, it } from 'vitest'

import { deepFreeze } from '@/domain/events/deep-freeze'
import { spellWrittenKey } from '@/domain/notation/pitch-spelling'
import {
  describeDoodle,
  describeEmptySystem,
  describeWrittenPhrase,
} from '@/domain/notation/score-description'
import { noteStemDirection } from '@/domain/notation/stem-direction'
import {
  NotationInputError,
  type WrittenChordSymbol,
  type WrittenEvent,
  type WrittenKey,
  type WrittenMeasure,
  type WrittenNote,
  type WrittenPhrase,
  type WrittenRest,
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
    stemDirection: noteStemDirection({ letter, alter, octave }, 'treble'),
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
function phrase(
  overrides: Partial<Pick<WrittenPhrase, 'key' | 'measures' | 'clef'>> = {},
): WrittenPhrase {
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

  it('states treble clef for a treble-clef phrase, 4/4 time and four measures', () => {
    const result = describeWrittenPhrase(phrase())
    expect(result.summary).toContain('treble clef')
    expect(result.summary).toContain('4/4 time')
    expect(result.summary).toContain('four measures')
  })

  // @test-link [[module_notation_display_convention]]
  it('names bass clef for a bass-clef phrase', () => {
    const result = describeWrittenPhrase(phrase({ key: D_IONIAN_KEY, clef: 'bass' }))
    expect(result.summary).toBe(
      'Written notation, bass clef, key signature 2 sharps (D Ionian), 4/4 time, four measures.',
    )
  })
})

// @test-link [[rule_jam_idle_shows_no_phrase]]
describe("describeEmptySystem, the empty system's name", () => {
  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it('words it as a phrase summary naming no measures: treble clef, G Ionian, 1 sharp', () => {
    expect(describeEmptySystem('treble', spellWrittenKey(7, 'Ionian'))).toBe(
      'Empty staff, treble clef, key signature 1 sharp (G Ionian), 4/4 time.',
    )
  })

  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it('spells the key label with accidentals in words: bass clef, B flat Ionian, 2 flats', () => {
    expect(describeEmptySystem('bass', spellWrittenKey(10, 'Ionian'))).toBe(
      'Empty staff, bass clef, key signature 2 flats (B flat Ionian), 4/4 time.',
    )
  })

  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it('names no sharps or flats for a natural key, as the phrase summary does', () => {
    expect(describeEmptySystem('treble', C_IONIAN_KEY)).toBe(
      'Empty staff, treble clef, key signature no sharps or flats (C Ionian), 4/4 time.',
    )
  })
})

// @test-link [[rule_review_opens_with_doodle]]
describe("describeDoodle, the doodle's name in a Jam's review", () => {
  // @test-link [[rule_review_opens_with_doodle]]
  it("words it as a phrase summary, named for the doodle, with the doodle's own length", () => {
    const doodle = phrase({ key: spellWrittenKey(7, 'Ionian') })

    expect(describeDoodle(doodle, 2)).toBe(
      'Your doodle, treble clef, key signature 1 sharp (G Ionian), 4/4 time, two measures.',
    )
    expect(describeDoodle(doodle, 1)).toMatch(/, one measure\.$/u)
    expect(describeDoodle(doodle, 3)).toMatch(/, three measures\.$/u)
    expect(describeDoodle(doodle, 4)).toMatch(/, four measures\.$/u)
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it('names the clef and a key in words, as the phrase summary does', () => {
    expect(describeDoodle(phrase({ key: spellWrittenKey(10, 'Ionian'), clef: 'bass' }), 4)).toBe(
      'Your doodle, bass clef, key signature 2 flats (B flat Ionian), 4/4 time, four measures.',
    )
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it('refuses a length no doodle has', () => {
    for (const measureCount of [0, 5, 1.5]) {
      expect(() => describeDoodle(phrase(), measureCount)).toThrow(NotationInputError)
    }
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

  // @test-link [[rule_seventh_chord_symbols_spoken]]
  it.each([
    { symbol: 'Cmaj7', root: { letter: 'C', alter: 0 }, suffix: 'maj7', spoken: 'C major seventh' },
    { symbol: 'Dm7', root: { letter: 'D', alter: 0 }, suffix: 'm7', spoken: 'D minor seventh' },
    { symbol: 'G7', root: { letter: 'G', alter: 0 }, suffix: '7', spoken: 'G dominant seventh' },
    {
      symbol: 'Bm7♭5',
      root: { letter: 'B', alter: 0 },
      suffix: 'm7♭5',
      spoken: 'B half-diminished seventh',
    },
    {
      symbol: 'B♭maj7',
      root: { letter: 'B', alter: -1 },
      suffix: 'maj7',
      spoken: 'B flat major seventh',
    },
  ] as const)('speaks $symbol as "chord $spoken", its suffix read as one whole', (entry) => {
    const { root, suffix, spoken } = entry
    const measure0 = measure(0, [rest(0), rest(4), rest(8), rest(12)], [chord(0, root, suffix)])
    const p = phrase({
      measures: [measure0, phrase().measures[1], phrase().measures[2], phrase().measures[3]],
    })
    const result = describeWrittenPhrase(p)
    expect(result.measures[0]).toContain(`chord ${spoken};`)
    for (const text of result.measures) {
      for (const symbol of ['m7', 'maj7', '♭', ' flat five']) expect(text).not.toContain(symbol)
    }
  })

  // @test-link [[rule_seventh_chord_symbols_spoken]]
  it('refuses to speak a suffix that is neither a triad nor a seventh chord suffix', () => {
    const measure0 = measure(
      0,
      [rest(0), rest(4), rest(8), rest(12)],
      [chord(0, { letter: 'C', alter: 0 }, 'sus4')],
    )
    const p = phrase({
      measures: [measure0, phrase().measures[1], phrase().measures[2], phrase().measures[3]],
    })
    expect(() => describeWrittenPhrase(p)).toThrow(NotationInputError)
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
