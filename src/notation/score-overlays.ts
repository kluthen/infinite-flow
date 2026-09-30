/**
 * Score overlays: the session's marks on the engraved score (the start marker over the starting
 * note, the playhead band behind the measure being played, the acknowledged notes lit), drawn
 * straight into the system SVGs the engraver produced, with no engraving library involved. Notes
 * are addressed by the identity keys the engraver wrote on their own parts (`data-note-id`), and
 * measures by their `g.measure-slot`, whose `data-band-*` attributes give the band's rectangle.
 * Applying a state first checks every note and measure it names and reads every position it needs,
 * then removes the previous state's marks, then draws the new ones, so a rejected state leaves the
 * score exactly as it was. No animation: every change is instant.
 */
import type { ExpectedNoteIdentity } from '../domain/acknowledgement/expected-note'
import type { MeasureIndex } from '../domain/events/measure'
import { NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE } from './notation-layout-policy'
import { noteIdentityKey } from './note-identity'

const SVG_NS = 'http://www.w3.org/2000/svg'
const SPACE = NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
/** The start marker, apex down: 1.2 staff spaces wide, 1 tall, half a space clear of the ink below. */
const MARKER_WIDTH_UNITS = 1.2 * SPACE
const MARKER_HEIGHT_UNITS = 1 * SPACE
const MARKER_CLEARANCE_UNITS = 0.5 * SPACE
/** The least gap under a chord symbol that holds the marker with half a space clear each side. */
const MARKER_UNDER_CHORD_GAP_UNITS = 2 * SPACE
/**
 * Glyph ink is measured on a canvas at this multiple of the text's own font size, then scaled
 * back: the canvas reports whole-pixel bounds, so this keeps them to a tenth of a unit.
 */
const TEXT_MEASURE_MAGNIFICATION = 10
const DRAWN_SHAPES = 'path, rect, line, polyline, polygon, circle, ellipse, text'

/**
 * What the session shows on the engraved score. Every field names a note by its identity or a
 * measure by its index; none carries a pitch, so no overlay can draw a note the phrase lacks.
 */
// @spec-link [[module_notation_note_identity_overlays]]
// @spec-link [[rule_no_grading_or_mismatch_signal]]
export interface ScoreOverlays {
  /** The note the start marker points at, or null for no marker. */
  readonly startMarker: ExpectedNoteIdentity | null
  /** The measure the playhead band lies behind, or null for no band. */
  readonly playheadMeasure: MeasureIndex | null
  /** The notes acknowledged so far, each lit on its own parts. */
  readonly acknowledged: readonly ExpectedNoteIdentity[]
}

/** The idle score: no start marker, no playhead band, nothing acknowledged. */
// @spec-link [[module_notation_note_identity_overlays]]
export const NO_SCORE_OVERLAYS: ScoreOverlays = Object.freeze({
  startMarker: null,
  playheadMeasure: null,
  acknowledged: Object.freeze([]),
})

/** Typed failure for an overlay state that names a note or measure the engraved phrase lacks. */
// @spec-link [[module_notation_note_identity_overlays]]
export class ScoreOverlayError extends Error {
  readonly kind = 'ScoreOverlayError' as const

  constructor(message: string) {
    super(message)
    this.name = 'ScoreOverlayError'
  }
}

/** A drawn extent in an SVG's own user units (y grows downward). */
interface InkBox {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

/** A rectangle to draw, and the system SVG it goes in. */
interface BandPlan {
  readonly svg: SVGSVGElement
  readonly attributes: readonly (readonly [string, string])[]
}

/** The start marker's outline, and the system SVG it goes in. */
interface MarkerPlan {
  readonly svg: SVGSVGElement
  readonly path: string
}

/** Intent: every element matching `selector` across the systems, in system then document order. */
function queryAll(svgs: readonly SVGSVGElement[], selector: string): Element[] {
  return svgs.flatMap((svg) => Array.from(svg.querySelectorAll(selector)))
}

/**
 * Intent: check an identity names an attack of the engraved phrase and return its key: its phrase
 * number is the score's, and some part carries its key. A rest, a tie continuation's own index or
 * an index past the measure's events carries none.
 */
function requireAttackKey(
  svgs: readonly SVGSVGElement[],
  phraseNumber: number,
  identity: ExpectedNoteIdentity,
  role: string,
): string {
  const key = noteIdentityKey(identity)
  if (identity.phraseNumber !== phraseNumber) {
    throw new ScoreOverlayError(
      `The ${role} names note ${key} of phrase ${identity.phraseNumber}, but the score shows phrase ${phraseNumber}.`,
    )
  }
  if (queryAll(svgs, `[data-note-id="${key}"]`).length === 0) {
    throw new ScoreOverlayError(
      `The ${role} names ${key}, which is no attack of the engraved phrase.`,
    )
  }
  return key
}

/** Intent: the first element matching `selector` under `root`, crashing if the engraving lacks it. */
function requireOne(root: Element, selector: string): Element {
  const element = root.querySelector(selector)
  if (element === null) throw new Error(`Engraved score has no "${selector}" where expected.`)
  return element
}

/** Intent: the nearest ancestor-or-self matching `selector`, crashing if the engraving lacks it. */
function requireClosest(element: Element, selector: string): Element {
  const found = element.closest(selector)
  if (found === null) throw new Error(`Engraved score part lies outside any "${selector}".`)
  return found
}

/**
 * Intent: the drawn ink of one glyph text, measured on a canvas in the text's own font, since an
 * SVG text's box is the font's whole line box, far taller than a music glyph. VexFlow draws every
 * text from its `x`/`y` baseline, anchored at the start.
 */
function textInk(text: SVGTextElement, canvas: CanvasRenderingContext2D): InkBox {
  const style = getComputedStyle(text)
  const x = Number(text.getAttribute('x'))
  const y = Number(text.getAttribute('y'))
  if (!Number.isFinite(x) || !Number.isFinite(y) || style.textAnchor !== 'start') {
    throw new Error('Engraved glyph text is not placed by a start-anchored x/y baseline.')
  }
  const magnified = parseFloat(style.fontSize) * TEXT_MEASURE_MAGNIFICATION
  canvas.font = `${style.fontStyle} ${style.fontWeight} ${magnified}px ${style.fontFamily}`
  const metrics = canvas.measureText(text.textContent ?? '')
  return {
    left: x - metrics.actualBoundingBoxLeft / TEXT_MEASURE_MAGNIFICATION,
    top: y - metrics.actualBoundingBoxAscent / TEXT_MEASURE_MAGNIFICATION,
    right: x + metrics.actualBoundingBoxRight / TEXT_MEASURE_MAGNIFICATION,
    bottom: y + metrics.actualBoundingBoxDescent / TEXT_MEASURE_MAGNIFICATION,
  }
}

/** Intent: the drawn extent of one shape: its geometry, widened by half its stroke if stroked. */
function shapeInk(shape: SVGGraphicsElement): InkBox {
  const box = shape.getBBox()
  const style = getComputedStyle(shape)
  const half = style.stroke === 'none' ? 0 : parseFloat(style.strokeWidth) / 2
  return {
    left: box.x - half,
    top: box.y - half,
    right: box.x + box.width + half,
    bottom: box.y + box.height + half,
  }
}

/** Intent: the union of drawn extents, or null for none. */
function union(boxes: readonly InkBox[]): InkBox | null {
  if (boxes.length === 0) return null
  return {
    left: Math.min(...boxes.map((box) => box.left)),
    top: Math.min(...boxes.map((box) => box.top)),
    right: Math.max(...boxes.map((box) => box.right)),
    bottom: Math.max(...boxes.map((box) => box.bottom)),
  }
}

/** Intent: the drawn ink of elements: every text and shape they are or hold, invisible ones aside. */
function inkOf(elements: readonly Element[], canvas: CanvasRenderingContext2D): InkBox | null {
  const shapes = elements.flatMap((element) =>
    element.matches(DRAWN_SHAPES) ? [element] : Array.from(element.querySelectorAll(DRAWN_SHAPES)),
  )
  return union(
    shapes
      .filter((shape) => shape.getAttribute('opacity') !== '0')
      .map((shape) =>
        shape instanceof SVGTextElement
          ? textInk(shape, canvas)
          : shapeInk(shape as SVGGraphicsElement),
      ),
  )
}

/**
 * Intent: the beam group over the attack's stem, or null if its stem is its own (an unbeamed note)
 * or it has none (a whole note). A beamed stem is drawn inside the beam's group, among the
 * measure's; should a tie continuation in the same measure also be beamed, the attack's stem is
 * the one nearest its notehead.
 */
function attackBeam(stavenote: Element, key: string, head: InkBox): Element | null {
  if (stavenote.querySelector(':scope > g.vf-stem') !== null) return null
  const slot = requireClosest(stavenote, 'g.measure-slot')
  const stems = Array.from(slot.querySelectorAll(`g.vf-beam > g.vf-stem[data-note-id="${key}"]`))
  const centre = (head.left + head.right) / 2
  const distance = (stem: Element): number => {
    const box = (stem as SVGGraphicsElement).getBBox()
    return Math.abs(box.x + box.width / 2 - centre)
  }
  const nearest = stems.sort((a, b) => distance(a) - distance(b))[0]
  return nearest === undefined ? null : requireClosest(nearest, 'g.vf-beam')
}

/**
 * Intent: place the start marker over an attack, from the ink drawn now. The reference edge is the
 * higher of the note's own ink (notehead, stem, flag, accidental, dot, its ledger lines, and the
 * beam group over its stem) and the staff's top line. The marker's lowest point, its apex, sits
 * half a space above that edge; over a chord symbol, only where the gap from that edge up to the
 * chord symbol's bottom is at least 2 spaces, and otherwise half a space above the chord symbol's
 * top. Centred on the notehead's ink. The chord symbol is never moved.
 */
// @spec-link [[rule_starting_note_named]]
// @spec-link [[module_notation_layout_preflight]]
function planStartMarker(
  svgs: readonly SVGSVGElement[],
  key: string,
  canvas: CanvasRenderingContext2D,
): MarkerPlan {
  // The attack's own glyph is the first drawn with its key; its tie continuations come after it.
  const notehead = queryAll(svgs, `[data-note-id="${key}"][data-note-part="notehead"]`)[0]
  if (notehead === undefined) throw new Error(`Note ${key} has parts but no notehead.`)
  const svg = requireClosest(notehead, 'svg') as SVGSVGElement
  const slot = requireClosest(notehead, 'g.measure-slot')
  const glyph = requireClosest(notehead, 'g.vf-stavenote')
  const head = inkOf([notehead], canvas)!
  const ownInk = [
    ...Array.from(glyph.querySelectorAll(`[data-note-id="${key}"]`)),
    // VexFlow draws a note's ledger lines as bare paths straight in its stavenote group.
    ...Array.from(glyph.querySelectorAll(':scope > path')),
  ]
  const beam = attackBeam(glyph, key, head)
  const noteInk = inkOf(beam === null ? ownInk : [...ownInk, beam], canvas)!
  // The stave group holds only the five staff lines, so the top of its box is the top line.
  const staffTop = (requireOne(slot, ':scope > g.vf-stave') as SVGGraphicsElement).getBBox().y
  const reference = Math.min(noteInk.top, staffTop)
  const chord = inkOf(Array.from(svg.querySelectorAll(`[data-chord-for="${key}"]`)), canvas)
  const fitsUnderChord = chord === null || reference - chord.bottom >= MARKER_UNDER_CHORD_GAP_UNITS
  const apex = (fitsUnderChord ? reference : chord.top) - MARKER_CLEARANCE_UNITS
  const base = apex - MARKER_HEIGHT_UNITS
  const centre = (head.left + head.right) / 2
  const half = MARKER_WIDTH_UNITS / 2
  return {
    svg,
    path: `M ${centre - half} ${base} L ${centre + half} ${base} L ${centre} ${apex} Z`,
  }
}

/**
 * Intent: the playhead band for a measure: the rectangle its `g.measure-slot` records, in that
 * measure's own system. A measure the score does not draw is the caller's error.
 */
function planBand(svgs: readonly SVGSVGElement[], measureIndex: MeasureIndex): BandPlan {
  const slots = queryAll(svgs, `g.measure-slot[data-measure-index="${measureIndex}"]`)
  if (slots.length === 0) {
    throw new ScoreOverlayError(
      `The playhead names measure ${measureIndex}, which the score lacks.`,
    )
  }
  if (slots.length > 1) throw new Error(`The score draws measure ${measureIndex} twice.`)
  const slot = slots[0]!
  const attributes = (['x', 'y', 'width', 'height'] as const).map((name) => {
    const value = slot.getAttribute(`data-band-${name}`)
    if (value === null || !Number.isFinite(Number(value))) {
      throw new Error(`Measure ${measureIndex} records no numeric band ${name}.`)
    }
    return [name, value] as const
  })
  return { svg: requireClosest(slot, 'svg') as SVGSVGElement, attributes }
}

/** Intent: remove every mark a previous state drew: the marker, the band and every note-ack class. */
function clearOverlays(svgs: readonly SVGSVGElement[]): void {
  for (const mark of queryAll(svgs, '.start-note-marker, .playhead-band')) mark.remove()
  for (const part of queryAll(svgs, '.note-ack')) {
    part.classList.remove('note-ack')
    // A part that had no class before it was lit gets its markup back exactly.
    if (part.classList.length === 0) part.removeAttribute('class')
  }
}

/** Intent: draw the band as the first child of its system, so it paints behind every glyph there. */
function drawBand(plan: BandPlan): void {
  const rect = document.createElementNS(SVG_NS, 'rect')
  rect.setAttribute('class', 'playhead-band')
  for (const [name, value] of plan.attributes) rect.setAttribute(name, value)
  plan.svg.insertBefore(rect, plan.svg.firstChild)
}

/** Intent: draw the marker last in its system, over every glyph. */
function drawMarker(plan: MarkerPlan): void {
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('class', 'start-note-marker')
  path.setAttribute('d', plan.path)
  plan.svg.appendChild(path)
}

/** Intent: a 2D canvas context to measure glyph ink with. */
function measuringCanvas(): CanvasRenderingContext2D {
  const context = document.createElement('canvas').getContext('2d')
  if (context === null) throw new Error('No 2D canvas to measure the engraved glyphs with.')
  return context
}

/**
 * Apply an overlay state to the engraved system SVGs of phrase `phraseNumber`, replacing whatever
 * state was applied before, so applying the same state twice gives the same score. Acknowledged
 * notes get `note-ack` on every part carrying their key, in every system, so a tie continuation
 * lights with its attack; nothing else changes. The playhead band is one `rect.playhead-band`
 * behind its measure's system. The start marker is placed from the ink drawn now, so the SVGs must
 * be rendered. Every note and measure named is checked first: one the engraved phrase lacks throws
 * ScoreOverlayError and leaves the score untouched.
 */
// @spec-link [[module_notation_note_identity_overlays]]
// @spec-link [[rule_acknowledgement_highlights_expected_note_only]]
export function applyScoreOverlays(
  svgs: readonly SVGSVGElement[],
  phraseNumber: number,
  overlays: ScoreOverlays,
): void {
  const litParts = overlays.acknowledged.flatMap((identity) => {
    const key = requireAttackKey(svgs, phraseNumber, identity, 'acknowledgement')
    return queryAll(svgs, `[data-note-id="${key}"]`)
  })
  const band = overlays.playheadMeasure === null ? null : planBand(svgs, overlays.playheadMeasure)
  const marker =
    overlays.startMarker === null
      ? null
      : planStartMarker(
          svgs,
          requireAttackKey(svgs, phraseNumber, overlays.startMarker, 'start marker'),
          measuringCanvas(),
        )

  clearOverlays(svgs)
  if (band !== null) drawBand(band)
  for (const part of litParts) part.classList.add('note-ack')
  if (marker !== null) drawMarker(marker)
}
