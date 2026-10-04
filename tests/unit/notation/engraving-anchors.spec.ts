import { describe, expect, it } from 'vitest'

import { systemMeasureAnchors, type AnchorGlyph } from '@/notation/engraving-anchors'

/** Intent: a formatted-glyph stand-in whose notehead starts at `x` engraving units. */
function glyphAt(x: number): AnchorGlyph {
  return { getNoteHeadBeginX: () => x }
}

/** Four measures' glyphs: a note and a rest, five notes, a tie continuation and a rest, a whole. */
const GLYPHS: readonly (readonly AnchorGlyph[])[] = [
  [glyphAt(120), glyphAt(200)],
  [glyphAt(310), glyphAt(340), glyphAt(360), glyphAt(380), glyphAt(400)],
  [glyphAt(100), glyphAt(150)],
  [glyphAt(310)],
]

// @test-link [[module_notation_engraving_anchors]]
describe('systemMeasureAnchors', () => {
  // @test-link [[module_notation_engraving_anchors]]
  it('reports each drawn measure in phrase order, one scaled start per event, closing at its box edge', () => {
    const anchors = systemMeasureAnchors(
      GLYPHS,
      { systemIndex: 0, measures: [0, 1] },
      [
        { x: 0, width: 600 },
        { x: 600, width: 400 },
      ],
      0.5,
    )
    expect(anchors).toEqual([
      { measureIndex: 0, systemIndex: 0, eventStartsPx: [60, 100], barlinePx: 600 },
      {
        measureIndex: 1,
        systemIndex: 0,
        eventStartsPx: [155, 170, 180, 190, 200],
        barlinePx: 1000,
      },
    ])
  })

  // @test-link [[module_notation_engraving_anchors]]
  it("names the split layout's bottom system for bars 3-4, rests and tie continuations included", () => {
    const anchors = systemMeasureAnchors(
      GLYPHS,
      { systemIndex: 1, measures: [2, 3] },
      [
        { x: 0, width: 300 },
        { x: 300, width: 250 },
      ],
      2,
    )
    expect(anchors.map((measure) => measure.measureIndex)).toEqual([2, 3])
    expect(anchors.map((measure) => measure.systemIndex)).toEqual([1, 1])
    expect(anchors.map((measure) => measure.eventStartsPx)).toEqual([[200, 300], [620]])
    expect(anchors.map((measure) => measure.barlinePx)).toEqual([300, 550])
  })

  // @test-link [[module_notation_engraving_anchors]]
  it('throws when the drawn boxes do not match the measures, or a measure has no glyphs', () => {
    expect(() =>
      systemMeasureAnchors(GLYPHS, { systemIndex: 0, measures: [0, 1] }, [{ x: 0, width: 1 }], 1),
    ).toThrow(/2 measures were drawn but 1 boxes given/u)
    expect(() =>
      systemMeasureAnchors(GLYPHS, { systemIndex: 0, measures: [4] }, [{ x: 0, width: 1 }], 1),
    ).toThrow(/Measure 4 has no glyphs/u)
  })
})
