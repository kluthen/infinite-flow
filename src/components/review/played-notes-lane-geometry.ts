/**
 * The Review's played-notes lane geometry, free of Vue and the DOM: it places a phrase's played
 * notes on the engraved score's own time axis and on a session-wide pitch scale. A played time is a
 * beat of the phrase (0 to 16, four 4/4 measures); a beat maps to an inline position through the
 * engraving's anchors (every written note and rest, and each measure's closing barline), linearly
 * between consecutive anchors, with the gap from a barline to the next measure's first note taking
 * no time. Nothing is snapped or quantized. Each lane (one per system of the layout) gets its note
 * bars, cut at its range's ends, and its dividers (the barlines between its measures). A bar holds
 * only its inline start, inline size and pitch fraction: nothing tells one note from another.
 */

import type { SessionHistoryRecord } from '@/session/session-history'

const BEATS_PER_MEASURE = 4
const TICKS_PER_BEAT = 4
const TICKS_PER_MEASURE = BEATS_PER_MEASURE * TICKS_PER_BEAT
const SECONDS_PER_MINUTE = 60
const MIN_PITCH_SPAN = 12

/** Typed failure for lane input that cannot be placed: bad anchors, phrase, record or scale. */
// @spec-link [[module_review_played_notes_lane]]
export class PlayedNotesLaneError extends Error {
  readonly kind = 'PlayedNotesLaneError' as const

  constructor(message: string) {
    super(message)
    this.name = 'PlayedNotesLaneError'
  }
}

/** One drawn measure's anchors, in CSS px relative to its system's SVG. */
// @spec-link [[module_review_played_notes_lane]]
export interface LaneMeasureAnchors {
  readonly measureIndex: number
  readonly systemIndex: 0 | 1
  /** One per written event (notes and rests) of the measure, in order. */
  readonly eventStartsPx: readonly number[]
  /** The measure's closing barline. */
  readonly barlinePx: number
}

/** The written phrase as the lane reads it: measure-relative sixteenth-tick event starts. */
// @spec-link [[module_review_played_notes_lane]]
export interface PlayedNotesLanePhrase {
  readonly measures: readonly { readonly events: readonly { readonly startTick: number }[] }[]
}

/** What the lane reads of a session history record. */
// @spec-link [[module_review_played_notes_lane]]
export type PlayedNotesLaneRecord = Pick<
  SessionHistoryRecord,
  'startedAt' | 'tempo' | 'playedNotes'
>

/** The session-wide pitch scale, in MIDI numbers: `high - low` is at least 12. */
// @spec-link [[module_review_played_notes_lane]]
export interface PlayedNotesPitchScale {
  readonly low: number
  readonly high: number
}

/** One played note's bar in a lane: inline start and size in CSS px, pitch fraction 0 to 1. */
// @spec-link [[module_review_played_notes_lane]]
// @spec-link [[rule_no_grading_or_mismatch_signal]]
export interface PlayedNoteBar {
  readonly startPx: number
  readonly sizePx: number
  readonly pitch: number
}

/** One system's lane: the dividers between its measures and its played notes' bars. */
// @spec-link [[module_review_played_notes_lane]]
export interface PlayedNotesLaneDrawing {
  readonly systemIndex: 0 | 1
  readonly dividersPx: readonly number[]
  readonly bars: readonly PlayedNoteBar[]
}

/** The input of `playedNotesLanes`. */
// @spec-link [[module_review_played_notes_lane]]
export interface PlayedNotesLanesInput {
  readonly record: PlayedNotesLaneRecord
  readonly phrase: PlayedNotesLanePhrase
  readonly anchors: readonly LaneMeasureAnchors[]
  readonly scale: PlayedNotesPitchScale
}

/** Which end of a note a beat is: they differ only exactly on a measure boundary. */
type NoteEdge = 'onset' | 'release'

interface Anchor {
  readonly beat: number
  readonly px: number
}

/** A measure's anchors in beat order: its events, then its closing barline. */
interface MeasureAxis {
  readonly anchors: readonly Anchor[]
  readonly barlinePx: number
}

/** A lane's time axis: its consecutive measures and the beat range they cover. */
interface LaneAxis {
  readonly systemIndex: 0 | 1
  readonly firstMeasureIndex: number
  readonly measures: readonly MeasureAxis[]
  readonly startBeat: number
  readonly endBeat: number
}

/**
 * Intent: the session-wide pitch scale from every played note of every record: the lowest to the
 * highest pitch, widened equally on both sides to exactly 12 semitones when narrower, so every lane
 * of the session shares it. Null when no record holds a played note.
 */
// @spec-link [[module_review_played_notes_lane]]
export function playedNotesPitchScale(
  records: readonly Pick<SessionHistoryRecord, 'playedNotes'>[],
): PlayedNotesPitchScale | null {
  let low = Number.POSITIVE_INFINITY
  let high = Number.NEGATIVE_INFINITY
  for (const record of records) {
    for (const note of record.playedNotes) {
      low = Math.min(low, note.pitch)
      high = Math.max(high, note.pitch)
    }
  }
  if (low > high) return null
  const span = high - low
  if (span >= MIN_PITCH_SPAN) return { low, high }
  const widening = (MIN_PITCH_SPAN - span) / 2
  return { low: low - widening, high: high + widening }
}

/**
 * Intent: the phrase beat of an audio-clock time in a record, unquantized: (time - start) * tempo /
 * 60. The phrase's four measures span beats 0 to 16.
 */
// @spec-link [[module_review_played_notes_lane]]
export function playedNoteBeat(
  record: Pick<SessionHistoryRecord, 'startedAt' | 'tempo'>,
  time: number,
): number {
  return ((time - record.startedAt) * record.tempo) / SECONDS_PER_MINUTE
}

/**
 * Intent: draw a phrase's played notes in each lane of its layout, one lane per system present in
 * the anchors, in system order. Each lane gets the barlines between its measures as dividers, and a
 * bar for every played note overlapping its beat range: placed through the anchors, cut at the
 * lane's first measure's first note and its last barline, with its pitch fraction on the
 * session-wide scale. Bars keep the record's note order and carry nothing but startPx, sizePx and
 * pitch, so no note is ever marked differently from another.
 */
// @spec-link [[module_review_played_notes_lane]]
// @spec-link [[rule_no_grading_or_mismatch_signal]]
export function playedNotesLanes(input: PlayedNotesLanesInput): readonly PlayedNotesLaneDrawing[] {
  const { record, phrase, anchors, scale } = input
  assertRecord(record)
  assertScale(scale)
  return laneAxes(phrase, anchors).map((lane) => ({
    systemIndex: lane.systemIndex,
    dividersPx: lane.measures.slice(0, -1).map((measure) => measure.barlinePx),
    bars: record.playedNotes.flatMap((note) => {
      const bar = laneBar(
        lane,
        playedNoteBeat(record, note.onsetAt),
        playedNoteBeat(record, note.releaseAt),
      )
      return bar === null ? [] : [{ ...bar, pitch: pitchFraction(note.pitch, scale) }]
    }),
  }))
}

/**
 * Intent: a note's inline start and size in one lane, or null when it does not overlap the lane.
 * An onset before the lane starts at its first measure's first note; a release at or past its end
 * stops at its last barline. A note whose onset is the lane's end belongs to the next lane, and one
 * released exactly at the lane's start (and begun before it) to the previous one.
 */
function laneBar(
  lane: LaneAxis,
  onsetBeat: number,
  releaseBeat: number,
): { readonly startPx: number; readonly sizePx: number } | null {
  if (onsetBeat >= lane.endBeat) return null
  if (onsetBeat < lane.startBeat && releaseBeat <= lane.startBeat) return null
  const onset = Math.max(onsetBeat, lane.startBeat)
  const startPx = positionAt(lane, onset, 'onset')
  let endPx: number
  if (releaseBeat >= lane.endBeat) endPx = lastBarlinePx(lane)
  else if (releaseBeat <= onset) endPx = startPx
  else endPx = positionAt(lane, releaseBeat, 'release')
  return { startPx, sizePx: endPx - startPx }
}

/**
 * Intent: the inline position of a beat inside a lane's range. The measure is the one the beat
 * falls in; exactly on a boundary, an onset belongs to the next measure (its first note) and a
 * release to the earlier one (its barline). Inside a measure the position is linear between the
 * consecutive anchors around the beat; a beat before the measure's first event sits at that event.
 */
function positionAt(lane: LaneAxis, beat: number, edge: NoteEdge): number {
  const measureIndex =
    edge === 'onset'
      ? Math.floor(beat / BEATS_PER_MEASURE)
      : Math.ceil(beat / BEATS_PER_MEASURE) - 1
  const measure = lane.measures[measureIndex - lane.firstMeasureIndex]
  if (measure === undefined)
    throw new PlayedNotesLaneError(`Beat ${beat} is outside the lane's measures.`)
  let previous: Anchor | undefined
  for (const anchor of measure.anchors) {
    if (beat <= anchor.beat) {
      if (previous === undefined) return anchor.px
      const fraction = (beat - previous.beat) / (anchor.beat - previous.beat)
      return previous.px + fraction * (anchor.px - previous.px)
    }
    previous = anchor
  }
  return measure.barlinePx
}

function lastBarlinePx(lane: LaneAxis): number {
  const last = lane.measures[lane.measures.length - 1]
  if (last === undefined) throw new PlayedNotesLaneError('A lane has no measure.')
  return last.barlinePx
}

function pitchFraction(pitch: number, scale: PlayedNotesPitchScale): number {
  if (pitch < scale.low || pitch > scale.high)
    throw new PlayedNotesLaneError(
      `Pitch ${pitch} is outside the pitch scale ${scale.low}..${scale.high}.`,
    )
  return (pitch - scale.low) / (scale.high - scale.low)
}

/**
 * Intent: the lanes' time axes, one per system present in the anchors, in system order, each over
 * its measures in measure order. A lane's measures must be consecutive, and its anchors strictly
 * increase in beat and position, except that a measure's first note may sit at its previous
 * barline (the gap between them takes no time but never goes backward).
 */
function laneAxes(
  phrase: PlayedNotesLanePhrase,
  anchors: readonly LaneMeasureAnchors[],
): readonly LaneAxis[] {
  const seen = new Set<number>()
  for (const measure of anchors) {
    if (seen.has(measure.measureIndex))
      throw new PlayedNotesLaneError(`Measure ${measure.measureIndex} has two sets of anchors.`)
    seen.add(measure.measureIndex)
  }
  const systems = [...new Set(anchors.map((measure) => measure.systemIndex))].sort((a, b) => a - b)
  return systems.map((systemIndex) => {
    const measures = anchors
      .filter((measure) => measure.systemIndex === systemIndex)
      .sort((a, b) => a.measureIndex - b.measureIndex)
    const axes = measures.map((measure, i) => {
      const first = measures[0]
      if (first !== undefined && measure.measureIndex !== first.measureIndex + i)
        throw new PlayedNotesLaneError(`System ${systemIndex}'s measures are not consecutive.`)
      return measureAxis(phrase, measure)
    })
    axes.forEach((axis, i) => {
      const previous = axes[i - 1]
      const firstAnchor = axis.anchors[0]
      if (
        previous !== undefined &&
        firstAnchor !== undefined &&
        firstAnchor.px < previous.barlinePx
      )
        throw new PlayedNotesLaneError(
          `System ${systemIndex}'s anchors go backward across a barline.`,
        )
    })
    const firstMeasureIndex = measures[0]?.measureIndex ?? 0
    return {
      systemIndex,
      firstMeasureIndex,
      measures: axes,
      startBeat: firstMeasureIndex * BEATS_PER_MEASURE,
      endBeat: (firstMeasureIndex + axes.length) * BEATS_PER_MEASURE,
    }
  })
}

/** Intent: one measure's anchors (its events at their beats, then its barline at its end beat). */
function measureAxis(phrase: PlayedNotesLanePhrase, measure: LaneMeasureAnchors): MeasureAxis {
  const { measureIndex, eventStartsPx, barlinePx } = measure
  const written = Number.isInteger(measureIndex) ? phrase.measures[measureIndex] : undefined
  if (written === undefined)
    throw new PlayedNotesLaneError(`Measure ${measureIndex} is not in the written phrase.`)
  if (written.events.length === 0 || eventStartsPx.length !== written.events.length)
    throw new PlayedNotesLaneError(
      `Measure ${measureIndex} has ${eventStartsPx.length} event anchors for ${written.events.length} written events.`,
    )
  const measureStart = measureIndex * BEATS_PER_MEASURE
  const anchors: Anchor[] = written.events.map((event, i) => {
    const { startTick } = event
    if (!Number.isInteger(startTick) || startTick < 0 || startTick >= TICKS_PER_MEASURE)
      throw new PlayedNotesLaneError(`Measure ${measureIndex} has an event at tick ${startTick}.`)
    return { beat: measureStart + startTick / TICKS_PER_BEAT, px: eventStartsPx[i] ?? Number.NaN }
  })
  anchors.push({ beat: measureStart + BEATS_PER_MEASURE, px: barlinePx })
  anchors.forEach((anchor, i) => {
    const previous = anchors[i - 1]
    if (
      !Number.isFinite(anchor.px) ||
      (previous !== undefined && (anchor.beat <= previous.beat || anchor.px <= previous.px))
    )
      throw new PlayedNotesLaneError(
        `Measure ${measureIndex}'s anchors do not strictly increase in beat and position.`,
      )
  })
  return { anchors, barlinePx }
}

function assertRecord(record: PlayedNotesLaneRecord): void {
  if (!Number.isFinite(record.startedAt))
    throw new PlayedNotesLaneError(`The record's start ${record.startedAt} is not a time.`)
  if (!Number.isFinite(record.tempo) || record.tempo <= 0)
    throw new PlayedNotesLaneError(`The record's tempo ${record.tempo} is not usable.`)
  for (const note of record.playedNotes)
    if (
      !Number.isFinite(note.onsetAt) ||
      !Number.isFinite(note.releaseAt) ||
      note.releaseAt < note.onsetAt
    )
      throw new PlayedNotesLaneError(
        `A played note spans ${note.onsetAt}..${note.releaseAt}, which is not a time span.`,
      )
}

function assertScale(scale: PlayedNotesPitchScale): void {
  if (
    !Number.isFinite(scale.low) ||
    !Number.isFinite(scale.high) ||
    scale.high - scale.low < MIN_PITCH_SPAN
  )
    throw new PlayedNotesLaneError(
      `The pitch scale ${scale.low}..${scale.high} does not span at least ${MIN_PITCH_SPAN} semitones.`,
    )
}
