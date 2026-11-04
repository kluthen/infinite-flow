/**
 * The controls of a Jam session's doodle section, which the review area gives the Review panel
 * (master spec C6.4, C6.5; the review's handoff, `review-doodle`, Focus and Keyboard; the review
 * flow, The Doodle and the Suggestion): the suggestion row's inputs once Jam's code has loaded (the
 * quantized doodle, Jam's key and mode now, the selected instrument, the decline), `Jam in
 * {answer}` (Jam's key and mode set, saved as Jam's, wherever the review was opened from), `Keep
 * {key} {mode}` (the decline, at once in memory and saved with the session, focus then on `Jam
 * again on this doodle` when it is enabled, else on `review-title`), and `Jam again on this
 * doodle`, disabled while Jam's code loads or after it failed, which leaves the review mode onto
 * Jam mode.
 */
import { computed, nextTick, type ComputedRef, type Ref } from 'vue'

import type { ReviewJamCode } from '@/components/review/review-types'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import type { JamKeyAndMode } from '@/jam/key-suggestion/key-suggestion'

import type { ReviewJamPorts } from './review-jam-ports'
import type { ReviewedJamPart } from './session-jam-part'
import type { SessionController } from './workspace-session-controller-types'

/** What the doodle section's controls read and act through. */
// @spec-link [[req_key_and_mode_suggestion]]
export interface ReviewDoodleToolsDependencies {
  /** Jam's code for the showing Review. */
  readonly jamCode: Readonly<Ref<ReviewJamCode>>
  /** The showing Review's Jam part; null while none shows or for a session that is no Jam. */
  readonly jam: () => ReviewedJamPart | null
  /** The showing Review's session key; null while none shows. */
  readonly sessionKey: () => string | null
  readonly controller: () => SessionController | null
  /** The workspace's Jam ports (./review-jam-ports.ts). */
  readonly ports: () => ReviewJamPorts
  /** Focus `Jam again on this doodle`, rendered and enabled. */
  readonly focusJamAgain: () => void
  /** Focus `review-title`. */
  readonly focusTitle: () => void
}

/** What the suggestion row is given. */
// @spec-link [[req_key_and_mode_suggestion]]
export interface SuggestionRowInputs {
  readonly doodle: QuantizedDoodle
  readonly jam: JamKeyAndMode
  readonly instrument: Pick<InstrumentProfile, 'transposition'>
  readonly declined: boolean
}

/** The doodle section's controls, as the review area binds them. */
// @spec-link [[req_key_and_mode_suggestion]]
export interface ReviewDoodleTools {
  /** The suggestion row's inputs; null until Jam's code has loaded, and for no Jam. */
  readonly suggestion: ComputedRef<SuggestionRowInputs | null>
  /** `Jam again on this doodle` is disabled: Jam's code loading, or unable to load. */
  readonly jamAgainDisabled: ComputedRef<boolean>
  readonly useAnswer: (answer: JamKeyAndMode) => void
  readonly keep: () => void
  readonly jamAgain: () => Promise<void>
}

/** Intent: the doodle section's controls over the showing Review and the workspace's Jam. */
// @spec-link [[req_key_and_mode_suggestion]]
// @spec-link [[rule_jam_again_on_this_doodle]]
// @spec-link [[rule_suggestion_shown_after_jam_only]]
export function useReviewDoodleTools(deps: ReviewDoodleToolsDependencies): ReviewDoodleTools {
  /** Intent: Jam's code once loaded; null before, or after it failed. */
  const loaded = computed(() => {
    const code = deps.jamCode.value
    return code.state === 'loaded' ? code.module : null
  })

  const suggestion = computed((): SuggestionRowInputs | null => {
    const jam = deps.jam()
    const module = loaded.value
    if (jam === null || module === null) return null
    const ports = deps.ports()
    return {
      doodle: jam.doodle.doodle,
      jam: ports.keyAndMode(module),
      instrument: ports.instrument(),
      declined: jam.suggestionDeclined,
    }
  })

  /** Intent: Jam's code, which a suggestion's answer is only offered with. */
  function requireLoaded() {
    if (loaded.value === null) throw new Error("review doodle: Jam's code is not loaded")
    return loaded.value
  }

  /** Intent: the session controller; a press before it loads is a defect. */
  function requireController(): SessionController {
    const controller = deps.controller()
    if (controller === null) throw new Error('review doodle: no session controller yet')
    return controller
  }

  /**
   * Intent: `Jam in {answer}`: Jam's key and mode set and saved as Jam's, from a Review over
   * either mode; the row says so and takes focus itself.
   */
  // @spec-link [[rule_suggestion_use_it]]
  function useAnswer(answer: JamKeyAndMode): void {
    deps.ports().useAnswer(requireLoaded(), answer)
  }

  /**
   * Intent: `Keep {key} {mode}`: the suggestion declined for good, at once in memory, then saved
   * with the session (chunk 30's decline); once the row has left, focus on `Jam again on this
   * doodle` when it is enabled, else on `review-title`. Nothing is announced.
   */
  // @spec-link [[rule_suggestion_keep_mine]]
  function keep(): void {
    const key = deps.sessionKey()
    if (key === null) throw new Error('review doodle: Keep with no Review showing')
    void requireController().declineSuggestion(key)
    void nextTick(() => (loaded.value === null ? deps.focusTitle() : deps.focusJamAgain()))
  }

  return {
    suggestion,
    jamAgainDisabled: computed(() => loaded.value === null),
    useAnswer,
    keep,
    jamAgain: () => deps.ports().jamAgain(),
  }
}
