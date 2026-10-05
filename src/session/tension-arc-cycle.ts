/**
 * The multi-phrase tension arc's four-phrase cycle, as pure functions: from a session phrase's
 * number alone, the step its tension arc takes, and the settings that phrase is generated under,
 * plus the check of the session start's flag. No seed stream, clock or session state is read, and the settings in effect are never changed.
 */

import { TENSION_ARCS, type TensionArc } from '../domain/controls/generation-controls'
import { freezeSessionSettings } from './session-intents'
import { SessionEngineError, type SessionSettings } from './session-types'

/** A phrase's step along the tension arcs: one calmer, none, or one tenser. */
// @spec-link [[module_tension_arc_cycle]]
// @spec-link [[rule_multi_phrase_tension_arc_cycle]]
export type TensionArcCycleStep = -1 | 0 | 1

/** The step at each position of a group of four: none, tenser, none, calmer. */
const CYCLE_STEPS: readonly TensionArcCycleStep[] = [0, 1, 0, -1]

/** Intent: crash on a number that cannot be a session phrase number (an integer from 1). */
function requirePhraseNumber(phraseNumber: number): void {
  if (!Number.isSafeInteger(phraseNumber) || phraseNumber < 1)
    throw new SessionEngineError(`A phrase number must be an integer ≥ 1, got ${phraseNumber}.`)
}

/**
 * Intent: the step of session phrase n (phrase 1 is the first), from its position (n - 1) mod 4
 * in its group of four: none, one step tenser, none, one step calmer.
 */
// @spec-link [[module_tension_arc_cycle]]
// @spec-link [[rule_multi_phrase_tension_arc_cycle]]
export function tensionArcCycleStep(phraseNumber: number): TensionArcCycleStep {
  requirePhraseNumber(phraseNumber)
  const step = CYCLE_STEPS[(phraseNumber - 1) % CYCLE_STEPS.length]
  if (step === undefined) throw new SessionEngineError(`No cycle step for phrase ${phraseNumber}.`)
  return step
}

/**
 * Intent: the tension arc a session phrase is generated with: the tension arc in effect moved by
 * the phrase's cycle step along Settled, Lift, Build, Edge, never past either end. A tension arc
 * outside the vocabulary is a caller bug and throws.
 */
// @spec-link [[module_tension_arc_cycle]]
// @spec-link [[rule_multi_phrase_tension_arc_cycle]]
export function steppedTensionArc(tension: TensionArc, phraseNumber: number): TensionArc {
  const index = TENSION_ARCS.indexOf(tension)
  if (index < 0) throw new SessionEngineError(`Unknown tension arc: ${String(tension)}.`)
  const clamped = Math.min(
    TENSION_ARCS.length - 1,
    Math.max(0, index + tensionArcCycleStep(phraseNumber)),
  )
  const stepped = TENSION_ARCS[clamped]
  if (stepped === undefined) throw new SessionEngineError(`No tension arc at index ${clamped}.`)
  return stepped
}

/**
 * Intent: the multi-phrase tension arc flag of a session start, checked: anything but a boolean is
 * a caller bug and throws, with no default.
 */
// @spec-link [[module_tension_arc_cycle]]
// @spec-link [[req_multi_phrase_tension_arc]]
export function requireTensionArcFlag(multiPhraseTensionArc: unknown): boolean {
  if (typeof multiPhraseTensionArc !== 'boolean')
    throw new SessionEngineError(
      `The multi-phrase tension arc flag must be a boolean, got ${String(multiPhraseTensionArc)}.`,
    )
  return multiPhraseTensionArc
}

/**
 * Intent: the settings a session phrase is generated under: the settings in effect themselves,
 * the same object, when the multi-phrase tension arc is off or the clamped step leaves the tension
 * arc unchanged; otherwise a frozen copy with only the tension arc replaced by the stepped one.
 * A non-boolean flag or an invalid phrase number throws.
 */
// @spec-link [[module_tension_arc_cycle]]
// @spec-link [[rule_multi_phrase_tension_arc_cycle]]
// @spec-link [[req_multi_phrase_tension_arc]]
// @spec-link [[module_session_tension_arc_step]]
export function settingsGeneratedUnder(
  multiPhraseTensionArc: boolean,
  phraseNumber: number,
  settingsInEffect: SessionSettings,
): SessionSettings {
  const on = requireTensionArcFlag(multiPhraseTensionArc)
  requirePhraseNumber(phraseNumber)
  if (!on) return settingsInEffect
  const tension = steppedTensionArc(settingsInEffect.controls.tension, phraseNumber)
  if (tension === settingsInEffect.controls.tension) return settingsInEffect
  return freezeSessionSettings({
    ...settingsInEffect,
    controls: { ...settingsInEffect.controls, tension },
  })
}
