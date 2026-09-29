/**
 * Whether a carry-in can be received by one generation intent. A carry-in only ever comes from the
 * phrase before in the same session, generated with the same settings, so everything it carries
 * must be something those settings produce and the next phrase can honour: its window is the
 * window the register choice resolves to (for Varying, the one resolved for phrase 1), its chord
 * is one these harmony settings end a phrase on, and anything it still owes can be settled by the
 * next phrase's first note inside that window.
 */

import type { GenerationControls } from '../../controls/generation-controls'
import type { ProfileSelection } from '../../controls/profile-selection'
import { makeHarmonyCollection } from '../../harmony/collection'
import { carriedHarmonyEndsDomain } from '../../harmony/harmony-join'
import { makeHarmonyCandidateDomain } from '../../harmony/harmony-planner'
import type { RegisterIntent } from '../../profile/register-intent'
import { CarryInError, type CarryIn } from './carry-in'
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

/** Intent: refuse a carried chord and endpoint class the receiver's harmony never ends on. */
function assertHarmonyFits(carryIn: CarryIn, receiver: CarryInReceiver): void {
  const { controls } = receiver
  const domain = makeHarmonyCandidateDomain({
    tonalCenter: controls.tonalCenter,
    collection: controls.collection,
    harmonicMotion: controls.harmonicMotion,
    tensionArc: controls.tension,
    profile: receiver.musicalProfile.musicalProfile,
  })
  if (
    domain.kind !== 'harmony_candidate_domain' ||
    !carriedHarmonyEndsDomain(domain, carryIn.finalHarmony)
  )
    throw new CarryInError('The carried chord is not one these harmony settings end a phrase on.')
}

/** Intent: refuse a carried debt that no phrase may end with, or that no next phrase could settle. */
function assertDebtSettleable(carryIn: CarryIn, receiver: CarryInReceiver): void {
  const { midi } = carryIn.lastPitch
  const collection = makeHarmonyCollection(
    receiver.controls.tonalCenter,
    receiver.controls.collection,
  ).pitchClasses as readonly number[]
  const allowance = phraseEndingDebtAllowance(true)
  const pitchClass = ((midi % 12) + 12) % 12
  const tense = !(carryIn.finalHarmony.triad.pitchClasses as readonly number[]).includes(pitchClass)
  if (tense) {
    if (!allowance.tenseNote || !collection.includes(pitchClass))
      throw new CarryInError(
        `The carried pitch ${midi} is not a tense scale tone a phrase may end on.`,
      )
    if (!tenseNoteCanSettle(midi, collection, carryIn.registerWindow))
      throw new CarryInError(`No first note inside the window can resolve the tense pitch ${midi}.`)
  }
  const recovery = carryIn.lastPitch.recovery
  if (recovery.kind === 'owed') {
    if (!allowance.leapRecovery) throw new CarryInError('No phrase may end owing a leap recovery.')
    if (!owedRecoveryCanSettle(midi, recovery.leapDirection, collection, carryIn.registerWindow))
      throw new CarryInError(`No first note inside the window can recover the leap to ${midi}.`)
  }
}

/**
 * Intent: refuse, as a CarryInError, a carry-in the receiving intent cannot honour: a window its
 * register choice does not resolve to, a chord its harmony never ends on, or a debt no phrase may
 * owe or no next phrase could settle.
 */
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[rule_varying_register_once_per_session]]
export function assertCarryInFitsIntent(carryIn: CarryIn, receiver: CarryInReceiver): void {
  assertWindowFits(carryIn, receiver)
  assertHarmonyFits(carryIn, receiver)
  assertDebtSettleable(carryIn, receiver)
}
