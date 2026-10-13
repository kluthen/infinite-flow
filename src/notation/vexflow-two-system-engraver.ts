/**
 * The VexFlow geometry of one staff system: builds a system's staves (four measures in the
 * one-system layout; bars 1-2 or bars 3-4 in the split layout's two systems) at equal measure
 * widths, and draws one system's measures into its own SVG context. In the split layout the bottom
 * system repeats the clef and key signature but not the time signature, and its notes are forced
 * to start at the same x as the top system's, so bar 3 aligns under bar 1 and bar 4 under bar 2.
 * Each measure's group also records its playhead band rectangle. It also opens, sizes, finishes
 * and bounds-checks a system's SVG root. The caller, ./vexflow-engraver.ts, owns the planning,
 * which systems are drawn into which hosts, the ties and the note-identity tagging.
 * Together with ./vexflow-mapping.ts, ./vexflow-engraver.ts and ./vexflow-check-note-engraver.ts,
 * this is one of the only four files allowed to import 'vexflow'.
 */
import {
  Barline,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  type Beam,
  type RenderContext,
  type Voice,
} from 'vexflow/bravura'

import type { WrittenPhrase } from '../domain/notation/written-phrase-types'
import type { InstrumentClef } from '../domain/profile/instrument-clef'
import { NotationError } from './notation-error'
import type { SystemLayoutPlan } from './notation-layout-policy'
import type { StaffKeySignature } from './staff-fit-types'
import { mapKeySpec } from './vexflow-mapping'

/** One drawn measure's scaled pixel box, relative to its own system's SVG. */
export interface MeasureBox {
  readonly x: number
  readonly width: number
}

/** How to build one system's staves: its measure count and what its first stave carries. */
export interface SystemStaveSpec {
  readonly measureCount: 2 | 4
  /** Only the phrase's first system carries the 4/4 time signature. */
  readonly withTimeSignature: boolean
  /** Only the phrase's last system ends with the final barline. */
  readonly endsPhrase: boolean
  readonly leadingWidth: number
  readonly measureContentWidthUnits: number
  readonly systemPaddingUnits: number
  /** The staff's top line, in engraving units from the top of the system's SVG. */
  readonly staffTopLineUnits: number
  /**
   * The top system's staves, for the split layout's bottom system: each stave's notes start at
   * the same x as the stave above it, so the measure columns align although this system carries
   * no time signature.
   */
  readonly alignTo?: readonly Stave[]
}

/**
 * Intent: add the clef and key signature every system starts with: the instrument's clef, then the
 * key signature, whose accidentals VexFlow places on that clef's lines (it reads the stave's clef
 * when it formats them). The engraver's leading-width measurement (for a phrase's layout and for
 * the phrase-independent room check alike) uses the same helper, so the measured width always
 * matches the drawn staff.
 */
// @spec-link [[module_notation_display_convention]]
export function addClefAndKey(
  stave: Stave,
  clef: InstrumentClef,
  signature: StaffKeySignature,
): void {
  stave.addClef(clef)
  stave.addKeySignature(signature.count === 0 ? 'C' : mapKeySpec(signature.ionianTonic))
}

/**
 * Build one system's staves left to right: the first carries the leading width (clef, key
 * signature and, on the phrase's first system, the time signature) plus one measure's content
 * width, the middle ones one content width each, and the last one content width plus the system
 * padding. Every system of a phrase uses the same widths, so their measure columns line up.
 */
// @spec-link [[module_notation_layout_preflight]]
export function buildSystemStaves(phrase: WrittenPhrase, spec: SystemStaveSpec): readonly Stave[] {
  const widths = Array.from({ length: spec.measureCount }, (_, index) => {
    const leading = index === 0 ? spec.leadingWidth : 0
    const trailing = index === spec.measureCount - 1 ? spec.systemPaddingUnits : 0
    return leading + spec.measureContentWidthUnits + trailing
  })

  let x = 0
  const staves = widths.map((width) => {
    // No space above the top line, so the stave's y is the top line itself (VexFlow's default
    // keeps four spaces there); chord symbols and ledger lines still draw above it.
    const stave = new Stave(x, spec.staffTopLineUnits, width, { spaceAboveStaffLn: 0 })
    x += width
    return stave
  })

  const first = staves[0]!
  addClefAndKey(first, phrase.clef, phrase.key.signature)
  if (spec.withTimeSignature) first.addTimeSignature('4/4')
  if (spec.endsPhrase) staves[staves.length - 1]!.setEndBarType(Barline.type.END)
  if (spec.alignTo) {
    staves.forEach((stave, index) => stave.setNoteStartX(spec.alignTo![index]!.getNoteStartX()))
  }
  return staves
}

/** One drawn measure: its scaled box and the `g.measure-slot` group it was drawn into. */
interface DrawnMeasure {
  readonly box: MeasureBox
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
  // context.openGroup prefixes the class ('vf-measure-slot'); reset it to the documented,
  // VexFlow-version-independent public contract other code and tests select on.
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

/**
 * Intent: the vertical extent of one system's playhead band, in the SVG's user units: one staff
 * space beyond each outer staff line, pushed out to half a space past any notehead edge lying
 * further out (a notehead is one space tall, so that is one space from its centre), clamped to
 * the system position (`systemPositionUnits` tall). Taken over every measure of the system, so the
 * band keeps one height while it steps along the system.
 */
function systemBandSpan(
  staves: readonly Stave[],
  voices: readonly Voice[],
  systemPositionUnits: number,
): { readonly top: number; readonly bottom: number } {
  const stave = staves[0]!
  const space = stave.getSpacingBetweenLines()
  let top = stave.getYForLine(0) - space
  let bottom = stave.getYForLine(stave.getNumLines() - 1) + space
  for (const tickable of voices.flatMap((voice) => voice.getTickables())) {
    if (!(tickable instanceof StaveNote)) throw new Error('A measure voice holds a non-StaveNote.')
    if (tickable.isRest()) continue
    for (const y of tickable.getYs()) {
      top = Math.min(top, y - space)
      bottom = Math.max(bottom, y + space)
    }
  }
  return { top: Math.max(0, top), bottom: Math.min(systemPositionUnits, bottom) }
}

/**
 * Record each measure's playhead band rectangle on its `g.measure-slot`, as `data-band-x`,
 * `data-band-y`, `data-band-width` and `data-band-height` in the SVG's own user units:
 * horizontally from the opening barline (from where the notes start on the system's first
 * measure, after the clef, key and time signatures) to the closing barline; vertically the
 * system's one band span, inside its system position of `systemPositionUnits`.
 */
// @spec-link [[module_notation_note_identity_overlays]]
function recordPlayheadBands(
  groups: readonly SVGGElement[],
  staves: readonly Stave[],
  voices: readonly Voice[],
  systemPositionUnits: number,
): void {
  const { top, bottom } = systemBandSpan(staves, voices, systemPositionUnits)
  staves.forEach((stave, index) => {
    const left = index === 0 ? stave.getNoteStartX() : stave.getX()
    const group = groups[index]!
    group.setAttribute('data-band-x', String(left))
    group.setAttribute('data-band-y', String(top))
    group.setAttribute('data-band-width', String(stave.getX() + stave.getWidth() - left))
    group.setAttribute('data-band-height', String(bottom - top))
  })
}

/**
 * Draw one system's measures into its own context, in phrase order, each tagged with its phrase
 * measure index, the system's index (0 for the top system, 1 for the split layout's bottom one)
 * and its playhead band rectangle (inside the plan's system position), and return their scaled
 * boxes.
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[module_notation_note_identity_overlays]]
export function drawSystemMeasures(
  context: RenderContext,
  staves: readonly Stave[],
  voices: readonly Voice[],
  beams: readonly (readonly Beam[])[],
  phraseMeasureIndices: readonly number[],
  systemIndex: 0 | 1,
  plan: Pick<SystemLayoutPlan, 'scale' | 'systemPositionUnits'>,
): readonly MeasureBox[] {
  const systemVoices = phraseMeasureIndices.map((phraseMeasureIndex) => voices[phraseMeasureIndex]!)
  const drawn = staves.map((stave, index) =>
    drawMeasureGroup(
      context,
      stave,
      systemVoices[index]!,
      beams[phraseMeasureIndices[index]!]!,
      phraseMeasureIndices[index]!,
      systemIndex,
      plan.scale,
    ),
  )
  recordPlayheadBands(
    drawn.map((measure) => measure.group),
    staves,
    systemVoices,
    plan.systemPositionUnits,
  )
  return drawn.map((measure) => measure.box)
}

/** Tolerance, in CSS pixels, for drawn content touching the container's edges (sub-pixel rounding). */
const BOUNDS_EPSILON_PX = 1.5

/**
 * Intent: check one system's drawn content lies within the container's width. The height needs no
 * such check: the system position's height is the plan's shared size, and the staff is placed in
 * it for the phrase's instrument so that every written pitch that instrument reaches, stems, beams
 * and chord symbols included, stays inside (see planSystemPositionUnits and planStaffPlacement),
 * and an SVG box could not measure it anyway, since every music glyph is `<text>` whose box is the
 * font's whole line box rather than the glyph's ink.
 */
export function assertSystemWidthBounds(
  svg: SVGSVGElement,
  plan: SystemLayoutPlan,
  containerWidthPx: number,
): void {
  const bbox = svg.getBBox()
  const leftPx = bbox.x * plan.scale
  const rightPx = (bbox.x + bbox.width) * plan.scale
  if (leftPx < -BOUNDS_EPSILON_PX || rightPx > containerWidthPx + BOUNDS_EPSILON_PX) {
    throw new NotationError(
      'notation_bounds_exceeded',
      'Engraved notation overflows the container width.',
      { requiredWidthPx: rightPx - leftPx, containerWidthPx },
    )
  }
}

/** Intent: create one system's SVG in its host, sized to the container width and its position's height. */
export function openSystemSvg(host: HTMLElement, plan: SystemLayoutPlan): Renderer {
  const renderer = new Renderer(host as HTMLDivElement, Renderer.Backends.SVG)
  renderer.resize(plan.systemWidthUnits * plan.scale, plan.systemPositionUnits * plan.scale)
  renderer.getContext().scale(plan.scale, plan.scale)
  return renderer
}

/**
 * Intent: fix the finished SVG's size and viewBox directly on the element (never re-invoking
 * VexFlow's own resize/scale, which would re-derive the scale from itself and distort the drawn
 * content), and mark it with the documented class the stylesheet recolours and its image role.
 */
export function finishSystemSvg(host: HTMLElement, plan: SystemLayoutPlan): SVGSVGElement {
  const svg = host.querySelector('svg')
  if (!svg) {
    throw new NotationError(
      'notation_container_unavailable',
      'VexFlow did not create an SVG root.',
      {},
    )
  }
  const widthPx = plan.systemWidthUnits * plan.scale
  const heightPx = plan.systemPositionUnits * plan.scale
  svg.setAttribute('class', 'staff-svg')
  svg.setAttribute('role', 'img')
  svg.setAttribute('width', String(widthPx))
  svg.setAttribute('height', String(heightPx))
  svg.style.width = `${widthPx}px`
  svg.style.height = `${heightPx}px`
  // A block box, so no inline line box adds a descender gap under the SVG inside its position.
  svg.style.display = 'block'
  // An inline SVG clips at its viewBox by default. The position's height holds every calibrated
  // system with about a staff space to spare; should ink ever reach past it, it shows rather than
  // being cut off silently.
  svg.style.overflow = 'visible'
  svg.setAttribute('viewBox', `0 0 ${plan.systemWidthUnits} ${plan.systemPositionUnits}`)
  return svg
}
