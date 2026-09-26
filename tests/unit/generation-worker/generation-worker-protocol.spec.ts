import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { GenerationRequestError, makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { makeSeed } from '@/domain/random/seed'
import {
  GenerationWorkerProtocolError,
  parseGenerationWorkerRequest,
  parseGenerationWorkerResponse,
} from '@/generation-worker/generation-worker-protocol'

/** Intent: one real GenerationWorkerRequest wire envelope, exactly as the session posts it. */
function requestFixture() {
  const intent = createGenerationIntent({
    requestId: makeRequestId('protocol-request-fixture'),
    seed: makeSeed(1),
    controls: makeGenerationControls({
      tempo: 90,
      tonalCenter: 'C',
      collection: 'Major',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Settled',
      noteDensity: 'Quarter',
      rhythmicVariety: 'Strict',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'bb-tenor',
    }),
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
  })
  return structuredClone({ type: 'generate', id: 1, intent })
}

/** Intent: one real, cheap-to-search success outcome, exactly as the worker handler produces it. */
function successOutcome() {
  const intent = createGenerationIntent({
    requestId: makeRequestId('protocol-round-trip'),
    seed: makeSeed(1),
    controls: makeGenerationControls({
      tempo: 90,
      tonalCenter: 'C',
      collection: 'Major',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Settled',
      noteDensity: 'Quarter',
      rhythmicVariety: 'Strict',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'c-keyboard',
    }),
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
  })
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') throw new Error('fixture outcome must succeed')
  return outcome
}

// @test-link [[module_generation_worker_protocol]]
describe('parseGenerationWorkerResponse: retained request round trip', () => {
  it('re-parses a structured-cloned success outcome whose request keeps its kind tags', () => {
    const outcome = successOutcome()
    expect(outcome.request.activeConcertRange.kind).toBe('ActiveConcertRange')
    expect(outcome.request.registerWindow.kind).toBe('RegisterWindow')

    const wire = structuredClone({ type: 'outcome', id: 7, outcome })
    const parsed = parseGenerationWorkerResponse(wire)

    expect(parsed.type).toBe('outcome')
    if (parsed.type !== 'outcome' || parsed.outcome.kind !== 'generation_success') return
    expect(parsed.outcome.request).toStrictEqual(outcome.request)
  })

  it('rejects a wire outcome whose retained request carries a wrong kind tag', () => {
    const wire = structuredClone({ type: 'outcome', id: 8, outcome: successOutcome() })
    const tampered = {
      ...wire,
      outcome: {
        ...wire.outcome,
        request: {
          ...wire.outcome.request,
          registerWindow: { ...wire.outcome.request.registerWindow, kind: 'ActiveConcertRange' },
        },
      },
    }

    expect(() => parseGenerationWorkerResponse(tampered)).toThrow(GenerationRequestError)
  })
})

// @test-link [[module_generation_worker_protocol]]
// @test-link [[service_workspace_session_flow]]
describe('parseGenerationWorkerRequest: writtenTonalCenter is required, valid, and untampered', () => {
  it('parses a valid, structured-cloned request', () => {
    const wire = requestFixture()
    const parsed = parseGenerationWorkerRequest(wire)
    expect(parsed.intent.writtenTonalCenter).toBe('C')
    expect(parsed.intent.controls.tonalCenter).toBe('A#')
  })

  it('rejects a request missing writtenTonalCenter entirely', () => {
    const wire = requestFixture()
    const intentWithoutWrittenTonalCenter: Record<string, unknown> = { ...wire.intent }
    delete intentWithoutWrittenTonalCenter.writtenTonalCenter
    const tampered = { ...wire, intent: intentWithoutWrittenTonalCenter }

    expect(() => parseGenerationWorkerRequest(tampered)).toThrow(GenerationWorkerProtocolError)
  })

  it('rejects a request with an invalid writtenTonalCenter value', () => {
    const wire = requestFixture()
    const tampered = { ...wire, intent: { ...wire.intent, writtenTonalCenter: 'H' } }

    expect(() => parseGenerationWorkerRequest(tampered)).toThrow(GenerationWorkerProtocolError)
  })

  it('rejects a request whose written and concert tonal centers were tampered out of sync', () => {
    const wire = requestFixture()
    const tampered = {
      ...wire,
      intent: {
        ...wire.intent,
        controls: { ...wire.intent.controls, tonalCenter: 'D' },
      },
    }

    expect(() => parseGenerationWorkerRequest(tampered)).toThrow(GenerationWorkerProtocolError)
  })
})
