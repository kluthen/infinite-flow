/**
 * The session's post-generation instrument-profile switch action, split out of
 * use-generation-session.ts to keep both files under the project's effective-LOC ceiling. This
 * module owns no state of its own: it reads and writes the shared session state object the root
 * composable constructs and passes in, through the small dependency surface below.
 */

import { applyNonProfileControlValue } from '@/domain/controls/profile-selection'
import { isUnsupportedRhythmSetting } from '@/domain/controls/unsupported-rhythm-settings'
import { type GenerationControls } from '@/domain/controls/generation-controls'
import {
  createGenerationIntent,
  type GenerationIntent,
  type GenerationIntentProviders,
} from '@/domain/generation/generation-intent'
import { type InstrumentProfileId } from '@/domain/profile/instrument-profile'
import { type Seed } from '@/domain/random/seed'
import type { MutableGenerationSessionState } from './use-generation-session'

/** The decision a profile-switch policy renders: keep the current phrase, or regenerate with a fresh seed. */
// @spec-link [[service_workspace_session_flow]]
export type SessionProfileSwitchDecision =
  { readonly kind: 'retain' } | { readonly kind: 'regenerate'; readonly seed: Seed }

/** Every outcome `selectInstrumentProfile` can resolve to. */
// @spec-link [[service_workspace_session_flow]]
export type ProfileSelectionOutcome =
  | 'rejected'
  | 'unchanged'
  | 'applied'
  | 'retained'
  | 'regenerated'
  | 'regeneration_failed'
  | 'cleared_unsupported_rhythm'

/** The dependency surface `selectInstrumentProfile` needs from the root session composable. */
export interface ProfileSwitchDependencies<TResult> {
  readonly state: MutableGenerationSessionState<TResult>
  readonly providers: GenerationIntentProviders
  readonly evaluateProfileSwitch: (
    result: TResult,
    nextControls: GenerationControls,
    freshSeed: Seed,
  ) => SessionProfileSwitchDecision
  readonly runGeneration: (intent: GenerationIntent) => Promise<boolean>
  readonly redrawNotation: (result: TResult) => Promise<boolean>
  /** Discard the current phrase and everything tied to it; the switch applies without regenerating. */
  readonly clearPhrase: () => void
}

/**
 * Intent: build the `selectInstrumentProfile` session action. Rejects outside idle; a same-id
 * reselection is a no-op; with no prior result the instrument-profile control is simply applied;
 * with a prior result the policy decides retain (redraw the current display) or regenerate (run a
 * complete generation with the drawn fresh seed, unless the resulting controls are themselves an
 * unsupported rhythm setting, in which case generation never starts, the switch still applies, and
 * the prior phrase is cleared rather than regenerated).
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[rule_profile_switch_validates_phrase]]
export function createSelectInstrumentProfileAction<TResult>(
  deps: ProfileSwitchDependencies<TResult>,
): (id: InstrumentProfileId) => Promise<ProfileSelectionOutcome> {
  return async function selectInstrumentProfile(
    id: InstrumentProfileId,
  ): Promise<ProfileSelectionOutcome> {
    const { state } = deps
    if (state.operation !== 'idle') return 'rejected'
    if (state.controls.instrumentProfileId === id) return 'unchanged'

    const [controls, profileSelection] = applyNonProfileControlValue(
      state.controls,
      state.profileSelection,
      'instrumentProfileId',
      id,
    )
    state.controls = controls
    state.profileSelection = profileSelection

    const priorResult = state.result
    if (priorResult === null) return 'applied'

    const freshSeed = deps.providers.nextSeed()
    const decision = deps.evaluateProfileSwitch(priorResult, controls, freshSeed)

    if (decision.kind === 'retain') {
      await deps.redrawNotation(priorResult)
      return 'retained'
    }

    if (isUnsupportedRhythmSetting(controls)) {
      deps.clearPhrase()
      return 'cleared_unsupported_rhythm'
    }

    const intent = createGenerationIntent({
      requestId: deps.providers.nextRequestId(),
      seed: decision.seed,
      controls,
      musicalProfile: profileSelection,
    })
    const succeeded = await deps.runGeneration(intent)
    return succeeded ? 'regenerated' : 'regeneration_failed'
  }
}
