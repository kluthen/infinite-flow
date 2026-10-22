/**
 * Where the session engine meets the settings-mutation engine: when a phrase is about to be
 * requested, whether a scheduled mutation lands on it and, if so, the settings it puts in effect
 * and the output that reports it, or its skip when it meets a dead end; and the mutation context
 * the session's start state gives, which the legal-move check at the start reads. Pure: the flag,
 * the phrase number, the settings in effect and the mutation context fully decide the answer.
 */

import type { GenerationIntent } from '../domain/generation/generation-intent'
import { carryInAfter } from './failure-ladder'
import { resolvedRegister } from './session-intents'
import { registerCandidates } from './session-settings-change'
import {
  isMutationDeadEnd,
  mutateSettings,
  mutationIndexLandingOn,
  type MutationContext,
  type SettingsMutationFlag,
} from './settings-mutation'
import type {
  MutationSkippedOutput,
  SessionPhrase,
  SessionSettings,
  SettingsChangedOutput,
  SuccessfulOutcome,
} from './session-types'

/**
 * A scheduled mutation on its phrase: the settings in effect from its phrase on (those before,
 * the very same object, when it is skipped), and its report: the settings it changed, or its skip.
 */
// @spec-link [[rule_mutation_lands_on_scheduled_phrase]]
// @spec-link [[rule_vary_settings_skips_dead_end]]
export interface MutationLanding {
  readonly settings: SessionSettings
  readonly output: SettingsChangedOutput | MutationSkippedOutput
}

/**
 * Intent: the mutation landing on a phrase about to be requested, or undefined when the flag is
 * off or no mutation is scheduled there. The mutation context is read only when one lands, so a
 * session with the flag off reads nothing more than before. The restriction frozen at the
 * session's start travels in the settings, which every mutation's settings keep: a key or mode
 * move stays inside it for the whole session. A mutation that meets a dead end is skipped,
 * throwing nothing: the settings in effect stay as they are, the very same object, so nothing
 * counts as a change, and the skip names the phrase and the mutation's number; the next mutation
 * lands as scheduled and draws from its own stream.
 */
// @spec-link [[rule_mutation_lands_on_scheduled_phrase]]
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[rule_density_mutation_steps_from_generated_density]]
// @spec-link [[rule_mutation_sixteenth_blocked_after_step_down]]
// @spec-link [[rule_vary_settings_skips_dead_end]]
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
  if (isMutationDeadEnd(mutation))
    return { settings, output: { kind: 'mutation-skipped', phraseNumber, mutationNumber: k } }
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

/**
 * Intent: the mutation context the session's start state gives: the window's width read at the
 * start, no step-down yet (the engine's start memory) and the register whose window phrase 2's
 * carry-in holds, worked out from phrase 1 exactly as opening phrase 2 does. It is the context
 * the session's first mutation sees when nothing changes before it; the legal-move check at the
 * start reads it.
 */
// @spec-link [[rule_vary_settings_needs_legal_move]]
// @spec-link [[module_session_mutation_step]]
export function mutationContextAtStart(
  phraseOne: { readonly intent: GenerationIntent; readonly outcome: SuccessfulOutcome },
  belowTabletLandscape: boolean,
): MutationContext {
  const one: SessionPhrase = {
    phraseNumber: 1,
    origin: 'idle',
    intent: phraseOne.intent,
    outcome: phraseOne.outcome,
  }
  return {
    belowTabletLandscape,
    sessionSteppedDown: false,
    resolvedRegister: resolvedRegister(carryInAfter(one), registerCandidates(one)),
  }
}
