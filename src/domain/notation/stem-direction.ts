/**
 * Pure stem-direction decisions for written notation: every written note's stem direction is
 * decided here, from written staff positions, so the engraver never chooses one itself. A note
 * outside any beam group follows its own staff position; a beam group shares one direction, set by
 * its note farthest from the middle line, then by the side holding more of its notes, then down.
 * The middle line is the clef's own: B4 in treble, D3 in bass.
 */
import type { InstrumentClef } from '../profile/instrument-clef'
import { staffStepsFromMiddleLine } from './pitch-spelling'
import {
  NotationInputError,
  type SpelledPitch,
  type StemDirection,
  type WrittenEvent,
  type WrittenNote,
  type WrittenRest,
} from './written-phrase-types'

/** A written note whose stem direction is not decided yet. */
export type UnstemmedWrittenNote = Omit<WrittenNote, 'stemDirection'>

/**
 * Intent: the stem direction of one note outside any beam group: down on or above the middle line
 * of its clef (B4 in treble, D3 in bass), up below it.
 */
// @spec-link [[module_notation_stem_direction]]
export function noteStemDirection(pitch: SpelledPitch, clef: InstrumentClef): StemDirection {
  return staffStepsFromMiddleLine(pitch, clef) >= 0 ? 'down' : 'up'
}

/**
 * Intent: the one stem direction every note of a beam group shares. The note farthest from the
 * middle line of its clef (B4 in treble, D3 in bass) decides (above it, or on it, gives down; below gives up); when the farthest note
 * above and the farthest below are equally far, the side holding more of the group's notes decides;
 * when that count ties too, down.
 */
// @spec-link [[module_notation_stem_direction]]
export function beamGroupStemDirection(
  pitches: readonly SpelledPitch[],
  clef: InstrumentClef,
): StemDirection {
  const steps = pitches.map((pitch) => staffStepsFromMiddleLine(pitch, clef))
  const farthestAbove = Math.max(0, ...steps)
  const farthestBelow = Math.max(0, ...steps.map((step) => -step))
  if (farthestAbove !== farthestBelow) return farthestAbove > farthestBelow ? 'down' : 'up'

  const notesAbove = steps.filter((step) => step > 0).length
  const notesBelow = steps.filter((step) => step < 0).length
  return notesBelow > notesAbove ? 'up' : 'down'
}

/**
 * Intent: give every note of one measure's glyphs its stem direction, returning new note objects
 * and never mutating the given glyphs: each beam group's notes share the group's direction, every
 * other note follows its own staff position, both measured from the middle line of the phrase's
 * clef, and rests are returned as they are (they carry none).
 * Crashes early if a beam group lists a missing glyph or a rest.
 */
// @spec-link [[module_notation_stem_direction]]
// @spec-link [[rule_notation_display_preserves_phrase]]
export function assignStemDirections(
  events: readonly (UnstemmedWrittenNote | WrittenRest)[],
  beamGroups: readonly (readonly number[])[],
  clef: InstrumentClef,
): readonly WrittenEvent[] {
  const groupDirections = new Map<number, StemDirection>()
  for (const group of beamGroups) {
    const pitches = group.map((index) => {
      const event = events[index]
      if (event === undefined || event.kind !== 'note') {
        throw new NotationInputError(`Beam group index ${index} does not name a written note.`)
      }
      return event.pitch
    })
    const direction = beamGroupStemDirection(pitches, clef)
    for (const index of group) groupDirections.set(index, direction)
  }

  return events.map((event, index): WrittenEvent => {
    if (event.kind === 'rest') return event
    const stemDirection = groupDirections.get(index) ?? noteStemDirection(event.pitch, clef)
    return { ...event, stemDirection }
  })
}
