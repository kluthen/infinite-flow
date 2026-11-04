/**
 * One case of the key and mode suggestion's golden list and what is compared for it: the seed, the
 * kept candidates in concert pitch and the answer, computed by the app's own functions. Shared by
 * the Node spec (key-suggestion.spec.ts) and the workspace harness's in-browser seam
 * (tests/e2e/workspace-harness/key-suggestion-seams.ts), so both runtimes compute exactly the
 * same thing. Browser-safe: no Node module. Test plumbing: nothing in the app reads it.
 */
import {
  PITCH_CLASSES,
  type Collection,
  type PitchClass,
} from '@/domain/controls/generation-controls'
import { makeQuantizedDoodle, type QuantizedDoodleInput } from '@/domain/doodle/quantized-doodle'
import { findBuiltInInstrumentProfile } from '@/domain/profile/instrument-profiles'
import { suggestKeyAndMode, type KeySuggestion } from '@/jam/key-suggestion/key-suggestion'
import { keySuggestionSeed } from '@/jam/key-suggestion/key-suggestion-draw'
import { keptCandidates, scorePairs } from '@/jam/key-suggestion/key-suggestion-scores'

/** One input of the golden list: a doodle, Jam's written key and Collection, an instrument. */
export interface KeySuggestionCase {
  readonly label: string
  readonly doodle: QuantizedDoodleInput
  readonly jam: { readonly tonalCenter: PitchClass; readonly collection: Collection }
  readonly instrumentProfileId: string
}

/** What a case gives: the draw's seed, the kept candidates ("D Dorian", concert) and the answer. */
export interface KeySuggestionDescription {
  readonly seed: number
  readonly kept: readonly string[]
  readonly answer: KeySuggestion
}

/** A recorded case: its input and what it gave when recorded. */
export type KeySuggestionGoldenCase = KeySuggestionCase & KeySuggestionDescription

/** Intent: what the app's functions give for one case, in plain data. */
export function describeKeySuggestion(input: KeySuggestionCase): KeySuggestionDescription {
  const profile = findBuiltInInstrumentProfile(input.instrumentProfileId)
  if (profile === undefined) {
    throw new Error(
      `Golden case ${input.label}: no built-in instrument ${input.instrumentProfileId}.`,
    )
  }
  const doodle = makeQuantizedDoodle(input.doodle)
  return {
    seed: keySuggestionSeed(doodle),
    kept: keptCandidates(scorePairs(doodle)).map(
      (pair) => `${PITCH_CLASSES[pair.homeNote]} ${pair.mode}`,
    ),
    answer: suggestKeyAndMode(doodle, input.jam, profile),
  }
}
