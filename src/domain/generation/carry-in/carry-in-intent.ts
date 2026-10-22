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
  type GenerationIntentInput,
} from '../generation-intent'
import { CarryInError, isPhraseCarryIn, type CarryIn } from './carry-in'
import { assertCarryInFitsIntent } from './carry-in-fit'

/**
 * The intent input of a phrase that receives what the session phrase before hands forward: a plain
 * intent input plus the carry-in.
 */
export type CarryInGenerationIntentInput = GenerationIntentInput & {
  readonly carryIn: CarryIn
}

/**
 * Intent: build the intent exactly as the plain factory does (same validation, same concert-pitch
 * conversion, same register intent), then refuse, as a CarryInError, a carry-in the finished
 * intent cannot honour, and otherwise keep the carry-in unchanged. A carry-in from no phrase (the
 * doodle's join) is refused unless the input also holds a steering block. The fields keep the one order
 * every intent has: the v3.1 fields, the carry-in, then the rhythm lock group and the steering
 * block when the input holds them.
 */
// @spec-link [[module_generation_request_construction]]
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[entity_request_rhythm_lock]]
// @spec-link [[entity_steering_block]]
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
export function makeCarryInGenerationIntent(input: CarryInGenerationIntentInput): GenerationIntent {
  const { carryIn, ...plainInput } = input
  if (!isPhraseCarryIn(carryIn) && plainInput.steering === undefined)
    throw new CarryInError('A carry-in from no phrase is received only with a steering block.')
  const intent = makeGenerationIntent(plainInput)
  assertCarryInFitsIntent(carryIn, intent)
  const { rhythmLock, steering, ...v31Fields } = intent
  return deepFreeze({
    ...v31Fields,
    carryIn,
    ...(rhythmLock === undefined ? {} : { rhythmLock }),
    ...(steering === undefined ? {} : { steering }),
  })
}
