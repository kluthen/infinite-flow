/**
 * `buildStaveNote` in a clef: the glyph is given the instrument's clef, so VexFlow reads its key on
 * that clef's lines, and a rest takes its clef's own middle line (a whole rest the fourth line
 * from the bottom). VexFlow line numbers count staff lines from the bottom line (line 1) in half
 * steps: line 3 is the middle line, line 4 the fourth line.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type {
  NotatedDuration,
  SpelledPitch,
  WrittenNote,
  WrittenRest,
} from '@/domain/notation/written-phrase-types'
import { QUARTER_TICKS, TICKS_PER_BAR } from '@/domain/time/ticks'
import { buildStaveNote } from '@/notation/vexflow-mapping'

const QUARTER: NotatedDuration = { value: 'quarter', dots: 0, ticks: QUARTER_TICKS }
const WHOLE: NotatedDuration = { value: 'whole', dots: 0, ticks: TICKS_PER_BAR }

/** Intent: a written rest of `duration`. */
function rest(duration: NotatedDuration): WrittenRest {
  return { kind: 'rest', startTick: 0, duration, sourceEventIndex: 0 }
}

/** Intent: a written natural quarter note on `letter` in `octave`, its stem up. */
function note(letter: SpelledPitch['letter'], octave: number): WrittenNote {
  return {
    kind: 'note',
    startTick: 0,
    duration: QUARTER,
    pitch: { letter, alter: 0, octave },
    accidental: null,
    tieFromPrevious: false,
    tieToNext: false,
    sourceEventIndex: 0,
    stemDirection: 'up',
  }
}

/** Intent: the VexFlow key and staff line the glyph built for `event` in `clef` carries. */
function placed(event: WrittenNote | WrittenRest, clef: InstrumentClef) {
  const keyProps = buildStaveNote(event, clef).getKeyProps()[0]!
  return { key: `${keyProps.key.toLowerCase()}/${keyProps.octave}`, line: keyProps.line }
}

// jsdom has no canvas: VexFlow's text measuring (glyph widths, unused here) finds no context.
beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterAll(() => {
  vi.restoreAllMocks()
})

// @test-link [[module_notation_display_convention]]
describe("buildStaveNote: a rest on its clef's lines", () => {
  it('places a treble rest on B4, the middle line, and a whole rest on D5, the fourth line', () => {
    expect(placed(rest(QUARTER), 'treble')).toEqual({ key: 'b/4', line: 3 })
    expect(placed(rest(WHOLE), 'treble')).toEqual({ key: 'd/5', line: 4 })
  })

  it('places a bass rest on D3, the middle line, and a whole rest on F3, the fourth line', () => {
    expect(placed(rest(QUARTER), 'bass')).toEqual({ key: 'd/3', line: 3 })
    expect(placed(rest(WHOLE), 'bass')).toEqual({ key: 'f/3', line: 4 })
  })
})

// @test-link [[module_notation_display_convention]]
// @test-link [[rule_notation_display_preserves_phrase]]
describe("buildStaveNote: a note on its clef's lines", () => {
  it('gives the glyph the clef, so a written note keeps its key and moves only its line', () => {
    expect(placed(note('D', 3), 'bass')).toEqual({ key: 'd/3', line: 3 })
    expect(placed(note('D', 3), 'treble')).toEqual({ key: 'd/3', line: -3 })
    expect(placed(note('B', 4), 'treble')).toEqual({ key: 'b/4', line: 3 })
    expect(placed(note('A', 3), 'bass')).toEqual({ key: 'a/3', line: 5 })
    expect(placed(note('F', 5), 'treble')).toEqual({ key: 'f/5', line: 5 })
  })
})
