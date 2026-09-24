import { describe, expect, it } from 'vitest'

import {
  makeGenerationControls,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { makeSeed } from '@/domain/random/seed'
import {
  GenerationWorkerCrashError,
  GenerationWorkerTransportError,
  createGenerationWorkerClient,
} from '@/generation-worker/generation-worker-client'
import { GenerationWorkerProtocolError } from '@/generation-worker/generation-worker-protocol'

import { createFakeGenerationWorkerPort } from './fake-generation-worker-port'

const CHEAP_CONTROLS: GenerationControls = makeGenerationControls({
  tempo: 90,
  tonalCenter: 'C',
  collection: 'Major',
  harmonicMotion: 'Gentle diatonic',
  tension: 'Settled',
  noteDensity: 'Quarter',
  syncopation: 'Straight',
  silenceDensity: 'Sparse',
  contour: 'Arch',
  register: 'Middle',
  leapiness: 'Shaped',
  arpeggioChaos: 'Predictable',
  instrumentProfileId: 'c-keyboard',
})

/** Intent: build one real cheap-to-search GenerationIntent, distinguished by requestId/seed. */
function buildIntent(requestId: string, seed: number): GenerationIntent {
  return createGenerationIntent({
    requestId: makeRequestId(requestId),
    seed: makeSeed(seed),
    controls: CHEAP_CONTROLS,
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
  })
}

/** Intent: recursively sample every reachable plain object/array from `value` and assert it is frozen. */
function expectDeepFrozen(value: unknown): void {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return
  expect(Object.isFrozen(value)).toBe(true)
  for (const key of Object.getOwnPropertyNames(value)) {
    expectDeepFrozen((value as Record<string, unknown>)[key])
  }
}

// @test-link [[service_workspace_session_flow]]
describe('createGenerationWorkerClient', () => {
  // @test-link [[rule_seeded_phrase_reproduction]]
  it('resolves generate() with an outcome deep-equal to a direct generatePhrase call, fully frozen', async () => {
    const intent = buildIntent('client-success', 11)
    const expected = generatePhrase(intent)
    const client = createGenerationWorkerClient(createFakeGenerationWorkerPort())

    const outcome = await client.generate(intent)

    expect(outcome).toEqual(expected)
    expectDeepFrozen(outcome)
  })

  it('resolves two concurrent generate() calls to their own independently matching outcomes', async () => {
    const intentA = buildIntent('client-concurrent-a', 21)
    const intentB = buildIntent('client-concurrent-b', 22)
    const expectedA = generatePhrase(intentA)
    const expectedB = generatePhrase(intentB)
    const client = createGenerationWorkerClient(createFakeGenerationWorkerPort())

    const [outcomeA, outcomeB] = await Promise.all([
      client.generate(intentA),
      client.generate(intentB),
    ])

    expect(outcomeA).toEqual(expectedA)
    expect(outcomeB).toEqual(expectedB)
  })

  it('rejects with GenerationWorkerCrashError when the worker responds with a crash', async () => {
    const intent = buildIntent('client-crash', 31)
    const port = createFakeGenerationWorkerPort((data) => {
      const record = data as { id: number }
      return { type: 'crash', id: record.id, name: 'RangeError', message: 'boom' }
    })
    const client = createGenerationWorkerClient(port)

    await expect(client.generate(intent)).rejects.toBeInstanceOf(GenerationWorkerCrashError)
    await expect(client.generate(intent)).rejects.toMatchObject({
      workerErrorName: 'RangeError',
      message: expect.stringContaining('boom'),
    })
  })

  it('rejects all pending requests and every later call once an "error" event fires', async () => {
    const port = createFakeGenerationWorkerPort(null)
    const client = createGenerationWorkerClient(port)
    const intent = buildIntent('client-error-event', 41)

    const pending = client.generate(intent)
    port.emitError()

    await expect(pending).rejects.toBeInstanceOf(GenerationWorkerTransportError)
    await expect(client.generate(intent)).rejects.toBeInstanceOf(GenerationWorkerTransportError)
  })

  it('rejects all pending requests and every later call once a "messageerror" event fires', async () => {
    const port = createFakeGenerationWorkerPort(null)
    const client = createGenerationWorkerClient(port)
    const intent = buildIntent('client-messageerror-event', 42)

    const pending = client.generate(intent)
    port.emitMessageError()

    await expect(pending).rejects.toBeInstanceOf(GenerationWorkerTransportError)
    await expect(client.generate(intent)).rejects.toBeInstanceOf(GenerationWorkerTransportError)
  })

  it('throws on a malformed response instead of silently ignoring it', () => {
    const port = createFakeGenerationWorkerPort()
    createGenerationWorkerClient(port)

    expect(() => port.dispatchMessageSync({ type: 'nonsense' })).toThrow(
      GenerationWorkerProtocolError,
    )
  })

  it('throws when a response arrives for an id with no matching pending request', () => {
    const port = createFakeGenerationWorkerPort()
    createGenerationWorkerClient(port)

    expect(() =>
      port.dispatchMessageSync({
        type: 'outcome',
        id: 999,
        outcome: {
          kind: 'generation_failure',
          code: 'no_legal_harmony_plan',
          diagnostics: {
            version: 'generation-diagnostics-v1',
            harmonyDomainSize: 0,
            rhythmDomainSize: 0,
            windows: [],
            successfulRegisters: [],
          },
        },
      }),
    ).toThrow(GenerationWorkerProtocolError)
  })

  it('dispose() terminates the port and rejects every pending request', async () => {
    const port = createFakeGenerationWorkerPort(null)
    const client = createGenerationWorkerClient(port)
    const intent = buildIntent('client-dispose', 51)

    const pending = client.generate(intent)
    client.dispose()

    await expect(pending).rejects.toBeInstanceOf(GenerationWorkerTransportError)
    expect(port.terminated()).toBe(true)
  })
})
