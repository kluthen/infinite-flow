/**
 * The words the My instrument sheet shows, from what the form holds: note names with their octave
 * number, the transposition's value, interval name and example note, the range's refusals in note
 * names, and the staff-reach note. Pure: no state, no browser API. Loaded with the sheet.
 */

import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import {
  MY_INSTRUMENT_RANGE_BOUNDS,
  MINIMUM_WRITTEN_SPAN,
  type WrittenRange,
} from '@/domain/profile/my-instrument'
import {
  deriveTranspositionInterval,
  type MyInstrumentTransposition,
} from '@/domain/profile/transposition-interval'
import {
  NOTATION_SYSTEM_POSITION_UNITS,
  planSystemPositionUnits,
} from '@/notation/notation-layout-policy'

/** The one spelling of each pitch class in the sheet: never a double sharp or flat. */
const NOTE_LETTERS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'] as const

/** The natural letters in order, with their semitones above C. */
const NATURALS = [
  ['C', 0],
  ['D', 2],
  ['E', 4],
  ['F', 5],
  ['G', 7],
  ['A', 9],
  ['B', 11],
] as const

const SEMITONES_PER_OCTAVE = 12
const LETTERS_PER_OCTAVE = 7
/** Middle C, the written C4 the example note starts from. */
const MIDDLE_C = 60

/** The number words of the octave counts, from one up to the transposition stepper's reach. */
const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
]

/** Intent: the octave number of a MIDI note, the number going up by one at each C (C4 = 60). */
function octaveOf(midi: number): number {
  return Math.floor(midi / SEMITONES_PER_OCTAVE) - 1
}

/** Intent: a MIDI note's name with its octave number, in the sheet's one spelling ("B♭3"). */
// @spec-link [[rule_my_instrument_range_limits]]
export function noteName(midi: number): string {
  const pitchClass = ((midi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE
  return `${NOTE_LETTERS[pitchClass]}${octaveOf(midi)}`
}

/** Intent: a clef's name in running text: "treble clef" or "bass clef". */
export function clefName(clef: InstrumentClef): string {
  return clef === 'bass' ? 'bass clef' : 'treble clef'
}

/** Intent: the other clef. */
function otherClef(clef: InstrumentClef): InstrumentClef {
  return clef === 'bass' ? 'treble' : 'bass'
}

/** Intent: a count of octaves in words ("one", "two"); a count beyond the table in digits. */
function octavesWord(count: number): string {
  return NUMBER_WORDS[count] ?? String(count)
}

/** Intent: a word with its first letter in capitals. */
function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Intent: the indefinite article a name takes. */
function articleFor(name: string): string {
  return /^[aeiou]/.test(name) ? 'an' : 'a'
}

/**
 * Intent: the transposition the sheet's one stepper gives: `count` semitones, negative sounding
 * lower, positive higher, 0 the same, as octaves, semitones within the octave and a direction.
 */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export function transpositionOfCount(count: number): MyInstrumentTransposition {
  const size = Math.abs(count)
  return {
    octaves: Math.floor(size / SEMITONES_PER_OCTAVE),
    semitones: size % SEMITONES_PER_OCTAVE,
    direction: count < 0 ? 'lower' : count > 0 ? 'higher' : 'same',
  }
}

/** Intent: the stepper's count of a transposition: negative sounding lower, positive higher. */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export function countOfTransposition(transposition: MyInstrumentTransposition): number {
  const size = SEMITONES_PER_OCTAVE * transposition.octaves + transposition.semitones
  if (transposition.direction === 'lower') return -size
  return transposition.direction === 'higher' ? size : 0
}

/** Intent: the stepper's shown value: "{n} lower", "Same" or "{n} higher". */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export function transpositionValueText(count: number): string {
  if (count === 0) return 'Same'
  return `${Math.abs(count)} ${count < 0 ? 'lower' : 'higher'}`
}

/**
 * Intent: the interval's name without its direction, in lower case: "a major sixth", "one
 * octave", "a major ninth", "two octaves", "two octaves and a major second"; none at 0.
 */
function intervalCore(count: number): string {
  const interval = deriveTranspositionInterval(transpositionOfCount(count))
  const { octaves, simpleName } = interval
  const simple = interval.semitones % SEMITONES_PER_OCTAVE
  if (octaves === 0) return `${articleFor(simpleName)} ${simpleName}`
  const octaveWords = `${octavesWord(octaves)} octave${octaves === 1 ? '' : 's'}`
  if (simple === 0) return octaveWords
  if (octaves === 1) return `${articleFor(interval.name)} ${interval.name}`
  return `${octaveWords} and ${articleFor(simpleName)} ${simpleName}`
}

/**
 * Intent: the interval's name with its direction, as the transposition's note starts: "No
 * transposition" at 0; "A major sixth lower"; "One octave lower"; from 13 to 23, the compound
 * name, the direction, then the octave it holds in brackets ("A major ninth lower (an octave and a
 * major second)"); "Two octaves and a major second lower" beyond.
 */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export function intervalNameText(count: number): string {
  if (count === 0) return 'No transposition'
  const direction = count < 0 ? 'lower' : 'higher'
  const size = Math.abs(count)
  const core = capitalized(`${intervalCore(count)} ${direction}`)
  if (size <= SEMITONES_PER_OCTAVE || size >= 2 * SEMITONES_PER_OCTAVE) return core
  const simpleName = deriveTranspositionInterval(transpositionOfCount(count)).simpleName
  return `${core} (an octave and ${articleFor(simpleName)} ${simpleName})`
}

/**
 * Intent: the note a written C4 sounds as, spelled to agree with the interval's name: C4 moved by
 * its letter-name steps, then the accidental the semitones need (never a double one from C).
 */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export function soundingC4Name(count: number): string {
  const interval = deriveTranspositionInterval(transpositionOfCount(count))
  const sign = count < 0 ? -1 : 1
  const steps = sign * interval.letterSteps
  const letterIndex = ((steps % LETTERS_PER_OCTAVE) + LETTERS_PER_OCTAVE) % LETTERS_PER_OCTAVE
  const octave = 4 + Math.floor(steps / LETTERS_PER_OCTAVE)
  const [letter, naturalOffset] = NATURALS[letterIndex]!
  const natural = (octave + 1) * SEMITONES_PER_OCTAVE + naturalOffset
  const accidental = MIDDLE_C + count - natural
  if (accidental === 0) return `${letter}${octave}`
  if (accidental === 1) return `${letter}♯${octave}`
  if (accidental === -1) return `${letter}♭${octave}`
  throw new Error(`my instrument copy: ${count} semitones would need a double accidental`)
}

/** Intent: the transposition's note: "{interval}: a written C4 sounds as {note}." */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export function transpositionNoteText(count: number): string {
  return `${intervalNameText(count)}: a written C4 sounds as ${soundingC4Name(count)}.`
}

/**
 * Intent: the transposition stepper's accessible value: "14 semitones lower, a major ninth",
 * "Same pitch", "12 semitones lower, one octave".
 */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export function transpositionValueA11yText(count: number): string {
  if (count === 0) return 'Same pitch'
  const size = Math.abs(count)
  const unit = size === 1 ? 'semitone' : 'semitones'
  return `${size} ${unit} ${count < 0 ? 'lower' : 'higher'}, ${intervalCore(count)}`
}

/** Intent: whether both ends of `range` lie inside `clef`'s bound, both ends included. */
// @spec-link [[rule_my_instrument_range_limits]]
export function insideClefBound(range: WrittenRange, clef: InstrumentClef): boolean {
  const bound = MY_INSTRUMENT_RANGE_BOUNDS[clef]
  return range.minMidi >= bound.minMidi && range.maxMidi <= bound.maxMidi
}

/** Intent: the span refusal's line, or none when the range spans two octaves or more. */
function spanRefusal(range: WrittenRange): string | null {
  const lead =
    'The range needs at least two octaves (24 semitones) between its lowest and highest notes.'
  if (range.minMidi > range.maxMidi) return `${lead} Its lowest note is above its highest.`
  const span = range.maxMidi - range.minMidi
  return span < MINIMUM_WRITTEN_SPAN ? `${lead} It has ${span}.` : null
}

/** Intent: the clef bound's refusal line, or none when both ends lie inside it. */
function boundRefusal(range: WrittenRange, clef: InstrumentClef): string | null {
  const bound = MY_INSTRUMENT_RANGE_BOUNDS[clef]
  const tooLow = range.minMidi < bound.minMidi
  const tooHigh = range.maxMidi > bound.maxMidi
  if (!tooLow && !tooHigh) return null
  const lead = `In ${clefName(clef)}, the range must stay between ${noteName(bound.minMidi)} and ${noteName(bound.maxMidi)}.`
  const lowest = noteName(range.minMidi)
  const highest = noteName(range.maxMidi)
  const ends =
    tooLow && tooHigh
      ? `${lowest} is too low and ${highest} too high.`
      : tooLow
        ? `${lowest} is too low.`
        : `${highest} is too high.`
  const other = otherClef(clef)
  const fits = insideClefBound(range, other) ? ` It fits in ${clefName(other)}.` : ''
  return `${lead} ${ends}${fits}`
}

/**
 * Intent: the range's refusal lines, one per reason that applies, the span first; none while the
 * range is valid.
 */
// @spec-link [[rule_my_instrument_range_limits]]
export function rangeRefusalLines(range: WrittenRange, clef: InstrumentClef): readonly string[] {
  return [spanRefusal(range), boundRefusal(range, clef)].filter(
    (line): line is string => line !== null,
  )
}

/** Intent: whether `range` in `clef` makes the staff taller than the built-in instruments need. */
function makesStaffTaller(range: WrittenRange, clef: InstrumentClef): boolean {
  return planSystemPositionUnits({ writtenRange: range, clef }) > NOTATION_SYSTEM_POSITION_UNITS
}

/**
 * Intent: the staff-reach note for a valid range, by the rule that sizes the staff: none when the
 * range, in its clef, needs no more than the built-in instruments; otherwise its cost, and, when
 * the other clef would hold the range within its bound at the built-in size, that it would not.
 */
// @spec-link [[module_notation_layout_preflight]]
export function staffReachNote(range: WrittenRange, clef: InstrumentClef): string | null {
  if (!makesStaffTaller(range, clef)) return null
  const note = `In ${clefName(clef)}, this range makes the staff taller for every instrument, and it may no longer fit a phone's screen.`
  const other = otherClef(clef)
  if (!insideClefBound(range, other) || makesStaffTaller(range, other)) return note
  return `${note} In ${clefName(other)}, it would not.`
}
