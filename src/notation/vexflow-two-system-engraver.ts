/**
 * The two-system phone layout's VexFlow geometry: builds and draws the two lines of two staves
 * each (bars 1-2 on line one, bars 3-4 on line two, clef and key signature repeated on line two,
 * the 4/4 time signature only on line one) at aligned, equal-width measure columns, and assembles
 * the phrase's ties including the one that crosses the line break as two partial StaveTies. Draws
 * into a `RenderContext` already positioned by ./vexflow-engraver.ts, which owns the SVG root,
 * overall bounds checking and final sizing. Together with ./vexflow-mapping.ts and
 * ./vexflow-engraver.ts, this is the only trio of files allowed to import 'vexflow'.
 */
import {
  Barline,
  Formatter,
  Stave,
  Voice,
  type Beam,
  type RenderContext,
  type StaveTie,
} from 'vexflow/bravura'

import type { WrittenPhrase } from '../domain/notation/written-phrase-types'
import { buildPhraseTiesTwoSystem, mapKeySpec, type FlatGlyph } from './vexflow-mapping'

/** Vertical gap, in raw engraving units, between line one's content bottom and line two's stave top. */
export const NOTATION_INTER_SYSTEM_GAP_UNITS = 40

/** The geometry and ties the two-system draw produces, mirroring one system's measureBoxes shape. */
export interface TwoSystemDrawResult {
  readonly measureBoxes: readonly { readonly x: number; readonly width: number }[]
  readonly ties: readonly StaveTie[]
}

/** One drawn measure's scaled pixel box and the raw `g.measure-slot` element, for bbox measuring. */
interface DrawnMeasure {
  readonly box: { readonly x: number; readonly width: number }
  readonly group: SVGGElement
}

/**
 * Intent: draw one measure's stave, voice and (already-beamed) beams into a tagged `g.measure-slot`.
 * The beams are built and attached to their notes (via `Beam`'s own `note.setBeam()`) by the caller,
 * before any voice in the phrase is formatted or drawn, so a beamed note's flag is already suppressed
 * by the time `voice.draw` runs here.
 */
function drawMeasureGroup(
  context: RenderContext,
  stave: Stave,
  voice: Voice,
  measureBeams: readonly Beam[],
  phraseMeasureIndex: number,
  systemIndex: 0 | 1,
  scale: number,
): DrawnMeasure {
  const group: SVGGElement = context.openGroup('measure-slot')
  group.setAttribute('class', 'measure-slot')
  group.setAttribute('data-measure-index', String(phraseMeasureIndex))
  group.setAttribute('data-system-index', String(systemIndex))
  stave.setContext(context).draw()
  new Formatter().joinVoices([voice]).formatToStave([voice], stave)
  voice.draw(context, stave)
  for (const beam of measureBeams) {
    beam.setContext(context).draw()
  }
  context.closeGroup()
  return { box: { x: stave.getX() * scale, width: stave.getWidth() * scale }, group }
}

/** Intent: draw every stave of one system (line) in phrase order, tagging each with its system index. */
function drawSystemMeasures(
  context: RenderContext,
  staves: readonly [Stave, Stave],
  voices: readonly Voice[],
  beams: readonly (readonly Beam[])[],
  phraseMeasureIndices: readonly [number, number],
  systemIndex: 0 | 1,
  scale: number,
): {
  readonly boxes: readonly { readonly x: number; readonly width: number }[]
  readonly groups: readonly SVGGElement[]
} {
  const drawn = staves.map((stave, i) => {
    const phraseMeasureIndex = phraseMeasureIndices[i]!
    return drawMeasureGroup(
      context,
      stave,
      voices[phraseMeasureIndex]!,
      beams[phraseMeasureIndex]!,
      phraseMeasureIndex,
      systemIndex,
      scale,
    )
  })
  return { boxes: drawn.map((d) => d.box), groups: drawn.map((d) => d.group) }
}

/** Intent: the lowest point (raw units) any of the given measure-slot groups' content reaches. */
function groupsBottomUnits(groups: readonly SVGGElement[]): number {
  return Math.max(
    ...groups.map((group) => {
      const box = group.getBBox()
      return box.y + box.height
    }),
  )
}

/** Intent: build line one's two staves (bars 1-2), clef/key/time on the first, at the system top. */
function buildLine1Staves(
  phrase: WrittenPhrase,
  leadingWidth: number,
  measureContentWidthUnits: number,
  systemPaddingUnits: number,
  staveTopYUnits: number,
): readonly [Stave, Stave] {
  const leadWidth = leadingWidth + measureContentWidthUnits
  const tailWidth = measureContentWidthUnits + systemPaddingUnits

  const first = new Stave(0, staveTopYUnits, leadWidth)
  first.addClef('treble')
  first.addKeySignature(
    phrase.key.signature.count === 0 ? 'C' : mapKeySpec(phrase.key.signature.ionianTonic),
  )
  first.addTimeSignature('4/4')

  const second = new Stave(leadWidth, staveTopYUnits, tailWidth)

  return [first, second]
}

/**
 * Intent: build line two's two staves (bars 3-4), clef and key signature repeated but no time
 * signature, at widths and x positions mirroring line one so bar 3 aligns under bar 1 and bar 4
 * under bar 2, with notes forced to start at the same x as line one via `setNoteStartX`.
 */
function buildLine2Staves(
  line1: readonly [Stave, Stave],
  phrase: WrittenPhrase,
  line2TopYUnits: number,
): readonly [Stave, Stave] {
  const [line1First, line1Second] = line1

  const third = new Stave(line1First.getX(), line2TopYUnits, line1First.getWidth())
  third.addClef('treble')
  third.addKeySignature(
    phrase.key.signature.count === 0 ? 'C' : mapKeySpec(phrase.key.signature.ionianTonic),
  )
  third.setNoteStartX(line1First.getNoteStartX())

  const fourth = new Stave(line1Second.getX(), line2TopYUnits, line1Second.getWidth())
  fourth.setEndBarType(Barline.type.END)
  fourth.setNoteStartX(line1Second.getNoteStartX())

  return [third, fourth]
}

/**
 * Draw the phrase as two staff systems of two measures each into `context`: line one (bars 1-2,
 * full leading) at `staveTopYUnits`, line two (bars 3-4, clef/key repeated, no time signature)
 * positioned directly below line one's measured content bottom plus the named inter-system gap,
 * both lines sharing the same scale and equal, aligned measure-column widths. Returns the four
 * measures' scaled boxes in phrase order and every StaveTie the phrase requires, with the one tie
 * crossing the line break split into two partial ties.
 */
// @spec-link [[module_notation_layout_preflight]]
export function drawTwoSystems(
  context: RenderContext,
  phrase: WrittenPhrase,
  voices: readonly Voice[],
  beams: readonly (readonly Beam[])[],
  flatGlyphs: readonly FlatGlyph[],
  leadingWidth: number,
  measureContentWidthUnits: number,
  systemPaddingUnits: number,
  staveTopYUnits: number,
  scale: number,
): TwoSystemDrawResult {
  const line1 = buildLine1Staves(
    phrase,
    leadingWidth,
    measureContentWidthUnits,
    systemPaddingUnits,
    staveTopYUnits,
  )
  const system0 = drawSystemMeasures(context, line1, voices, beams, [0, 1], 0, scale)

  const line2TopYUnits = groupsBottomUnits(system0.groups) + NOTATION_INTER_SYSTEM_GAP_UNITS
  const line2 = buildLine2Staves(line1, phrase, line2TopYUnits)
  const system1 = drawSystemMeasures(context, line2, voices, beams, [2, 3], 1, scale)

  const lineBreakGlyphIndex = phrase.measures[0]!.events.length + phrase.measures[1]!.events.length
  const ties = buildPhraseTiesTwoSystem(flatGlyphs, lineBreakGlyphIndex)

  return { measureBoxes: [...system0.boxes, ...system1.boxes], ties }
}
