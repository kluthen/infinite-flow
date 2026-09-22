/**
 * Post-generation instrument-profile switch policy: decides, without ever transposing a source
 * event, whether an existing four-measure concert phrase can be retained under a newly selected
 * instrument profile or must be regenerated from scratch. Consumes the existing
 * ConcertEventTimeline (see ../events/timeline.ts) as the unchanged-events input; never runs
 * generation feasibility or a bounded planner merely to decide retention.
 */

import { type Seed } from '../random/seed'
import { type ConcertEventTimeline } from '../events/timeline'
import { type ActiveConcertRange } from '../profile/active-concert-range'
import { type InstrumentProfile } from '../profile/instrument-profile'
import { CANONICAL_REGISTER_ORDER, type RegisterId } from '../profile/register-id'
import {
  type RegisterChoice,
  type RegisterIntent,
  buildRegisterIntent,
  resolveRegisterIntentCandidate,
} from '../profile/register-intent'
import { registerTieKey } from '../profile/register-tie-key'
import { type RegisterWindowCandidate } from '../profile/register-window-derivation'
import { type RegisterWindow, registerWindowContainsPitch } from '../profile/register-window'

/**
 * A post-generation profile-switch request: the unchanged concert phrase, the current Register
 * selection, the existing seed, the newly selected profile, and the fresh seed to use if
 * regeneration is required. Selecting the fresh seed's underlying randomness is an orchestration
 * concern outside this module's scope; this policy only decides whether to use it.
 */
// @spec-link [[module_phrase_generation_profile_policy]]
export interface ProfileSwitchRequest {
  readonly timeline: ConcertEventTimeline
  readonly currentRegister: RegisterChoice
  readonly existingSeed: Seed
  readonly newProfile: InstrumentProfile
  readonly freshSeed: Seed
}

/** The typed, inspectable reason a profile switch could not retain the existing phrase. */
// @spec-link [[rule_profile_switch_validates_phrase]]
export type ProfileSwitchRegenerateReason =
  | {
      readonly kind: 'EventOutsideActiveRange'
      readonly measureIndex: number
      readonly eventIndex: number
      readonly pitch: number
    }
  | {
      readonly kind: 'EventOutsideRegisterWindow'
      readonly measureIndex: number
      readonly eventIndex: number
      readonly pitch: number
    }

/**
 * The discriminated outcome of a profile switch. Regeneration is a normal, expected outcome, not
 * an error — this is a plain return value, never an exception.
 */
// @spec-link [[rule_profile_switch_validates_phrase]]
export type ProfileSwitchResult =
  | {
      readonly kind: 'retain'
      readonly timeline: ConcertEventTimeline
      readonly activeConcertRange: ActiveConcertRange
      readonly register: RegisterId
      readonly registerWindow: RegisterWindow
    }
  | {
      readonly kind: 'regenerate'
      readonly reason: ProfileSwitchRegenerateReason
      readonly seed: Seed
    }

/**
 * Intent: deterministically resolve one Varying candidate window from the existing seed, using
 * the fixed canonical candidate order and the minimum register tie key — never by running
 * generation feasibility or a bounded planner. Ties (practically unreachable for a 32-bit hash
 * over distinct candidate identities) resolve to the earliest candidate in canonical order.
 */
function resolveVaryingCandidateByTieKey(
  seed: Seed,
  intent: RegisterIntent,
): RegisterWindowCandidate {
  let best: RegisterWindowCandidate | undefined
  let bestKey = Number.POSITIVE_INFINITY

  for (const id of CANONICAL_REGISTER_ORDER) {
    const candidate = resolveRegisterIntentCandidate(intent, id)
    const key = registerTieKey(seed, intent, id)
    if (key < bestKey) {
      bestKey = key
      best = candidate
    }
  }

  // Unreachable in practice: CANONICAL_REGISTER_ORDER is always non-empty and every id resolves.
  if (best === undefined) {
    throw new Error('No register candidate could be resolved for Varying retention.')
  }
  return best
}

/**
 * Intent: resolve the single whole-phrase register window and identity required for retention
 * validation under the new profile. Explicit Low/Middle/High use the new profile's matching
 * candidate window; Varying resolves exactly one candidate deterministically from the existing
 * seed via resolveVaryingCandidateByTieKey.
 */
function resolveRequiredWindow(
  newProfile: InstrumentProfile,
  currentRegister: RegisterChoice,
  existingSeed: Seed,
): { readonly register: RegisterId; readonly registerWindow: RegisterWindow } {
  const intent = buildRegisterIntent(newProfile, currentRegister)

  const candidate =
    currentRegister === 'Varying'
      ? resolveVaryingCandidateByTieKey(existingSeed, intent)
      : resolveRegisterIntentCandidate(intent, currentRegister)

  return { register: candidate.id, registerWindow: candidate.window }
}

/**
 * Intent: find the first unchanged concert event (in measure/event order) that violates either
 * the new active concert range or the required whole-phrase register window. Rest events carry
 * no pitch and are never checked. Returns undefined when every event satisfies both constraints.
 */
function firstViolatingEvent(
  timeline: ConcertEventTimeline,
  activeConcertRange: ActiveConcertRange,
  registerWindow: RegisterWindow,
): ProfileSwitchRegenerateReason | undefined {
  for (const measure of timeline.measures) {
    for (let eventIndex = 0; eventIndex < measure.events.length; eventIndex += 1) {
      const event = measure.events[eventIndex]
      if (event === undefined || event.kind !== 'note') continue

      const pitch = event.pitch
      if (pitch < activeConcertRange.minMidi || pitch > activeConcertRange.maxMidi) {
        return {
          kind: 'EventOutsideActiveRange',
          measureIndex: measure.measureIndex,
          eventIndex,
          pitch,
        }
      }
      if (!registerWindowContainsPitch(registerWindow, pitch)) {
        return {
          kind: 'EventOutsideRegisterWindow',
          measureIndex: measure.measureIndex,
          eventIndex,
          pitch,
        }
      }
    }
  }
  return undefined
}

/**
 * Intent: decide whether a post-generation instrument-profile switch retains the existing phrase
 * or requires complete regeneration. Retains only when every unchanged concert event fits both
 * the new profile's active concert range and the whole-phrase register window required by the
 * current Register selection; source events are never transposed to force a fit. Otherwise
 * returns a typed, inspectable regenerate reason and the caller-supplied fresh seed. Independent
 * of any display-mode selection — this request type has no parameter for one.
 */
// @spec-link [[rule_profile_switch_validates_phrase]]
export function evaluateProfileSwitch(request: ProfileSwitchRequest): ProfileSwitchResult {
  const { register, registerWindow } = resolveRequiredWindow(
    request.newProfile,
    request.currentRegister,
    request.existingSeed,
  )

  const violation = firstViolatingEvent(
    request.timeline,
    request.newProfile.concertRange,
    registerWindow,
  )

  if (violation !== undefined) {
    return { kind: 'regenerate', reason: violation, seed: request.freshSeed }
  }

  return {
    kind: 'retain',
    timeline: request.timeline,
    activeConcertRange: request.newProfile.concertRange,
    register,
    registerWindow,
  }
}
