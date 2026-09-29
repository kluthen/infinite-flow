/**
 * The score-level marks the MusicXML export writes around the phrases: the opening attributes
 * (divisions, written key signature, 4/4, treble G2 clef, and the instrument's transposition),
 * a key-signature change, the rehearsal mark and metronome mark that open a phrase, and the double
 * barline that closes one.
 */
import type { Collection } from '@/domain/controls/generation-controls'
import type { WrittenKey } from '@/domain/notation/written-phrase-types'
import type { InstrumentTransposition } from '@/domain/profile/instrument-profile'
import { DIVISIONS_PER_QUARTER } from './musicxml-measure'
import { element, textElement, type XmlElement } from './xml-text'

const LETTERS_PER_OCTAVE = 7
const SEMITONES_PER_OCTAVE = 12

const MODE_BY_COLLECTION: Readonly<Record<Collection, string>> = {
  Major: 'major',
  Minor: 'minor',
  Ionian: 'ionian',
  Dorian: 'dorian',
  Phrygian: 'phrygian',
  Lydian: 'lydian',
  Mixolydian: 'mixolydian',
  Aeolian: 'aeolian',
  Locrian: 'locrian',
}

/** Intent: a written key as a key element: signed sharp/flat count, then the mode. */
// @spec-link [[rule_generated_notes_musicxml_export]]
export function keyElement(key: WrittenKey): XmlElement {
  const count = key.signature.accidental === 'flat' ? -key.signature.count : key.signature.count
  return element(
    'key',
    [],
    [textElement('fifths', count), textElement('mode', MODE_BY_COLLECTION[key.collection])],
  )
}

/** Intent: whether two written keys print the same key element. */
export function sameKey(a: WrittenKey, b: WrittenKey): boolean {
  return (
    a.signature.accidental === b.signature.accidental &&
    a.signature.count === b.signature.count &&
    a.collection === b.collection
  )
}

/**
 * Intent: the instrument's transposition as a transpose element, or null for an instrument that
 * does not transpose. The instrument profile says how far written pitch sits above concert pitch;
 * MusicXML asks the opposite, what to add to the written pitch to get the sounding pitch, so both
 * counts change sign. Whole octaves go to `octave-change`, leaving `diatonic` and `chromatic`
 * within an octave: the B-flat tenor (written a major ninth up) becomes diatonic -1, chromatic -2,
 * octave-change -1.
 */
// @spec-link [[rule_generated_notes_musicxml_export]]
// @spec-link [[entity_instrument_profile]]
export function transposeElement(transposition: InstrumentTransposition): XmlElement | null {
  if (transposition.chromatic === 0 && transposition.diatonic === 0) return null
  const diatonic = -transposition.diatonic
  const chromatic = -transposition.chromatic
  const octaves = Math.trunc(diatonic / LETTERS_PER_OCTAVE)
  const children = [
    textElement('diatonic', diatonic - octaves * LETTERS_PER_OCTAVE),
    textElement('chromatic', chromatic - octaves * SEMITONES_PER_OCTAVE),
  ]
  if (octaves !== 0) children.push(textElement('octave-change', octaves))
  return element('transpose', [], children)
}

/** Intent: the attributes of the score's first measure. */
// @spec-link [[rule_generated_notes_musicxml_export]]
export function openingAttributes(
  key: WrittenKey,
  transposition: InstrumentTransposition,
): XmlElement {
  const transpose = transposeElement(transposition)
  return element(
    'attributes',
    [],
    [
      textElement('divisions', DIVISIONS_PER_QUARTER),
      keyElement(key),
      element('time', [], [textElement('beats', 4), textElement('beat-type', 4)]),
      element('clef', [], [textElement('sign', 'G'), textElement('line', 2)]),
      ...(transpose === null ? [] : [transpose]),
    ],
  )
}

/** Intent: the attributes of a phrase's first measure when its key differs from the one before. */
export function keyChangeAttributes(key: WrittenKey): XmlElement {
  return element('attributes', [], [keyElement(key)])
}

/** Intent: the rehearsal mark that opens a phrase, holding its session phrase number. */
// @spec-link [[rule_generated_notes_musicxml_export]]
export function rehearsalMark(phraseNumber: number): XmlElement {
  return element(
    'direction',
    [['placement', 'above']],
    [element('direction-type', [], [textElement('rehearsal', phraseNumber)])],
  )
}

/** Intent: a metronome mark (quarter note = tempo) with the matching playback tempo. */
// @spec-link [[rule_generated_notes_musicxml_export]]
export function metronomeMark(tempo: number): XmlElement {
  return element(
    'direction',
    [['placement', 'above']],
    [
      element(
        'direction-type',
        [],
        [
          element(
            'metronome',
            [],
            [textElement('beat-unit', 'quarter'), textElement('per-minute', tempo)],
          ),
        ],
      ),
      element('sound', [['tempo', String(tempo)]]),
    ],
  )
}

/** Intent: the double barline (light-light) that closes a phrase. */
// @spec-link [[rule_generated_notes_musicxml_export]]
export function phraseEndBarline(): XmlElement {
  return element('barline', [['location', 'right']], [textElement('bar-style', 'light-light')])
}
