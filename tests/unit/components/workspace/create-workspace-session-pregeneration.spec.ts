/**
 * `composeWorkspaceSession`'s Idle pre-generation, over fake dependencies: the queue runs only once
 * the session controller exists, after the prewarm, on the same generate seam with a signal per
 * background attempt; every Idle player request yields to the player first, aborting the attempt
 * in flight, and still posts no signal; no background attempt announces a replay key, and a ready
 * phrase a session spends is announced at its phrase-ready, like any accepted session phrase.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  composeWorkspaceSession,
  type WorkspaceSession,
} from '@/components/workspace/create-workspace-session'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { GenerationCancelledError } from '@/generation-worker/generation-worker-client'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import { resetFakeEngraver } from '../../notation/fake-vexflow-engraver-loader'
import {
  chooseCheapControls,
  fakeDependencies,
  generateAndEngrave,
} from './fake-workspace-dependencies'

vi.mock('@/generation-worker/browser-generation-worker', () => ({
  createBrowserGenerationWorker: vi.fn(() => ({
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    terminate: vi.fn(),
  })),
}))

// The fit and room checks plan through the lazy engraver loader; a fake planner answers here.
vi.mock(
  '@/notation/vexflow-engraver-loader',
  () => import('../../notation/fake-vexflow-engraver-loader'),
)

beforeEach(() => {
  resetFakeEngraver()
})

/** Intent: let every pending promise settle. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** Intent: settle a player regeneration the way a mounted staff would, by engraving it. */
async function regenerateAndEngrave(workspace: WorkspaceSession): Promise<boolean> {
  const running = workspace.session.actions.regenerate()
  await vi.waitFor(() => {
    if (workspace.session.state.operation !== 'notating') throw new Error('not drawing yet')
  })
  workspace.handleEngraved()
  return running
}

// @test-link [[rule_pregeneration_yields_to_player]]
describe('composeWorkspaceSession Idle pre-generation', () => {
  // @test-link [[rule_pregeneration_yields_to_player]]
  // @test-link [[module_idle_pregeneration_queue]]
  it('runs after the prewarm once the controller exists, and every player request yields to it first', async () => {
    const deps = fakeDependencies('enabled', 'enabled')
    const events: string[] = []
    deps.prewarmMock.mockImplementation(() => events.push('prewarm'))
    deps.generateMock.mockImplementation(
      (intent: GenerationIntent, signal?: AbortSignal): Promise<GenerationOutcome> => {
        if (signal === undefined) {
          events.push('player')
          return Promise.resolve(generatePhrase(intent))
        }
        events.push('background')
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            events.push('background aborted')
            reject(new GenerationCancelledError())
          })
        })
      },
    )
    const workspace = composeWorkspaceSession(deps)
    chooseCheapControls(workspace)
    expect(await generateAndEngrave(workspace)).toBe(true)
    await flush()
    expect(events.filter((event) => event !== 'prewarm')).toEqual(['player'])

    const controller = await workspace.createSessionController()
    await flush()
    expect(events.at(-1)).toBe('background')
    expect(events.indexOf('prewarm')).toBe(0)
    expect(controller.state.canStart).toBe(true)
    expect(workspace.session.state.operation).toBe('idle')

    expect(await regenerateAndEngrave(workspace)).toBe(true)

    const yielded = events.indexOf('background aborted')
    expect(events.slice(yielded - 1, yielded + 2)).toEqual([
      'background',
      'background aborted',
      'player',
    ])
    const playerCalls = deps.generateMock.mock.calls.filter((call) => call[1] === undefined)
    expect(playerCalls.map((call) => call.length)).toEqual([1, 1])
    controller.dispose()
  })

  // @test-link [[module_idle_pregeneration_queue]]
  it('runs no background attempt under the disabled policy', async () => {
    const deps = fakeDependencies('disabled', 'disabled')
    deps.generateMock.mockImplementation(async (intent: GenerationIntent) => generatePhrase(intent))
    const workspace = composeWorkspaceSession(deps)
    chooseCheapControls(workspace)
    expect(await generateAndEngrave(workspace)).toBe(true)

    const controller = await workspace.createSessionController()
    await flush()

    expect(deps.generateMock).toHaveBeenCalledOnce()
    controller.dispose()
  })
})

// @test-link [[module_session_ready_phrases]]
describe('composeWorkspaceSession replay keys with Idle pre-generation', () => {
  // @test-link [[module_session_ready_phrases]]
  // @test-link [[module_phrase_replay_key]]
  it('announces no background attempt, and a spent ready phrase at its phrase-ready', async () => {
    const deps = fakeDependencies('disabled', 'enabled')
    let pending = 0
    const background: GenerationIntent[] = []
    deps.generateMock.mockImplementation(async (intent: GenerationIntent, signal?: AbortSignal) => {
      if (signal === undefined) return generatePhrase(intent)
      background.push(intent)
      pending += 1
      await flush()
      pending -= 1
      return generatePhrase(intent)
    })
    const workspace = composeWorkspaceSession(deps)
    chooseCheapControls(workspace)
    expect(await generateAndEngrave(workspace)).toBe(true)

    const controller = await workspace.createSessionController()
    await vi.waitFor(
      () => {
        if (pending !== 0 || background.length < 4) throw new Error('still pre-generating')
      },
      { timeout: 10_000 },
    )
    await flush()
    expect(deps.replayKeyLines).toHaveLength(1)
    const callsBeforeStart = deps.generateMock.mock.calls.length

    controller.start()

    expect(deps.generateMock.mock.calls).toHaveLength(callsBeforeStart)
    expect(deps.replayKeyLines).toHaveLength(2)
    expect(deps.replayKeyLines[1]).toContain('session phrase 2 (carry-in)')
    const key = /(ifk3\.[A-Za-z0-9_-]+)$/u.exec(deps.replayKeyLines[1]!)![1]!
    const decoded = decodePhraseReplayKey(key)
    expect(decoded.phraseNumber).toBe(2)
    expect(background).toContainEqual(decoded.intent)
    controller.dispose()
  })
})
