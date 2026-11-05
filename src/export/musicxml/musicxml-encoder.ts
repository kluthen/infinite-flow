/**
 * The generated-notes MusicXML encoder: a pure function from a session's phrases to one
 * score-partwise 4.0 document. One part, in the instrument's written pitch, with a transpose
 * element for a transposing instrument. The phrases the file holds sit back to back, four measures
 * each, the first one opening the score; phrase n's measures are numbered from (n − 1) × 4 + 1, so a
 * whole session's run from 1 and a favorites-only file keeps each phrase's session measure numbers
 * (phrases 2, 5 and 6: measures 5–8, 17–20 and 21–24). Every phrase opens with a rehearsal mark
 * holding its phrase number and closes with a double barline, except the last phrase, which closes
 * with a final (light-heavy) barline; a metronome mark opens the score and
 * every phrase whose tempo differs from the one before; a key signature is written again where a
 * phrase's written key differs from the one before. The output depends only on the input, so the
 * same session always gives the same bytes.
 */
import type { WrittenMeasure } from '@/domain/notation/written-phrase-types'
import {
  type GeneratedNotesMusicXmlInput,
  type MusicXmlDoodleSection,
  type MusicXmlSessionPhrase,
  validateMusicXmlExportInput,
} from './musicxml-export-input'
import {
  DOODLE_REHEARSAL,
  keyChangeAttributes,
  metronomeMark,
  openingAttributes,
  phraseEndBarline,
  rehearsalMark,
  sameKey,
  sessionEndBarline,
} from './musicxml-marks'
import { measureContent } from './musicxml-measure'
import { element, serializeXmlDocument, textElement, type XmlElement } from './xml-text'

const PART_ID = 'P1'
const MEASURES_PER_PHRASE = 4

const PROLOG: readonly string[] = [
  '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
  '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" ' +
    '"http://www.musicxml.org/dtds/partwise.dtd">',
]

/**
 * Intent: the marks that open a phrase's first measure, in order: the attributes (the opening
 * ones for the file's first phrase, a key change for a later phrase in a new key), the rehearsal mark, and the
 * metronome mark when the tempo is new.
 */
function phraseOpening(
  phrase: MusicXmlSessionPhrase,
  previous: Omit<MusicXmlSessionPhrase, 'number'> | null,
  input: GeneratedNotesMusicXmlInput,
): XmlElement[] {
  const key = phrase.writtenPhrase.key
  const opening: XmlElement[] = []
  if (previous === null) {
    opening.push(openingAttributes(key, input.instrument.transposition, phrase.writtenPhrase.clef))
  } else if (!sameKey(previous.writtenPhrase.key, key)) {
    opening.push(keyChangeAttributes(key))
  }
  opening.push(rehearsalMark(phrase.number))
  if (previous === null || previous.tempo !== phrase.tempo)
    opening.push(metronomeMark(phrase.tempo))
  return opening
}

/**
 * Intent: the four measure elements of one phrase, numbered on from its session measure number,
 * (n − 1) × 4 + 1 for phrase n, the last closed by a final barline when the phrase is the file's
 * last and by a double barline otherwise.
 */
// @spec-link [[rule_favorites_only_export]]
function phraseMeasures(
  phrase: MusicXmlSessionPhrase,
  previous: Omit<MusicXmlSessionPhrase, 'number'> | null,
  isLastPhrase: boolean,
  input: GeneratedNotesMusicXmlInput,
): XmlElement[] {
  const doodleMeasures = input.doodle?.measureCount ?? 0
  const firstMeasureNumber = doodleMeasures + (phrase.number - 1) * MEASURES_PER_PHRASE + 1
  const endBarline = isLastPhrase ? sessionEndBarline() : phraseEndBarline()
  return phrase.writtenPhrase.measures.map((measure: WrittenMeasure, index) => {
    const opening = index === 0 ? phraseOpening(phrase, previous, input) : []
    const closing = index === MEASURES_PER_PHRASE - 1 ? [endBarline] : []
    return element(
      'measure',
      [['number', String(firstMeasureNumber + index)]],
      [...opening, ...measureContent(measure), ...closing],
    )
  })
}

/**
 * Intent: the measures of a Jam's doodle section, numbered from 1: the first opening the score
 * (its attributes in the doodle's key and clef, the rehearsal mark "Doodle", a metronome mark at
 * its capture tempo), the last closed by a double barline, the phrases following.
 */
// @spec-link [[rule_jam_exports_open_with_doodle]]
// @spec-link [[rule_jam_exports_line_up]]
function doodleSectionMeasures(
  doodle: MusicXmlDoodleSection,
  input: GeneratedNotesMusicXmlInput,
): XmlElement[] {
  const { writtenPhrase, measureCount, tempo } = doodle
  return writtenPhrase.measures.slice(0, measureCount).map((measure: WrittenMeasure, index) => {
    const opening =
      index === 0
        ? [
            openingAttributes(
              writtenPhrase.key,
              input.instrument.transposition,
              writtenPhrase.clef,
            ),
            rehearsalMark(DOODLE_REHEARSAL),
            metronomeMark(tempo),
          ]
        : []
    const closing = index === measureCount - 1 ? [phraseEndBarline()] : []
    return element(
      'measure',
      [['number', String(index + 1)]],
      [...opening, ...measureContent(measure), ...closing],
    )
  })
}

/**
 * Intent: encode a session's generated notes (every phrase, or the favorites only) as one MusicXML
 * (score-partwise 4.0) document, a Jam's opening with its doodle.
 * Validates the input first and crashes with a MusicXmlExportError on any breach; never takes or
 * writes a played note.
 */
// @spec-link [[rule_generated_notes_musicxml_export]]
// @spec-link [[req_session_export]]
// @spec-link [[rule_jam_exports_open_with_doodle]]
export function encodeGeneratedNotesMusicXml(input: GeneratedNotesMusicXmlInput): string {
  validateMusicXmlExportInput(input)
  const doodle = input.doodle ?? null
  const measures = [
    ...(doodle === null ? [] : doodleSectionMeasures(doodle, input)),
    ...input.phrases.flatMap((phrase, position) =>
      phraseMeasures(
        phrase,
        position === 0 ? doodle : input.phrases[position - 1]!,
        position === input.phrases.length - 1,
        input,
      ),
    ),
  ]
  const score = element(
    'score-partwise',
    [['version', '4.0']],
    [
      element(
        'identification',
        [],
        [element('encoding', [], [textElement('software', 'Infinite Flow')])],
      ),
      element(
        'part-list',
        [],
        [
          element(
            'score-part',
            [['id', PART_ID]],
            [textElement('part-name', input.instrument.displayName)],
          ),
        ],
      ),
      element('part', [['id', PART_ID]], measures),
    ],
  )
  return serializeXmlDocument(PROLOG, score)
}
