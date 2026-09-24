/**
 * The explicit notation input and the pure written-phrase model produced by the display
 * transform. The input is assembled from explicit generation data only (the concert timeline,
 * the tonal context, and concert chord symbols); the written model carries every engraving
 * decision (spelling, key signature, displayed accidentals, notated durations, ties, beam groups,
 * chord-symbol placement) so an engraving adapter only draws it and never re-decides music.
 */
import type { Collection, PitchClass } from '../controls/generation-controls'
import type { ConcertEventTimeline } from '../events/timeline'
import type { MeasureIndex } from '../events/measure'
import type { PitchClassNumber } from '../harmony/harmony-types'
import type { DisplayTransposition, NotationMode } from './notation-mode'

/** Typed failure for notation input that violates the notation contract; never repaired. */
// @spec-link [[module_notation_display_convention]]
export class NotationInputError extends Error {
  readonly kind = 'NotationInputError' as const

  constructor(message: string) {
    super(message)
    this.name = 'NotationInputError'
  }
}

/** The selected concert tonal context the phrase was generated in. */
// @spec-link [[module_notation_display_convention]]
export interface NotationTonalContext {
  readonly tonalCenter: PitchClass
  readonly collection: Collection
}

/**
 * One concert chord symbol placed at a measure-relative sixteenth tick (0-15). `suffix` carries
 * quality, alterations, extensions, additions and omissions verbatim (for example '', 'm', 'dim',
 * 'm7b5'); only the root and optional slash bass are respelled by a display convention.
 */
// @spec-link [[module_notation_display_convention]]
export interface ConcertChordSymbol {
  readonly measureIndex: MeasureIndex
  readonly startTick: number
  readonly root: PitchClassNumber
  readonly suffix: string
  readonly bass: PitchClassNumber | null
}

/**
 * The complete explicit input of the display transform. Every measure carries at least one chord
 * symbol at tick 0 (a harmony continuing across a barline is restated) plus one per harmony
 * change inside the measure, in ascending tick order.
 */
// @spec-link [[module_notation_display_convention]]
export interface NotationPhraseInput {
  readonly timeline: ConcertEventTimeline
  readonly tonalContext: NotationTonalContext
  readonly chords: readonly ConcertChordSymbol[]
}

/** A written staff letter. */
export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'

/** Semitone alteration of a letter: double-flat to double-sharp. */
export type Alter = -2 | -1 | 0 | 1 | 2

/** A spelled pitch class: one letter plus one alteration. */
// @spec-link [[module_notation_display_convention]]
export interface SpelledPitchClass {
  readonly letter: Letter
  readonly alter: Alter
}

/** A spelled written pitch in scientific octave numbering (C4 is MIDI 60, B#3 is MIDI 60). */
// @spec-link [[module_notation_display_convention]]
export interface SpelledPitch extends SpelledPitchClass {
  readonly octave: number
}

/**
 * A written key: the fewest-accidental spelling of the written tonal center plus its collection,
 * a display label using that spelling (for example 'E♭ Ionian'), and the conventional key
 * signature for the spelled collection (letters listed in standard signature order).
 */
// @spec-link [[module_notation_display_convention]]
export interface WrittenKey {
  readonly tonic: SpelledPitchClass
  readonly collection: Collection
  readonly label: string
  readonly scale: readonly SpelledPitchClass[]
  readonly signature: {
    readonly accidental: 'sharp' | 'flat' | null
    readonly count: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
    readonly letters: readonly Letter[]
    /** The Ionian (major) tonic sharing this signature, for example 'E♭' for C Aeolian. */
    readonly ionianTonic: SpelledPitchClass
  }
}

/** A displayed accidental sign, or none when the key signature and measure state already imply it. */
export type DisplayedAccidental = 'double-flat' | 'flat' | 'natural' | 'sharp' | 'double-sharp'

/** A notatable note value for the first-release sixteenth grid. */
export type NoteValue = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth'

/** One notated duration glyph: a value, optional single dot, and its exact sixteenth-tick length. */
// @spec-link [[module_notation_display_convention]]
export interface NotatedDuration {
  readonly value: NoteValue
  readonly dots: 0 | 1
  readonly ticks: number
}

/**
 * One notated note glyph. A source note may split into several tied glyphs; `sourceEventIndex`
 * is the index of the concert event within its measure. `tieFromPrevious` marks a glyph whose
 * attack is tied from the previous glyph (inside or across a barline); `tieToNext` mirrors it.
 */
// @spec-link [[module_notation_display_convention]]
export interface WrittenNote {
  readonly kind: 'note'
  readonly startTick: number
  readonly duration: NotatedDuration
  readonly pitch: SpelledPitch
  readonly accidental: DisplayedAccidental | null
  readonly tieFromPrevious: boolean
  readonly tieToNext: boolean
  readonly sourceEventIndex: number
}

/** One notated rest glyph. */
// @spec-link [[module_notation_display_convention]]
export interface WrittenRest {
  readonly kind: 'rest'
  readonly startTick: number
  readonly duration: NotatedDuration
  readonly sourceEventIndex: number
}

/** A notated glyph. */
export type WrittenEvent = WrittenNote | WrittenRest

/** A respelled chord symbol at a measure-relative tick; `text` is the display string ('F♯m/A'). */
// @spec-link [[module_notation_display_convention]]
export interface WrittenChordSymbol {
  readonly startTick: number
  readonly root: SpelledPitchClass
  readonly suffix: string
  readonly bass: SpelledPitchClass | null
  readonly text: string
}

/**
 * One written measure. `beamGroups` lists groups of indices into `events` (each group two or more
 * eighth/sixteenth notes inside one quarter beat, never across a rest). Every chord symbol's
 * `startTick` equals the `startTick` of some event in the measure.
 */
// @spec-link [[module_notation_display_convention]]
export interface WrittenMeasure {
  readonly index: MeasureIndex
  readonly events: readonly WrittenEvent[]
  readonly beamGroups: readonly (readonly number[])[]
  readonly chords: readonly WrittenChordSymbol[]
}

/** The written phrase for one display convention, in treble G2 clef and 4/4. */
// @spec-link [[module_notation_display_convention]]
export interface WrittenPhrase {
  readonly mode: NotationMode
  readonly transposition: DisplayTransposition
  readonly clef: 'treble'
  readonly timeSignature: { readonly beats: 4; readonly beatValue: 4 }
  readonly key: WrittenKey
  readonly measures: readonly [WrittenMeasure, WrittenMeasure, WrittenMeasure, WrittenMeasure]
}
