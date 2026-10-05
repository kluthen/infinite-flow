/**
 * The single VexFlow rendering adapter: turns a ready-to-draw WrittenPhrase into one SVG per staff
 * system position that shows notes, at the scale ./notation-layout-policy.ts plans: one system in
 * the top position from the tablet-landscape breakpoint up, or, below it, bars 1-2 in the top
 * position and bars 3-4 in the bottom one. It maps the written model 1:1 through
 * ./vexflow-mapping.ts and never re-decides music, then tags every note glyph's own parts with the
 * identity of the attack it sounds as (./note-identity.ts, ./note-part-tags.ts). A running session
 * draws one system part at a time instead, into the position its rolling display gives it, from
 * the same whole-phrase plan. It also runs the two pure pre-draw checks the idle workspace needs,
 * through the same planning code drawing uses and without touching the DOM: whether a phrase
 * fits, and whether the window has room for the staff with a given key signature at all. It also
 * re-exports the controller check's one-note engraving (./vexflow-check-note-engraver.ts), so that
 * ships in this same lazy chunk. Together with that file, ./vexflow-mapping.ts and
 * ./vexflow-two-system-engraver.ts, this is one of the only four files allowed to import 'vexflow'.
 */
import { Formatter, Stave, StaveNote, Voice, type Beam } from 'vexflow/bravura'

import type { ExpectedNoteIdentity } from '../domain/acknowledgement/expected-note'
import type { WrittenPhrase } from '../domain/notation/written-phrase-types'
import { systemMeasureAnchors, type MeasureAnchors } from './engraving-anchors'
import { NotationError } from './notation-error'
import { resolveGlyphIdentities } from './note-identity'
import { tagSystemNoteParts, type TaggedNoteGlyph } from './note-part-tags'
import {
  NOTATION_SYSTEM_POSITION_UNITS,
  planStaffPlacement,
  planStaffRoom,
  planSystemLayout,
  type StaffLayout,
  type StaffNoRoom,
  type StaffNotesTooWide,
  type StaffViewport,
  type SystemLayoutOutcome,
  type SystemLayoutPlan,
  type SystemPart,
} from './notation-layout-policy'
import type {
  StaffFitVerdict,
  StaffFixedParts,
  StaffKeySignature,
  StaffRoomVerdict,
} from './staff-fit-types'
import {
  attachMeasureChordSymbols,
  buildMeasureBeams,
  buildStaveNote,
  buildSystemTies,
  describeNoteParts,
  type FlatGlyph,
} from './vexflow-mapping'
import {
  addClefAndKey,
  assertSystemWidthBounds,
  buildSystemStaves,
  drawSystemMeasures,
  finishSystemSvg,
  openSystemSvg,
  type MeasureBox,
} from './vexflow-two-system-engraver'

export { engraveCheckNote } from './vexflow-check-note-engraver'

/** The engraved result: one SVG per system that shows notes, plus the geometry PhraseScore reports. */
export interface EngravedScore {
  /** The top system's SVG, then (split layout only) the bottom system's. */
  readonly svgs: readonly SVGSVGElement[]
  readonly staffSpacePx: number
  /** One system's SVG width, in CSS px: the container width. */
  readonly widthPx: number
  /** One system's SVG height, in CSS px: the system position's height at the phrase's own scale. */
  readonly heightPx: number
  /** Each reserved system position's block size, in CSS px, the same for every phrase. */
  readonly positionBlockPx: number
  /** The four measures' boxes in phrase order, each relative to its own system's SVG. */
  readonly measureBoxes: readonly MeasureBox[]
  /** Every drawn measure's event starts and closing barline, in phrase order, across its systems. */
  // @spec-link [[module_notation_engraving_anchors]]
  readonly measureAnchors: readonly MeasureAnchors[]
  /** Raw engraving units (scale 1) one system of this layout requires for this phrase. */
  readonly requiredUnits: number
  /** One staff system (four measures) or the split layout's two (two measures each). */
  readonly systemCount: 1 | 2
}

/** One system part's engraving: its SVG, and the geometry its whole phrase's plan gives it. */
export interface EngravedSystem extends Pick<
  EngravedScore,
  'staffSpacePx' | 'widthPx' | 'heightPx' | 'positionBlockPx' | 'requiredUnits' | 'measureAnchors'
> {
  readonly svg: SVGSVGElement
  /** This system's measures' boxes in phrase order, relative to its SVG. */
  readonly measureBoxes: readonly MeasureBox[]
}

/** Where each system draws: the top position's host, then the bottom position's. */
export type SystemTargets = readonly [HTMLElement, HTMLElement]

/**
 * Reserved raw engraving units beyond a system's measures' minimum widths (barline, margins, and a
 * safety margin absorbing the small gap between Formatter.preCalculateMinTotalWidth's estimate and
 * the actual formatToStave layout width).
 */
const SYSTEM_PADDING_UNITS = 60

/** A wide scratch width (raw units) used only to measure the first stave's leading offset. */
const LEADING_SCRATCH_WIDTH_UNITS = 1000

/** Each system part: the layout it belongs to, its stacking index in it and its phrase measures. */
const SYSTEM_PARTS: Readonly<
  Record<
    SystemPart,
    {
      readonly layout: StaffLayout
      readonly systemIndex: 0 | 1
      readonly measures: readonly number[]
    }
  >
> = {
  whole: { layout: 'one-system', systemIndex: 0, measures: [0, 1, 2, 3] },
  opening: { layout: 'split', systemIndex: 0, measures: [0, 1] },
  closing: { layout: 'split', systemIndex: 1, measures: [2, 3] },
}

/** The parts each layout draws, in the order its systems are stacked. */
const LAYOUT_PARTS: Readonly<Record<StaffLayout, readonly SystemPart[]>> = {
  'one-system': ['whole'],
  split: ['opening', 'closing'],
}

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

/**
 * Intent: build every measure's beams from the phrase's written beam groups. `new Beam(...)` calls
 * `note.setBeam()` on every grouped note, which is what suppresses that note's individual flag; this
 * must therefore run before the notes are formatted or drawn, not after. Each beam keeps the stem
 * direction its notes were built with (decided by the written phrase), never recomputing one.
 */
function buildPhraseBeams(
  phrase: WrittenPhrase,
  glyphs: readonly (readonly StaveNote[])[],
): readonly (readonly Beam[])[] {
  return phrase.measures.map((measure, index) => buildMeasureBeams(measure, glyphs[index]!))
}

/** Intent: measure each measure's minimum content width (raw units) via a throwaway Formatter. */
function measureMinWidths(voices: readonly Voice[]): readonly [number, number, number, number] {
  const widths = voices.map((voice) =>
    new Formatter().joinVoices([voice]).preCalculateMinTotalWidth([voice]),
  )
  return [widths[0]!, widths[1]!, widths[2]!, widths[3]!]
}

/**
 * Intent: measure the first stave's leading width (clef + key signature + time signature) for a
 * key signature, on a scratch stave built with the drawn staff's own helper.
 */
function measureLeadingWidth(signature: StaffKeySignature): number {
  const scratch = new Stave(0, 0, LEADING_SCRATCH_WIDTH_UNITS)
  addClefAndKey(scratch, signature)
  scratch.addTimeSignature('4/4')
  return scratch.getNoteStartX()
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

/** Every glyph's note identity, measure by measure, as resolveGlyphIdentities returns it. */
type GlyphIdentities = readonly (readonly (ExpectedNoteIdentity | null)[])[]

/**
 * Intent: pair each note glyph of one system's measures with where its parts were drawn and the
 * attack it sounds as; rests are left out, since they carry no identity.
 */
function systemNoteGlyphs(
  phrase: WrittenPhrase,
  glyphs: readonly (readonly StaveNote[])[],
  identities: GlyphIdentities,
  measureIndices: readonly number[],
): TaggedNoteGlyph[] {
  return measureIndices.flatMap((measureIndex) =>
    phrase.measures[measureIndex]!.events.flatMap((event, glyphIndex) => {
      if (event.kind === 'rest') return []
      const identity = identities[measureIndex]?.[glyphIndex]
      if (!identity) {
        throw new Error(`Note glyph ${glyphIndex} of measure ${measureIndex} has no identity.`)
      }
      const parts = describeNoteParts(glyphs[measureIndex]![glyphIndex]!)
      return [{ parts, identity, isAttack: !event.tieFromPrevious }]
    }),
  )
}

/** Intent: turn any thrown value into a readable message, since a caught value need not be an Error. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Intent: pass a typed NotationError through, and wrap any other thrown value (a VexFlow
 * `RuntimeError`, for example) as `notation_engraving_failed` with the original as `cause`.
 */
function asNotationError(error: unknown): NotationError {
  if (error instanceof NotationError) return error
  return new NotationError(
    'notation_engraving_failed',
    `VexFlow engraving failed: ${errorMessage(error)}`,
    {},
    error,
  )
}

/** One phrase's planning: its glyphs, beams and voices, its leading width and the planner's outcome. */
interface PhrasePlanning {
  readonly glyphs: readonly (readonly StaveNote[])[]
  readonly beams: readonly (readonly Beam[])[]
  readonly voices: readonly Voice[]
  readonly leadingWidth: number
  readonly outcome: SystemLayoutOutcome
}

/**
 * Intent: plan the phrase's layout: build its glyphs, beams and voices, measure its leading and
 * measure widths, and run the layout planner. The one planning path both drawing and the fit
 * check take, so they can never disagree; it draws nothing and touches no DOM.
 */
function planPhraseLayout(
  phrase: WrittenPhrase,
  containerWidthPx: number,
  viewport: StaffViewport,
): PhrasePlanning {
  const glyphs = buildMeasureGlyphs(phrase)
  // Beams must attach to their notes (note.setBeam) before those notes are measured, formatted or
  // drawn, so build them first and reuse the same instances throughout: measuring, formatting and
  // drawing all share these glyph objects, and constructing a second Beam over the same notes later
  // would just redo the same setBeam calls.
  const beams = buildPhraseBeams(phrase, glyphs)
  const voices = buildMeasureVoices(glyphs)
  const leadingWidth = measureLeadingWidth(phrase.key.signature)
  const outcome = planSystemLayout({
    containerWidthPx,
    leadingWidth,
    measureMinWidths: measureMinWidths(voices),
    systemPadding: SYSTEM_PADDING_UNITS,
    viewport,
  })
  return { glyphs, beams, voices, leadingWidth, outcome }
}

/** Intent: turn the planner's two layout failures into their distinct typed notation errors. */
function layoutFailureError(outcome: StaffNoRoom | StaffNotesTooWide): NotationError {
  if (outcome.kind === 'no_room') {
    return new NotationError(
      'notation_no_room',
      outcome.cause === 'too_short'
        ? 'The window is too short for the staff at the legibility floor.'
        : 'The window is too narrow for the staff at the legibility floor.',
      outcome.details,
    )
  }
  return new NotationError(
    'notation_notes_too_wide',
    "The phrase's notes need more width than the legibility floor allows.",
    outcome.details,
  )
}

/**
 * Intent: the half-open range, among the phrase's glyphs in phrase order, of the glyphs of the
 * given consecutive measures (the range a system's ties are built over).
 */
function glyphRange(phrase: WrittenPhrase, measures: readonly number[]): readonly [number, number] {
  const start = phrase.measures
    .slice(0, measures[0])
    .reduce((count, measure) => count + measure.events.length, 0)
  const end = measures.reduce(
    (count, index) => count + phrase.measures[index]!.events.length,
    start,
  )
  return [start, end]
}

/** One system to draw: the part of the phrase it shows and the host it draws into. */
interface SystemDraw {
  readonly part: SystemPart
  readonly host: HTMLElement
}

/** One drawn system: its finished SVG, its measures' boxes and their anchors. */
type DrawnSystem = Pick<EngravedSystem, 'svg' | 'measureBoxes' | 'measureAnchors'>

/**
 * Draw the chosen systems of the written phrase, each into its own host, from the whole phrase's
 * one plan, so every system shares its scale, its width and its measure columns whichever of them
 * are drawn: the split layout's closing system aligns to the opening system's staves (built, with
 * its time signature, whether drawn or not). Each system gets its staves, notes, chord symbols,
 * beams and its own ties, is bounds-checked, and has its note parts tagged with their attacks'
 * identities and its measures' playhead bands recorded. The callers' single wrapping try/catch
 * turns every unexpected throw (VexFlow's own `RuntimeError` included) into a typed error.
 */
// @spec-link [[module_notation_note_identity_overlays]]
function drawPhraseSystems(
  draws: readonly SystemDraw[],
  phrase: WrittenPhrase,
  identities: GlyphIdentities,
  containerWidthPx: number,
  viewport: StaffViewport,
): { readonly plan: SystemLayoutPlan; readonly systems: readonly DrawnSystem[] } {
  const { glyphs, beams, voices, leadingWidth, outcome } = planPhraseLayout(
    phrase,
    containerWidthPx,
    viewport,
  )
  if (outcome.kind !== 'fits') throw layoutFailureError(outcome)
  const plan = outcome.plan

  const flatGlyphs = flattenGlyphs(phrase, glyphs)
  const staveSpec = {
    measureCount: plan.measuresPerSystem,
    leadingWidth,
    measureContentWidthUnits: plan.measureContentWidthUnits,
    systemPaddingUnits: SYSTEM_PADDING_UNITS,
    staffTopLineUnits: planStaffPlacement(phrase.writtenRange).staffTopLineUnits,
  }
  const topStaves = buildSystemStaves(phrase, {
    ...staveSpec,
    withTimeSignature: true,
    endsPhrase: plan.layout === 'one-system',
  })

  const systems = draws.map(({ part, host }): DrawnSystem => {
    const { systemIndex, measures } = SYSTEM_PARTS[part]
    const staves =
      systemIndex === 0
        ? topStaves
        : buildSystemStaves(phrase, {
            ...staveSpec,
            withTimeSignature: false,
            endsPhrase: true,
            alignTo: topStaves,
          })
    const context = openSystemSvg(host, plan).getContext()
    const measureBoxes = drawSystemMeasures(
      context,
      staves,
      voices,
      beams,
      measures,
      systemIndex,
      plan.scale,
    )
    const [glyphStart, glyphEnd] = glyphRange(phrase, measures)
    for (const tie of buildSystemTies(flatGlyphs, glyphStart, glyphEnd)) {
      tie.setContext(context).draw()
    }

    const svg = finishSystemSvg(host, plan)
    assertSystemWidthBounds(svg, plan, containerWidthPx)
    tagSystemNoteParts(svg, systemNoteGlyphs(phrase, glyphs, identities, measures))
    // @spec-link [[module_notation_engraving_anchors]]
    const anchors = systemMeasureAnchors(glyphs, SYSTEM_PARTS[part], measureBoxes, plan.scale)
    return { svg, measureBoxes, measureAnchors: anchors }
  })
  return { plan, systems }
}

/** Intent: the geometry every system of a phrase shares, from the phrase's plan. */
function planGeometry(plan: SystemLayoutPlan): Omit<EngravedSystem, keyof DrawnSystem> {
  return {
    staffSpacePx: plan.staffSpacePx,
    widthPx: plan.systemWidthUnits * plan.scale,
    heightPx: NOTATION_SYSTEM_POSITION_UNITS * plan.scale,
    positionBlockPx: plan.positionBlockPx,
    requiredUnits: plan.requiredUnits,
  }
}

/**
 * Intent: clear the hosts, then draw into them; should drawing throw, clear them again rather than
 * leave partial notation, and rethrow it as a typed NotationError (`asNotationError`).
 */
function drawIntoClearedHosts<T>(hosts: readonly HTMLElement[], draw: () => T): T {
  for (const host of hosts) host.replaceChildren()
  try {
    return draw()
  } catch (error) {
    for (const host of hosts) host.replaceChildren()
    throw asNotationError(error)
  }
}

/**
 * Engrave the written phrase, as phrase number `phraseNumber` of its session, into its system
 * hosts, in the layout the viewport selects: clears both hosts, plans the layout against
 * `containerWidthPx` and the viewport, then draws each system's staves, notes, chord symbols,
 * beams and ties into its own host at the phrase's one scale (the bottom host stays empty in the
 * one-system layout), tags every note glyph's own parts with its attack's identity and records
 * each measure's playhead band. An invalid phrase number or a malformed tie is a caller error and
 * throws NoteIdentityError before anything is cleared. Otherwise throws a typed NotationError
 * instead of showing partial notation: `notation_no_room` or `notation_notes_too_wide` for the
 * layout's two failures, and any unexpected non-NotationError throw (a VexFlow `RuntimeError`,
 * for example) wrapped as `notation_engraving_failed` with the original error as `cause`.
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[module_notation_note_identity_overlays]]
export function engraveWrittenPhrase(
  targets: SystemTargets,
  phrase: WrittenPhrase,
  phraseNumber: number,
  containerWidthPx: number,
  viewport: StaffViewport,
): EngravedScore {
  const identities = resolveGlyphIdentities(phrase, phraseNumber)
  return drawIntoClearedHosts(targets, () => {
    const draws = LAYOUT_PARTS[viewport.layout].map((part, index) => ({
      part,
      host: targets[index]!,
    }))
    const { plan, systems } = drawPhraseSystems(
      draws,
      phrase,
      identities,
      containerWidthPx,
      viewport,
    )
    return {
      svgs: systems.map((system) => system.svg),
      ...planGeometry(plan),
      measureBoxes: systems.flatMap((system) => system.measureBoxes),
      measureAnchors: systems.flatMap((system) => system.measureAnchors),
      systemCount: plan.systemCount,
    }
  })
}

/**
 * Engrave one system part of the written phrase, as phrase number `phraseNumber` of its session,
 * into `host`: plans the whole phrase exactly as `engraveWrittenPhrase` does, so the split
 * layout's two halves drawn separately share one scale, one system width and aligned measure
 * columns, then draws only this part's system (its measures, its own ties, the time signature on
 * the opening half, the final barline on the last), tags its note parts with their attacks'
 * identities and records its measures' playhead bands; `data-system-index` stays the system's
 * index within the phrase. The part must belong to the viewport's layout (`whole` iff one
 * system): a mismatch is a caller error and throws before the host is touched, as an invalid
 * phrase number or a malformed tie does (NoteIdentityError). Otherwise fails exactly as
 * `engraveWrittenPhrase` does, leaving the host empty and throwing a typed NotationError.
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[module_session_rolling_display]]
// @spec-link [[module_notation_note_identity_overlays]]
export function engravePhraseSystem(
  host: HTMLElement,
  phrase: WrittenPhrase,
  phraseNumber: number,
  part: SystemPart,
  containerWidthPx: number,
  viewport: StaffViewport,
): EngravedSystem {
  if (SYSTEM_PARTS[part].layout !== viewport.layout) {
    throw new Error(`The ${part} system part is not drawn in the ${viewport.layout} layout.`)
  }
  const identities = resolveGlyphIdentities(phrase, phraseNumber)
  return drawIntoClearedHosts([host], () => {
    const { plan, systems } = drawPhraseSystems(
      [{ part, host }],
      phrase,
      identities,
      containerWidthPx,
      viewport,
    )
    return { ...systems[0]!, ...planGeometry(plan) }
  })
}

/**
 * Check, before drawing anything, whether the written phrase can be drawn at the legibility floor
 * with these layout inputs: the planning `engraveWrittenPhrase` runs, with no drawing and no DOM,
 * so the verdict always matches what drawing it would do. Returns `fits`, `no_room` with its cause
 * (the window, whatever the phrase) or `notes_too_wide` (this phrase). An unusable width throws
 * `notation_container_unavailable`, as the planner does; any unexpected non-NotationError throw is
 * wrapped as `notation_engraving_failed`.
 */
// @spec-link [[module_idle_fit_round]]
export function planWrittenPhraseFit(
  phrase: WrittenPhrase,
  containerWidthPx: number,
  viewport: StaffViewport,
): StaffFitVerdict {
  let outcome: SystemLayoutOutcome
  try {
    outcome = planPhraseLayout(phrase, containerWidthPx, viewport).outcome
  } catch (error) {
    throw asNotationError(error)
  }
  if (outcome.kind === 'no_room') return { kind: 'no_room', cause: outcome.cause }
  return { kind: outcome.kind }
}

/**
 * Measure the staff's fixed parts for a key signature, exactly as the drawn staff carries them:
 * the leading clef, key signature and 4/4 time signature, and the system padding, in engraving
 * units at scale 1. A running session judges its held layout's room with them. Any unexpected
 * non-NotationError throw is wrapped as `notation_engraving_failed`.
 */
// @spec-link [[rule_session_ends_when_staff_too_small]]
export function measureStaffFixedParts(signature: StaffKeySignature): StaffFixedParts {
  try {
    return { leadingWidth: measureLeadingWidth(signature), systemPadding: SYSTEM_PADDING_UNITS }
  } catch (error) {
    throw asNotationError(error)
  }
}

/**
 * Check, whatever the notes, whether the window has room for the staff with this key signature:
 * the leading clef, key signature and 4/4 time signature measured exactly as the drawn staff
 * carries them, then the planner's phrase-independent room check (the height, then the fixed
 * parts' width). Returns `room` or `no_room` with its cause. An unusable width throws
 * `notation_container_unavailable`; any unexpected non-NotationError throw is wrapped as
 * `notation_engraving_failed`.
 */
// @spec-link [[module_idle_fit_round]]
export function planStaffRoomForKey(
  signature: StaffKeySignature,
  containerWidthPx: number,
  viewport: StaffViewport,
): StaffRoomVerdict {
  try {
    const outcome = planStaffRoom({
      containerWidthPx,
      leadingWidth: measureLeadingWidth(signature),
      systemPadding: SYSTEM_PADDING_UNITS,
      viewport,
    })
    return outcome.kind === 'room' ? { kind: 'room' } : { kind: 'no_room', cause: outcome.cause }
  } catch (error) {
    throw asNotationError(error)
  }
}
