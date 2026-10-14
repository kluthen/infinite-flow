/**
 * The session's post-generation instrument-profile switch action, split out of
 * use-generation-session.ts to keep both files under the project's effective-LOC ceiling. This
 * module owns no state of its own: it reads and writes the shared session state object the root
 * composable constructs and passes in, through the small dependency surface below.
 */

import { applyNonProfileControlValue } from '@/domain/controls/profile-selection'
import { type InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import type { SaveSettings } from '@/storage/settings-saver'
import type { MutableGenerationSessionState } from './use-generation-session'

/** Every outcome `selectInstrumentProfile` can resolve to. */
// @spec-link [[service_idle_generation_session]]
export type ProfileSelectionOutcome =
  | 'rejected'
  | 'unchanged'
  | 'applied'
  | 'regenerated'
  | 'regeneration_failed'
  | 'cleared_unsupported_rhythm'

/** The dependency surface `selectInstrumentProfile` needs from the root session composable. */
export interface ProfileSwitchDependencies<TResult> {
  readonly state: MutableGenerationSessionState<TResult>
  /** Whether the current controls' rhythm combination blocks generation at the width now. */
  readonly isBlocked: () => boolean
  /** Run one Idle fit run from the current controls, keeping what the staff shows meanwhile. */
  readonly runFitRun: () => Promise<boolean>
  /** Show no phrase: the phrase, the room notice and both errors go; nothing regenerates. */
  readonly clearPhrase: () => void
  /** Save the settings a player's change changed. */
  readonly saveSettings: SaveSettings
}

/**
 * Intent: build the `selectInstrumentProfile` session action. Rejects outside idle; a same-id
 * reselection is a no-op. An applied switch saves the instrument at once, before any fit run it
 * starts. Under the no-room notice the switch only changes the selection: no
 * phrase can be shown in a window with no room. Under the too-many-notes notice it starts a round
 * like any change to a setting the phrase is generated from. Otherwise, with no prior result the
 * control is simply applied; with a prior result there is no keep-if-it-fits check — the switch
 * always regenerates the complete phrase with a fresh seed under the new profile, through the fit
 * run. Wherever it would regenerate or start a round, a rhythm combination that blocks generation
 * (judged on the note density a phrase would be generated with at the window's current width)
 * clears the phrase and any notice instead, and the switch still applies.
 */
// @spec-link [[service_idle_generation_session]]
// @spec-link [[rule_profile_switch_validates_phrase]]
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
// @spec-link [[rule_too_dense_notice_retry_rounds]]
// @spec-link [[rule_settings_saved_on_change]]
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
    deps.saveSettings({ 'controls.instrumentProfileId': id })

    if (state.roomNotice === 'no_room') return 'applied'
    if (state.roomNotice === null && state.result === null) return 'applied'

    if (deps.isBlocked()) {
      deps.clearPhrase()
      return 'cleared_unsupported_rhythm'
    }
    const succeeded = await deps.runFitRun()
    return succeeded ? 'regenerated' : 'regeneration_failed'
  }
}
