/**
 * The input of the generated-notes MusicXML encoder, and its boundary check. A session reaches the
 * encoder as its instrument plus its phrases in session order, each phrase carrying only its
 * session number, the written phrase the staff showed, and the tempo it played at. Nothing else
 * can travel with it: in particular, no note the player played. MusicXML only ever holds generated
 * notes, because unquantized playing cannot be engraved faithfully and quantizing it would
 * misrepresent what was played. The check below rejects any extra field at run time, so the type
 * and the value agree on that.
 */
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'

/** Typed failure for an encoder input that breaks the encoder's contract; never repaired. */
// @spec-link [[rule_generated_notes_musicxml_export]]
export class MusicXmlExportError extends Error {
  readonly kind = 'MusicXmlExportError' as const

  constructor(message: string) {
    super(message)
    this.name = 'MusicXmlExportError'
  }
}

/**
 * One phrase of the session as the export sees it: its session phrase number (1 for the first
 * phrase that sounded; a favorites-only file keeps each phrase's own), the written phrase exactly as the staff showed it, and its tempo in quarter
 * notes per minute.
 */
// @spec-link [[rule_generated_notes_musicxml_export]]
// @spec-link [[req_session_export]]
export interface MusicXmlSessionPhrase {
  readonly number: number
  readonly writtenPhrase: WrittenPhrase
  readonly tempo: number
}

/**
 * The whole encoder input: the session's instrument profile and the phrases the file holds (every
 * phrase that sounded, or the favorites only), in session order. It has no field for played notes, and the run-time check rejects one.
 */
// @spec-link [[rule_generated_notes_musicxml_export]]
// @spec-link [[req_session_export]]
// @spec-link [[rule_export_contents_never_merged]]
export interface GeneratedNotesMusicXmlInput {
  readonly instrument: InstrumentProfile
  readonly phrases: readonly MusicXmlSessionPhrase[]
}

const INPUT_KEYS: readonly string[] = ['instrument', 'phrases']
const PHRASE_KEYS: readonly string[] = ['number', 'writtenPhrase', 'tempo']

/** Intent: crash early unless `value` has exactly the named own keys, no more and no fewer. */
function assertExactKeys(value: object, expected: readonly string[], what: string): void {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new MusicXmlExportError(
      `${what} must have exactly the fields ${wanted.join(', ')}; got ${actual.join(', ')}.`,
    )
  }
}

/** Intent: crash early unless the phrase's written pitch belongs to the session's instrument. */
function assertSameTransposition(
  phrase: MusicXmlSessionPhrase,
  instrument: InstrumentProfile,
): void {
  const phraseTransposition = phrase.writtenPhrase.transposition
  if (
    phraseTransposition.chromatic !== instrument.transposition.chromatic ||
    phraseTransposition.diatonic !== instrument.transposition.diatonic
  ) {
    throw new MusicXmlExportError(
      `Phrase ${phrase.number} is written for transposition ` +
        `${phraseTransposition.chromatic}/${phraseTransposition.diatonic}, not the instrument's ` +
        `${instrument.transposition.chromatic}/${instrument.transposition.diatonic}.`,
    )
  }
}

/**
 * Intent: reject an encoder input that breaks the contract: an extra field on the input or on a
 * phrase (a played-note list among them), an empty session, phrase numbers that are not whole
 * numbers from 1 up, each above the one before, a tempo that is not a positive whole number of beats per minute, or a phrase
 * written for another instrument's transposition.
 */
// @spec-link [[rule_generated_notes_musicxml_export]]
// @spec-link [[req_session_export]]
// @spec-link [[rule_export_contents_never_merged]]
// @spec-link [[rule_favorites_only_export]]
export function validateMusicXmlExportInput(input: GeneratedNotesMusicXmlInput): void {
  assertExactKeys(input, INPUT_KEYS, 'The MusicXML export input')
  if (input.phrases.length === 0) {
    throw new MusicXmlExportError('A MusicXML export needs at least one phrase.')
  }
  input.phrases.forEach((phrase, position) => {
    assertExactKeys(phrase, PHRASE_KEYS, `Phrase at position ${position}`)
    const floor = position === 0 ? 1 : input.phrases[position - 1]!.number + 1
    if (!Number.isInteger(phrase.number) || phrase.number < floor) {
      throw new MusicXmlExportError(
        `Phrases must be numbered from 1 up in session order, each above the one before; ` +
          `position ${position} holds phrase ${phrase.number}.`,
      )
    }
    if (!Number.isInteger(phrase.tempo) || phrase.tempo <= 0) {
      throw new MusicXmlExportError(
        `Phrase ${phrase.number} tempo must be a positive whole number of BPM, got ${phrase.tempo}.`,
      )
    }
    assertSameTransposition(phrase, input.instrument)
  })
}
