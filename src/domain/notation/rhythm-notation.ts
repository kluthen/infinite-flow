/**
 * Pure rhythm notation: split concert measure events into notatable glyph segments (whole down
 * to sixteenth, single dot allowed) tied across a split, plus the beam groups those segments form.
 * This module never re-decides pitch, spelling, or harmony; it only decides how a measure's exact
 * sixteenth-grid durations render as engravable glyphs, deterministically and without mutating the
 * measure it reads.
 */
import { deepFreeze } from '../events/deep-freeze'
import type { Measure } from '../events/measure'
import type { MeasureEvent, NoteEvent } from '../events/measure-event'
import { sixteenthTicksOf, TICKS_PER_BAR } from '../time/ticks'
import { NotationInputError } from './written-phrase-types'
import type { NotatedDuration } from './written-phrase-types'

/**
 * One notated glyph segment carved out of a source measure event. `sourceEventIndex` is the
 * index of the originating event within the measure's event list. For rests both tie flags are
 * always false.
 */
// @spec-link [[module_notation_display_convention]]
export type RhythmSegment = {
  readonly kind: 'note' | 'rest'
  readonly sourceEventIndex: number
  readonly startTick: number
  readonly duration: NotatedDuration
  readonly tieFromPrevious: boolean
  readonly tieToNext: boolean
}

/**
 * The closed set of notatable glyphs for the first-release sixteenth grid, in strictly
 * descending tick order so a greedy "largest glyph that fits" walk can scan it in order.
 */
// @spec-link [[module_notation_display_convention]]
export const NOTATED_DURATIONS: readonly NotatedDuration[] = deepFreeze([
  { value: 'whole', dots: 0, ticks: 16 },
  { value: 'half', dots: 1, ticks: 12 },
  { value: 'half', dots: 0, ticks: 8 },
  { value: 'quarter', dots: 1, ticks: 6 },
  { value: 'quarter', dots: 0, ticks: 4 },
  { value: 'eighth', dots: 1, ticks: 3 },
  { value: 'eighth', dots: 0, ticks: 2 },
  { value: 'sixteenth', dots: 0, ticks: 1 },
])

/** One glyph placed at a measure-relative sixteenth tick, before tie flags are attached. */
interface GlyphPlacement {
  readonly startTick: number
  readonly duration: NotatedDuration
}

/**
 * Intent: reject a forced boundary tick list that is not every entry an integer in 0..15 (a
 * chord-symbol start tick must land inside the bar), as a typed failure before segmentation runs.
 */
function assertForcedBoundaries(forcedBoundaryTicks: readonly number[]): void {
  for (const tick of forcedBoundaryTicks) {
    if (!Number.isInteger(tick) || tick < 0 || tick > 15) {
      throw new NotationInputError(
        `Forced boundary tick must be an integer in [0, 15], got ${tick}.`,
      )
    }
  }
}

/**
 * Intent: report whether a glyph starting at `position` satisfies the first-release metric
 * alignment table (whole/dotted-half only from beat 1, half/dotted-quarter never crossing the
 * half-bar, quarter/dotted-eighth on the beat, eighth on the half-beat, sixteenth anywhere).
 */
function isMetricallyAligned(entry: NotatedDuration, position: number): boolean {
  switch (entry.ticks) {
    case 16:
    case 12:
      return position === 0
    case 8:
    case 6:
      return position % 8 === 0
    case 4:
    case 3:
      return position % 4 === 0
    case 2:
      return position % 2 === 0
    default:
      return true
  }
}

/**
 * Intent: report whether placing a glyph over `[position, position + ticks)` would cross a
 * forced boundary tick (a chord-symbol start strictly inside the glyph), which is forbidden
 * because a harmony change must always land on a glyph start.
 */
function crossesForcedBoundary(
  position: number,
  segmentEnd: number,
  forcedBoundaryTicks: readonly number[],
): boolean {
  return forcedBoundaryTicks.some((boundary) => position < boundary && boundary < segmentEnd)
}

/**
 * Intent: pick the largest notatable glyph that starts at `position`, ends at or before `end`,
 * satisfies the metric alignment table, and does not cross a forced boundary tick. The sixteenth
 * glyph is always eligible (its interval is empty, so no boundary can lie strictly inside it),
 * which guarantees this never falls through without a result.
 */
function pickGlyph(
  position: number,
  end: number,
  forcedBoundaryTicks: readonly number[],
): NotatedDuration {
  for (const entry of NOTATED_DURATIONS) {
    const segmentEnd = position + entry.ticks
    if (segmentEnd > end) continue
    if (!isMetricallyAligned(entry, position)) continue
    if (crossesForcedBoundary(position, segmentEnd, forcedBoundaryTicks)) continue
    return entry
  }
  throw new NotationInputError(
    `No notatable glyph fits at tick ${position} within [${position}, ${end}).`,
  )
}

/**
 * Intent: greedily split one event's `[start, end)` tick range into the fewest largest-first
 * notatable glyphs allowed by the metric alignment table and the forced boundary ticks.
 */
function splitRange(
  start: number,
  end: number,
  forcedBoundaryTicks: readonly number[],
): readonly GlyphPlacement[] {
  const placements: GlyphPlacement[] = []
  let position = start
  while (position < end) {
    const duration = pickGlyph(position, end, forcedBoundaryTicks)
    placements.push({ startTick: position, duration })
    position += duration.ticks
  }
  return placements
}

/**
 * Intent: crash early on an event list whose tie-continuation notes are not resolvable purely
 * within this measure: a continuation that is not the measure's first event but follows a rest
 * (no preceding note to tie from), or whose pitch differs from the preceding note's pitch.
 */
function assertTieContinuationsResolvable(events: readonly MeasureEvent[]): void {
  let previousNote: NoteEvent | null = null
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!
    if (event.kind === 'note' && event.tieContinuation && index > 0) {
      if (previousNote === null) {
        throw new NotationInputError(
          `Event ${index} is a tie continuation but the preceding event in the measure is a rest.`,
        )
      }
      if (previousNote.pitch !== event.pitch) {
        throw new NotationInputError(
          `Event ${index} is a tie continuation at pitch ${event.pitch}, but the preceding note ` +
            `in the measure is at pitch ${previousNote.pitch}.`,
        )
      }
    }
    previousNote = event.kind === 'note' ? event : null
  }
}

/**
 * Intent: decide whether the last glyph segment of `events[eventIndex]` ties into what follows —
 * the next event in this measure when it is a tie-continuation note, otherwise whether the next
 * measure is declared to start with a tie continuation.
 */
function tiesIntoWhatFollows(
  events: readonly MeasureEvent[],
  eventIndex: number,
  nextMeasureStartsWithTieContinuation: boolean,
): boolean {
  const nextEvent = events[eventIndex + 1]
  if (nextEvent !== undefined) {
    return nextEvent.kind === 'note' && nextEvent.tieContinuation
  }
  return nextMeasureStartsWithTieContinuation
}

/**
 * Intent: split every event of one already-validated 4/4 measure into notatable glyph segments,
 * carrying tie flags across a within-event split, across events, and (for the measure's final
 * event) into the next measure. Crashes early as a typed NotationInputError on an invalid forced
 * boundary list, an unresolvable tie continuation, or an event list that does not tile 16 ticks.
 */
// @spec-link [[module_notation_display_convention]]
export function segmentMeasure(
  measure: Measure,
  forcedBoundaryTicks: readonly number[],
  nextMeasureStartsWithTieContinuation: boolean,
): readonly RhythmSegment[] {
  assertForcedBoundaries(forcedBoundaryTicks)

  const events = measure.events
  const eventTicks = events.map((event) => sixteenthTicksOf(event.duration))
  const totalTicks = eventTicks.reduce((sum, ticks) => sum + ticks, 0)
  if (totalTicks !== TICKS_PER_BAR) {
    throw new NotationInputError(
      `Measure ${measure.measureIndex} events sum to ${totalTicks} sixteenth ticks; expected ${TICKS_PER_BAR}.`,
    )
  }

  assertTieContinuationsResolvable(events)

  const segments: RhythmSegment[] = []
  let cursor = 0
  for (let eventIndex = 0; eventIndex < events.length; eventIndex += 1) {
    const event = events[eventIndex]!
    const start = cursor
    const end = start + eventTicks[eventIndex]!
    const glyphs = splitRange(start, end, forcedBoundaryTicks)

    for (let glyphIndex = 0; glyphIndex < glyphs.length; glyphIndex += 1) {
      const glyph = glyphs[glyphIndex]!
      const isFirstGlyph = glyphIndex === 0
      const isLastGlyph = glyphIndex === glyphs.length - 1

      if (event.kind === 'rest') {
        segments.push({
          kind: 'rest',
          sourceEventIndex: eventIndex,
          startTick: glyph.startTick,
          duration: glyph.duration,
          tieFromPrevious: false,
          tieToNext: false,
        })
        continue
      }

      segments.push({
        kind: 'note',
        sourceEventIndex: eventIndex,
        startTick: glyph.startTick,
        duration: glyph.duration,
        tieFromPrevious: isFirstGlyph ? event.tieContinuation : true,
        tieToNext: isLastGlyph
          ? tiesIntoWhatFollows(events, eventIndex, nextMeasureStartsWithTieContinuation)
          : true,
      })
    }

    cursor = end
  }

  return deepFreeze(segments)
}

/**
 * Intent: report whether a rhythm segment is eligible to join a beam run: a note glyph valued
 * eighth or sixteenth (dotted included).
 */
function isBeamable(segment: RhythmSegment): boolean {
  return (
    segment.kind === 'note' &&
    (segment.duration.value === 'eighth' || segment.duration.value === 'sixteenth')
  )
}

/**
 * Intent: group consecutive beamable segments (eighth/sixteenth note glyphs, dotted included)
 * that start in the same quarter beat into beam runs of two or more; a rest, a longer note, or a
 * beat-boundary crossing breaks a run, and a run of a single segment is not reported.
 */
// @spec-link [[module_notation_display_convention]]
export function beamGroupsFor(segments: readonly RhythmSegment[]): readonly (readonly number[])[] {
  const groups: number[][] = []
  let current: number[] = []
  let currentBeat: number | null = null

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!
    const beat = Math.floor(segment.startTick / 4)
    const continuesRun = isBeamable(segment) && current.length > 0 && currentBeat === beat

    if (continuesRun) {
      current.push(index)
      continue
    }

    if (current.length >= 2) {
      groups.push(current)
    }
    if (isBeamable(segment)) {
      current = [index]
      currentBeat = beat
    } else {
      current = []
      currentBeat = null
    }
  }

  if (current.length >= 2) {
    groups.push(current)
  }

  return deepFreeze(groups)
}
