/**
 * Cancelling one pending request on the generation worker client: the worker running it is
 * replaced by a fresh one from the port factory, which receives every other pending request again
 * under its original id and, with the prewarm policy enabled, a prewarm of the cancelled intent.
 * Each worker the factory makes is a fake port; the first answers nothing, so its requests stay
 * pending until the test cancels one, and later ones answer through the real Worker runtime.
 */

import { describe, expect, it } from 'vitest'

import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import {
  GenerationCancelledError,
  GenerationWorkerCrashError,
  GenerationWorkerTransportError,
  createGenerationWorkerClient,
  type GenerationWorkerClient,
} from '@/generation-worker/generation-worker-client'

import { parseGenerationWorkerInboundMessage } from '@/generation-worker/generation-worker-inbound'

import { SAMPLE_RHYTHM_LOCK, SAMPLE_STEERING } from '../domain/generation/request-inputs-fixture'
import { buildIntent } from './client-intents'
import {
  createFakeGenerationWorkerPort,
  type FakeGenerationWorkerPort,
} from './fake-generation-worker-port'

/** A client over a factory of fake workers, and every worker that factory has made so far. */
interface CancelRig {
  readonly client: GenerationWorkerClient
  readonly ports: FakeGenerationWorkerPort[]
}

/**
 * Intent: a client whose first worker never answers and whose replacements answer for real,
 * re-warming a replacement only when `prewarmEnabled`.
 */
function cancelRig(prewarmEnabled: boolean): CancelRig {
  const ports: FakeGenerationWorkerPort[] = []
  /** Intent: make the next worker, silent if it is the first, and keep it for the test. */
  const createPort = (): FakeGenerationWorkerPort => {
    const port = createFakeGenerationWorkerPort(ports.length === 0 ? null : undefined)
    ports.push(port)
    return port
  }
  return { client: createGenerationWorkerClient(createPort, { prewarmEnabled }), ports }
}

/** Intent: let every queued microtask and promise continuation run. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// @test-link [[module_generation_worker_cancellation]]
describe('createGenerationWorkerClient: cancellation', () => {
  // @test-link [[module_generation_worker_cancellation]]
  // @test-link [[rule_dropped_attempt_cancelled]]
  it('rejects an aborted request, replaces its worker and re-posts the others under their ids', async () => {
    const { client, ports } = cancelRig(true)
    const [intentA, intentB, intentC] = [
      buildIntent('cancel-a', 71),
      buildIntent('cancel-b', 72),
      buildIntent('cancel-c', 73),
    ]
    const controller = new AbortController()
    const first = client.generate(intentA)
    const cancelled = client.generate(intentB, controller.signal)
    const third = client.generate(intentC, new AbortController().signal)

    controller.abort()

    await expect(cancelled).rejects.toBeInstanceOf(GenerationCancelledError)
    expect(ports).toHaveLength(2)
    expect(ports[0]!.terminated()).toBe(true)
    expect(ports[1]!.terminated()).toBe(false)
    expect(ports[1]!.postedMessages()).toEqual([
      { type: 'generate', id: 1, intent: intentA },
      { type: 'generate', id: 3, intent: intentC },
      { type: 'prewarm', intent: intentB },
    ])
    await expect(first).resolves.toEqual(generatePhrase(intentA))
    await expect(third).resolves.toEqual(generatePhrase(intentC))
  })

  // @test-link [[entity_request_rhythm_lock]]
  // @test-link [[entity_steering_block]]
  it('re-posts and re-warms intents holding the rhythm lock group and the steering block whole', async () => {
    const { client, ports } = cancelRig(true)
    const groups = { rhythmLock: SAMPLE_RHYTHM_LOCK, steering: SAMPLE_STEERING }
    const [kept, dropped] = [
      buildIntent('cancel-groups-a', 81, groups),
      buildIntent('cancel-groups-b', 82, groups),
    ]
    const controller = new AbortController()
    const first = client.generate(kept)
    const cancelled = client.generate(dropped, controller.signal)

    controller.abort()

    await expect(cancelled).rejects.toBeInstanceOf(GenerationCancelledError)
    const reposted = ports[1]!.postedMessages()
    expect(reposted).toEqual([
      { type: 'generate', id: 1, intent: kept },
      { type: 'prewarm', intent: dropped },
    ])
    for (const message of reposted)
      expect(parseGenerationWorkerInboundMessage(structuredClone(message))).toEqual(message)
    await expect(first).resolves.toEqual(generatePhrase(kept))
  })

  // @test-link [[module_generation_worker_cancellation]]
  // @test-link [[module_generation_prewarm]]
  it('posts no prewarm to the replacement worker with the prewarm policy disabled', async () => {
    const { client, ports } = cancelRig(false)
    const intentA = buildIntent('cancel-off-a', 74)
    const controller = new AbortController()
    const kept = client.generate(intentA)
    const cancelled = client.generate(buildIntent('cancel-off-b', 75), controller.signal)

    controller.abort()

    await expect(cancelled).rejects.toBeInstanceOf(GenerationCancelledError)
    expect(ports[1]!.postedMessages()).toEqual([{ type: 'generate', id: 1, intent: intentA }])
    await expect(kept).resolves.toEqual(generatePhrase(intentA))
  })

  // @test-link [[module_generation_worker_cancellation]]
  it('spawns a fresh worker even when no other request is pending, and serves later calls on it', async () => {
    const { client, ports } = cancelRig(false)
    const controller = new AbortController()
    const cancelled = client.generate(buildIntent('cancel-alone', 76), controller.signal)

    controller.abort()
    await expect(cancelled).rejects.toBeInstanceOf(GenerationCancelledError)
    expect(ports).toHaveLength(2)
    expect(ports[1]!.postedMessages()).toEqual([])

    const later = buildIntent('cancel-later', 77)
    await expect(client.generate(later)).resolves.toEqual(generatePhrase(later))
    expect(ports[1]!.postedMessages()).toEqual([{ type: 'generate', id: 2, intent: later }])
  })

  // @test-link [[module_generation_worker_cancellation]]
  it('ignores a late response and late errors from the terminated worker', async () => {
    const { client, ports } = cancelRig(true)
    const intentA = buildIntent('cancel-stale-a', 78)
    const controller = new AbortController()
    const kept = client.generate(intentA)
    void client.generate(buildIntent('cancel-stale-b', 79), controller.signal).catch(() => {})
    controller.abort()

    const stale = ports[0]!
    stale.dispatchMessageSync({ type: 'crash', id: 1, name: 'RangeError', message: 'stale' })
    stale.emitError()
    stale.emitMessageError()

    await expect(kept).resolves.toEqual(generatePhrase(intentA))
    const next = buildIntent('cancel-stale-next', 80)
    await expect(client.generate(next)).resolves.toEqual(generatePhrase(next))
  })

  // @test-link [[module_generation_worker_cancellation]]
  it('does nothing when the request has already settled', async () => {
    const ports: FakeGenerationWorkerPort[] = []
    const client = createGenerationWorkerClient(
      () => {
        const port = createFakeGenerationWorkerPort()
        ports.push(port)
        return port
      },
      { prewarmEnabled: true },
    )
    const intent = buildIntent('cancel-settled', 81)
    const controller = new AbortController()
    await expect(client.generate(intent, controller.signal)).resolves.toEqual(
      generatePhrase(intent),
    )

    controller.abort()

    expect(ports).toHaveLength(1)
    expect(ports[0]!.terminated()).toBe(false)
  })

  // @test-link [[module_generation_worker_cancellation]]
  it('rejects at once, posting nothing, a request whose signal is already aborted', async () => {
    const { client, ports } = cancelRig(true)

    await expect(
      client.generate(buildIntent('cancel-pre', 82), AbortSignal.abort()),
    ).rejects.toBeInstanceOf(GenerationCancelledError)

    expect(ports).toHaveLength(1)
    expect(ports[0]!.postedMessages()).toEqual([])
    expect(ports[0]!.terminated()).toBe(false)
  })

  // @test-link [[module_generation_worker_cancellation]]
  it('stays broken after a worker error: an abort revives nothing', async () => {
    const { client, ports } = cancelRig(true)
    const intent = buildIntent('cancel-broken', 83)
    const controller = new AbortController()
    const pending = client.generate(intent, controller.signal)
    ports[0]!.emitError()

    controller.abort()

    await expect(pending).rejects.toBeInstanceOf(GenerationWorkerTransportError)
    expect(ports).toHaveLength(1)
    await expect(client.generate(intent)).rejects.toBeInstanceOf(GenerationWorkerTransportError)
  })

  // @test-link [[module_generation_worker_cancellation]]
  it('dispose terminates the replacement worker, the current one', async () => {
    const { client, ports } = cancelRig(true)
    const controller = new AbortController()
    void client.generate(buildIntent('cancel-dispose', 84), controller.signal).catch(() => {})
    controller.abort()
    await settle()

    client.dispose()

    expect(ports).toHaveLength(2)
    expect(ports[1]!.terminated()).toBe(true)
  })

  // @test-link [[module_generation_worker_cancellation]]
  it('breaks with a transport error, failing the other pending requests, when no fresh worker can be made', async () => {
    let made = 0
    const client = createGenerationWorkerClient(
      () => {
        made += 1
        if (made > 1) throw new Error('no more workers')
        return createFakeGenerationWorkerPort(null)
      },
      { prewarmEnabled: true },
    )
    const intent = buildIntent('cancel-no-worker', 85)
    const controller = new AbortController()
    const kept = client.generate(intent)
    const cancelled = client.generate(intent, controller.signal)

    controller.abort()

    await expect(cancelled).rejects.toBeInstanceOf(GenerationCancelledError)
    await expect(kept).rejects.toBeInstanceOf(GenerationWorkerTransportError)
    await expect(client.generate(intent)).rejects.toBeInstanceOf(GenerationWorkerTransportError)
  })

  // @test-link [[module_generation_worker_cancellation]]
  it('re-posts a pending request that then crashes on the fresh worker, still rejecting it as a crash', async () => {
    let made = 0
    const client = createGenerationWorkerClient(
      () => {
        made += 1
        if (made === 1) return createFakeGenerationWorkerPort(null)
        return createFakeGenerationWorkerPort((data) => ({
          type: 'crash',
          id: (data as { id: number }).id,
          name: 'RangeError',
          message: 'fresh',
        }))
      },
      { prewarmEnabled: false },
    )
    const controller = new AbortController()
    const kept = client.generate(buildIntent('cancel-crash-a', 86))
    void client.generate(buildIntent('cancel-crash-b', 87), controller.signal).catch(() => {})

    controller.abort()

    await expect(kept).rejects.toBeInstanceOf(GenerationWorkerCrashError)
  })
})
