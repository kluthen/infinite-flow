/**
 * The doodle as a Jam's review engraves it (master spec C5.15; ux `review-doodle`): the quantized
 * doodle, what the app heard, drawn by a phrase's rules in the written pitch of the session's
 * instrument, with the key signature of the written key and collection the Jam started with, in the
 * clef it was played in, 4/4, and no chord symbol. The doodle is laid out as a four-measure system
 * whose first measures are its own, so its measures take a phrase's measure width: its notes become
 * a four-measure written phrase whose measures after the doodle are whole rests, engraved as a
 * phrase is, and each system's drawing is then cut at the doodle's last barline, so the staff lines
 * end there and the rest of the system position stays blank. Its notes are never expected notes:
 * the note identities the engraver tags them with are removed. Part of Jam's code (src/jam/).
 */
import type { Collection, PitchClass } from '@/domain/controls/generation-controls'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { makeNoteEvent, makeRestEvent, type MeasureEvent } from '@/domain/events/measure-event'
import { makeMeasure, type Measure } from '@/domain/events/measure'
import { makeConcertEventTimeline } from '@/domain/events/timeline'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type {
  ConcertChordSymbol,
  InstrumentMidiRange,
  WrittenMeasure,
  WrittenPhrase,
} from '@/domain/notation/written-phrase-types'
import { deepFreeze } from '@/domain/events/deep-freeze'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type { InstrumentTransposition } from '@/domain/profile/instrument-profile'
import { makeRational } from '@/domain/time/rational'
import { TICKS_PER_BAR } from '@/domain/time/ticks'
import type { MeasureAnchors } from '@/notation/engraving-anchors'
import type { ReviewedPhrase } from '@/session/session-history'

const SVG_NS = 'http://www.w3.org/2000/svg'
const PHRASE_MEASURES = 4

/**
 * What the doodle is engraved in: the written key and collection the Jam started with, the
 * session's instrument (its transposition and concert range) and the clef the Jam was played in.
 */
// @spec-link [[rule_review_opens_with_doodle]]
export interface DoodleEngravingContext {
  readonly tonalCenter: PitchClass
  readonly collection: Collection
  readonly transposition: InstrumentTransposition
  readonly concertRange: InstrumentMidiRange
  readonly clef: InstrumentClef
}

/**
 * Intent: the context a Jam's doodle is engraved in, from the session's phrase 1, which the Jam
 * generated in the key and mode it started with, for its instrument, in its clef.
 */
// @spec-link [[rule_review_opens_with_doodle]]
export function doodleEngravingContext(
  phraseOne: Pick<ReviewedPhrase, 'intent' | 'clef'>,
): DoodleEngravingContext {
  const { intent, clef } = phraseOne
  return {
    tonalCenter: intent.writtenTonalCenter,
    collection: intent.controls.collection,
    transposition: intent.instrumentProfile.transposition,
    concertRange: intent.instrumentProfile.concertRange,
    clef,
  }
}

/** Intent: a span of whole ticks (sixteenth notes) as a fraction of a whole note. */
function tickDuration(ticks: number): ReturnType<typeof makeRational> {
  return makeRational(ticks, TICKS_PER_BAR)
}

/**
 * Intent: one measure of the four-measure timeline: the doodle's notes inside it (a note begun in
 * an earlier measure continues as a tie), rests in every gap; a whole rest after the doodle.
 */
function doodleMeasure(doodle: QuantizedDoodle, index: number): Measure {
  const start = index * TICKS_PER_BAR
  const end = start + TICKS_PER_BAR
  const events: MeasureEvent[] = []
  let cursor = start
  for (const note of doodle.notes) {
    const from = Math.max(note.startTick, start)
    const to = Math.min(note.startTick + note.lengthTicks, end)
    if (to <= from) continue
    if (from > cursor) events.push(makeRestEvent({ duration: tickDuration(from - cursor) }))
    events.push(
      makeNoteEvent({
        duration: tickDuration(to - from),
        pitch: note.pitch,
        tieContinuation: note.startTick < start,
      }),
    )
    cursor = to
  }
  if (cursor < end) events.push(makeRestEvent({ duration: tickDuration(end - cursor) }))
  return makeMeasure(index, events)
}

/** One placeholder chord per measure, which the transform requires and the doodle never shows. */
const PLACEHOLDER_CHORDS: readonly ConcertChordSymbol[] = [0, 1, 2, 3].map((measureIndex) => ({
  measureIndex: measureIndex as ConcertChordSymbol['measureIndex'],
  startTick: 0,
  root: 0,
  suffix: '',
  bass: null,
}))

/**
 * Intent: the doodle as a four-measure written phrase, spelled and notated exactly as a phrase in
 * the same key and collection is: its measures first, whole rests after them, and no chord symbol.
 * The chord symbols the transform asks for fall on each measure's first beat, where every measure
 * already starts a glyph, so they move no note; they are then dropped.
 */
// @spec-link [[rule_review_opens_with_doodle]]
export function doodleWrittenPhrase(
  doodle: QuantizedDoodle,
  context: DoodleEngravingContext,
): WrittenPhrase {
  const timeline = makeConcertEventTimeline(
    Array.from({ length: PHRASE_MEASURES }, (_, index) => doodleMeasure(doodle, index)),
  )
  const phrase = transformToWrittenPhrase({
    timeline,
    tonalContext: { tonalCenter: context.tonalCenter, collection: context.collection },
    chords: PLACEHOLDER_CHORDS,
    transposition: context.transposition,
    concertRange: context.concertRange,
    clef: context.clef,
  })
  const [first, second, third, fourth] = phrase.measures
  /** Intent: a written measure without its chord symbols. */
  const bare = (measure: WrittenMeasure): WrittenMeasure => ({ ...measure, chords: [] })
  return deepFreeze({ ...phrase, measures: [bare(first), bare(second), bare(third), bare(fourth)] })
}

/** Intent: the engraving's anchors of the doodle's own measures, the ones its lanes are drawn on. */
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
export function doodleMeasureAnchors<A extends Pick<MeasureAnchors, 'measureIndex'>>(
  anchors: readonly A[],
  measureCount: number,
): A[] {
  return anchors.filter((anchor) => anchor.measureIndex < measureCount)
}

/** Intent: the viewBox of an engraved system's SVG, in engraving units. */
function viewBoxOf(svg: SVGSVGElement): { readonly width: number; readonly height: number } {
  const [, , width, height] = (svg.getAttribute('viewBox') ?? '').split(/\s+/u).map(Number)
  if (width === undefined || height === undefined || !(width > 0) || !(height > 0)) {
    throw new Error("Doodle engraving: a system's SVG has no usable viewBox.")
  }
  return { width, height }
}

/**
 * Intent: cut one system's drawing at an inline position (CSS px from its SVG's start): everything
 * drawn is moved into a group clipped there, the clip reaching far above and below the staff so no
 * ink outside the system position is cut.
 */
function clipSystemAt(svg: SVGSVGElement, endPx: number, clipId: string): void {
  const box = viewBoxOf(svg)
  const widthPx = Number(svg.getAttribute('width'))
  if (!(widthPx > 0)) throw new Error("Doodle engraving: a system's SVG has no width.")
  const endUnits = (endPx * box.width) / widthPx
  const clipPath = document.createElementNS(SVG_NS, 'clipPath')
  clipPath.setAttribute('id', clipId)
  const rect = document.createElementNS(SVG_NS, 'rect')
  rect.setAttribute('x', String(-box.width))
  rect.setAttribute('y', String(-box.height))
  rect.setAttribute('width', String(box.width + endUnits))
  rect.setAttribute('height', String(box.height * 3))
  clipPath.append(rect)
  const defs = document.createElementNS(SVG_NS, 'defs')
  defs.append(clipPath)
  const drawing = document.createElementNS(SVG_NS, 'g')
  drawing.setAttribute('clip-path', `url(#${clipId})`)
  drawing.append(...Array.from(svg.childNodes))
  svg.append(defs, drawing)
}

let clips = 0

/**
 * Intent: end each drawn system of the doodle at the doodle's last barline in it, leaving one
 * `measure-slot` per doodle measure (the whole rests after it go), and remove the note identities
 * the engraver tagged its notes with (the doodle holds no expected note). A system
 * holding none of the doodle's measures is never reserved, so meeting one is a caller defect.
 */
// @spec-link [[rule_review_opens_with_doodle]]
export function cutSystemsAtDoodleEnd(
  svgs: readonly SVGSVGElement[],
  anchors: readonly MeasureAnchors[],
  measureCount: number,
): void {
  svgs.forEach((svg, systemIndex) => {
    const last = doodleMeasureAnchors(anchors, measureCount)
      .filter((anchor) => anchor.systemIndex === systemIndex)
      .at(-1)
    if (last === undefined) {
      throw new Error(`Doodle engraving: system ${systemIndex} holds none of the doodle.`)
    }
    clips += 1
    clipSystemAt(svg, last.barlinePx, `doodle-clip-${clips}`)
    for (const slot of svg.querySelectorAll('g.measure-slot[data-measure-index]')) {
      if (Number(slot.getAttribute('data-measure-index')) >= measureCount) slot.remove()
    }
    for (const tagged of svg.querySelectorAll('[data-note-id], [data-note-part]')) {
      tagged.removeAttribute('data-note-id')
      tagged.removeAttribute('data-note-part')
    }
  })
}
