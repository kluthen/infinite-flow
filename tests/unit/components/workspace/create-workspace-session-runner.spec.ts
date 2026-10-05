/**
 * `composeWorkspaceSession`'s session runner and phrase replay key, over fake dependencies whose
 * generate seam runs real generations: the runner starts from the Idle phrase and asks for phrase 2
 * through the same generate seam (never prewarming), and every accepted phrase, Idle or session, is
 * announced once through the injected console sink with a replay key that decodes to its intent.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { composeWorkspaceSession } from '@/components/workspace/create-workspace-session'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { encodeSeed } from '@/domain/random/seed'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import type { SessionOutput } from '@/session/session-types'
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

// @test-link [[service_workspace_session_flow]]
// @test-link [[service_session_runner]]
describe('composeWorkspaceSession session runner', () => {
  // @test-link [[service_workspace_session_flow]]
  // @test-link [[service_session_runner]]
  // @test-link [[rule_phrase_one_is_idle_phrase]]
  it('starts from the Idle phrase and requests phrase 2 through the same generate seam', async () => {
    const deps = fakeDependencies()
    deps.generateMock.mockImplementation(async (intent: GenerationIntent) => generatePhrase(intent))
    const workspace = composeWorkspaceSession(deps)
    chooseCheapControls(workspace)
    expect(await generateAndEngrave(workspace)).toBe(true)
    const idle = workspace.session.state.result
    expect(idle).not.toBeNull()
    const outputs: SessionOutput[] = []
    const errors: unknown[] = []

    const startRunner = await workspace.loadSessionRunner()
    const runner = startRunner({
      start: {
        at: 0,
        settings: {
          controls: workspace.session.state.controls,
          musicalProfile: workspace.session.state.profileSelection,
        },
        phraseOne: { intent: idle!.intent, outcome: idle!.outcome },
        adaptiveTempo: false,
        varySettings: false,
        multiPhraseTensionArc: false,
      },
      checkFit: async () => true,
      now: () => 0.1,
      display: { isPhraseOnScreen: () => false },
      onOutput: (output) => outputs.push(output),
      onError: (error) => errors.push(error),
    })
    runner.dispatch({ kind: 'end', at: 0.1, cause: 'stop' })

    expect(deps.generateMock).toHaveBeenCalledTimes(2)
    const phraseTwoIntent = deps.generateMock.mock.calls[1]![0] as GenerationIntent
    expect(phraseTwoIntent.carryIn?.phraseNumber).toBe(1)
    expect(outputs[0]).toMatchObject({
      kind: 'request-generation',
      phraseNumber: 2,
      intent: phraseTwoIntent,
    })
    expect(outputs.at(-1)?.kind).toBe('ended')
    expect(errors).toEqual([])
  })

  // @test-link [[service_workspace_session_flow]]
  // @test-link [[service_session_runner]]
  it('keeps the runner on the generate seam with prewarm enabled: it never prewarms or draws for it', async () => {
    const deps = fakeDependencies('enabled')
    deps.generateMock.mockImplementation(async (intent: GenerationIntent) => generatePhrase(intent))
    const workspace = composeWorkspaceSession(deps)
    chooseCheapControls(workspace)
    expect(await generateAndEngrave(workspace)).toBe(true)
    const idle = workspace.session.state.result!
    const prewarmsBeforeRunner = deps.prewarmMock.mock.calls.length

    const startRunner = await workspace.loadSessionRunner()
    const runner = startRunner({
      start: {
        at: 0,
        settings: {
          controls: workspace.session.state.controls,
          musicalProfile: workspace.session.state.profileSelection,
        },
        phraseOne: { intent: idle.intent, outcome: idle.outcome },
        adaptiveTempo: false,
        varySettings: false,
        multiPhraseTensionArc: false,
      },
      checkFit: async () => true,
      now: () => 0.1,
      display: { isPhraseOnScreen: () => false },
      onOutput: () => undefined,
      onError: (error) => {
        throw error
      },
    })
    runner.dispatch({ kind: 'end', at: 0.1, cause: 'stop' })

    expect(deps.generateMock).toHaveBeenCalledTimes(2)
    const phraseTwoIntent = deps.generateMock.mock.calls[1]![0] as GenerationIntent
    expect(phraseTwoIntent.requestId).toBe('di-seam-request-2')
    expect(phraseTwoIntent.seed).toBe(2)
    expect(deps.prewarmMock).toHaveBeenCalledTimes(prewarmsBeforeRunner)
  })
})

/** The single console line one accepted phrase announces, its context, seed and key captured. */
const REPLAY_KEY_LINE =
  /^\[Infinite Flow\] phrase replay key · (workspace phrase|session phrase \d+ \((?:carry-in|standalone)\)) · (seed1-[0-9a-f]{8}) · (ifk1\.[A-Za-z0-9_-]+)$/u

/** Intent: split one replay-key line into its context, seed code and key, failing on any other line. */
function parseReplayKeyLine(line: string) {
  const match = REPLAY_KEY_LINE.exec(line)
  if (match === null) throw new Error(`Not a phrase replay key line: ${line}`)
  return { context: match[1]!, seed: match[2]!, key: match[3]! }
}

/** Intent: whether a runner output readies a phrase, narrowing it to that output. */
function isPhraseReady(
  output: SessionOutput,
): output is Extract<SessionOutput, { kind: 'phrase-ready' }> {
  return output.kind === 'phrase-ready'
}

// @test-link [[module_phrase_replay_key]]
describe('composeWorkspaceSession phrase replay key', () => {
  // @test-link [[module_phrase_replay_key]]
  it('announces a generated Idle phrase once through the injected sink, its key decoding to the result intent', async () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)

    expect(await generateAndEngrave(workspace)).toBe(true)

    const result = workspace.session.state.result!
    expect(deps.replayKeyLines).toHaveLength(1)
    const line = parseReplayKeyLine(deps.replayKeyLines[0]!)
    expect(line.context).toBe('workspace phrase')
    expect(line.seed).toBe(encodeSeed(result.intent.seed))
    const decoded = decodePhraseReplayKey(line.key)
    expect(decoded.intent).toEqual(result.intent)
    expect(decoded.phraseNumber).toBe(1)
  })

  // @test-link [[module_phrase_replay_key]]
  it('announces a readied carry-in session phrase, then forwards that output unchanged', async () => {
    const deps = fakeDependencies()
    deps.generateMock.mockImplementation(async (intent: GenerationIntent) => generatePhrase(intent))
    const workspace = composeWorkspaceSession(deps)
    chooseCheapControls(workspace)
    expect(await generateAndEngrave(workspace)).toBe(true)
    const idle = workspace.session.state.result!
    const outputs: SessionOutput[] = []
    const linesWhenForwarded: number[] = []

    const startRunner = await workspace.loadSessionRunner()
    const runner = startRunner({
      start: {
        at: 0,
        settings: {
          controls: workspace.session.state.controls,
          musicalProfile: workspace.session.state.profileSelection,
        },
        phraseOne: { intent: idle.intent, outcome: idle.outcome },
        adaptiveTempo: false,
        varySettings: false,
        multiPhraseTensionArc: false,
      },
      checkFit: async () => true,
      now: () => 0.1,
      display: { isPhraseOnScreen: () => false },
      onOutput: (output) => {
        outputs.push(output)
        linesWhenForwarded.push(deps.replayKeyLines.length)
      },
      onError: (error) => {
        throw error
      },
    })
    await vi.waitFor(() => {
      if (!outputs.some(isPhraseReady)) throw new Error('phrase 2 not readied yet')
    })
    runner.dispatch({ kind: 'end', at: 0.2, cause: 'stop' })

    const readyIndex = outputs.findIndex(isPhraseReady)
    const ready = outputs[readyIndex]!
    if (!isPhraseReady(ready)) throw new Error('expected a phrase-ready output')
    expect(ready.phrase).toMatchObject({ phraseNumber: 2, origin: 'carry-in' })
    expect(ready.phrase.intent).toBe(deps.generateMock.mock.calls[1]![0])
    expect(linesWhenForwarded[readyIndex]).toBe(2)
    expect(deps.replayKeyLines).toHaveLength(2)
    const line = parseReplayKeyLine(deps.replayKeyLines[1]!)
    expect(line.context).toBe('session phrase 2 (carry-in)')
    expect(line.seed).toBe(encodeSeed(ready.phrase.intent.seed))
    const decoded = decodePhraseReplayKey(line.key)
    expect(decoded.intent).toEqual(ready.phrase.intent)
    expect(decoded.phraseNumber).toBe(2)
    expect(outputs.at(-1)?.kind).toBe('ended')
  })
})
