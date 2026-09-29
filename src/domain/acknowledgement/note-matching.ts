/**
 * Matching played notes to expected notes. A played note acknowledges an expected note only when
 * its concert pitch is exactly the expected one, octave included, and its latency-corrected onset
 * lies inside that note's window. Each expected note is acknowledged at most once, by the earliest
 * unacknowledged expected note whose window holds the onset and whose pitch matches.
 *
 * The only output is the identities of the acknowledged expected notes. A played note that matches
 * nothing (a wrong pitch, an extra note of a chord, a note outside every window) leaves no trace
 * here: there is no miss, no wrong note and no score to report, because the app never signals
 * anything but a positive catch.
 */

import { deepFreeze } from '../events/deep-freeze'
import { type ExpectedNoteIdentity } from './expected-note'
import { type WindowedExpectedNote } from './acknowledgement-window'
import { type PlayedNote } from './played-onset-latency'

/**
 * Intent: match one played note against the windowed expected notes, given the identities already
 * acknowledged. Returns the identity it newly acknowledges (a list of one), or an empty list.
 */
// @spec-link [[rule_acknowledgement_exact_pitch]]
// @spec-link [[rule_no_grading_or_mismatch_signal]]
export function acknowledgePlayedNote(
  expected: readonly WindowedExpectedNote[],
  alreadyAcknowledged: readonly ExpectedNoteIdentity[],
  played: PlayedNote,
): readonly ExpectedNoteIdentity[] {
  const taken = new Set(alreadyAcknowledged.map(identityKey))
  const match = firstMatch(expected, taken, played)
  return deepFreeze(match === undefined ? [] : [match.identity])
}

/**
 * Intent: match played notes one after another, in the order given (the order they were played),
 * and return every identity acknowledged, in the order acknowledged.
 */
// @spec-link [[rule_acknowledgement_exact_pitch]]
// @spec-link [[rule_no_grading_or_mismatch_signal]]
export function acknowledgePlayedNotes(
  expected: readonly WindowedExpectedNote[],
  played: readonly PlayedNote[],
): readonly ExpectedNoteIdentity[] {
  const taken = new Set<string>()
  const acknowledged: ExpectedNoteIdentity[] = []
  for (const note of played) {
    const match = firstMatch(expected, taken, note)
    if (match !== undefined) {
      taken.add(identityKey(match.identity))
      acknowledged.push(match.identity)
    }
  }
  return deepFreeze(acknowledged)
}

/**
 * Intent: the earliest expected note, in time order, that is not yet acknowledged, has exactly the
 * played pitch, and whose window (both ends included) holds the played onset.
 */
function firstMatch(
  expected: readonly WindowedExpectedNote[],
  taken: ReadonlySet<string>,
  played: PlayedNote,
): WindowedExpectedNote | undefined {
  return expected.find(
    (note) =>
      note.pitch === played.pitch &&
      note.window.opensAtSeconds <= played.onsetSeconds &&
      played.onsetSeconds <= note.window.closesAtSeconds &&
      !taken.has(identityKey(note.identity)),
  )
}

/** Intent: a string key that is equal for two identities exactly when they name the same note. */
function identityKey(identity: ExpectedNoteIdentity): string {
  return `${identity.phraseNumber}/${identity.measureIndex}/${identity.eventIndex}`
}
