/**
 * The key and mode suggestion as a Jam's review shows it (master spec C6.3 to C6.5; the review's
 * handoff, `suggestion-row`): worked out again from the quantized doodle whenever the review opens
 * and whenever Jam's key or mode changes while it shows, against Jam's written key and Collection
 * (never session mode's) for the selected instrument, through chunk 14's `suggestKeyAndMode`, the
 * same doodle always giving the same answer. Its forms: offering (the answer, `Jam in {answer}`
 * and `Keep {key} {mode}`), set (after `Jam in {answer}`, until Jam's key or mode is changed
 * again, then absent for the rest of the review), no fit, and absent (too little to go on, Jam's
 * key and mode among the close answers, or declined). Keys are named in written pitch as the
 * Written key control labels them, modes as the Collection control does. Part of Jam's code
 * (src/jam/), loaded on demand.
 */
import { computed, shallowRef, watch, type ComputedRef } from 'vue'

import { collectionOptions, tonalCenterOptions } from '@/components/controls/control-options'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'

import {
  suggestKeyAndMode,
  type JamKeyAndMode,
  type KeySuggestion,
} from '../key-suggestion/key-suggestion'

/** What the suggestion row shows: one of its forms, or nothing. */
// @spec-link [[req_key_and_mode_suggestion]]
export type SuggestionRowForm =
  | {
      readonly kind: 'offering'
      /** What `Jam in {answer}` sets. */
      readonly answer: JamKeyAndMode
      /** The answer's name, "G Major". */
      readonly answerName: string
      /** Jam's key and mode named, "C Major", for `Keep {key} {mode}`. */
      readonly keepName: string
    }
  | { readonly kind: 'set'; readonly answerName: string }
  | { readonly kind: 'no_fit' }
  | { readonly kind: 'absent' }

/** What the suggestion is worked out from, each read again as it changes. */
// @spec-link [[req_key_and_mode_suggestion]]
export interface KeySuggestionInputs {
  /** The review's quantized doodle. */
  readonly doodle: () => QuantizedDoodle
  /** Jam's written key and Collection now. */
  readonly jam: () => JamKeyAndMode
  /** The selected instrument, whose transposition the written key is read in. */
  readonly instrument: () => Pick<InstrumentProfile, 'transposition'>
  /** The player has declined this doodle's suggestion (`Keep`). */
  readonly declined: () => boolean
}

/** The review's suggestion: its form now, and `Jam in {answer}` pressed. */
// @spec-link [[req_key_and_mode_suggestion]]
export interface ReviewKeySuggestion {
  readonly form: ComputedRef<SuggestionRowForm>
  /** `Jam in {answer}` was pressed: the row says it is set once Jam's key and mode are the answer. */
  readonly used: (answer: JamKeyAndMode) => void
}

const ABSENT: SuggestionRowForm = Object.freeze({ kind: 'absent' })

/** Intent: a key and mode named as Jam's Written key and Collection controls label them. */
// @spec-link [[rule_suggestion_named_in_players_family]]
export function keyAndModeName(keyAndMode: JamKeyAndMode): string {
  const key = tonalCenterOptions().find((option) => option.value === keyAndMode.tonalCenter)
  const mode = collectionOptions().find((option) => option.value === keyAndMode.collection)
  if (key === undefined || mode === undefined) {
    throw new Error(
      `The suggestion: no label for ${keyAndMode.tonalCenter} ${keyAndMode.collection}.`,
    )
  }
  return `${key.label} ${mode.label}`
}

/** Intent: whether two keys and modes are the same written key and Collection. */
function sameKeyAndMode(a: JamKeyAndMode, b: JamKeyAndMode): boolean {
  return a.tonalCenter === b.tonalCenter && a.collection === b.collection
}

/**
 * Intent: the row's form for a suggestion judged against Jam's key and mode: offering for a
 * suggested answer, no fit, or absent for nothing or once declined.
 */
// @spec-link [[rule_suggestion_withheld]]
// @spec-link [[rule_doodle_outside_modes_told]]
// @spec-link [[rule_suggestion_keep_mine]]
export function suggestionRowForm(
  suggestion: KeySuggestion,
  jam: JamKeyAndMode,
  declined: boolean,
): SuggestionRowForm {
  if (declined || suggestion.kind === 'nothing') return ABSENT
  if (suggestion.kind === 'no_fit') return Object.freeze({ kind: 'no_fit' })
  const answer = Object.freeze({
    tonalCenter: suggestion.tonalCenter,
    collection: suggestion.collection,
  })
  return Object.freeze({
    kind: 'offering',
    answer,
    answerName: keyAndModeName(answer),
    keepName: keyAndModeName(jam),
  })
}

/**
 * Intent: the review's suggestion, judged again as Jam's key and mode change; after `Jam in
 * {answer}`, set while Jam's key and mode are the answer, then absent for the rest of the review
 * once they are changed again.
 */
// @spec-link [[req_key_and_mode_suggestion]]
// @spec-link [[rule_suggestion_use_it]]
// @spec-link [[rule_suggestion_same_doodle_same_answer]]
export function useKeySuggestion(inputs: KeySuggestionInputs): ReviewKeySuggestion {
  /** The answer `Jam in {answer}` set, while Jam's key and mode are still it; null otherwise. */
  const setTo = shallowRef<JamKeyAndMode | null>(null)
  /** `Jam in {answer}` was pressed in this review. */
  const usedOnce = shallowRef(false)

  watch(inputs.jam, (jam) => {
    if (setTo.value !== null && !sameKeyAndMode(setTo.value, jam)) setTo.value = null
  })

  const form = computed((): SuggestionRowForm => {
    const jam = inputs.jam()
    const set = setTo.value
    if (set !== null && sameKeyAndMode(set, jam)) {
      return Object.freeze({ kind: 'set', answerName: keyAndModeName(set) })
    }
    if (usedOnce.value) return ABSENT
    const suggestion = suggestKeyAndMode(inputs.doodle(), jam, inputs.instrument())
    return suggestionRowForm(suggestion, jam, inputs.declined())
  })

  return {
    form,
    used: (answer) => {
      setTo.value = answer
      usedOnce.value = true
    },
  }
}
