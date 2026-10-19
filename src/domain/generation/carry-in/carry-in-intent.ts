/**
 * Build the generation intent of a phrase that receives a carry-in. Only a running session (and
 * the worker boundary and phrase replay that rebuild its requests) ever hands a carry-in forward;
 * the Idle workspace never does. Keeping this builder, and the carry-in fit check it runs, apart
 * from the plain intent factory keeps the harmony planner and the join checks out of the code the
 * app loads at start-up.
 */

import { deepFreeze } from '../../events/deep-freeze'
import {
  makeGenerationIntent,
  type GenerationIntent,
  type GenerationIntentFactoryInput,
} from '../generation-intent'
import type { CarryIn } from './carry-in'
import { assertCarryInFitsIntent } from './carry-in-fit'

/**
 * The intent input of a phrase that receives what the session phrase before hands forward: a plain
 * intent input, its figure levels from a musical profile selection or given as levels, plus the
 * carry-in.
 */
export type CarryInGenerationIntentInput = GenerationIntentFactoryInput & {
  readonly carryIn: CarryIn
}

/**
 * Intent: build the intent exactly as the plain factory does (same validation, same concert-pitch
 * conversion, same register intent), then refuse, as a CarryInError, a carry-in the finished
 * intent cannot honour, and otherwise keep the carry-in unchanged as the intent's last field.
 */
// @spec-link [[module_generation_request_construction]]
// @spec-link [[entity_phrase_carry_in]]
export function makeCarryInGenerationIntent(input: CarryInGenerationIntentInput): GenerationIntent {
  const { carryIn, ...plainInput } = input
  const intent = makeGenerationIntent(plainInput)
  assertCarryInFitsIntent(carryIn, intent)
  return deepFreeze({ ...intent, carryIn })
}
