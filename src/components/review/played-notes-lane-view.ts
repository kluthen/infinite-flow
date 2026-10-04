/**
 * What a Review phrase's played-notes lanes show, from its engraving and its record: one lane per
 * reserved system position, named for its phrase (and its bars in the split layout), holding a
 * divider at each barline between its measures and a bar per played note, both placed by
 * ./played-notes-lane-geometry.ts and moved by the system's inline offset into the lane's frame.
 * A lane without an engraving to draw against is blank. Every bar carries the same three style
 * values and nothing else, so no note is ever told apart from another.
 */
import {
  playedNotesLanes,
  type LaneMeasureAnchors,
  type PlayedNotesLanePhrase,
  type PlayedNotesLaneRecord,
  type PlayedNotesPitchScale,
} from './played-notes-lane-geometry'

/** What a phrase's lanes are drawn against, kept from its last successful engraving. */
// @spec-link [[module_review_played_notes_lane]]
export interface PlayedNotesLaneSource {
  /** The written phrase the engraver drew. */
  readonly phrase: PlayedNotesLanePhrase
  /** The engraving's measure anchors, in CSS px relative to each system's SVG. */
  readonly anchors: readonly LaneMeasureAnchors[]
  /** Each system's SVG inline start relative to its lane's inline start, in CSS px, top first. */
  readonly systemOffsetsPx: readonly number[]
}

/** One lane as the view draws it: its accessible name and its elements' inline styles. */
// @spec-link [[module_review_played_notes_lane]]
export interface PlayedNotesLaneView {
  readonly label: string
  readonly dividers: readonly Readonly<Record<string, string>>[]
  readonly bars: readonly Readonly<Record<string, string>>[]
}

/** The input of `playedNotesLaneViews`. */
export interface PlayedNotesLaneViewsInput {
  readonly phraseNumber: number
  readonly record: PlayedNotesLaneRecord
  readonly positionCount: 1 | 2
  /** Null while the phrase is not engraved (or released, or replaced by its note): blank lanes. */
  readonly source: PlayedNotesLaneSource | null
  /** The session-wide pitch scale; null only for a session without a played note. */
  readonly scale: PlayedNotesPitchScale | null
}

/**
 * Intent: the inline start of each system's SVG relative to the reserved position holding it,
 * which starts where its lane does (both span the review staff's content inline size).
 */
// @spec-link [[module_review_played_notes_lane]]
export function systemInlineOffsets(
  svgs: readonly SVGSVGElement[],
  hosts: readonly HTMLElement[],
): number[] {
  return svgs.map((svg, index) => {
    const host = hosts[index]
    if (host === undefined) throw new Error(`System ${index} has no reserved position.`)
    return svg.getBoundingClientRect().left - host.getBoundingClientRect().left
  })
}

/** Intent: "Played notes, phrase {n}", with "bars 1–2" or "bars 3–4" in the split layout. */
// @spec-link [[rule_review_played_notes_toggle]]
export function playedNotesLaneLabel(
  phraseNumber: number,
  positionIndex: number,
  positionCount: 1 | 2,
): string {
  const name = `Played notes, phrase ${phraseNumber}`
  if (positionCount === 1) return name
  return `${name}, bars ${positionIndex === 0 ? '1–2' : '3–4'}`
}

/**
 * Intent: one lane per reserved position, top first. Without a source every lane is blank; with
 * one, each lane gets its system's dividers and bars, shifted by that system's offset: a divider
 * sets its inline start only, a bar its inline start, inline size and `--played-note-pitch` only.
 */
// @spec-link [[module_review_played_notes_lane]]
// @spec-link [[rule_no_grading_or_mismatch_signal]]
export function playedNotesLaneViews(input: PlayedNotesLaneViewsInput): PlayedNotesLaneView[] {
  const { phraseNumber, record, positionCount, source, scale } = input
  const drawings = source === null ? [] : laneDrawings(record, source, scale)
  return Array.from({ length: positionCount }, (_, index) => {
    const label = playedNotesLaneLabel(phraseNumber, index, positionCount)
    const drawing = drawings.find((lane) => lane.systemIndex === index)
    if (source === null || drawing === undefined) return { label, dividers: [], bars: [] }
    const offset = source.systemOffsetsPx[index]
    if (offset === undefined) throw new Error(`System ${index} has no inline offset.`)
    return {
      label,
      dividers: drawing.dividersPx.map((px) => ({ insetInlineStart: `${offset + px}px` })),
      bars: drawing.bars.map((bar) => ({
        insetInlineStart: `${offset + bar.startPx}px`,
        inlineSize: `${bar.sizePx}px`,
        '--played-note-pitch': String(bar.pitch),
      })),
    }
  })
}

/** Intent: the geometry's lanes for an engraved phrase; a scale is required to draw any. */
function laneDrawings(
  record: PlayedNotesLaneRecord,
  source: PlayedNotesLaneSource,
  scale: PlayedNotesPitchScale | null,
) {
  if (scale === null) throw new Error('Played-notes lanes are drawn without a pitch scale.')
  return playedNotesLanes({ record, phrase: source.phrase, anchors: source.anchors, scale })
}
