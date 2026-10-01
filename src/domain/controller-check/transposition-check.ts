/**
 * The controller transposition check, as pure logic: the written note the check shows, the
 * concert pitch a correctly set controller sends for it, and the judgement of the note the
 * controller actually sent (match, whole octaves off, or semitones off with a possible other
 * profile that would match as is).
 */

import type { InstrumentProfile } from '../profile/instrument-profile'

const OCTAVE = 12
const MIDI_MIN = 0
const MIDI_MAX = 127

/**
 * Intent: pick the written note the check asks the player to play — the C nearest the middle of
 * the profile's written range (concert range shifted by the chromatic transposition), the lower
 * C on a tie. Crashes when that C is outside the written range rather than show an unplayable note.
 */
// @spec-link [[rule_controller_transposition_check]]
// @spec-link [[entity_instrument_profile]]
export function checkWrittenNote(profile: InstrumentProfile): number {
  const writtenMin = profile.concertRange.minMidi + profile.transposition.chromatic
  const writtenMax = profile.concertRange.maxMidi + profile.transposition.chromatic
  const doubledMiddle = writtenMin + writtenMax
  const lowerC = Math.floor(doubledMiddle / 2 / OCTAVE) * OCTAVE
  const upperC = lowerC + OCTAVE
  const writtenC = doubledMiddle - 2 * lowerC <= 2 * upperC - doubledMiddle ? lowerC : upperC
  if (writtenC < writtenMin || writtenC > writtenMax) {
    throw new RangeError(
      `Check written note ${writtenC} is outside the written range ${writtenMin}-${writtenMax} of profile "${profile.id}".`,
    )
  }
  return writtenC
}

/**
 * Intent: the concert pitch a correctly set controller sends when the player plays the given
 * written note on this profile (written − chromatic transposition).
 */
// @spec-link [[rule_controller_transposition_check]]
// @spec-link [[entity_instrument_profile]]
export function expectedConcertPitch(profile: InstrumentProfile, writtenMidi: number): number {
  return writtenMidi - profile.transposition.chromatic
}

/**
 * The verdict of one transposition check. `offset` is the played concert pitch minus the expected
 * one, in semitones (positive: the controller sounds higher).
 */
// @spec-link [[rule_controller_transposition_check]]
export type TranspositionCheckReport =
  | { readonly kind: 'match' }
  | { readonly kind: 'octaves'; readonly offset: number }
  | {
      readonly kind: 'semitones'
      readonly offset: number
      readonly suggestedProfile: InstrumentProfile | null
    }

/** Intent: reject a played pitch that is not a MIDI note number, loudly. */
function assertMidiNote(playedPitch: number): void {
  if (!Number.isInteger(playedPitch) || playedPitch < MIDI_MIN || playedPitch > MIDI_MAX) {
    throw new RangeError(
      `Played pitch must be an integer MIDI note ${MIDI_MIN}-${MIDI_MAX}, got ${playedPitch}.`,
    )
  }
}

/**
 * Intent: judge the note the controller sent against the check's written note. A non-octave
 * offset also names the other profile (from `profiles`, the profiles the check may suggest, passed
 * in so this module imports no profile table) whose chromatic transposition would make the played
 * note right as is — profile's chromatic minus the offset — or null when none does.
 */
// @spec-link [[rule_controller_transposition_check]]
// @spec-link [[entity_instrument_profile]]
export function judgeTranspositionCheck(
  profile: InstrumentProfile,
  playedPitch: number,
  profiles: readonly InstrumentProfile[],
): TranspositionCheckReport {
  assertMidiNote(playedPitch)
  const offset = playedPitch - expectedConcertPitch(profile, checkWrittenNote(profile))
  if (offset === 0) return { kind: 'match' }
  if (offset % OCTAVE === 0) return { kind: 'octaves', offset }
  const matchingChromatic = profile.transposition.chromatic - offset
  const suggestedProfile =
    profiles.find(
      (candidate) =>
        candidate.id !== profile.id && candidate.transposition.chromatic === matchingChromatic,
    ) ?? null
  return { kind: 'semitones', offset, suggestedProfile }
}
