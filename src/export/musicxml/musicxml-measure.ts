/**
 * The contents of one written measure as MusicXML: its notes and rests exactly as the staff
 * engraves them (spelled written pitch, displayed accidentals, notated durations and dots, ties,
 * beam groups) and its chord symbols as harmony elements, each placed right before the note or rest
 * it starts on. Nothing is re-decided here: every value comes from the written-phrase model.
 */
import type {
  DisplayedAccidental,
  NoteValue,
  SpelledPitchClass,
  WrittenChordSymbol,
  WrittenEvent,
  WrittenMeasure,
  WrittenNote,
} from '@/domain/notation/written-phrase-types'
import { MusicXmlExportError } from './musicxml-export-input'
import { element, textElement, type XmlElement, type XmlNode } from './xml-text'

/** Divisions per quarter note: the written phrase's sixteenth-note tick is one division. */
export const DIVISIONS_PER_QUARTER = 4

const NOTE_TYPE: Readonly<Record<NoteValue, string>> = {
  whole: 'whole',
  half: 'half',
  quarter: 'quarter',
  eighth: 'eighth',
  sixteenth: '16th',
}

const ACCIDENTAL: Readonly<Record<DisplayedAccidental, string>> = {
  'double-flat': 'flat-flat',
  flat: 'flat',
  natural: 'natural',
  sharp: 'sharp',
  'double-sharp': 'double-sharp',
}

/**
 * The MusicXML chord kind for every chord-symbol suffix the written phrase can carry. The kind's
 * `text` attribute repeats the suffix, so a notation program prints the symbol as the staff does.
 */
const CHORD_KIND_BY_SUFFIX: Readonly<Record<string, string>> = {
  '': 'major',
  m: 'minor',
  dim: 'diminished',
}

/** Intent: a pitch step element pair (step, then alter when the letter is altered). */
function stepAndAlter(prefix: '' | 'root-' | 'bass-', pitch: SpelledPitchClass): XmlElement[] {
  const step = textElement(`${prefix}step`, pitch.letter)
  return pitch.alter === 0 ? [step] : [step, textElement(`${prefix}alter`, pitch.alter)]
}

/** Intent: one chord symbol as a harmony element: root, kind with its printed suffix, bass. */
// @spec-link [[rule_generated_notes_musicxml_export]]
export function harmonyElement(chord: WrittenChordSymbol): XmlElement {
  const kind = CHORD_KIND_BY_SUFFIX[chord.suffix]
  if (kind === undefined) {
    throw new MusicXmlExportError(
      `Chord symbol ${chord.text} has suffix '${chord.suffix}', which has no MusicXML chord kind.`,
    )
  }
  const children: XmlElement[] = [
    element('root', [], stepAndAlter('root-', chord.root)),
    element('kind', [['text', chord.suffix]], [kind]),
  ]
  if (chord.bass !== null) children.push(element('bass', [], stepAndAlter('bass-', chord.bass)))
  return element('harmony', [], children)
}

/**
 * Intent: the second beam level of one note in a beam group: sixteenths joined to a neighbouring
 * sixteenth get begin/continue/end, a lone sixteenth gets a hook pointing into the group.
 */
function secondBeamLevel(group: readonly WrittenNote[], position: number): string | null {
  const isSixteenth = (index: number): boolean => group[index]?.duration.value === 'sixteenth'
  if (!isSixteenth(position)) return null
  const joinedBefore = isSixteenth(position - 1)
  const joinedAfter = isSixteenth(position + 1)
  if (joinedBefore && joinedAfter) return 'continue'
  if (joinedBefore) return 'end'
  if (joinedAfter) return 'begin'
  return position === 0 ? 'forward hook' : 'backward hook'
}

/** Intent: the beam elements of every beamed event in a measure, keyed by event index. */
function beamsByEvent(measure: WrittenMeasure): ReadonlyMap<number, readonly XmlElement[]> {
  const beams = new Map<number, XmlElement[]>()
  for (const group of measure.beamGroups) {
    const notes = group.map((index) => {
      const event = measure.events[index]
      if (event?.kind !== 'note') {
        throw new MusicXmlExportError(
          `Measure ${measure.index} beam group points at event ${index}, which is not a note.`,
        )
      }
      return event
    })
    group.forEach((eventIndex, position) => {
      const first = position === 0
      const last = position === group.length - 1
      const level1 = first ? 'begin' : last ? 'end' : 'continue'
      const elements = [element('beam', [['number', '1']], [level1])]
      const level2 = secondBeamLevel(notes, position)
      if (level2 !== null) elements.push(element('beam', [['number', '2']], [level2]))
      beams.set(eventIndex, elements)
    })
  }
  return beams
}

/** Intent: the tie elements (sound) and tied notations (drawing) of one note, stop before start. */
function tieElements(note: WrittenNote): { ties: XmlElement[]; tied: XmlElement[] } {
  const types = [...(note.tieFromPrevious ? ['stop'] : []), ...(note.tieToNext ? ['start'] : [])]
  return {
    ties: types.map((type) => element('tie', [['type', type]])),
    tied: types.map((type) => element('tied', [['type', type]])),
  }
}

/** Intent: one written note or rest as a note element, in the schema's child order. */
// @spec-link [[rule_generated_notes_musicxml_export]]
export function noteElement(event: WrittenEvent, beams: readonly XmlElement[]): XmlElement {
  const duration = textElement('duration', event.duration.ticks)
  const voice = textElement('voice', 1)
  const type = textElement('type', NOTE_TYPE[event.duration.value])
  const dots = Array.from({ length: event.duration.dots }, () => element('dot'))
  if (event.kind === 'rest') {
    return element('note', [], [element('rest'), duration, voice, type, ...dots])
  }
  const pitch = element(
    'pitch',
    [],
    [...stepAndAlter('', event.pitch), textElement('octave', event.pitch.octave)],
  )
  const { ties, tied } = tieElements(event)
  const accidental =
    event.accidental === null ? [] : [textElement('accidental', ACCIDENTAL[event.accidental])]
  const notations = tied.length === 0 ? [] : [element('notations', [], tied)]
  return element(
    'note',
    [],
    [pitch, duration, ...ties, voice, type, ...dots, ...accidental, ...beams, ...notations],
  )
}

/**
 * Intent: every note, rest and chord symbol of one written measure, in time order, each chord
 * symbol right before the event that starts on its tick. Crashes early on a chord symbol that
 * starts on no event, which the written-phrase model rules out.
 */
// @spec-link [[rule_generated_notes_musicxml_export]]
export function measureContent(measure: WrittenMeasure): XmlNode[] {
  const beams = beamsByEvent(measure)
  const placed = new Set<WrittenChordSymbol>()
  const content: XmlNode[] = []
  measure.events.forEach((event, index) => {
    for (const chord of measure.chords) {
      if (chord.startTick === event.startTick) {
        content.push(harmonyElement(chord))
        placed.add(chord)
      }
    }
    content.push(noteElement(event, beams.get(index) ?? []))
  })
  if (placed.size !== measure.chords.length) {
    throw new MusicXmlExportError(
      `Measure ${measure.index} has a chord symbol that starts on no note or rest.`,
    )
  }
  return content
}
