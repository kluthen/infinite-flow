/**
 * The carry-in crosses the generation worker boundary inside the intent posted to the worker and
 * inside the resolved request the worker's outcome retains, and is re-validated on both sides
 * from untrusted structured-clone input.
 */

import { describe, expect, it } from 'vitest'

import { GenerationRequestError } from '@/domain/generation/generation-request'
import { CarryInError } from '@/domain/generation/carry-in/carry-in'
import {
  GenerationWorkerProtocolError,
  parseGenerationWorkerRequest,
  parseGenerationWorkerResponse,
} from '@/generation-worker/generation-worker-protocol'
import { handleGenerationWorkerMessage } from '@/generation-worker/generation-worker-handler'
import {
  buildIntent,
  carryInAfter,
  generateSuccess,
} from '../domain/generation/carry-in/carry-in-fixture'

/** Intent: a real intent for phrase 2 of a session, carrying phrase 1's carry-in. */
function carryInIntent() {
  const firstIntent = buildIntent({ seed: 11 })
  const carryIn = carryInAfter(firstIntent, generateSuccess(firstIntent), 1)
  return buildIntent({ seed: 12, carryIn })
}

// @test-link [[module_generation_worker_protocol]]
// @test-link [[entity_phrase_carry_in]]
describe('generation worker protocol with a carry-in', () => {
  it('round-trips an intent carrying a carry-in', () => {
    const intent = carryInIntent()
    const parsed = parseGenerationWorkerRequest(
      structuredClone({ type: 'generate', id: 4, intent }),
    )
    expect(parsed.intent).toStrictEqual(intent)
    expect(parsed.intent.carryIn).toStrictEqual(intent.carryIn)
  })

  it('refuses a malformed carry-in on the posted intent', () => {
    const wire = structuredClone({ type: 'generate', id: 4, intent: carryInIntent() })
    const tampered = {
      ...wire,
      intent: { ...wire.intent, carryIn: { ...wire.intent.carryIn, tempo: 140 } },
    }
    expect(() => parseGenerationWorkerRequest(tampered)).toThrow(CarryInError)
  })

  it('refuses a carry-in the posted intent cannot receive', () => {
    const wire = structuredClone({ type: 'generate', id: 4, intent: carryInIntent() })
    const tampered = {
      ...wire,
      intent: {
        ...wire.intent,
        carryIn: {
          ...wire.intent.carryIn,
          registerWindow: { ...wire.intent.carryIn!.registerWindow, minMidi: 55, maxMidi: 67 },
        },
      },
    }
    expect(() => parseGenerationWorkerRequest(tampered)).toThrow(CarryInError)
  })

  it('round-trips the outcome whose retained request carries the carry-in', () => {
    const intent = carryInIntent()
    const response = handleGenerationWorkerMessage(
      structuredClone({ type: 'generate', id: 5, intent }),
    )
    expect(response.type).toBe('outcome')
    if (response.type !== 'outcome' || response.outcome.kind !== 'generation_success') return
    expect(response.outcome.request.carryIn).toStrictEqual(intent.carryIn)
    const parsed = parseGenerationWorkerResponse(structuredClone(response))
    expect(parsed).toStrictEqual(response)
  })

  it('refuses a retained request whose window is not the carried window', () => {
    const intent = carryInIntent()
    const response = handleGenerationWorkerMessage(
      structuredClone({ type: 'generate', id: 6, intent }),
    )
    if (response.type !== 'outcome' || response.outcome.kind !== 'generation_success')
      throw new Error('Expected a successful outcome.')
    const wire = structuredClone(response)
    const request = wire.outcome.kind === 'generation_success' ? wire.outcome.request : undefined
    const tampered = {
      ...wire,
      outcome: {
        ...wire.outcome,
        request: {
          ...request,
          registerWindow: { kind: 'RegisterWindow', minMidi: 48, maxMidi: 60 },
        },
      },
    }
    expect(() => parseGenerationWorkerResponse(tampered)).toThrow(GenerationRequestError)
  })

  it('still refuses an unknown intent field next to the carry-in', () => {
    const wire = structuredClone({ type: 'generate', id: 4, intent: carryInIntent() })
    expect(() =>
      parseGenerationWorkerRequest({ ...wire, intent: { ...wire.intent, sessionId: 'x' } }),
    ).toThrow(GenerationWorkerProtocolError)
  })
})
