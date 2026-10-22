import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { GenerationRequestError, makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { makeSeed } from '@/domain/random/seed'
import {
  parseGenerationWorkerInboundMessage,
  parseGenerationWorkerPrewarm,
  parseGenerationWorkerRequest,
} from '@/generation-worker/generation-worker-inbound'
import {
  GenerationWorkerProtocolError,
  parseGenerationWorkerResponse,
} from '@/generation-worker/generation-worker-protocol'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import type { RequestRhythmLock } from '@/domain/generation/request-rhythm-lock'
import type { SteeringBlock } from '@/domain/generation/steering-block'
import { SAMPLE_RHYTHM_LOCK, SAMPLE_STEERING } from '../domain/generation/request-inputs-fixture'

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
    figureLevels: NEUTRAL_FIGURE_LEVELS,
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
    figureLevels: NEUTRAL_FIGURE_LEVELS,
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
// @test-link [[service_workspace_session_runner_factory]]
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

// @test-link [[module_generation_worker_protocol]]
describe('parseGenerationWorkerPrewarm and parseGenerationWorkerInboundMessage', () => {
  it('round-trips a structured-cloned prewarm message to an equal value', () => {
    const { intent } = requestFixture()
    const wire = structuredClone({ type: 'prewarm', intent })

    expect(parseGenerationWorkerPrewarm(wire)).toEqual(wire)
    expect(parseGenerationWorkerInboundMessage(wire)).toEqual(wire)
  })

  it('dispatches a generate message to the request parser', () => {
    const wire = requestFixture()

    expect(parseGenerationWorkerInboundMessage(wire)).toEqual(parseGenerationWorkerRequest(wire))
  })

  it('rejects a prewarm with an id, a missing or tampered intent, or a wrong type', () => {
    const { intent } = requestFixture()
    const tamperedIntent = { ...intent, controls: { ...intent.controls, tonalCenter: 'D' } }

    for (const wire of [
      { type: 'prewarm', id: 1, intent },
      { type: 'prewarm' },
      { type: 'prewarm', intent: tamperedIntent },
      { type: 'generate', intent },
    ]) {
      expect(() => parseGenerationWorkerPrewarm(wire)).toThrow(GenerationWorkerProtocolError)
    }
  })

  it('rejects an inbound message of unknown type or shape', () => {
    const { intent } = requestFixture()

    for (const wire of [{ type: 'warm', intent }, null, [], 'prewarm']) {
      expect(() => parseGenerationWorkerInboundMessage(wire)).toThrow(GenerationWorkerProtocolError)
    }
  })
})

/** The v3.2 groups a wire intent may hold. */
interface RequestGroups {
  readonly rhythmLock?: RequestRhythmLock
  readonly steering?: SteeringBlock
}

/** Intent: a structured clone of a real intent holding the given groups, as the worker receives it. */
function groupIntent(groups: RequestGroups): Record<string, unknown> {
  const { intent } = requestFixture()
  const built = createGenerationIntent({
    requestId: makeRequestId('protocol-groups'),
    seed: makeSeed(5),
    controls: makeGenerationControls({
      ...intent.controls,
      tonalCenter: intent.writtenTonalCenter,
    }),
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    ...groups,
  })
  return structuredClone(built) as unknown as Record<string, unknown>
}

/** Intent: the wire intent holding both groups, with one group's record changed by the test. */
function tamperedIntent(
  field: 'rhythmLock' | 'steering',
  change: (group: Record<string, unknown>) => void,
): Record<string, unknown> {
  const intent = groupIntent({ rhythmLock: SAMPLE_RHYTHM_LOCK, steering: SAMPLE_STEERING })
  change(intent[field] as Record<string, unknown>)
  return intent
}

const GROUP_CASES: readonly (readonly [string, RequestGroups])[] = [
  ['the rhythm lock group', { rhythmLock: SAMPLE_RHYTHM_LOCK }],
  ['the steering block', { steering: SAMPLE_STEERING }],
  ['both groups', { rhythmLock: SAMPLE_RHYTHM_LOCK, steering: SAMPLE_STEERING }],
]

// @test-link [[entity_request_rhythm_lock]]
// @test-link [[entity_steering_block]]
describe('parseGenerationWorkerInboundMessage: the rhythm lock group and the steering block', () => {
  // @test-link [[entity_request_rhythm_lock]]
  // @test-link [[entity_steering_block]]
  it.each(GROUP_CASES)('round-trips a generate request holding %s unchanged', (_name, groups) => {
    const intent = groupIntent(groups)
    const parsed = parseGenerationWorkerInboundMessage(
      structuredClone({ type: 'generate', id: 4, intent }),
    )

    expect(parsed).toEqual({ type: 'generate', id: 4, intent })
    expect(parsed.intent.rhythmLock).toStrictEqual(groups.rhythmLock)
    expect(parsed.intent.steering).toStrictEqual(groups.steering)
    expect(Object.isFrozen(parsed.intent.rhythmLock ?? parsed.intent.steering)).toBe(true)
  })

  // @test-link [[entity_request_rhythm_lock]]
  // @test-link [[entity_steering_block]]
  it.each(GROUP_CASES)('round-trips a prewarm holding %s unchanged', (_name, groups) => {
    const intent = groupIntent(groups)
    const parsed = parseGenerationWorkerInboundMessage(structuredClone({ type: 'prewarm', intent }))

    expect(parsed).toEqual({ type: 'prewarm', intent })
    expect(JSON.stringify(parsed.intent)).toBe(JSON.stringify(intent))
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses an unknown lock state or change kind with the typed protocol error', () => {
    const tampered = [
      tamperedIntent('rhythmLock', (lock) => (lock['state'] = { kind: 'off' })),
      tamperedIntent('rhythmLock', (lock) => (lock['allowedChanges'] = ['swing'])),
    ]
    for (const intent of tampered) {
      expect(() =>
        parseGenerationWorkerInboundMessage({ type: 'generate', id: 5, intent }),
      ).toThrow(GenerationWorkerProtocolError)
      expect(() => parseGenerationWorkerInboundMessage({ type: 'prewarm', intent })).toThrow(
        /intent\.rhythmLock/u,
      )
    }
  })

  // @test-link [[entity_steering_block]]
  it('refuses an unknown band, move direction or size, or strength with the typed protocol error', () => {
    const tampered = [
      tamperedIntent('steering', (block) => {
        block['targetRhythm'] = { ...(block['targetRhythm'] as object), band: 'far' }
      }),
      tamperedIntent('steering', (block) => (block['moves'] = [{ direction: 'sideways' }])),
      tamperedIntent('steering', (block) => (block['moves'] = [{ direction: 'up', size: 'jump' }])),
      tamperedIntent('steering', (block) => (block['strength'] = 'all')),
    ]
    for (const intent of tampered) {
      expect(() =>
        parseGenerationWorkerInboundMessage({ type: 'generate', id: 6, intent }),
      ).toThrow(GenerationWorkerProtocolError)
      expect(() => parseGenerationWorkerInboundMessage({ type: 'prewarm', intent })).toThrow(
        /intent\.steering/u,
      )
    }
  })

  // @test-link [[entity_request_rhythm_lock]]
  // @test-link [[entity_steering_block]]
  it('still refuses an extra field inside a group and an extra intent field', () => {
    const tampered = [
      tamperedIntent('rhythmLock', (lock) => (lock['tempo'] = 120)),
      tamperedIntent('steering', (block) => (block['doodle'] = [])),
      tamperedIntent('steering', (block) => {
        block['moves'] = [{ direction: 'same', size: 'step' }]
      }),
      { ...groupIntent({ steering: SAMPLE_STEERING }), drift: 0.5 },
    ]
    for (const intent of tampered) {
      expect(() =>
        parseGenerationWorkerInboundMessage({ type: 'generate', id: 7, intent }),
      ).toThrow(GenerationWorkerProtocolError)
    }
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses a group key holding nothing, never reading it as an absent group', () => {
    const intent = { ...groupIntent({}), rhythmLock: undefined }

    expect(() => parseGenerationWorkerInboundMessage({ type: 'generate', id: 8, intent })).toThrow(
      GenerationWorkerProtocolError,
    )
  })
})
