/**
 * The key and mode suggestion (master spec C6): from the quantized doodle, Jam's written key and
 * Collection and the selected instrument, the one answer a Jam's review and Jam's Idle show about
 * the key and mode the doodle sounds in, always the same for the same inputs. Judged in C6.3's
 * order (spec D452), the first that holds giving the answer: nothing, for too little material;
 * no fit, when under 80 % of the doodle's weighted length lies in the best pair's notes (read
 * from the doodle alone, so every review of a Jam says it whatever key Jam has since); nothing,
 * when Jam's key and mode are among the kept candidates (compared in concert pitch, Major as
 * Ionian and Minor as Aeolian); otherwise the drawn pair, its home note in written pitch and its
 * mode in the player's family. No key and mode restriction plays a part: Jam mode has none. Runs
 * on the main thread, in Jam's code (src/jam/), in whole numbers only.
 */
import type { Collection, PitchClass } from '@/domain/controls/generation-controls'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { deepFreeze } from '@/domain/events/deep-freeze'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'

import { drawCandidate, keySuggestionSeed } from './key-suggestion-draw'
import {
  collectionInFamily,
  concertHomeNote,
  keyModeOf,
  writtenHomeNote,
} from './key-suggestion-names'
import { fitsWell, hasEnoughMaterial, keptCandidates, scorePairs } from './key-suggestion-scores'

/**
 * The suggestion's answer: nothing (too little material, or Jam's key and mode among the kept
 * candidates; nothing is shown); no fit (the doodle fits no mode well enough; the review says so);
 * or a suggestion, the written tonal centre and the Collection that Use it would set.
 */
// @spec-link [[module_key_suggestion]]
// @spec-link [[req_key_and_mode_suggestion]]
export type KeySuggestion =
  | { readonly kind: 'nothing' }
  | { readonly kind: 'no_fit' }
  | {
      readonly kind: 'suggested'
      readonly tonalCenter: PitchClass
      readonly collection: Collection
    }

/** Jam's key and mode as its settings hold them: the written tonal centre and the Collection. */
// @spec-link [[module_key_suggestion]]
export interface JamKeyAndMode {
  readonly tonalCenter: PitchClass
  readonly collection: Collection
}

const NOTHING: KeySuggestion = deepFreeze({ kind: 'nothing' })
const NO_FIT: KeySuggestion = deepFreeze({ kind: 'no_fit' })

/**
 * Intent: the suggestion for a quantized doodle (after the very-short-note filter, in concert
 * pitch), against Jam's written key and Collection, for the selected instrument's transposition.
 */
// @spec-link [[module_key_suggestion]]
// @spec-link [[rule_suggestion_withheld]]
// @spec-link [[rule_doodle_outside_modes_told]]
// @spec-link [[rule_suggestion_ignores_restriction]]
// @spec-link [[rule_suggestion_named_in_players_family]]
export function suggestKeyAndMode(
  doodle: QuantizedDoodle,
  jam: JamKeyAndMode,
  instrument: Pick<InstrumentProfile, 'transposition'>,
): KeySuggestion {
  if (!hasEnoughMaterial(doodle)) return NOTHING
  const kept = keptCandidates(scorePairs(doodle))
  if (!fitsWell(doodle, kept[0]!)) return NO_FIT
  const jamHome = concertHomeNote(jam.tonalCenter, instrument.transposition)
  const jamMode = keyModeOf(jam.collection)
  if (kept.some((pair) => pair.homeNote === jamHome && pair.mode === jamMode)) return NOTHING
  const drawn = drawCandidate(kept, keySuggestionSeed(doodle))
  return deepFreeze({
    kind: 'suggested',
    tonalCenter: writtenHomeNote(drawn.homeNote, instrument.transposition),
    collection: collectionInFamily(drawn.mode, jam.collection),
  })
}
