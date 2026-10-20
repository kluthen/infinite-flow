/**
 * Where the session engine meets the settings-mutation engine: when a phrase is about to be
 * requested, whether a scheduled mutation lands on it and, if so, the settings it puts in effect
 * and the output that reports it. Pure: the flag, the phrase number, the settings in effect and
 * the mutation context fully decide the answer.
 */

import {
  mutateSettings,
  mutationIndexLandingOn,
  type MutationContext,
  type SettingsMutationFlag,
} from './settings-mutation'
import type { SessionSettings, SettingsChangedOutput } from './session-types'

/** A mutation that landed: the settings in effect from its phrase on, and its report. */
// @spec-link [[rule_mutation_lands_on_scheduled_phrase]]
export interface MutationLanding {
  readonly settings: SessionSettings
  readonly output: SettingsChangedOutput
}

/**
 * Intent: the mutation landing on a phrase about to be requested, or undefined when the flag is
 * off or no mutation is scheduled there. The mutation context is read only when one lands, so a
 * session with the flag off reads nothing more than before.
 */
// @spec-link [[rule_mutation_lands_on_scheduled_phrase]]
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[rule_density_mutation_steps_from_generated_density]]
// @spec-link [[rule_mutation_sixteenth_blocked_after_step_down]]
// @spec-link [[module_session_mutation_step]]
export function landingMutation(
  flag: SettingsMutationFlag,
  phraseNumber: number,
  settings: SessionSettings,
  readContext: () => MutationContext,
): MutationLanding | undefined {
  if (flag.kind === 'off') return undefined
  const k = mutationIndexLandingOn(flag.seed, phraseNumber)
  if (k === undefined) return undefined
  const mutation = mutateSettings(settings, readContext(), flag.seed, k)
  return {
    settings: mutation.settings,
    output: {
      kind: 'settings-changed',
      phraseNumber,
      settings: mutation.settings,
      cause: 'mutation',
      setting: mutation.setting,
      ...(mutation.figure === undefined ? {} : { figure: mutation.figure }),
      from: mutation.from,
      to: mutation.to,
    },
  }
}
