/**
 * The single VexFlow rendering adapter: turns a ready-to-draw WrittenPhrase into one SVG staff
 * system, or (on a narrow landscape phone container) two, at a container-fitting scale, budgeted by
 * ../notation/notation-layout-policy.ts. It maps the written model 1:1 through ./vexflow-mapping.ts
 * and never re-decides music. Together with that file and ./vexflow-two-system-engraver.ts, this is
 * the only trio of files allowed to import 'vexflow'.
 */
import {
  Barline,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Voice,
  type RenderContext,
  type StaveTie,
} from 'vexflow/bravura'

import type { WrittenPhrase } from '../domain/notation/written-phrase-types'
import { NotationError } from './notation-error'
import { planSystemLayout } from './notation-layout-policy'
import {
  attachMeasureChordSymbols,
  buildMeasureBeams,
  buildPhraseTies,
  buildStaveNote,
  mapKeySpec,
  type FlatGlyph,
} from './vexflow-mapping'
import { drawTwoSystems } from './vexflow-two-system-engraver'

/** The engraved result: the SVG element plus the pixel geometry PhraseScore needs to report. */
export interface EngravedScore {
  readonly svg: SVGSVGElement
  readonly staffSpacePx: number
  readonly widthPx: number
  readonly heightPx: number
  readonly measureBoxes: readonly { readonly x: number; readonly width: number }[]
  /** Raw engraving units (scale 1) this phrase requires; the same value calibration reports on. */
  readonly requiredUnits: number
  /** Whether the phrase engraved as one staff system or fell back to the two-system phone layout. */
  readonly systemCount: 1 | 2
}

/**
 * Reserved raw engraving units beyond the four measures' minimum widths (barline, margins, and a
 * safety margin absorbing the small gap between Formatter.preCalculateMinTotalWidth's estimate and
 * the actual formatToStave layout width).
 */
const SYSTEM_PADDING_UNITS = 60

/** Vertical position, in raw engraving units, of the single stave's top line. */
const STAVE_TOP_Y_UNITS = 60

/** A generous placeholder height (raw units) used only until the real content bbox is known. */
const PLACEHOLDER_HEIGHT_UNITS = 220

/** Padding, in raw engraving units, added below the measured content bounding box. */
const BBOX_BOTTOM_PADDING_UNITS = 8

/** A wide scratch width (raw units) used only to measure the first stave's leading offset. */
const LEADING_SCRATCH_WIDTH_UNITS = 1000

/** Tolerance, in CSS pixels, for the measured bbox exceeding the container (sub-pixel rounding). */
const BOUNDS_EPSILON_PX = 1.5

/**
 * Wait for the Bravura (music glyphs) and Academico (text) faces bundled by 'vexflow/bravura' to
 * finish loading, so every subsequent width measurement and glyph draw uses the real font metrics
 * rather than a fallback system font.
 */
// @spec-link [[module_notation_layout_preflight]]
export async function ensureNotationFonts(): Promise<void> {
  await Promise.all([document.fonts.load('30px Bravura'), document.fonts.load('30px Academico')])
  await document.fonts.ready
  for (const family of ['Bravura', 'Academico'] as const) {
    if (!document.fonts.check(`30px ${family}`)) {
      throw new NotationError(
        'notation_font_unavailable',
        `The ${family} notation font is not available.`,
        {},
      )
    }
  }
}

/** Intent: build the four measures' StaveNote glyphs, with accidentals, dots and chord symbols attached. */
function buildMeasureGlyphs(phrase: WrittenPhrase): readonly (readonly StaveNote[])[] {
  return phrase.measures.map((measure) => {
    const glyphs = measure.events.map(buildStaveNote)
    attachMeasureChordSymbols(measure, glyphs)
    return glyphs
  })
}

/** Intent: build one strict 4/4 Voice per measure, populated with that measure's glyphs. */
function buildMeasureVoices(glyphs: readonly (readonly StaveNote[])[]): readonly Voice[] {
  return glyphs.map((measureGlyphs) => {
    const voice = new Voice({ numBeats: 4, beatValue: 4 }).setStrict(true)
    voice.addTickables([...measureGlyphs])
    return voice
  })
}

/** Intent: measure each measure's minimum content width (raw units) via a throwaway Formatter. */
function measureMinWidths(voices: readonly Voice[]): readonly [number, number, number, number] {
  const widths = voices.map((voice) =>
    new Formatter().joinVoices([voice]).preCalculateMinTotalWidth([voice]),
  )
  return [widths[0]!, widths[1]!, widths[2]!, widths[3]!]
}

/** Intent: measure the first stave's leading width (clef + key signature + time signature). */
function measureLeadingWidth(phrase: WrittenPhrase): number {
  const scratch = new Stave(0, 0, LEADING_SCRATCH_WIDTH_UNITS)
  scratch.addClef('treble')
  scratch.addKeySignature(
    phrase.key.signature.count === 0 ? 'C' : mapKeySpec(phrase.key.signature.ionianTonic),
  )
  scratch.addTimeSignature('4/4')
  return scratch.getNoteStartX()
}

/** Intent: build the four real Staves at their planned x positions, sharing one vertical band. */
function buildStaves(
  phrase: WrittenPhrase,
  leadingWidth: number,
  measureContentWidthUnits: number,
): readonly [Stave, Stave, Stave, Stave] {
  const widths = [
    leadingWidth + measureContentWidthUnits,
    measureContentWidthUnits,
    measureContentWidthUnits,
    measureContentWidthUnits + SYSTEM_PADDING_UNITS,
  ] as const

  let x = 0
  const staves = widths.map((width) => {
    const stave = new Stave(x, STAVE_TOP_Y_UNITS, width)
    x += width
    return stave
  })

  const first = staves[0]!
  first.addClef('treble')
  first.addKeySignature(
    phrase.key.signature.count === 0 ? 'C' : mapKeySpec(phrase.key.signature.ionianTonic),
  )
  first.addTimeSignature('4/4')
  staves[3]!.setEndBarType(Barline.type.END)

  return [staves[0]!, staves[1]!, staves[2]!, staves[3]!]
}

/** Intent: flatten every measure's glyphs and tieToNext flags in phrase order, for cross-measure ties. */
function flattenGlyphs(
  phrase: WrittenPhrase,
  glyphs: readonly (readonly StaveNote[])[],
): readonly FlatGlyph[] {
  return phrase.measures.flatMap((measure, measureIndex) =>
    measure.events.map((event, eventIndex) => ({
      glyph: glyphs[measureIndex]![eventIndex]!,
      tieToNext: event.kind === 'note' && event.tieToNext,
    })),
  )
}

/** Intent: turn any thrown value into a readable message, since a caught value need not be an Error. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Intent: draw all four measures of the one-system layout, each tagged with system index 0. */
function drawOneSystem(
  context: RenderContext,
  phrase: WrittenPhrase,
  staves: readonly [Stave, Stave, Stave, Stave],
  voices: readonly Voice[],
  glyphs: readonly (readonly StaveNote[])[],
  scale: number,
): readonly { readonly x: number; readonly width: number }[] {
  return staves.map((stave, index) => {
    // context.openGroup prefixes the class ('vf-measure-slot'); reset it to the documented,
    // VexFlow-version-independent public contract other code and tests select on.
    const group: SVGGElement = context.openGroup('measure-slot')
    group.setAttribute('class', 'measure-slot')
    group.setAttribute('data-measure-index', String(index))
    group.setAttribute('data-system-index', '0')
    stave.setContext(context).draw()
    const voice = voices[index]!
    new Formatter().joinVoices([voice]).formatToStave([voice], stave)
    voice.draw(context, stave)
    for (const beam of buildMeasureBeams(phrase.measures[index]!, glyphs[index]!)) {
      beam.setContext(context).draw()
    }
    context.closeGroup()
    return { x: stave.getX() * scale, width: stave.getWidth() * scale }
  })
}

/**
 * Draw the written phrase into `host` and report its engraved geometry. Split from
 * `engraveWrittenPhrase` so every unexpected throw during construction or drawing (VexFlow's own
 * `RuntimeError` included) is caught by that function's single wrapping try/catch, never partially
 * escaping as an untyped error.
 */
function drawWrittenPhrase(
  host: HTMLDivElement,
  phrase: WrittenPhrase,
  containerWidthPx: number,
  allowTwoSystems: boolean,
): EngravedScore {
  const glyphs = buildMeasureGlyphs(phrase)
  const voices = buildMeasureVoices(glyphs)
  const minWidths = measureMinWidths(voices)
  const leadingWidth = measureLeadingWidth(phrase)

  const plan = planSystemLayout({
    containerWidthPx,
    leadingWidth,
    measureMinWidths: minWidths,
    systemPadding: SYSTEM_PADDING_UNITS,
    allowTwoSystems,
  })

  const widthPx = plan.systemWidthUnits * plan.scale

  const renderer = new Renderer(host, Renderer.Backends.SVG)
  renderer.resize(widthPx, PLACEHOLDER_HEIGHT_UNITS * plan.systemCount * plan.scale)
  const context = renderer.getContext()
  context.scale(plan.scale, plan.scale)

  let measureBoxes: readonly { readonly x: number; readonly width: number }[]
  let ties: readonly StaveTie[]

  if (plan.systemCount === 1) {
    const staves = buildStaves(phrase, leadingWidth, plan.measureContentWidthUnits)
    measureBoxes = drawOneSystem(context, phrase, staves, voices, glyphs, plan.scale)
    ties = buildPhraseTies(flattenGlyphs(phrase, glyphs))
  } else {
    const twoSystems = drawTwoSystems(
      context,
      phrase,
      glyphs,
      voices,
      flattenGlyphs(phrase, glyphs),
      leadingWidth,
      plan.measureContentWidthUnits,
      SYSTEM_PADDING_UNITS,
      STAVE_TOP_Y_UNITS,
      plan.scale,
    )
    measureBoxes = twoSystems.measureBoxes
    ties = twoSystems.ties
  }

  for (const tie of ties) tie.setContext(context).draw()

  const svg = host.querySelector('svg')
  if (!svg) {
    throw new NotationError(
      'notation_container_unavailable',
      'VexFlow did not create an SVG root.',
      {
        containerWidthPx,
      },
    )
  }
  svg.setAttribute('role', 'img')
  svg.setAttribute('class', 'staff-svg')

  const bbox = svg.getBBox()
  const bboxLeftPx = bbox.x * plan.scale
  const bboxRightPx = (bbox.x + bbox.width) * plan.scale
  if (bboxLeftPx < -BOUNDS_EPSILON_PX || bboxRightPx > containerWidthPx + BOUNDS_EPSILON_PX) {
    throw new NotationError(
      'notation_bounds_exceeded',
      'Engraved notation overflows the container width.',
      {
        requiredWidthPx: bboxRightPx - bboxLeftPx,
        containerWidthPx,
      },
    )
  }

  // A chord symbol placed above the stave (ChordSymbol.VerticalJustify.TOP) can draw above y=0;
  // fold any such negative top into the viewBox's origin (rather than clipping it) by measuring
  // and setting the final size directly on the <svg>, never re-invoking VexFlow's own resize/scale
  // (which would re-derive the scale from itself and silently distort the already-drawn content).
  const minYUnits = Math.min(0, bbox.y)
  const heightUnits = bbox.y + bbox.height + BBOX_BOTTOM_PADDING_UNITS - minYUnits
  const heightPx = heightUnits * plan.scale

  svg.setAttribute('width', String(widthPx))
  svg.setAttribute('height', String(heightPx))
  svg.style.width = `${widthPx}px`
  svg.style.height = `${heightPx}px`
  svg.setAttribute('viewBox', `0 ${minYUnits} ${plan.systemWidthUnits} ${heightUnits}`)

  return {
    svg,
    staffSpacePx: plan.staffSpacePx,
    widthPx,
    heightPx,
    measureBoxes,
    requiredUnits: plan.requiredUnits,
    systemCount: plan.systemCount,
  }
}

/**
 * Engrave the written phrase as one staff system, or (when `allowTwoSystems` is true and one system
 * does not clear the legibility floor) two, into `target`: clears `target`, budgets the layout
 * against `containerWidthPx`, then draws staves, notes, chord symbols, beams and ties at the
 * resulting scale. Throws a typed NotationError instead of showing partial notation; any unexpected
 * non-NotationError throw (a VexFlow `RuntimeError`, for example) is wrapped as
 * `notation_engraving_failed` with the original error as `cause` rather than escaping untyped.
 */
// @spec-link [[module_notation_layout_preflight]]
export function engraveWrittenPhrase(
  target: HTMLElement,
  phrase: WrittenPhrase,
  containerWidthPx: number,
  allowTwoSystems: boolean,
): EngravedScore {
  target.replaceChildren()
  const host = document.createElement('div')
  target.appendChild(host)

  try {
    return drawWrittenPhrase(host, phrase, containerWidthPx, allowTwoSystems)
  } catch (error) {
    if (error instanceof NotationError) throw error
    target.replaceChildren()
    throw new NotationError(
      'notation_engraving_failed',
      `VexFlow engraving failed: ${errorMessage(error)}`,
      {},
      error,
    )
  }
}
