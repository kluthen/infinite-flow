/**
 * The carry-in crosses the generation worker boundary inside the intent posted to the worker and
 * inside the resolved request the worker's outcome retains, and is re-validated on both sides
 * from untrusted structured-clone input.
 */

import { describe, expect, it } from 'vitest'

import { GenerationRequestError } from '@/domain/generation/generation-request'
import { CarryInError, makeCarryIn } from '@/domain/generation/carry-in/carry-in'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import {
  parseGenerationWorkerInboundMessage,
  parseGenerationWorkerRequest,
} from '@/generation-worker/generation-worker-inbound'
import {
  GenerationWorkerProtocolError,
  parseGenerationWorkerResponse,
} from '@/generation-worker/generation-worker-protocol'
import { handleGenerationWorkerMessage } from '@/generation-worker/generation-worker-handler'
import {
  buildIntent,
  carryInAfter,
  generateSuccess,
  keyChangeIntent,
} from '../domain/generation/carry-in/carry-in-fixture'
import { SAMPLE_STEERING } from '../domain/generation/request-inputs-fixture'

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

// @test-link [[rule_key_change_drops_harmonic_carry_in]]
// @test-link [[module_generation_worker_protocol]]
describe('generation worker protocol with a carry-in whose harmony was dropped', () => {
  it('round-trips an intent whose carry-in has an explicit null harmony', () => {
    const intent = keyChangeIntent(12)
    expect(intent.carryIn?.finalHarmony).toBeNull()
    const parsed = parseGenerationWorkerRequest(
      structuredClone({ type: 'generate', id: 7, intent }),
    )
    expect(parsed.intent).toStrictEqual(intent)
  })

  it('refuses a posted carry-in whose harmony field is missing', () => {
    const wire = structuredClone({ type: 'generate', id: 7, intent: keyChangeIntent(12) })
    const carryIn: Record<string, unknown> = { ...wire.intent.carryIn }
    delete carryIn.finalHarmony
    expect(() =>
      parseGenerationWorkerRequest({ ...wire, intent: { ...wire.intent, carryIn } }),
    ).toThrow(CarryInError)
  })

  it('round-trips the outcome whose retained request carries the null harmony', () => {
    const intent = keyChangeIntent(12)
    const response = handleGenerationWorkerMessage(
      structuredClone({ type: 'generate', id: 8, intent }),
    )
    if (response.type !== 'outcome' || response.outcome.kind !== 'generation_success')
      throw new Error('Expected a successful outcome.')
    expect(response.outcome.request.carryIn).toStrictEqual(intent.carryIn)
    expect(parseGenerationWorkerResponse(structuredClone(response))).toStrictEqual(response)
  })
})

/** Intent: the posted message of a Middle phrase 1 receiving the doodle's join, with steering. */
function noPhraseMessage() {
  const carryIn = makeCarryIn({
    origin: 'none',
    lastPitch: {
      midi: makeConcertPitch(60),
      arrivingInterval: null,
      recovery: { kind: 'settled' },
    },
    registerWindow: makeRegisterWindow(54, 66),
    finalHarmony: null,
  })
  const plain = buildIntent({ seed: 13, label: 'doodle-join' })
  return {
    type: 'generate' as const,
    id: 9,
    intent: { ...plain, carryIn, steering: SAMPLE_STEERING },
  }
}

// @test-link [[module_generation_worker_protocol]]
// @test-link [[entity_phrase_carry_in]]
// @test-link [[rule_jam_phrase_one_joins_doodle]]
describe('generation worker protocol with a carry-in from no phrase', () => {
  it('round-trips an intent holding it beside a steering block', () => {
    const message = noPhraseMessage()
    const parsed = parseGenerationWorkerInboundMessage(structuredClone(message))

    expect(parsed).toStrictEqual(message)
    expect(JSON.stringify(parsed)).toBe(JSON.stringify(message))
  })

  it('refuses it without a steering block, as a CarryInError', () => {
    const wire = structuredClone(noPhraseMessage())
    const intent: Record<string, unknown> = { ...wire.intent }
    delete intent.steering

    expect(() => parseGenerationWorkerInboundMessage({ ...wire, intent })).toThrow(CarryInError)
    expect(() => parseGenerationWorkerInboundMessage({ ...wire, intent })).toThrow(
      /steering block/u,
    )
  })
})
