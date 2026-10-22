/**
 * Readable names for the headless phrase replay report: concert pitches and pitch classes spelled
 * in the phrase's concert key, written pitches read back from the notation path's own spelling,
 * and the carry-in restated with named pitches (and its carried chord, when one was carried).
 * Every name comes from the notation pitch-spelling helpers; this module holds no transposition
 * logic of its own.
 */

import {
  PITCH_CLASSES,
  type Collection,
  type PitchClass,
} from '../domain/controls/generation-controls'
import { isPhraseCarryIn, type CarryIn } from '../domain/generation/carry-in/carry-in'
import type { CarriedHarmony } from '../domain/harmony/harmony-join'
import type { DiatonicTriad, PitchClassNumber } from '../domain/harmony/harmony-types'
import { CHORD_SUFFIX_BY_TRIAD_QUALITY } from '../domain/notation/notation-input'
import {
  naturalPitchClassOf,
  pitchClassText,
  spellMidiInKey,
  spellPitchClassInKey,
  spellWrittenKey,
} from '../domain/notation/pitch-spelling'
import type { SpelledPitch, WrittenKey } from '../domain/notation/written-phrase-types'

/** A MIDI note number beside its spelled name, for example `{ midi: 66, name: 'F♯4' }`. */
// @spec-link [[service_headless_phrase_replay]]
export interface NamedPitch {
  readonly midi: number
  readonly name: string
}

/** A MIDI range (register window or concert range) beside the names of its two bounds. */
// @spec-link [[service_headless_phrase_replay]]
export interface NamedMidiRange {
  readonly minMidi: number
  readonly maxMidi: number
  readonly minName: string
  readonly maxName: string
}

/** A carried chord restated readably: its concert symbol and named pitch classes. */
// @spec-link [[service_headless_phrase_replay]]
export interface NamedCarriedChord {
  readonly symbol: string
  readonly degree: number
  readonly quality: DiatonicTriad['quality']
  readonly pitchClasses: readonly number[]
  readonly pitchClassNames: readonly string[]
  readonly role: CarriedHarmony['role']
  readonly endpointClass: CarriedHarmony['endpoint']['kind']
}

/** The readable additions placed beside a verbatim carry-in from a phrase. */
// @spec-link [[service_headless_phrase_replay]]
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
export interface PhraseCarryInNames {
  readonly phraseNumber: number
  readonly lastPitch: NamedPitch
  readonly registerWindow: NamedMidiRange
  /** The carried chord named; null when a key or collection change dropped the harmony. */
  readonly finalChord: NamedCarriedChord | null
}

/** The readable additions placed beside a verbatim carry-in from no phrase: no number, no chord. */
// @spec-link [[service_headless_phrase_replay]]
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
export interface NoPhraseCarryInNames {
  readonly origin: 'none'
  readonly lastPitch: NamedPitch
  readonly registerWindow: NamedMidiRange
  readonly finalChord: null
}

/** The readable additions placed beside a verbatim carry-in, whatever its origin. */
// @spec-link [[service_headless_phrase_replay]]
export type CarryInNames = PhraseCarryInNames | NoPhraseCarryInNames

/**
 * Intent: the pitch-class number of a tonal center, crashing on a value outside the closed
 * pitch-class vocabulary rather than guessing one.
 */
function pitchClassNumberOf(tonalCenter: PitchClass): PitchClassNumber {
  const index = PITCH_CLASSES.indexOf(tonalCenter)
  if (index < 0) throw new RangeError(`Unknown tonal center "${String(tonalCenter)}".`)
  return index as PitchClassNumber
}

/**
 * Intent: the spelled key of a tonal center and collection, through the notation path's own key
 * speller (used for the concert key with the concert tonal center, and the written key with the
 * written tonal center).
 */
// @spec-link [[service_headless_phrase_replay]]
export function keyFor(tonalCenter: PitchClass, collection: Collection): WrittenKey {
  return spellWrittenKey(pitchClassNumberOf(tonalCenter), collection)
}

/** Intent: render a spelled pitch as its letter, accidental and octave, for example 'B♭3'. */
// @spec-link [[service_headless_phrase_replay]]
export function spelledPitchName(pitch: SpelledPitch): string {
  return `${pitchClassText(pitch)}${pitch.octave}`
}

/**
 * Intent: the MIDI number a spelled pitch denotes, read back from its letter, alteration and
 * octave (C4 = 60, B♯3 = 60), so a written pitch's number comes from the notation path's spelling.
 */
// @spec-link [[service_headless_phrase_replay]]
export function midiOfSpelledPitch(pitch: SpelledPitch): number {
  return (pitch.octave + 1) * 12 + naturalPitchClassOf(pitch.letter) + pitch.alter
}

/** Intent: a MIDI pitch beside its name spelled in the given key. */
// @spec-link [[service_headless_phrase_replay]]
export function namedPitchInKey(midi: number, key: WrittenKey): NamedPitch {
  return { midi, name: spelledPitchName(spellMidiInKey(midi, key)) }
}

/** Intent: a pitch-class number's name spelled in the given key, for example 'F♯'. */
// @spec-link [[service_headless_phrase_replay]]
export function pitchClassNameInKey(pc: PitchClassNumber, key: WrittenKey): string {
  return pitchClassText(spellPitchClassInKey(pc, key))
}

/** Intent: a MIDI range beside its two bound names, spelled in the given key. */
// @spec-link [[service_headless_phrase_replay]]
export function namedRange(
  range: { readonly minMidi: number; readonly maxMidi: number },
  key: WrittenKey,
): NamedMidiRange {
  return {
    minMidi: range.minMidi,
    maxMidi: range.maxMidi,
    minName: namedPitchInKey(range.minMidi, key).name,
    maxName: namedPitchInKey(range.maxMidi, key).name,
  }
}

/** Intent: the root-position concert chord symbol of a triad, spelled in the given key. */
// @spec-link [[service_headless_phrase_replay]]
export function triadSymbolInKey(triad: DiatonicTriad, key: WrittenKey): string {
  return `${pitchClassNameInKey(triad.pitchClasses[0], key)}${CHORD_SUFFIX_BY_TRIAD_QUALITY[triad.quality]}`
}

/** Intent: restate a carried chord readably: its symbol and pitch classes spelled in the key. */
function namedCarriedChord(harmony: CarriedHarmony, concertKey: WrittenKey): NamedCarriedChord {
  const { triad, role, endpoint } = harmony
  return {
    symbol: triadSymbolInKey(triad, concertKey),
    degree: triad.degree,
    quality: triad.quality,
    pitchClasses: triad.pitchClasses,
    pitchClassNames: triad.pitchClasses.map((pc) => pitchClassNameInKey(pc, concertKey)),
    role,
    endpointClass: endpoint.kind,
  }
}

/**
 * Intent: restate a carry-in readably (named last pitch, window bounds and final chord); a dropped
 * harmony stays an explicit null chord. A carry-in from no phrase is named by its origin, with no
 * phrase number and no chord.
 */
// @spec-link [[service_headless_phrase_replay]]
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
export function carryInNames(carryIn: CarryIn, concertKey: WrittenKey): CarryInNames {
  if (!isPhraseCarryIn(carryIn))
    return {
      origin: 'none',
      lastPitch: namedPitchInKey(carryIn.lastPitch.midi, concertKey),
      registerWindow: namedRange(carryIn.registerWindow, concertKey),
      finalChord: null,
    }
  return {
    phraseNumber: carryIn.phraseNumber,
    lastPitch: namedPitchInKey(carryIn.lastPitch.midi, concertKey),
    registerWindow: namedRange(carryIn.registerWindow, concertKey),
    finalChord:
      carryIn.finalHarmony === null ? null : namedCarriedChord(carryIn.finalHarmony, concertKey),
  }
}
