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
 * - accidentals are always spelled as words from the pitch's letter/alteration ('F sharp', 'B
 *   flat', 'double sharp', 'double flat'); the word 'natural' is added only when the written note
 *   carries a displayed natural sign.
 */
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

/** Intent: render a chord suffix as spoken words, keeping any unmapped suffix verbatim. */
function suffixWords(suffix: string): string {
  if (suffix === '') return ''
  if (suffix === 'm') return 'minor'
  if (suffix === 'dim') return 'diminished'
  return suffix
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

/** Intent: build the one-line summary of a written phrase's clef, key and meter. */
function summaryOf(phrase: WrittenPhrase): string {
  const signature = signatureWords(phrase.key.signature)
  const label = spellAccidentalsAsWords(phrase.key.label)
  return (
    `Written notation, ${phrase.clef} clef, key signature ${signature} (${label}), ` +
    `4/4 time, four measures.`
  )
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
