// @vitest-environment node
/**
 * The doodle quantizer: a capture's raw notes, on the audio clock, become one quantized doodle.
 * The very-short-note filter applies first; starts and ends snap to the nearest tick, a tie going
 * to the later tick, and a note keeps at least one tick; notes snapped before the grid origin
 * belong to the count-in and notes starting after the end to no doodle; the doodle starts at the
 * measure holding its first note and a note past its end is cut at its last barline; chords,
 * collisions and overlaps reduce to one line. The same notes, in any order, always give the same
 * doodle, and no floating-point operation follows the one conversion to microseconds.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import {
  doodleMeasureOf,
  quantizeDoodle,
  snappedTickOf,
  type DoodleCapture,
  type RawDoodleNote,
} from '@/jam/doodle-quantizer'

/** The grid origin of the captures below, in audio-clock seconds: tick 0, beat 1. */
const ORIGIN = 10

/** The capture tempo of the captures below: a tick (sixteenth note) lasts 125 ms. */
const TEMPO = 120

/** Intent: the audio-clock time of a grid tick (fractions allowed) at 120 BPM. */
function at(tick: number): number {
  return ORIGIN + tick * 0.125
}

/** Intent: a raw played note of `pitch` from `onsetAt` to `releaseAt`, in audio-clock seconds. */
function note(pitch: number, onsetAt: number, releaseAt: number): RawDoodleNote {
  return { pitch: makeConcertPitch(pitch), onsetAt, releaseAt }
}

/** Intent: a capture at 120 BPM from ORIGIN, ended at the barline that starts `endMeasure`. */
function capture(notes: readonly RawDoodleNote[], endMeasure: number): DoodleCapture {
  return { gridOriginAt: ORIGIN, tempoBpm: TEMPO, notes, endMeasure }
}

/** The quantizer's source file, read by the arithmetic test. */
const QUANTIZER_SOURCE = fileURLToPath(
  new URL('../../../src/jam/doodle-quantizer.ts', import.meta.url),
)

/** One operation found in the quantizer's source, and the named function it sits in. */
interface SourceOperation {
  readonly what: string
  readonly inFunction: string | undefined
}

/** What the arithmetic test looks for in the quantizer's source. */
interface SourceOperations {
  readonly functionNames: string[]
  readonly mathAccesses: SourceOperation[]
  readonly decimalLiterals: SourceOperation[]
  readonly numberConversions: SourceOperation[]
  readonly divisions: SourceOperation[]
}

/** Calls that turn a value into a float or a float into text. */
const NUMBER_CONVERSIONS = new Set(['parseFloat', 'Number', 'toFixed', 'toPrecision'])

/**
 * Intent: every Math access, decimal or exponent literal, number conversion and division in a
 * TypeScript source, each with the named function declaration it sits in.
 */
function operationsIn(sourceText: string): SourceOperations {
  const source = ts.createSourceFile('doodle-quantizer.ts', sourceText, ts.ScriptTarget.Latest)
  const found: SourceOperations = {
    functionNames: [],
    mathAccesses: [],
    decimalLiterals: [],
    numberConversions: [],
    divisions: [],
  }
  /** Intent: record what `node` holds, then walk its children inside the same function. */
  const visit = (node: ts.Node, inFunction: string | undefined): void => {
    let enclosing = inFunction
    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      enclosing = node.name.text
      found.functionNames.push(enclosing)
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Math'
    ) {
      found.mathAccesses.push({ what: node.name.text, inFunction: enclosing })
    }
    if (ts.isNumericLiteral(node) && /[.eE]/.test(node.getText(source))) {
      found.decimalLiterals.push({ what: node.getText(source), inFunction: enclosing })
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : undefined
      if (name !== undefined && NUMBER_CONVERSIONS.has(name)) {
        found.numberConversions.push({ what: name, inFunction: enclosing })
      }
    }
    if (
      ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.SlashToken ||
        node.operatorToken.kind === ts.SyntaxKind.SlashEqualsToken)
    ) {
      found.divisions.push({ what: node.operatorToken.getText(source), inFunction: enclosing })
    }
    ts.forEachChild(node, (child) => visit(child, enclosing))
  }
  visit(source, undefined)
  return found
}

/** Intent: the operations found outside the body of toMicroseconds. */
function outsideConversion(operations: readonly SourceOperation[]): SourceOperation[] {
  return operations.filter((operation) => operation.inFunction !== 'toMicroseconds')
}

// @test-link [[module_doodle_quantizer]]
// @test-link [[rule_doodle_capture_start]]
describe('the count-in boundary', () => {
  // @test-link [[module_doodle_quantizer]]
  // @test-link [[rule_doodle_capture_start]]
  it("makes a note played a little early onto beat 1 the doodle's first note", () => {
    const doodle = quantizeDoodle(capture([note(60, ORIGIN - 0.03, at(4))], 1))

    expect(doodle).toEqual({
      measureCount: 1,
      notes: [{ startTick: 0, lengthTicks: 4, pitch: 60 }],
    })
  })

  // @test-link [[module_doodle_quantizer]]
  // @test-link [[rule_doodle_capture_start]]
  it('drops a note that snaps before beat 1 as a count-in note, even held into the doodle', () => {
    const doodle = quantizeDoodle(
      capture([note(55, ORIGIN - 0.1, at(3)), note(60, at(2), at(6))], 1),
    )

    expect(doodle).toEqual({
      measureCount: 1,
      notes: [{ startTick: 2, lengthTicks: 4, pitch: 60 }],
    })
  })
})

// @test-link [[module_doodle_quantizer]]
// @test-link [[rule_doodle_quantized_to_sixteenths]]
describe('snapping to the tick', () => {
  // @test-link [[module_doodle_quantizer]]
  // @test-link [[rule_doodle_quantized_to_sixteenths]]
  it('snaps a time exactly halfway between two ticks to the later tick', () => {
    const grid = { gridOriginAt: 10, tempoBpm: 60 }

    expect(snappedTickOf(10.125, grid)).toBe(1)
    expect(snappedTickOf(9.875, grid)).toBe(0)
    expect(snappedTickOf(9.625, grid)).toBe(-1)
    expect(snappedTickOf(10.124, grid)).toBe(0)
    expect(snappedTickOf(10.25, grid)).toBe(1)
    expect(snappedTickOf(10.0625, { gridOriginAt: 10, tempoBpm: 120 })).toBe(1)
  })

  // @test-link [[module_doodle_quantizer]]
  // @test-link [[rule_doodle_quantized_to_sixteenths]]
  it('snaps starts and ends both, and a note shorter than a tick after snapping keeps one tick', () => {
    const doodle = quantizeDoodle(
      capture([note(60, at(1) + 0.05, at(3) - 0.04), note(62, at(5) + 0.02, at(5) + 0.06)], 1),
    )

    expect(doodle.notes).toEqual([
      { startTick: 1, lengthTicks: 2, pitch: 60 },
      { startTick: 5, lengthTicks: 1, pitch: 62 },
    ])
  })
})

// @test-link [[module_doodle_quantizer]]
// @test-link [[rule_doodle_is_one_line]]
describe('one line', () => {
  // @test-link [[module_doodle_quantizer]]
  // @test-link [[rule_doodle_is_one_line]]
  it('ends the earlier of two overlapping notes at the later start', () => {
    const doodle = quantizeDoodle(capture([note(64, at(4), at(12)), note(60, at(0), at(8))], 1))

    expect(doodle.notes).toEqual([
      { startTick: 0, lengthTicks: 4, pitch: 60 },
      { startTick: 4, lengthTicks: 8, pitch: 64 },
    ])
  })

  // @test-link [[module_doodle_quantizer]]
  // @test-link [[rule_doodle_is_one_line]]
  it('reduces notes struck together to one: the longer, then the higher', () => {
    const longerStays = quantizeDoodle(capture([note(60, at(0), at(8)), note(72, at(0), at(4))], 1))
    const higherStays = quantizeDoodle(
      capture(
        [note(60, at(0), at(4)), note(64, at(0) + 0.01, at(8)), note(67, at(0) - 0.01, at(8))],
        1,
      ),
    )

    expect(longerStays.notes).toEqual([{ startTick: 0, lengthTicks: 8, pitch: 60 }])
    expect(higherStays.notes).toEqual([{ startTick: 0, lengthTicks: 8, pitch: 67 }])
  })

  // @test-link [[module_doodle_quantizer]]
  // @test-link [[rule_doodle_is_one_line]]
  it('drops a quick grace note snapped onto the tick of a held note; on equal length the higher stays', () => {
    const graceNote = note(62, at(4) - 0.05, at(4))
    const heldNote = note(60, at(4) + 0.01, at(12))
    const equalLength = [note(60, at(2), at(3)), note(62, at(2) + 0.03, at(3) + 0.02)]

    expect(quantizeDoodle(capture([graceNote, heldNote], 1)).notes).toEqual([
      { startTick: 4, lengthTicks: 8, pitch: 60 },
    ])
    expect(quantizeDoodle(capture(equalLength, 1)).notes).toEqual([
      { startTick: 2, lengthTicks: 1, pitch: 62 },
    ])
    expect(
      quantizeDoodle(capture([note(60, at(2), at(3)), note(60, at(2), at(3))], 1)).notes,
    ).toEqual([{ startTick: 2, lengthTicks: 1, pitch: 60 }])
  })
})

// @test-link [[module_doodle_quantizer]]
// @test-link [[rule_doodle_capture_start]]
describe("the doodle's measures", () => {
  // @test-link [[module_doodle_quantizer]]
  // @test-link [[rule_doodle_capture_start]]
  it('starts the doodle at the measure holding its first note, rests included', () => {
    const doodle = quantizeDoodle(capture([note(60, at(20), at(24)), note(62, at(28), at(40))], 3))

    expect(doodle).toEqual({
      measureCount: 2,
      notes: [
        { startTick: 4, lengthTicks: 4, pitch: 60 },
        { startTick: 12, lengthTicks: 12, pitch: 62 },
      ],
    })
  })

  // @test-link [[module_doodle_quantizer]]
  // @test-link [[rule_doodle_capture_start]]
  it('cuts a note past the end at the last barline and leaves out a note starting after it', () => {
    const endBySilence = quantizeDoodle(
      capture([note(60, at(12), at(24)), note(62, at(16), at(18)), note(64, at(20), at(22))], 1),
    )
    const endByLength = quantizeDoodle(
      capture([note(60, at(0), at(4)), note(62, at(60), at(70))], 4),
    )

    expect(endBySilence).toEqual({
      measureCount: 1,
      notes: [{ startTick: 12, lengthTicks: 4, pitch: 60 }],
    })
    expect(endByLength).toEqual({
      measureCount: 4,
      notes: [
        { startTick: 0, lengthTicks: 4, pitch: 60 },
        { startTick: 60, lengthTicks: 4, pitch: 62 },
      ],
    })
  })
})

// @test-link [[module_doodle_quantizer]]
// @test-link [[rule_stray_notes_filtered_on_reading]]
describe('a very short note (under 38 ms)', () => {
  // @test-link [[module_doodle_quantizer]]
  // @test-link [[rule_stray_notes_filtered_on_reading]]
  it('never starts the doodle: it does not set the first measure', () => {
    const doodle = quantizeDoodle(
      capture([note(70, at(4), at(4) + 0.02), note(60, at(16), at(20))], 2),
    )

    expect(doodle).toEqual({
      measureCount: 1,
      notes: [{ startTick: 0, lengthTicks: 4, pitch: 60 }],
    })
  })

  // @test-link [[module_doodle_quantizer]]
  // @test-link [[rule_stray_notes_filtered_on_reading]]
  it('never extends the doodle: it adds no note after the last meant note', () => {
    const doodle = quantizeDoodle(
      capture([note(60, at(0), at(4)), note(72, at(10), at(10) + 0.03)], 1),
    )

    expect(doodle.notes).toEqual([{ startTick: 0, lengthTicks: 4, pitch: 60 }])
  })

  // @test-link [[module_doodle_quantizer]]
  // @test-link [[rule_stray_notes_filtered_on_reading]]
  it('never shapes the doodle: it neither cuts nor collides with a meant note', () => {
    const notCut = quantizeDoodle(
      capture([note(60, at(0), at(8)), note(72, at(4), at(4) + 0.02)], 1),
    )
    const noCollision = quantizeDoodle(
      capture([note(60, at(2), at(3)), note(72, at(2), at(2) + 0.02)], 1),
    )

    expect(notCut.notes).toEqual([{ startTick: 0, lengthTicks: 8, pitch: 60 }])
    expect(noCollision.notes).toEqual([{ startTick: 2, lengthTicks: 1, pitch: 60 }])
  })
})

// @test-link [[module_doodle_quantizer]]
// @test-link [[rule_doodle_capture_start]]
describe('doodleMeasureOf', () => {
  // @test-link [[module_doodle_quantizer]]
  // @test-link [[rule_doodle_capture_start]]
  it('gives the grid measure a snapped start falls in, count-in measures negative', () => {
    for (let tick = 0; tick < 16; tick += 1) expect(doodleMeasureOf(tick)).toBe(0)
    expect(doodleMeasureOf(16)).toBe(1)
    expect(doodleMeasureOf(31)).toBe(1)
    expect(doodleMeasureOf(32)).toBe(2)
    expect(doodleMeasureOf(-1)).toBe(-1)
    expect(doodleMeasureOf(-16)).toBe(-1)
    expect(doodleMeasureOf(-17)).toBe(-2)
  })

  // @test-link [[module_doodle_quantizer]]
  it('refuses a tick that is not a whole number', () => {
    expect(() => doodleMeasureOf(1.5)).toThrow(/integer tick/)
    expect(() => doodleMeasureOf(Number.NaN)).toThrow(/integer tick/)
  })
})

// @test-link [[module_doodle_quantizer]]
describe('determinism', () => {
  // @test-link [[module_doodle_quantizer]]
  it('quantizes a fixed list of raw notes, in any order, to the same doodle every time', () => {
    const notes = [
      note(55, ORIGIN - 0.2, ORIGIN - 0.05),
      note(60, ORIGIN - 0.02, at(3.4)),
      note(64, at(0.1), at(3.2)),
      note(62, at(3.7), at(3.8)),
      note(65, at(4), at(9.6)),
      note(67, at(6.2), at(6.2) + 0.01),
      note(69, at(8.4), at(14)),
      note(71, at(8.6), at(14)),
      note(72, at(13), at(21)),
      note(74, at(30), at(36)),
      note(76, at(33), at(34)),
    ]
    /** Intent: every third note, from `offset`, in input order. */
    const everyThird = (offset: number) => notes.filter((_, index) => index % 3 === offset)
    const shuffled = [...everyThird(2), ...everyThird(0), ...everyThird(1).reverse()]
    expect(shuffled).toHaveLength(notes.length)

    const first = quantizeDoodle(capture(notes, 2))
    expect(quantizeDoodle(capture(notes, 2))).toEqual(first)
    expect(quantizeDoodle(capture([...notes].reverse(), 2))).toEqual(first)
    expect(quantizeDoodle(capture(shuffled, 2))).toEqual(first)
    expect(first.measureCount).toBe(2)
    expect(first.notes.length).toBeGreaterThan(4)
  })
})

// @test-link [[module_doodle_quantizer]]
describe('refusals', () => {
  // @test-link [[module_doodle_quantizer]]
  it('refuses a capture left with no doodle note', () => {
    expect(() => quantizeDoodle(capture([], 1))).toThrow(/no doodle note/)
    expect(() => quantizeDoodle(capture([note(60, at(1), at(1) + 0.02)], 1))).toThrow(
      /no doodle note/,
    )
    expect(() => quantizeDoodle(capture([note(60, at(-3), at(2))], 1))).toThrow(/no doodle note/)
    expect(() => quantizeDoodle(capture([note(60, at(18), at(20))], 1))).toThrow(/no doodle note/)
  })

  // @test-link [[module_doodle_quantizer]]
  it('refuses an end that makes the doodle longer than four measures', () => {
    expect(() => quantizeDoodle(capture([note(60, at(0), at(4))], 5))).toThrow(/spans 5 measures/)
  })

  // @test-link [[module_doodle_quantizer]]
  it('refuses a tempo that is not a positive whole number of BPM', () => {
    const notes = [note(60, at(0), at(4))]
    for (const tempoBpm of [120.5, 0, -120, Number.NaN]) {
      expect(() => quantizeDoodle({ ...capture(notes, 1), tempoBpm })).toThrow(/tempo/)
      expect(() => snappedTickOf(10, { gridOriginAt: 10, tempoBpm })).toThrow(/tempo/)
    }
  })

  // @test-link [[module_doodle_quantizer]]
  it('refuses a note released before its onset, a time that is not finite and a fractional end', () => {
    expect(() => quantizeDoodle(capture([note(60, at(4), at(2))], 1))).toThrow(
      /releases before its onset/,
    )
    expect(() => quantizeDoodle(capture([note(60, Number.NaN, at(2))], 1))).toThrow(/finite/)
    expect(() => quantizeDoodle(capture([note(60, at(0), Number.POSITIVE_INFINITY)], 1))).toThrow(
      /finite/,
    )
    expect(() =>
      quantizeDoodle({ ...capture([note(60, at(0), at(2))], 1), gridOriginAt: Number.NaN }),
    ).toThrow(/finite/)
    expect(() => quantizeDoodle(capture([note(60, at(0), at(2))], 2.5))).toThrow(/endMeasure/)
  })
})

// @test-link [[module_doodle_quantizer]]
// @test-link [[rule_doodle_quantized_to_sixteenths]]
describe('the arithmetic', () => {
  // @test-link [[module_doodle_quantizer]]
  // @test-link [[rule_doodle_quantized_to_sixteenths]]
  it('has no floating-point operation after the one conversion to microseconds', () => {
    const operations = operationsIn(readFileSync(QUANTIZER_SOURCE, 'utf8'))

    expect(operations.functionNames).toContain('toMicroseconds')
    expect(operations.functionNames).toContain('floorDiv')
    expect(
      outsideConversion(operations.mathAccesses).filter(
        ({ what }) => what !== 'max' && what !== 'min',
      ),
    ).toEqual([])
    expect(operations.mathAccesses.filter(({ what }) => what === 'round')).toEqual([
      { what: 'round', inFunction: 'toMicroseconds' },
    ])
    expect(outsideConversion(operations.decimalLiterals)).toEqual([])
    expect(outsideConversion(operations.numberConversions)).toEqual([])
    expect(operations.divisions).toEqual([{ what: '/', inFunction: 'floorDiv' }])
  })
})
