/**
 * Unit coverage for the workspace-session DI seam: `composeWorkspaceSession` builds a working
 * session from explicit fake dependencies (never a real Worker or `crypto`): its generate seam,
 * engraving, audio transport, MIDI controller, session controllers and teardown. Its fit and room
 * checks, session runner and phrase replay key, and the production `createWorkspaceSession`, have
 * their own `create-workspace-session-*.spec.ts` siblings.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { composeWorkspaceSession } from '@/components/workspace/create-workspace-session'
import { JAZZ_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { NotationError } from '@/notation/notation-error'
import { DEFAULT_SESSION_OPTIONS } from '@/storage/records/setting-defaults'
import { resetFakeEngraver } from '../../notation/fake-vexflow-engraver-loader'
import {
  CHEAP_CONTROLS,
  fakeDependencies,
  fakeSavedData,
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

  // @test-link [[service_workspace_session_flow]]
  // @test-link [[rule_session_start_conditions]]
  it('builds session controllers over its Idle state, audio, browser ports and session clock', async () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)
    const controller = await workspace.createSessionController()
    expect(controller.state.startBlocker).toBe('no_phrase')
    expect(deps.sessionTimers).toEqual([])

    expect(await generateAndEngrave(workspace)).toBe(true)
    expect(controller.state.canStart).toBe(true)
    controller.start()

    expect(deps.audio.isRunning()).toBe(true)
    expect(deps.browser.wakeLock.isHeld()).toBe(true)
    expect(deps.sessionTimers.map((timer) => timer.running())).toEqual([true])
    expect(deps.generateMock).toHaveBeenCalledTimes(2)
    controller.dispose()
    expect(deps.audio.isRunning()).toBe(false)
    expect(controller.state.lastHistory?.phraseCount).toBe(0)
  })

  // @test-link [[service_workspace_session_flow]]
  // @test-link [[service_session_controller]]
  it('builds session controllers only once browser ports given still loading have loaded', async () => {
    const warm = composeWorkspaceSession(fakeDependencies())
    ;(await warm.createSessionController()).dispose()
    warm.dispose()
    const deps = fakeDependencies()
    let loadPorts!: (ports: typeof deps.browser) => void
    const workspace = composeWorkspaceSession({
      ...deps,
      browser: new Promise((resolve) => {
        loadPorts = resolve
      }),
    })
    let built = false
    const building = workspace.createSessionController().then((controller) => {
      built = true
      return controller
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(built).toBe(false)

    loadPorts(deps.browser)
    const controller = await building
    expect(await generateAndEngrave(workspace)).toBe(true)
    controller.start()

    expect(deps.browser.wakeLock.isHeld()).toBe(true)
    controller.dispose()
  })

  // @test-link [[rule_midi_starting_note]]
  it('builds session controllers over its MIDI controller and connection-sheet flag, false at first', async () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)
    const controller = await workspace.createSessionController()
    expect(await generateAndEngrave(workspace)).toBe(true)
    expect(workspace.connectionSheetOpen.value).toBe(false)
    deps.audio.unlock()
    deps.midiAccess.plug({ id: 'keys', name: 'Keys 49', manufacturer: 'Acme' })
    await workspace.midi.connect()
    expect(controller.state.startingNote).not.toBeNull()

    workspace.connectionSheetOpen.value = true

    expect(controller.state.startingNote).toBeNull()
    controller.dispose()
  })

  // @test-link [[rule_phrase_one_is_idle_phrase]]
  // @test-link [[module_session_rolling_display]]
  it('gives a session the very phrase Idle shows and its frame loop, and ends it when its staff fails', async () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)
    const controller = await workspace.createSessionController()
    expect(await generateAndEngrave(workspace)).toBe(true)

    controller.start()

    expect(controller.state.sessionStaff?.top?.phrase).toBe(workspace.pendingPhrase.value)
    expect(deps.sessionFrames.pending()).toBe(1)
    workspace.handleSessionStaffFailed(new NotationError('notation_engraving_failed', 'x', {}))
    expect(controller.state.lastEnd?.cause).toBe('staff-not-shown')
    expect(controller.state.sessionStaff).toBeNull()
    expect(deps.sessionFrames.pending()).toBe(0)
    expect(workspace.session.state.notationError).toBeNull()
    controller.dispose()
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

// @test-link [[rule_first_phrase_waits_for_saved_settings]]
// @test-link [[service_workspace_session_flow]]
describe('composeWorkspaceSession: the saved data', () => {
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  // @test-link [[service_session_controller]]
  it('starts Idle and the session controller from the loaded settings, and exposes the load', async () => {
    const savedData = fakeSavedData({
      controls: CHEAP_CONTROLS,
      figureLevels: JAZZ_FIGURE_LEVELS,
      presetSelection: { kind: 'custom', baseId: 'neutral' },
      theme: 'Light',
      sessionOptions: {
        ...DEFAULT_SESSION_OPTIONS,
        varySettings: true,
        tensionAcrossPhrases: true,
        risingTempo: true,
      },
    })
    const workspace = composeWorkspaceSession({ ...fakeDependencies(), savedData })

    expect(workspace.savedData).toBe(savedData)
    expect(workspace.session.state.controls).toEqual(CHEAP_CONTROLS)
    expect(workspace.session.state.selection).toEqual({ kind: 'custom', baseId: 'neutral' })
    expect(workspace.session.state.figureLevels).toEqual(JAZZ_FIGURE_LEVELS)
    expect(workspace.session.state.presentation.theme).toBe('Light')

    const controller = await workspace.createSessionController()
    expect(controller.state.varySettings).toBe(true)
    expect(controller.state.tensionAcrossPhrases).toBe(true)
    expect(controller.state.adaptiveTempo).toBe(true)
    expect(controller.state.adaptiveTempoAvailable).toBe(false)
    controller.dispose()
    workspace.dispose()
  })
})
