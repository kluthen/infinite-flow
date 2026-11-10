/**
 * Pure semantic text representation of a written phrase: a spoken-friendly English description
 * carrying the same information as the engraved score (display convention, clef, key signature,
 * meter, and — per measure — chord symbols interleaved with notes, rests, durations and ties) so
 * an accessible alternative can be shown alongside the SVG without re-deriving anything from it.
 *
 * Format:
 * - `summary`: "<mode> notation, <treble|bass> clef, key signature <N sharps|flats|no sharps or
 *   flats> (<tonic> <collection>), 4/4 time, four measures.", where the clef is the phrase's own.
 * - each of the four `measures` strings: "Measure <n>: <block>; <block>; ...." where a block is
 *   either one chord announcement ("chord <root>[ <suffix words>][ over <bass>]") placed
 *   immediately before the tick it starts at, or a run of comma-joined note/rest tokens
 *   ("<pitch> <octave> [dotted ]<value>[, tied to next]" / "rest [dotted ]<value>") covering every
 *   event up to the next chord change.
 * - `describeEmptySystem`, the name of Jam's empty system, follows the summary without the
 *   display convention and the measures: "Empty staff, <clef> clef, key signature <...> (<tonic>
 *   <collection>), 4/4 time."
 * - suffix words name the whole suffix: none for a major triad, 'minor', 'diminished', 'major
 *   seventh', 'minor seventh', 'dominant seventh', 'half-diminished seventh' ('m7♭5'); a suffix is
 *   never read letter by letter, and an unknown suffix crashes.
 * - accidentals of a root, bass or pitch are always spelled as words from its letter/alteration
 *   ('F sharp', 'B flat', 'double sharp', 'double flat'); the word 'natural' is added only when the
 *   written note carries a displayed natural sign.
 */
import type { InstrumentClef } from '../profile/instrument-clef'
import { pitchClassText } from './pitch-spelling'
import { NotationInputError } from './written-phrase-types'
import type {
  NotatedDuration,
  SpelledPitch,
  SpelledPitchClass,
  WrittenChordSymbol,
  WrittenEvent,
  WrittenKey,
  WrittenMeasure,
  WrittenPhrase,
} from './written-phrase-types'

/** The pure semantic text alternative to one engraved written phrase. */
export interface ScoreDescription {
  readonly summary: string
  readonly measures: readonly [string, string, string, string]
}

/** Intent: turn one pitch-class accidental symbol string into its spoken-friendly words. */
function spellAccidentalsAsWords(symbolText: string): string {
  return symbolText
    .replace(/𝄪/g, ' double sharp')
    .replace(/𝄫/g, ' double flat')
    .replace(/♯/g, ' sharp')
    .replace(/♭/g, ' flat')
}

/** Intent: render a spelled pitch class (root, bass, or the letter part of a pitch) as words. */
function pitchClassWords(pitchClass: SpelledPitchClass): string {
  return spellAccidentalsAsWords(pitchClassText(pitchClass))
}

/** Intent: render one written pitch as spoken words, naming a displayed natural sign explicitly. */
function pitchWords(pitch: SpelledPitch, displaysNatural: boolean): string {
  const natural = displaysNatural ? ' natural' : ''
  return `${pitchClassWords(pitch)}${natural} ${pitch.octave}`
}

/** Intent: render one notated duration glyph as spoken words ('dotted eighth', 'quarter'). */
function durationWords(duration: NotatedDuration): string {
  const dotted = duration.dots === 1 ? 'dotted ' : ''
  return `${dotted}${duration.value}`
}

/**
 * The spoken words of each whole chord-symbol suffix: the triad suffixes and the seventh-chord
 * suffixes. A suffix is looked up as one whole, never read letter by letter, so the ♭ of 'm7♭5'
 * is never read as "flat" on its own.
 */
// @spec-link [[rule_seventh_chord_symbols_spoken]]
const SUFFIX_WORDS: ReadonlyMap<string, string> = new Map([
  ['', ''],
  ['m', 'minor'],
  ['dim', 'diminished'],
  ['maj7', 'major seventh'],
  ['m7', 'minor seventh'],
  ['7', 'dominant seventh'],
  ['m7♭5', 'half-diminished seventh'],
])

/**
 * Intent: render a whole chord suffix as spoken words; crashes on a suffix that is neither a
 * triad nor a seventh-chord suffix, which the notation input validator already refuses.
 */
// @spec-link [[rule_seventh_chord_symbols_spoken]]
function suffixWords(suffix: string): string {
  const words = SUFFIX_WORDS.get(suffix)
  if (words === undefined) {
    throw new NotationInputError(
      `Chord symbol suffix ${JSON.stringify(suffix)} is neither a triad nor a seventh chord suffix.`,
    )
  }
  return words
}

/** Intent: render one written chord symbol as spoken words: root, spoken suffix, spoken bass. */
function chordWords(chord: WrittenChordSymbol): string {
  const root = pitchClassWords(chord.root)
  const suffix = suffixWords(chord.suffix)
  const rootAndSuffix = suffix === '' ? root : `${root} ${suffix}`
  const bass = chord.bass === null ? '' : ` over ${pitchClassWords(chord.bass)}`
  return `${rootAndSuffix}${bass}`
}

/** Intent: render one written note or rest glyph as its spoken token, including a trailing tie. */
function eventToken(event: WrittenEvent): string {
  if (event.kind === 'rest') return `rest ${durationWords(event.duration)}`
  const tie = event.tieToNext ? ', tied to next' : ''
  const displaysNatural = event.accidental === 'natural'
  return `${pitchWords(event.pitch, displaysNatural)} ${durationWords(event.duration)}${tie}`
}

/**
 * Intent: render the key signature's accidental count and kind as words ('no sharps or flats',
 * '1 flat', '2 sharps'). Crashes on the invariant violation of a positive count with no kind.
 */
function signatureWords(signature: WrittenKey['signature']): string {
  if (signature.count === 0) return 'no sharps or flats'
  if (signature.accidental === null) {
    throw new NotationInputError('Key signature has a positive count but no accidental kind.')
  }
  const noun = signature.count === 1 ? signature.accidental : `${signature.accidental}s`
  return `${signature.count} ${noun}`
}

/** Intent: render a clef, a key and the 4/4 meter as words, as a phrase's summary names them. */
function clefKeyAndMeterWords(clef: InstrumentClef, key: WrittenKey): string {
  const signature = signatureWords(key.signature)
  const label = spellAccidentalsAsWords(key.label)
  return `${clef} clef, key signature ${signature} (${label}), 4/4 time`
}

/** Intent: build the one-line summary of a written phrase's clef, key and meter. */
function summaryOf(phrase: WrittenPhrase): string {
  return `Written notation, ${clefKeyAndMeterWords(phrase.clef, phrase.key)}, four measures.`
}

/**
 * Intent: name Jam's empty system as a phrase's summary names its staff, naming no measures:
 * "Empty staff, treble clef, key signature 1 sharp (G Ionian), 4/4 time."
 */
// @spec-link [[rule_jam_idle_shows_no_phrase]]
export function describeEmptySystem(clef: InstrumentClef, key: WrittenKey): string {
  return `Empty staff, ${clefKeyAndMeterWords(clef, key)}.`
}

/** The words of a doodle's length, one to four measures. */
const DOODLE_LENGTH_WORDS = ['one measure', 'two measures', 'three measures', 'four measures']

/**
 * Intent: name a Jam's doodle as a phrase's summary names its staff, with its own length: "Your
 * doodle, treble clef, key signature 1 sharp (G Ionian), 4/4 time, two measures."
 */
// @spec-link [[rule_review_opens_with_doodle]]
export function describeDoodle(phrase: WrittenPhrase, measureCount: number): string {
  const length = DOODLE_LENGTH_WORDS[measureCount - 1]
  if (length === undefined)
    throw new NotationInputError(`A doodle has no ${measureCount} measures.`)
  return `Your doodle, ${clefKeyAndMeterWords(phrase.clef, phrase.key)}, ${length}.`
}

/**
 * Intent: build one measure's spoken description, interleaving each chord announcement
 * immediately before the run of note/rest tokens starting at (and following) its tick.
 */
function describeMeasure(measure: WrittenMeasure, measureNumber: number): string {
  const blocks: string[] = []
  let noteRun: string[] = []
  let chordIndex = 0

  for (const event of measure.events) {
    while (
      chordIndex < measure.chords.length &&
      measure.chords[chordIndex]!.startTick === event.startTick
    ) {
      if (noteRun.length > 0) {
        blocks.push(noteRun.join(', '))
        noteRun = []
      }
      blocks.push(`chord ${chordWords(measure.chords[chordIndex]!)}`)
      chordIndex += 1
    }
    noteRun.push(eventToken(event))
  }
  if (noteRun.length > 0) blocks.push(noteRun.join(', '))

  return `Measure ${measureNumber}: ${blocks.join('; ')}.`
}

/**
 * Intent: describe a written phrase as pure semantic text — the accessible alternative shown
 * alongside its engraving — without mutating or otherwise reading anything beyond the phrase.
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[rule_seventh_chord_symbols_spoken]]
export function describeWrittenPhrase(phrase: WrittenPhrase): ScoreDescription {
  const [first, second, third, fourth] = phrase.measures
  return {
    summary: summaryOf(phrase),
    measures: [
      describeMeasure(first, 1),
      describeMeasure(second, 2),
      describeMeasure(third, 3),
      describeMeasure(fourth, 4),
    ],
  }
}
