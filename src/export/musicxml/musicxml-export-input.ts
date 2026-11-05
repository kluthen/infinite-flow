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
 * A Jam's doodle as the MusicXML file opens with it: its length in 4/4 measures (1 to 4), the
 * quantized doodle written as a four-measure phrase (in the instrument's written pitch, the key
 * signature the Jam started with, its clef, no chord symbol), of which the file writes only the
 * doodle's own measures, and the tempo it was captured at.
 */
// @spec-link [[rule_jam_exports_open_with_doodle]]
export interface MusicXmlDoodleSection {
  readonly measureCount: number
  readonly writtenPhrase: WrittenPhrase
  readonly tempo: number
}

/**
 * The whole encoder input: the session's instrument profile and the phrases the file holds (every
 * phrase that sounded, or the favorites only), in session order, and, in a Jam only, the doodle the
 * file opens with. It has no field for played notes, and the run-time check rejects one.
 */
// @spec-link [[rule_generated_notes_musicxml_export]]
// @spec-link [[req_session_export]]
// @spec-link [[rule_export_contents_never_merged]]
// @spec-link [[rule_jam_exports_open_with_doodle]]
export interface GeneratedNotesMusicXmlInput {
  readonly instrument: InstrumentProfile
  readonly phrases: readonly MusicXmlSessionPhrase[]
  readonly doodle?: MusicXmlDoodleSection
}

const INPUT_KEYS: readonly string[] = ['instrument', 'phrases']
const JAM_INPUT_KEYS: readonly string[] = [...INPUT_KEYS, 'doodle']
const PHRASE_KEYS: readonly string[] = ['number', 'writtenPhrase', 'tempo']
const DOODLE_KEYS: readonly string[] = ['measureCount', 'writtenPhrase', 'tempo']
const MAX_DOODLE_MEASURES = 4

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

/**
 * Intent: crash early unless the phrase's (or the doodle's, `name` saying which) written pitch
 * belongs to the session's instrument.
 */
function assertSameTransposition(
  phrase: Pick<MusicXmlSessionPhrase, 'writtenPhrase'>,
  instrument: InstrumentProfile,
  name: string,
): void {
  const phraseTransposition = phrase.writtenPhrase.transposition
  if (
    phraseTransposition.chromatic !== instrument.transposition.chromatic ||
    phraseTransposition.diatonic !== instrument.transposition.diatonic
  ) {
    throw new MusicXmlExportError(
      `${name} is written for transposition ` +
        `${phraseTransposition.chromatic}/${phraseTransposition.diatonic}, not the instrument's ` +
        `${instrument.transposition.chromatic}/${instrument.transposition.diatonic}.`,
    )
  }
}

/**
 * Intent: crash early unless a Jam's doodle section has exactly its fields, 1 to 4 measures, a
 * positive whole-number tempo, and is written for the session's instrument.
 */
// @spec-link [[rule_jam_exports_open_with_doodle]]
function assertDoodle(doodle: MusicXmlDoodleSection, instrument: InstrumentProfile): void {
  assertExactKeys(doodle, DOODLE_KEYS, 'The doodle section')
  const { measureCount, tempo } = doodle
  if (!Number.isInteger(measureCount) || measureCount < 1 || measureCount > MAX_DOODLE_MEASURES) {
    throw new MusicXmlExportError(
      `The doodle must last 1 to ${MAX_DOODLE_MEASURES} whole measures, got ${measureCount}.`,
    )
  }
  if (!Number.isInteger(tempo) || tempo <= 0) {
    throw new MusicXmlExportError(
      `The doodle tempo must be a positive whole number of BPM, got ${tempo}.`,
    )
  }
  assertSameTransposition(doodle, instrument, 'The doodle')
}

/**
 * Intent: reject an encoder input that breaks the contract: an extra field on the input or on a
 * phrase (a played-note list among them), an empty session, phrase numbers that are not whole
 * numbers from 1 up, each above the one before, a tempo that is not a positive whole number of beats per minute, or a phrase
 * written for another instrument's transposition; in a Jam's input, a doodle section that is not
 * 1 to 4 measures at such a tempo, written for the instrument.
 */
// @spec-link [[rule_generated_notes_musicxml_export]]
// @spec-link [[req_session_export]]
// @spec-link [[rule_export_contents_never_merged]]
// @spec-link [[rule_favorites_only_export]]
// @spec-link [[rule_jam_exports_open_with_doodle]]
export function validateMusicXmlExportInput(input: GeneratedNotesMusicXmlInput): void {
  const inputKeys = Object.hasOwn(input, 'doodle') ? JAM_INPUT_KEYS : INPUT_KEYS
  assertExactKeys(input, inputKeys, 'The MusicXML export input')
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
    assertSameTransposition(phrase, input.instrument, `Phrase ${phrase.number}`)
  })
  if (input.doodle !== undefined) assertDoodle(input.doodle, input.instrument)
}
