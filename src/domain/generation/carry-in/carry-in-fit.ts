/**
 * Whether a carry-in can be received by one generation intent. A carry-in only ever comes from the
 * phrase before in the same session, generated with the same settings, so everything it carries
 * must be something those settings produce and the next phrase can honour: its window is the
 * window the register choice resolves to (for Varying, the one resolved for phrase 1), its chord
 * is one these harmony settings end a phrase on, and anything it still owes can be settled by the
 * next phrase's first note inside that window. After a key or collection change the carry-in has
 * no chord (its harmony is null): only its window and its owed leap recovery are checked.
 */

import type { GenerationControls } from '../../controls/generation-controls'
import type { ProfileSelection } from '../../controls/profile-selection'
import { makeHarmonyCollection } from '../../harmony/collection'
import { carriedHarmonyEndsDomain, type CarriedHarmony } from '../../harmony/harmony-join'
import { makeHarmonyCandidateDomain } from '../../harmony/harmony-planner'
import type { RegisterIntent } from '../../profile/register-intent'
import { CarryInError, carriedPitchIsTense, type CarryIn } from './carry-in'
import {
  owedRecoveryCanSettle,
  phraseEndingDebtAllowance,
  tenseNoteCanSettle,
} from './phrase-ending-debt'

/** The parts of a generation intent a carry-in is checked against; controls are in concert pitch. */
export interface CarryInReceiver {
  readonly controls: GenerationControls
  readonly musicalProfile: ProfileSelection
  readonly registerIntent: RegisterIntent
}

/** Intent: refuse a carried window the receiver's register choice does not resolve to. */
function assertWindowFits(carryIn: CarryIn, receiver: CarryInReceiver): void {
  const { registerWindow } = carryIn
  const candidate = receiver.registerIntent.candidates.find(
    (entry) =>
      entry.window.minMidi === registerWindow.minMidi &&
      entry.window.maxMidi === registerWindow.maxMidi,
  )
  if (!candidate)
    throw new CarryInError(
      `The carried window ${registerWindow.minMidi}-${registerWindow.maxMidi} is not one this register choice offers.`,
    )
  const requested = receiver.registerIntent.requestedRegister
  if (requested !== 'Varying' && requested !== candidate.id)
    throw new CarryInError(
      `The carried window is the ${candidate.id} window, but the register choice is ${requested}.`,
    )
}

/**
 * Intent: true when the receiver's harmony settings end a phrase on the carried chord with its
 * endpoint class. Shared with the session's carry-in adaptation, so the two never disagree.
 */
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
export function carriedHarmonyFits(
  harmony: CarriedHarmony,
  receiver: Pick<CarryInReceiver, 'controls' | 'musicalProfile'>,
): boolean {
  const { controls } = receiver
  const domain = makeHarmonyCandidateDomain({
    tonalCenter: controls.tonalCenter,
    collection: controls.collection,
    harmonicMotion: controls.harmonicMotion,
    tensionArc: controls.tension,
    profile: receiver.musicalProfile.musicalProfile,
  })
  return domain.kind === 'harmony_candidate_domain' && carriedHarmonyEndsDomain(domain, harmony)
}

/**
 * Intent: refuse a carried chord and endpoint class the receiver's harmony never ends on; a
 * carry-in whose harmony was dropped carries no chord to check.
 */
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
function assertHarmonyFits(carryIn: CarryIn, receiver: CarryInReceiver): void {
  if (carryIn.finalHarmony === null) return
  if (!carriedHarmonyFits(carryIn.finalHarmony, receiver))
    throw new CarryInError('The carried chord is not one these harmony settings end a phrase on.')
}

/**
 * Intent: why the carried debt is one no phrase may end with, or one no next phrase could settle
 * inside the carried window, or null when it can be settled. Without a carried chord the pitch
 * owes no resolution; an owed leap recovery is still checked. Shared with the session's carry-in
 * adaptation, so the two never disagree.
 */
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
// @spec-link [[rule_setting_change_rechecks_pitch_carry_in]]
export function carriedDebtProblem(
  carryIn: CarryIn,
  receiver: Pick<CarryInReceiver, 'controls'>,
): string | null {
  const { midi } = carryIn.lastPitch
  const collection = makeHarmonyCollection(
    receiver.controls.tonalCenter,
    receiver.controls.collection,
  ).pitchClasses as readonly number[]
  const allowance = phraseEndingDebtAllowance(true)
  const pitchClass = ((midi % 12) + 12) % 12
  if (carriedPitchIsTense(carryIn)) {
    if (!allowance.tenseNote || !collection.includes(pitchClass))
      return `The carried pitch ${midi} is not a tense scale tone a phrase may end on.`
    if (!tenseNoteCanSettle(midi, collection, carryIn.registerWindow))
      return `No first note inside the window can resolve the tense pitch ${midi}.`
  }
  const recovery = carryIn.lastPitch.recovery
  if (recovery.kind === 'owed') {
    if (!allowance.leapRecovery) return 'No phrase may end owing a leap recovery.'
    if (!owedRecoveryCanSettle(midi, recovery.leapDirection, collection, carryIn.registerWindow))
      return `No first note inside the window can recover the leap to ${midi}.`
  }
  return null
}

/** Intent: refuse a carried debt that no phrase may end with, or that no next phrase could settle. */
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
function assertDebtSettleable(carryIn: CarryIn, receiver: CarryInReceiver): void {
  const problem = carriedDebtProblem(carryIn, receiver)
  if (problem !== null) throw new CarryInError(problem)
}

/**
 * Intent: refuse, as a CarryInError, a carry-in the receiving intent cannot honour: a window its
 * register choice does not resolve to, a chord its harmony never ends on, or a debt no phrase may
 * owe or no next phrase could settle. A carry-in whose harmony was dropped (null) skips the chord
 * and tense-note checks, so a new key or collection can receive it.
 */
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[rule_varying_register_once_per_session]]
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
export function assertCarryInFitsIntent(carryIn: CarryIn, receiver: CarryInReceiver): void {
  assertWindowFits(carryIn, receiver)
  assertHarmonyFits(carryIn, receiver)
  assertDebtSettleable(carryIn, receiver)
}
