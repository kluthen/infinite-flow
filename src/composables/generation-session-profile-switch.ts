/**
 * The session's post-generation instrument-profile switch action, split out of
 * use-generation-session.ts to keep both files under the project's effective-LOC ceiling. This
 * module owns no state of its own: it reads and writes the shared session state object the root
 * composable constructs and passes in, through the small dependency surface below.
 */

import { makeGenerationControls } from '@/domain/controls/generation-controls'
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
 * reselection is a no-op. The switch sets the instrument control only: it is outside the routing
 * point and never touches the preset selection, so it never makes Custom. An applied switch saves
 * the instrument at once, before any fit run it starts. Under the no-room notice the switch only
 * changes the instrument: no phrase can be shown in a window with no room. Under the
 * too-many-notes notice it starts a round like any change to a setting the phrase is generated
 * from. Otherwise, with no prior result the
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

    state.controls = makeGenerationControls({ ...state.controls, instrumentProfileId: id })
    deps.saveSettings({ 'controls.instrumentProfileId': id })
    return phraseAfterSwitch(deps)
  }
}

/**
 * Intent: what an applied switch does to the phrase, the instrument already changed: nothing under
 * the no-room notice or with no phrase shown; otherwise the phrase is cleared under a rhythm
 * combination that blocks generation, or regenerated with a fresh seed through the fit run.
 */
// @spec-link [[rule_profile_switch_validates_phrase]]
async function phraseAfterSwitch<TResult>(
  deps: ProfileSwitchDependencies<TResult>,
): Promise<ProfileSelectionOutcome> {
  const { state } = deps
  if (state.roomNotice === 'no_room') return 'applied'
  if (state.roomNotice === null && state.result === null) return 'applied'

  if (deps.isBlocked()) {
    deps.clearPhrase()
    return 'cleared_unsupported_rhythm'
  }
  const succeeded = await deps.runFitRun()
  return succeeded ? 'regenerated' : 'regeneration_failed'
}

/**
 * Intent: build the action that replaces the phrase as an instrument switch does, the instrument
 * unchanged: what saving a change to the selected my instrument's range or transposition does.
 * Rejected outside idle.
 */
// @spec-link [[rule_profile_switch_validates_phrase]]
// @spec-link [[req_my_instrument]]
export function createReplacePhraseAction<TResult>(
  deps: ProfileSwitchDependencies<TResult>,
): () => Promise<ProfileSelectionOutcome> {
  return async function replacePhrase(): Promise<ProfileSelectionOutcome> {
    if (deps.state.operation !== 'idle') return 'rejected'
    return phraseAfterSwitch(deps)
  }
}
