/**
 * Pure enharmonic pitch spelling for written notation. Given a written tonal center (the concert
 * tonal-center pitch class plus a display convention's chromatic transposition, mod 12) and its
 * unchanged collection, derives the fewest-accidental spelling of the written key (on a tie, the
 * sharp representation) and applies that one spelling everywhere: the tonal-center label, the key
 * signature, note accidentals, chord roots, and slash basses. No caller may pick a different
 * enharmonic spelling for any one of those independently.
 */
import type { Collection } from '../controls/generation-controls'
import { COLLECTION_OFFSETS } from '../harmony/collection'
import type { PitchClassNumber } from '../harmony/harmony-types'
import {
  NotationInputError,
  type Alter,
  type DisplayedAccidental,
  type Letter,
  type SpelledPitch,
  type SpelledPitchClass,
  type WrittenKey,
} from './written-phrase-types'

/** The seven written letters in scale order, used to derive consecutive-letter candidate scales. */
const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

/** The natural (no-accidental) pitch class of each written letter. */
const NATURAL_PC: Readonly<Record<Letter, PitchClassNumber>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

/** Standard key-signature accumulation order for sharp keys. */
const SHARP_ORDER: readonly Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B']

/** Standard key-signature accumulation order for flat keys. */
const FLAT_ORDER: readonly Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F']

/** The Ionian (major) tonic sharing each sharp-count signature, index 0..7. */
const SHARP_IONIAN_TONICS: readonly SpelledPitchClass[] = [
  { letter: 'C', alter: 0 },
  { letter: 'G', alter: 0 },
  { letter: 'D', alter: 0 },
  { letter: 'A', alter: 0 },
  { letter: 'E', alter: 0 },
  { letter: 'B', alter: 0 },
  { letter: 'F', alter: 1 },
  { letter: 'C', alter: 1 },
]

/** The Ionian (major) tonic sharing each flat-count signature, index 0 unused, 1..7 used. */
const FLAT_IONIAN_TONICS: readonly SpelledPitchClass[] = [
  { letter: 'C', alter: 0 },
  { letter: 'F', alter: 0 },
  { letter: 'B', alter: -1 },
  { letter: 'E', alter: -1 },
  { letter: 'A', alter: -1 },
  { letter: 'D', alter: -1 },
  { letter: 'G', alter: -1 },
  { letter: 'C', alter: -1 },
]

/** Intent: normalize any integer pitch class into the closed 0..11 PitchClassNumber range. */
function normalizePitchClass(value: number): PitchClassNumber {
  return (((value % 12) + 12) % 12) as PitchClassNumber
}

/** Intent: reduce a semitone difference to its unique representative in the -6..5 range. */
function normalizeAlterRange(diff: number): number {
  return ((((diff + 6) % 12) + 12) % 12) - 6
}

/** Intent: return the natural (no-accidental) pitch class of a written letter. */
// @spec-link [[module_notation_display_convention]]
export function naturalPitchClassOf(letter: Letter): PitchClassNumber {
  return NATURAL_PC[letter]
}

/** Intent: render one spelled pitch class as 'F♯', 'B♭', 'C', 'D𝄪', 'E𝄫'. */
// @spec-link [[module_notation_display_convention]]
export function pitchClassText(p: SpelledPitchClass): string {
  const suffix =
    p.alter === 2 ? '𝄪' : p.alter === 1 ? '♯' : p.alter === -1 ? '♭' : p.alter === -2 ? '𝄫' : ''
  return `${p.letter}${suffix}`
}

/** Intent: name the displayed accidental sign carried by a semitone alteration. */
// @spec-link [[module_notation_display_convention]]
export function displayedAccidentalOf(alter: Alter): DisplayedAccidental {
  switch (alter) {
    case -2:
      return 'double-flat'
    case -1:
      return 'flat'
    case 0:
      return 'natural'
    case 1:
      return 'sharp'
    case 2:
      return 'double-sharp'
  }
}

interface CandidateScale {
  readonly degrees: readonly SpelledPitchClass[]
  readonly count: number
}

/**
 * Intent: build the consecutive-letter scale candidate for one tonic letter, or null when any
 * degree (including the tonic itself) would need more than a double sharp/flat to spell.
 */
function buildCandidate(
  tonicLetter: Letter,
  writtenTonic: PitchClassNumber,
  offsets: readonly number[],
): CandidateScale | null {
  const tonicLetterIndex = LETTERS.indexOf(tonicLetter)
  const degrees: SpelledPitchClass[] = []
  let count = 0
  for (let i = 0; i < offsets.length; i += 1) {
    const degreeLetter = LETTERS[(tonicLetterIndex + i) % 7]!
    const actualPc = normalizePitchClass(writtenTonic + offsets[i]!)
    const alter = normalizeAlterRange(actualPc - NATURAL_PC[degreeLetter])
    if (Math.abs(alter) > 2) return null
    degrees.push({ letter: degreeLetter, alter: alter as Alter })
    count += Math.abs(alter)
  }
  return { degrees, count }
}

/** Intent: enumerate every tonic-letter candidate whose tonic alteration stays within -2..2. */
function candidatesForTonic(
  writtenTonic: PitchClassNumber,
  offsets: readonly number[],
): readonly CandidateScale[] {
  const candidates: CandidateScale[] = []
  for (const letter of LETTERS) {
    const tonicAlter = normalizeAlterRange(writtenTonic - NATURAL_PC[letter])
    if (Math.abs(tonicAlter) > 2) continue
    const candidate = buildCandidate(letter, writtenTonic, offsets)
    if (candidate !== null) candidates.push(candidate)
  }
  return candidates
}

/**
 * Intent: choose the fewest-accidental candidate scale, breaking ties in favor of the
 * no-flats (sharp) representation, and crashing on a genuine ambiguity that must not occur.
 */
function chooseCandidate(candidates: readonly CandidateScale[]): CandidateScale {
  if (candidates.length === 0) {
    throw new NotationInputError('No enharmonic spelling stays within the double-accidental range.')
  }
  const minCount = Math.min(...candidates.map((c) => c.count))
  const atMin = candidates.filter((c) => c.count === minCount)
  if (atMin.length === 1) return atMin[0]!
  const noFlats = atMin.filter((c) => c.degrees.every((d) => d.alter >= 0))
  if (noFlats.length === 1) return noFlats[0]!
  throw new NotationInputError('Enharmonic spelling choice is ambiguous; this should not happen.')
}

interface StandardSignature {
  readonly accidental: 'sharp' | 'flat' | null
  readonly count: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  readonly letters: readonly Letter[]
}

/**
 * Intent: verify a candidate scale's non-zero alters form a standard key signature (all +1
 * following the sharp order, or all -1 following the flat order) and describe that signature.
 */
function standardSignatureOf(degrees: readonly SpelledPitchClass[]): StandardSignature {
  const nonZero = degrees.filter((d) => d.alter !== 0)
  if (nonZero.length === 0) return { accidental: null, count: 0, letters: [] }

  const allSharp = nonZero.every((d) => d.alter === 1)
  const allFlat = nonZero.every((d) => d.alter === -1)
  if (!allSharp && !allFlat) {
    throw new NotationInputError('Chosen spelling does not form a standard key signature.')
  }

  const order = allSharp ? SHARP_ORDER : FLAT_ORDER
  const count = nonZero.length as StandardSignature['count']
  const expected = order.slice(0, count)
  const actualSet = new Set(nonZero.map((d) => d.letter))
  const isPrefix = expected.every((letter) => actualSet.has(letter)) && actualSet.size === count
  if (!isPrefix) {
    throw new NotationInputError('Chosen spelling does not form a standard key signature.')
  }

  return { accidental: allSharp ? 'sharp' : 'flat', count, letters: expected }
}

/** Intent: look up the Ionian tonic sharing a standard signature's sharp/flat count. */
function ionianTonicFor(signature: StandardSignature): SpelledPitchClass {
  if (signature.accidental === 'flat') return FLAT_IONIAN_TONICS[signature.count]!
  return SHARP_IONIAN_TONICS[signature.count]!
}

/**
 * Intent: derive the written key for a written tonal center and its (unchanged) collection —
 * the fewest-accidental enharmonic spelling, sharp on a tie — and its standard key signature.
 */
// @spec-link [[module_notation_display_convention]]
export function spellWrittenKey(
  writtenTonic: PitchClassNumber,
  collection: Collection,
): WrittenKey {
  const offsets = COLLECTION_OFFSETS[collection]
  const candidates = candidatesForTonic(writtenTonic, offsets)
  const chosen = chooseCandidate(candidates)
  const signature = standardSignatureOf(chosen.degrees)
  const tonic = chosen.degrees[0]!

  return {
    tonic,
    collection,
    label: `${pitchClassText(tonic)} ${collection}`,
    scale: chosen.degrees,
    signature: {
      accidental: signature.accidental,
      count: signature.count,
      letters: signature.letters,
      ionianTonic: ionianTonicFor(signature),
    },
  }
}

/** Intent: find the written letter whose natural pitch class matches a given white-key pitch class. */
function whiteLetterFor(pc: PitchClassNumber): Letter {
  const found = LETTERS.find((letter) => NATURAL_PC[letter] === pc)
  if (found === undefined) {
    throw new NotationInputError(`Pitch class ${pc} is not a white key.`)
  }
  return found
}

/**
 * Intent: spell a pitch class in a written key — its in-scale spelling when it is one of the
 * key's seven scale degrees, otherwise the documented chromatic rule (natural letter for a white
 * key; the flat of the letter above for a black key when the key's signature is flat, otherwise
 * the sharp of the letter below).
 */
// @spec-link [[module_notation_display_convention]]
export function spellPitchClassInKey(pc: PitchClassNumber, key: WrittenKey): SpelledPitchClass {
  for (const degree of key.scale) {
    const actual = normalizePitchClass(NATURAL_PC[degree.letter] + degree.alter)
    if (actual === pc) return degree
  }

  const isWhiteKey = [0, 2, 4, 5, 7, 9, 11].includes(pc)
  if (isWhiteKey) return { letter: whiteLetterFor(pc), alter: 0 }

  const belowLetter = whiteLetterFor(normalizePitchClass(pc - 1))
  const aboveLetter = whiteLetterFor(normalizePitchClass(pc + 1))
  if (key.signature.accidental === 'flat') return { letter: aboveLetter, alter: -1 }
  return { letter: belowLetter, alter: 1 }
}

/**
 * Intent: spell an absolute MIDI pitch in a written key, deriving the written octave from the
 * chosen letter and alteration so that, for example, B♯3 and C♭5 both resolve to MIDI 60 and 71.
 * Rejects a non-integer MIDI value.
 */
// @spec-link [[module_notation_display_convention]]
export function spellMidiInKey(midi: number, key: WrittenKey): SpelledPitch {
  if (!Number.isInteger(midi)) {
    throw new NotationInputError(`MIDI pitch ${midi} must be an integer.`)
  }
  const pc = normalizePitchClass(midi)
  const spelled = spellPitchClassInKey(pc, key)
  const octaveNumerator = midi - spelled.alter - NATURAL_PC[spelled.letter]
  if (octaveNumerator % 12 !== 0) {
    throw new NotationInputError(`MIDI pitch ${midi} does not resolve to an integer octave.`)
  }
  const octave = octaveNumerator / 12 - 1
  return { letter: spelled.letter, alter: spelled.alter, octave }
}
