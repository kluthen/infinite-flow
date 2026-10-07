import { describe, expect, it } from 'vitest'

import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import {
  GenerationWorkerCrashError,
  GenerationWorkerTransportError,
  createGenerationWorkerClient,
  type GenerationWorkerClient,
  type GenerationWorkerPort,
} from '@/generation-worker/generation-worker-client'
import { GenerationWorkerProtocolError } from '@/generation-worker/generation-worker-protocol'

import { buildIntent } from './client-intents'
import { createFakeGenerationWorkerPort } from './fake-generation-worker-port'

/** Intent: recursively sample every reachable plain object/array from `value` and assert it is frozen. */
function expectDeepFrozen(value: unknown): void {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return
  expect(Object.isFrozen(value)).toBe(true)
  for (const key of Object.getOwnPropertyNames(value)) {
    expectDeepFrozen((value as Record<string, unknown>)[key])
  }
}

/** Intent: a client over the one fake `port`, re-warming a replacement worker. */
function clientOver(port: GenerationWorkerPort): GenerationWorkerClient {
  return createGenerationWorkerClient(() => port, { prewarmEnabled: true })
}

// @test-link [[service_workspace_session_runner_factory]]
describe('createGenerationWorkerClient', () => {
  // @test-link [[rule_seeded_phrase_reproduction]]
  it('resolves generate() with an outcome deep-equal to a direct generatePhrase call, fully frozen', async () => {
    const intent = buildIntent('client-success', 11)
    const expected = generatePhrase(intent)
    const client = clientOver(createFakeGenerationWorkerPort())

    const outcome = await client.generate(intent)

    expect(outcome).toEqual(expected)
    expectDeepFrozen(outcome)
  })

  it('resolves two concurrent generate() calls to their own independently matching outcomes', async () => {
    const intentA = buildIntent('client-concurrent-a', 21)
    const intentB = buildIntent('client-concurrent-b', 22)
    const expectedA = generatePhrase(intentA)
    const expectedB = generatePhrase(intentB)
    const client = clientOver(createFakeGenerationWorkerPort())

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
    const client = clientOver(port)

    await expect(client.generate(intent)).rejects.toBeInstanceOf(GenerationWorkerCrashError)
    await expect(client.generate(intent)).rejects.toMatchObject({
      workerErrorName: 'RangeError',
      message: expect.stringContaining('boom'),
    })
  })

  it('rejects all pending requests and every later call once an "error" event fires', async () => {
    const port = createFakeGenerationWorkerPort(null)
    const client = clientOver(port)
    const intent = buildIntent('client-error-event', 41)

    const pending = client.generate(intent)
    port.emitError()

    await expect(pending).rejects.toBeInstanceOf(GenerationWorkerTransportError)
    await expect(client.generate(intent)).rejects.toBeInstanceOf(GenerationWorkerTransportError)
  })

  it('rejects all pending requests and every later call once a "messageerror" event fires', async () => {
    const port = createFakeGenerationWorkerPort(null)
    const client = clientOver(port)
    const intent = buildIntent('client-messageerror-event', 42)

    const pending = client.generate(intent)
    port.emitMessageError()

    await expect(pending).rejects.toBeInstanceOf(GenerationWorkerTransportError)
    await expect(client.generate(intent)).rejects.toBeInstanceOf(GenerationWorkerTransportError)
  })

  it('throws on a malformed response instead of silently ignoring it', () => {
    const port = createFakeGenerationWorkerPort()
    clientOver(port)

    expect(() => port.dispatchMessageSync({ type: 'nonsense' })).toThrow(
      GenerationWorkerProtocolError,
    )
  })

  it('throws when a response arrives for an id with no matching pending request', () => {
    const port = createFakeGenerationWorkerPort()
    clientOver(port)

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
    const client = clientOver(port)
    const intent = buildIntent('client-dispose', 51)

    const pending = client.generate(intent)
    client.dispose()

    await expect(pending).rejects.toBeInstanceOf(GenerationWorkerTransportError)
    expect(port.terminated()).toBe(true)
  })
})

// @test-link [[module_generation_worker_protocol]]
describe('createGenerationWorkerClient: prewarm', () => {
  it('posts one id-less prewarm message and consumes no correlation id', async () => {
    const port = createFakeGenerationWorkerPort()
    const client = clientOver(port)
    const intent = buildIntent('client-prewarm', 61)

    expect(client.prewarm(intent)).toBeUndefined()
    const outcome = client.generate(intent)

    expect(port.postedMessages()).toEqual([
      { type: 'prewarm', intent },
      { type: 'generate', id: 1, intent },
    ])
    await expect(outcome).resolves.toEqual(generatePhrase(intent))
  })

  it('gets no response for a prewarm, and its queued slice then completes quietly', async () => {
    const port = createFakeGenerationWorkerPort()
    const client = clientOver(port)
    client.prewarm(buildIntent('client-prewarm-quiet', 62))
    await Promise.resolve()

    expect(port.pendingSliceCount()).toBe(1)
    port.runNextSlice()
    expect(port.pendingSliceCount()).toBe(0)
  })

  it('posts nothing once the worker is unusable', () => {
    const port = createFakeGenerationWorkerPort(null)
    const client = clientOver(port)
    port.emitError()

    client.prewarm(buildIntent('client-prewarm-broken', 63))

    expect(port.postedMessages()).toEqual([])
  })
})
