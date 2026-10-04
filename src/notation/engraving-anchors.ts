/**
 * The time-axis anchors of an engraved system's measures: where each written event (note or rest)
 * starts and where each measure's closing barline sits, in CSS px relative to the system's own
 * SVG, the frame MeasureBox uses. They are read from the glyphs as the engraving library formatted
 * and drew them, so a view can place things on the score's own time axis; reading them changes
 * nothing that is drawn. No engraving library is imported here: a glyph only needs to report its
 * notehead's start in engraving units, which ./vexflow-engraver.ts passes in.
 */
import type { MeasureBox } from './vexflow-two-system-engraver'

/** One drawn measure's time-axis anchors, in CSS px relative to its own system's SVG (the frame MeasureBox uses). */
// @spec-link [[module_notation_engraving_anchors]]
export interface MeasureAnchors {
  /** The phrase measure, 0..3. */
  readonly measureIndex: number
  /** The system it is drawn in within the phrase. */
  readonly systemIndex: 0 | 1
  /**
   * One per phrase.measures[measureIndex].events entry, same order: notes and rests, tie
   * continuations included; each the inline start of its glyph's notehead (or rest glyph).
   */
  readonly eventStartsPx: readonly number[]
  /** This measure's closing barline (= its MeasureBox x + width). */
  readonly barlinePx: number
}

/**
 * A formatted glyph, as far as anchoring needs it: the inline start of its notehead (a rest's
 * glyph is drawn as its notehead), in the system's unscaled engraving units.
 */
export interface AnchorGlyph {
  getNoteHeadBeginX(): number
}

/** One drawn system within its phrase: its index and its phrase measures, in phrase order. */
export interface AnchoredSystem {
  readonly systemIndex: 0 | 1
  readonly measures: readonly number[]
}

/**
 * Intent: read the anchors of one drawn system's measures, in phrase order, from their formatted
 * glyphs (`glyphs[measureIndex][eventIndex]`, rests included) and their drawn boxes (one per
 * system measure, same order), scaling the glyphs' engraving units by the system's scale into the
 * boxes' CSS px frame. Reads only: it calls nothing that draws or formats, so the drawn SVG is the
 * same with or without it.
 */
// @spec-link [[module_notation_engraving_anchors]]
export function systemMeasureAnchors(
  glyphs: readonly (readonly AnchorGlyph[])[],
  { systemIndex, measures: measureIndices }: AnchoredSystem,
  boxes: readonly MeasureBox[],
  scale: number,
): readonly MeasureAnchors[] {
  if (boxes.length !== measureIndices.length) {
    throw new Error(`${measureIndices.length} measures were drawn but ${boxes.length} boxes given.`)
  }
  return measureIndices.map((measureIndex, index) => {
    const measureGlyphs = glyphs[measureIndex]
    if (measureGlyphs === undefined) throw new Error(`Measure ${measureIndex} has no glyphs.`)
    const box = boxes[index]!
    return {
      measureIndex,
      systemIndex,
      eventStartsPx: measureGlyphs.map((glyph) => glyph.getNoteHeadBeginX() * scale),
      barlinePx: box.x + box.width,
    }
  })
}
