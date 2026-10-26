/**
 * How the session opens its next phrase and builds the intent of one of its ladder rungs, shared
 * by the session engine and the pre-generation plan so both build the very same requests: the
 * mutation landing on the phrase, its tension-arc cycle step, its look-ahead basis from the
 * carry-in of the phrase before, its rhythm lock groups, and each rung's intent with the planned
 * seed of its slot. Pure:
 * only the seams are read (the window, and a request id per built intent).
 */

import type { CarryIn } from '../domain/generation/carry-in/carry-in'
import { LADDER, carryInAfter, type LadderRung, type LookAheadBasis } from './failure-ladder'
import {
  buildAttemptIntent,
  resolvedRegister,
  type BuiltIntent,
  type IntentSeams,
} from './session-intents'
import {
  phraseRhythmLock,
  type PhraseRhythmLock,
  type SessionRhythmLock,
} from './rhythm-lock-session'
import { landingMutation, type MutationLanding } from './session-mutation-step'
import { attemptPlan, lookAheadBasis, registerCandidates } from './session-settings-change'
import type { SessionPhrase, SessionSettings } from './session-types'
import type { SettingsMutationFlag } from './settings-mutation'
import { settingsGeneratedUnder } from './tension-arc-cycle'

/** What opening a phrase reads besides the course: the window, the mutation and arc flags. */
// @spec-link [[module_session_pregeneration_plan]]
export interface PhraseOpeningSeams extends Pick<IntentSeams, 'viewport'> {
  readonly mutation: SettingsMutationFlag
  readonly multiPhraseTensionArc: boolean
}

/**
 * The course of a session's phrases so far, as far as the next phrase's requests read it: the
 * settings in effect, the latest decided phrase and the settings it was generated under, the
 * density step-down memory, and the session's rhythm lock state (none while the lock is off).
 */
// @spec-link [[module_session_pregeneration_plan]]
// @spec-link [[rule_session_density_only_steps_down]]
// @spec-link [[module_session_rhythm_lock]]
export interface PhraseCourse {
  readonly settings: SessionSettings
  readonly lastDecided: SessionPhrase
  readonly lastDecidedSettings: SessionSettings
  readonly steppedDown: boolean
  readonly rhythmLock: SessionRhythmLock | undefined
}

/**
 * A phrase opened after the latest decided one: the mutation landing on it, if any, the settings
 * in effect from it on (the landing's, or those before), the carry-in from the phrase before, the
 * basis every attempt of it is built from, and the rhythm lock groups its rungs carry (none while
 * the lock is off).
 */
// @spec-link [[module_session_pregeneration_plan]]
// @spec-link [[module_session_rhythm_lock]]
export interface OpenedPhrase {
  readonly phraseNumber: number
  readonly landing: MutationLanding | undefined
  readonly settings: SessionSettings
  readonly carryIn: CarryIn
  readonly basis: LookAheadBasis
  readonly rhythmLock: PhraseRhythmLock | undefined
}

/**
 * A rung's built intent, the step-down memory after building it, whether it carries the re-lock
 * group, and the step it takes.
 */
// @spec-link [[module_session_pregeneration_plan]]
export interface RungIntent extends BuiltIntent {
  readonly step: 'carry-in' | 'standalone'
}

/**
 * Intent: open the phrase after the course's latest decided one. A mutation scheduled on it is
 * decided first, from the window read now, the step-down memory and the register whose window the
 * carry-in holds, and is in effect from it on; the phrase is generated under those settings with
 * its tension-arc cycle step, which never reaches the settings in effect. Its rhythm lock groups
 * come from the session's lock state, its number, the tension in effect from it on and whether
 * Tension across phrases runs.
 */
// @spec-link [[module_session_pregeneration_plan]]
// @spec-link [[rule_mutation_lands_on_scheduled_phrase]]
// @spec-link [[module_tension_arc_cycle]]
// @spec-link [[module_session_rhythm_lock]]
export function openNextPhrase(seams: PhraseOpeningSeams, course: PhraseCourse): OpenedPhrase {
  const previous = course.lastDecided
  const phraseNumber = previous.phraseNumber + 1
  const carryIn = carryInAfter(previous)
  const landing = landingMutation(seams.mutation, phraseNumber, course.settings, () => ({
    belowTabletLandscape: seams.viewport.isBelowTabletLandscape(),
    sessionSteppedDown: course.steppedDown,
    resolvedRegister: resolvedRegister(carryIn, registerCandidates(previous)),
  }))
  const settings = landing?.settings ?? course.settings
  const under = settingsGeneratedUnder(seams.multiPhraseTensionArc, phraseNumber, settings)
  const basis = lookAheadBasis(previous, course.lastDecidedSettings, under, carryIn)
  const rhythmLock = phraseRhythmLock(course.rhythmLock, {
    phraseNumber,
    tensionInEffect: settings.controls.tension,
    multiPhraseTensionArc: seams.multiPhraseTensionArc,
  })
  return { phraseNumber, landing, settings, carryIn, basis, rhythmLock }
}

/**
 * Intent: build the intent of one rung of the phrase after `previous` from its basis: the attempt
 * that rung makes (carry-in, or standalone with its register), with a request id drawn now, the
 * window read now, the step-down memory updated, the planned seed of that phrase's rung and the
 * phrase's rhythm lock group (the re-lock group when the rung is built with Eighth by the
 * step-down while a re-lock is pending).
 */
// @spec-link [[module_session_pregeneration_plan]]
// @spec-link [[module_session_seed_plan]]
// @spec-link [[module_session_rhythm_lock]]
export function buildRungIntent(
  seams: IntentSeams,
  previous: SessionPhrase,
  basis: LookAheadBasis,
  rung: LadderRung,
  steppedDown: boolean,
  rhythmLock: PhraseRhythmLock | undefined,
): RungIntent {
  const plan = attemptPlan(rung, basis.source, registerCandidates(previous))
  const slot = { phraseNumber: previous.phraseNumber + 1, rung: LADDER.indexOf(rung) }
  const built = buildAttemptIntent(seams, basis.settings, plan, steppedDown, slot, rhythmLock)
  return { ...built, step: plan.step }
}
