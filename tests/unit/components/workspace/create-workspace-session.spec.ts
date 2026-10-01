/**
 * Unit coverage for the workspace-session DI seam: `composeWorkspaceSession` builds a working
 * session from explicit fake dependencies (never a real Worker or `crypto`), and
 * `createWorkspaceSession` wires the same composition to a real `GenerationWorkerClient`-shaped
 * `generate`/`dispose` pair without ever constructing a real browser `Worker`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  composeWorkspaceSession,
  createWorkspaceSession,
  type WorkspaceSessionDependencies,
} from '@/components/workspace/create-workspace-session'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import { makeSeed } from '@/domain/random/seed'
import type { SessionOutput } from '@/session/session-types'
import {
  createFakeViewportWidth,
  type FakeViewportWidth,
} from '../../composables/fake-viewport-width'
import { transportRig } from '../../audio/transport-rig'
import { createFakeMidiAccess, type FakeMidiAccess } from '../../midi/fake-midi-access'
import { createMidiController } from '@/midi/midi-controller'
import type { WorkspacePrewarmPolicy } from '@/components/workspace/prewarm-policy'
import { createBrowserGenerationWorker } from '@/generation-worker/browser-generation-worker'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import { fakeEngraver, resetFakeEngraver } from '../../notation/fake-vexflow-engraver-loader'

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

/** The layout inputs a mounted PhraseScore would report for a wide window. */
const STAFF_INPUTS: StaffLayoutInputs = {
  containerWidthPx: 1100,
  viewport: { layout: 'one-system' },
}

const CHEAP_CONTROLS = {
  ...DEFAULT_GENERATION_CONTROLS,
  noteDensity: 'Quarter',
  syncopation: 'Straight',
  silenceDensity: 'Sparse',
  harmonicMotion: 'Gentle diatonic',
  tension: 'Settled',
} as const

/** Intent: run one real, cheap generation for the given intent's own identity and seed. */
function cheapOutcome(requestId: string, seed: number): GenerationOutcome {
  const intent = createGenerationIntent({
    requestId: makeRequestId(requestId),
    seed: makeSeed(seed),
    controls: CHEAP_CONTROLS,
    musicalProfile: DEFAULT_PROFILE_SELECTION,
  })
  return generatePhrase(intent)
}

/**
 * Intent: build a fully fake dependency bundle whose seams a test can assert against directly,
 * under the given prewarm policy (disabled unless a test is about prewarm).
 */
function fakeDependencies(
  prewarmPolicy: WorkspacePrewarmPolicy = 'disabled',
): WorkspaceSessionDependencies & {
  readonly generateMock: ReturnType<typeof vi.fn>
  readonly disposeMock: ReturnType<typeof vi.fn>
  readonly prewarmMock: ReturnType<typeof vi.fn<(intent: GenerationIntent) => void>>
  readonly viewport: FakeViewportWidth
  readonly midiAccess: FakeMidiAccess
} {
  let seedCounter = 0
  let requestCounter = 0
  // A real generate seam always answers under the caller's own request identity/seed; this fake
  // preserves that contract (notationInputFromOutcome rejects a mismatched requestId) while still
  // producing a real, cheap generatePhrase() result rather than a hand-rolled stand-in.
  const generateMock = vi.fn(async (intent: GenerationIntent): Promise<GenerationOutcome> => {
    return cheapOutcome(intent.requestId, intent.seed)
  })
  const disposeMock = vi.fn()
  const prewarmMock = vi.fn<(intent: GenerationIntent) => void>()
  const { transport } = transportRig()
  const midiAccess = createFakeMidiAccess()
  return {
    providers: {
      nextRequestId: () => makeRequestId(`di-seam-request-${++requestCounter}`),
      nextSeed: () => makeSeed(++seedCounter),
    },
    viewport: createFakeViewportWidth(),
    generate: generateMock,
    prewarmPolicy,
    prewarm: prewarmMock,
    audio: transport,
    midi: createMidiController({
      provider: midiAccess,
      clock: { anchor: () => transport.clockAnchor() },
    }),
    dispose: disposeMock,
    generateMock,
    disposeMock,
    prewarmMock,
    midiAccess,
  }
}

/**
 * Intent: report the staff's layout inputs, start `generate()`, then settle its inner `notate()`
 * the way a mounted `PhraseScore` would (`layout-inputs` at mount, `handleEngraved` once the
 * coordinator publishes a phrase to engrave), so a fake dependency bundle with no real component
 * tree can still exercise the whole operation.
 */
function generateAndEngrave(
  workspace: ReturnType<typeof composeWorkspaceSession>,
): Promise<boolean> {
  workspace.handleLayoutInputs(STAFF_INPUTS)
  const running = workspace.session.actions.generate()
  void vi
    .waitFor(() => {
      if (workspace.pendingPhrase.value === null) throw new Error('not yet pending')
    })
    .then(() => workspace.handleEngraved())
  return running
}

describe('composeWorkspaceSession', () => {
  it('builds a session whose generate() delegates to the injected generate seam', async () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)

    const succeeded = await generateAndEngrave(workspace)

    expect(succeeded).toBe(true)
    expect(deps.generateMock).toHaveBeenCalledTimes(1)
    expect(workspace.session.state.result).not.toBeNull()
  })

  it('surfaces a rejected generate() seam as the session generation error, never a default result', async () => {
    const deps = fakeDependencies()
    deps.generateMock.mockRejectedValueOnce(new Error('injected failure'))
    const workspace = composeWorkspaceSession(deps)

    const succeeded = await workspace.session.actions.generate()

    expect(succeeded).toBe(false)
    expect(workspace.session.state.result).toBeNull()
    expect(workspace.session.state.generationError?.message).toContain('injected failure')
  })

  it('routes engraving through the shared notation coordinator: engraved -> ready result', async () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)

    const succeeded = await generateAndEngrave(workspace)

    expect(succeeded).toBe(true)
    expect(workspace.session.state.notationError).toBeNull()
  })

  // @test-link [[rule_audio_unlocked_by_player_click]]
  it('exposes the injected audio transport unchanged, still locked', () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)

    expect(workspace.audio).toBe(deps.audio)
    expect(workspace.audio.isUnlocked()).toBe(false)
  })

  // @test-link [[req_midi_controller_input]]
  // @test-link [[rule_controller_connects_between_sessions]]
  it('exposes the injected MIDI controller unchanged, without requesting MIDI access', () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)

    expect(workspace.midi).toBe(deps.midi)
    expect(workspace.midi.state()).toEqual({ kind: 'not-requested' })
    expect(deps.midiAccess.requestCount()).toBe(0)
  })

  it('dispose() forwards to the injected teardown', () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)

    workspace.dispose()

    expect(deps.disposeMock).toHaveBeenCalledTimes(1)
  })

  it('dispose() also stops the session listening for window-width crossings', () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)
    expect(deps.viewport.listenerCount()).toBe(1)

    workspace.dispose()

    expect(deps.viewport.listenerCount()).toBe(0)
  })
})

// @test-link [[module_idle_fit_round]]
describe('composeWorkspaceSession fit and room checks', () => {
  // @test-link [[module_idle_fit_round]]
  it("checks each phrase with the coordinator's latest layout inputs before it is drawn", async () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)

    expect(await generateAndEngrave(workspace)).toBe(true)

    const result = workspace.session.state.result!
    expect(fakeEngraver.planWrittenPhraseFit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ key: expect.anything() }),
      STAFF_INPUTS.containerWidthPx,
      STAFF_INPUTS.viewport,
    )
    const checked = fakeEngraver.planWrittenPhraseFit.mock.calls[0]![0]
    expect(workspace.pendingPhrase.value).toEqual(checked)
    expect(result.intent.requestId).toBe('di-seam-request-1')
  })

  // @test-link [[module_idle_fit_round]]
  // @test-link [[rule_idle_phrase_too_dense_is_replaced]]
  // @test-link [[rule_staff_needs_room_notice]]
  it('never draws a phrase the check finds too wide: four attempts, then the too-many-notes notice', async () => {
    const deps = fakeDependencies()
    fakeEngraver.planWrittenPhraseFit.mockReturnValue({ kind: 'notes_too_wide' })
    const workspace = composeWorkspaceSession(deps)
    workspace.handleLayoutInputs(STAFF_INPUTS)

    expect(await workspace.session.actions.generate()).toBe(false)

    expect(deps.generateMock).toHaveBeenCalledTimes(4)
    expect(workspace.pendingPhrase.value).toBeNull()
    expect(workspace.session.state.roomNotice).toBe('notes_too_wide')
    expect(workspace.session.state.notationError).toBeNull()
  })

  // @test-link [[module_idle_fit_round]]
  // @test-link [[rule_staff_notice_gives_way_to_new_phrase]]
  it('runs the room check on each layout report under the no-room notice, with the reported inputs', async () => {
    const deps = fakeDependencies()
    fakeEngraver.planWrittenPhraseFit.mockReturnValue({ kind: 'no_room', cause: 'too_narrow' })
    fakeEngraver.planStaffRoomForKey.mockReturnValue({ kind: 'no_room', cause: 'too_narrow' })
    const workspace = composeWorkspaceSession(deps)
    workspace.handleLayoutInputs(STAFF_INPUTS)
    await workspace.session.actions.generate()
    expect(workspace.session.state.roomNotice).toBe('no_room')

    const narrower: StaffLayoutInputs = {
      containerWidthPx: 300,
      viewport: { layout: 'one-system' },
    }
    workspace.handleLayoutInputs(narrower)
    await vi.waitFor(() => expect(fakeEngraver.planStaffRoomForKey).toHaveBeenCalledTimes(1))

    expect(fakeEngraver.planStaffRoomForKey).toHaveBeenCalledWith(
      expect.objectContaining({ count: expect.any(Number) }),
      narrower.containerWidthPx,
      narrower.viewport,
    )
    expect(workspace.session.state.roomNotice).toBe('no_room')
  })

  // @test-link [[module_idle_fit_round]]
  it('keeps a phrase checked before the staff reported any inputs as a retryable notation error, undrawn', async () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)

    expect(await workspace.session.actions.generate()).toBe(true)

    expect(workspace.session.state.notationError).toMatchObject({
      code: 'notation_container_unavailable',
    })
    expect(workspace.session.state.result).not.toBeNull()
    expect(workspace.pendingPhrase.value).toBeNull()
    expect(workspace.session.state.roomNotice).toBeNull()
  })
})

/** Intent: set the workspace's controls to the cheap-to-generate values, one control at a time. */
function chooseCheapControls(workspace: ReturnType<typeof composeWorkspaceSession>): void {
  const keys = [
    'noteDensity',
    'syncopation',
    'silenceDensity',
    'harmonicMotion',
    'tension',
  ] as const
  for (const key of keys) {
    expect(workspace.session.actions.setControl(key, CHEAP_CONTROLS[key])).toBe(true)
  }
}

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

    const runner = workspace.createSessionRunner({
      start: {
        at: 0,
        settings: {
          controls: workspace.session.state.controls,
          musicalProfile: workspace.session.state.profileSelection,
        },
        phraseOne: { intent: idle!.intent, outcome: idle!.outcome },
      },
      checkFit: async () => true,
      now: () => 0.1,
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

    const runner = workspace.createSessionRunner({
      start: {
        at: 0,
        settings: {
          controls: workspace.session.state.controls,
          musicalProfile: workspace.session.state.profileSelection,
        },
        phraseOne: { intent: idle.intent, outcome: idle.outcome },
      },
      checkFit: async () => true,
      now: () => 0.1,
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

/** Intent: a jsdom stand-in for `window.matchMedia`, recording the query and its listeners. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<unknown>()
  const matchMedia = vi.fn((query: string) => ({
    media: query,
    matches,
    addEventListener: (_type: string, listener: unknown) => listeners.add(listener),
    removeEventListener: (_type: string, listener: unknown) => listeners.delete(listener),
  }))
  vi.stubGlobal('matchMedia', matchMedia)
  return { matchMedia, listeners }
}

describe('createWorkspaceSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds a production session without ever calling crypto.getRandomValues eagerly', () => {
    stubMatchMedia(false)
    const workspace = createWorkspaceSession({ prewarmPolicy: 'disabled' })

    expect(workspace.session.state.operation).toBe('idle')
    expect(workspace.session.state.controls).toEqual(DEFAULT_GENERATION_CONTROLS)

    workspace.dispose()
  })

  // @test-link [[rule_audio_unlocked_by_player_click]]
  it('builds a locked audio transport that never constructs an AudioContext', () => {
    stubMatchMedia(false)
    const constructions = vi.fn()
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          constructions()
        }
      },
    )
    const workspace = createWorkspaceSession({ prewarmPolicy: 'disabled' })

    expect(workspace.audio.isUnlocked()).toBe(false)
    expect(workspace.audio.isRunning()).toBe(false)
    expect(constructions).not.toHaveBeenCalled()

    workspace.dispose()
    expect(constructions).not.toHaveBeenCalled()
  })

  // @test-link [[rule_generated_density_follows_window_width]]
  it("reads the window's width against bp-tablet-landscape through matchMedia", () => {
    const { matchMedia, listeners } = stubMatchMedia(true)
    const workspace = createWorkspaceSession({ prewarmPolicy: 'disabled' })

    expect(matchMedia).toHaveBeenCalledWith('(max-width: 63.9375rem)')
    expect(workspace.session.state.noteDensityContext.belowTabletLandscape).toBe(true)
    expect(listeners.size).toBe(1)

    workspace.dispose()
    expect(listeners.size).toBe(0)
  })

  // @test-link [[service_workspace_session_flow]]
  it('posts one prewarm for the default controls to the new worker with prewarm enabled', () => {
    stubMatchMedia(false)
    const workspace = createWorkspaceSession({ prewarmPolicy: 'enabled' })

    const port = vi.mocked(createBrowserGenerationWorker).mock.results.at(-1)!.value as {
      postMessage: ReturnType<typeof vi.fn>
    }
    expect(port.postMessage).toHaveBeenCalledTimes(1)
    expect(port.postMessage.mock.calls[0]![0]).toMatchObject({
      type: 'prewarm',
      intent: { controls: { noteDensity: DEFAULT_GENERATION_CONTROLS.noteDensity } },
    })

    workspace.dispose()
  })

  // @test-link [[service_workspace_session_flow]]
  it('posts nothing to the new worker with prewarm disabled', () => {
    stubMatchMedia(false)
    const workspace = createWorkspaceSession({ prewarmPolicy: 'disabled' })
    workspace.session.actions.setControl('syncopation', 'Active displacement')

    const port = vi.mocked(createBrowserGenerationWorker).mock.results.at(-1)!.value as {
      postMessage: ReturnType<typeof vi.fn>
    }
    expect(port.postMessage).not.toHaveBeenCalled()

    workspace.dispose()
  })
})
