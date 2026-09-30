/**
 * Note identity for the engraved score: names every written glyph of a written phrase with the
 * identity of the attack it sounds as, the same ExpectedNoteIdentity acknowledgement reports, so a
 * session overlay can point at a note of the score. Pure: no engraving library, no DOM.
 */
import type { ExpectedNoteIdentity } from '../domain/acknowledgement/expected-note'
import type { WrittenPhrase } from '../domain/notation/written-phrase-types'

/** Typed failure for a phrase number or a written phrase that cannot yield glyph identities. */
// @spec-link [[module_notation_note_identity_overlays]]
export class NoteIdentityError extends Error {
  readonly kind = 'NoteIdentityError' as const

  constructor(message: string) {
    super(message)
    this.name = 'NoteIdentityError'
  }
}

/**
 * Intent: resolve every written glyph, measure by measure in `measure.events` order, to the
 * identity of the attack it sounds as. A fresh attack takes its measure's index and its source
 * event index (its index among the measure's concert events, rests included); a glyph tied from
 * the previous glyph (a split inside the measure, or a tie continuation across a barline, whatever
 * system the glyphs are drawn in) takes the identity of the attack it continues; a rest takes none.
 * Rejects a phrase number that is not a positive integer, and a tied glyph whose previous glyph in
 * phrase order is not a note tied to it: the written model is malformed, never guessed around.
 */
// @spec-link [[module_notation_note_identity_overlays]]
// @spec-link [[rule_expected_note_window]]
export function resolveGlyphIdentities(
  phrase: WrittenPhrase,
  phraseNumber: number,
): readonly (readonly (ExpectedNoteIdentity | null)[])[] {
  if (!Number.isInteger(phraseNumber) || phraseNumber < 1) {
    throw new NoteIdentityError(`Phrase number must be a positive integer, got ${phraseNumber}.`)
  }
  // The attack the next glyph may continue: set by a note glyph that ties to the next one.
  let tiedAttack: ExpectedNoteIdentity | null = null
  return phrase.measures.map((measure) =>
    measure.events.map((event, glyphIndex) => {
      if (event.kind === 'rest') {
        tiedAttack = null
        return null
      }
      let identity: ExpectedNoteIdentity
      if (event.tieFromPrevious) {
        if (tiedAttack === null) {
          throw new NoteIdentityError(
            `Glyph ${glyphIndex} of measure ${measure.index} is tied from a previous glyph that is not a note tied to it.`,
          )
        }
        identity = tiedAttack
      } else {
        identity = { phraseNumber, measureIndex: measure.index, eventIndex: event.sourceEventIndex }
      }
      tiedAttack = event.tieToNext ? identity : null
      return identity
    }),
  )
}

/**
 * Intent: the string an identity is written as on the engraved score's tagged parts,
 * `<phraseNumber>:<measureIndex>:<eventIndex>`.
 */
// @spec-link [[module_notation_note_identity_overlays]]
export function noteIdentityKey(identity: ExpectedNoteIdentity): string {
  return `${identity.phraseNumber}:${identity.measureIndex}:${identity.eventIndex}`
}
