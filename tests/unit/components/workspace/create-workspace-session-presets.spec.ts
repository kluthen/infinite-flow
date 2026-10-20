/**
 * The preset selection across the workspace's load: the saved v3.0 selection the composition root
 * starts Idle from loads as a preset or Custom based on it, with that built-in's levels, and the
 * selection the player chooses survives a save and a reload through the saver's writes and the
 * settings record's decode.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { composeWorkspaceSession } from '@/components/workspace/create-workspace-session'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { JAZZ_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { builtInPreset } from '@/domain/presets/built-in-presets'
import { defaultSettings, type SavedSettings } from '@/storage/records/setting-defaults'
import { decodeSettings, encodeSettings } from '@/storage/records/settings-record'
import { themeDesign } from '../../audio/transport-rig'
import { flushAsync } from '../../composables/fit-session-harness'
import { resetFakeEngraver } from '../../notation/fake-vexflow-engraver-loader'
import { recordingPolicy, type PolicyCall } from '../../storage/recording-save-policy'
import { fakeDependencies, fakeSavedData } from './fake-workspace-dependencies'

vi.mock('@/generation-worker/browser-generation-worker', () => ({
  createBrowserGenerationWorker: vi.fn(() => ({
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    terminate: vi.fn(),
  })),
}))

vi.mock(
  '@/notation/vexflow-engraver-loader',
  () => import('../../notation/fake-vexflow-engraver-loader'),
)

beforeEach(() => {
  resetFakeEngraver()
})

/** Intent: the settings records a load starts from, with every settings record a policy saved. */
function recordsAfterSaves(settings: SavedSettings, calls: readonly PolicyCall[]): unknown[] {
  const byKey = new Map<string, unknown>(
    encodeSettings(settings, '3.0.0-test').map((record) => [record.key, record]),
  )
  for (const call of calls) {
    if (call.method !== 'save') continue
    for (const change of call.changes) {
      if (change.kind === 'write' && change.store === 'settings') {
        byKey.set(change.key, change.record)
      }
    }
  }
  return [...byKey.values()]
}

/** Intent: a workspace on fakes whose saves reach a recording policy. */
function recordingWorkspace(settings: SavedSettings) {
  const { policy, calls } = recordingPolicy()
  const savedData = { ...fakeSavedData(settings), savePolicy: Promise.resolve(policy) }
  return { workspace: composeWorkspaceSession({ ...fakeDependencies(), savedData }), calls }
}

/** Intent: the settings a reload decodes from the records after the saves. */
function reloaded(settings: SavedSettings, calls: readonly PolicyCall[]): SavedSettings {
  return decodeSettings(recordsAfterSaves(settings, calls), {
    mixDesign: themeDesign(),
    myInstrumentLoaded: false,
  })
}

// @test-link [[rule_saved_profile_becomes_preset]]
// @test-link [[rule_settings_saved_on_change]]
describe('composeWorkspaceSession: the preset selection across a reload', () => {
  it('loads Jazz saved with Tension at Build as Custom based on Jazz, with Jazz levels', () => {
    const savedData = fakeSavedData({
      controls: makeGenerationControls({
        ...DEFAULT_GENERATION_CONTROLS,
        ...builtInPreset('jazz').controls,
        tension: 'Build',
      }),
      profileSelection: { musicalProfile: 'Jazz', isCustom: false },
    })
    const workspace = composeWorkspaceSession({ ...fakeDependencies(), savedData })

    expect(workspace.session.state.selection).toEqual({ kind: 'custom', baseId: 'jazz' })
    expect(workspace.session.state.figureLevels).toEqual(JAZZ_FIGURE_LEVELS)
    expect(workspace.session.state.controls.tension).toBe('Build')
    workspace.dispose()
  })

  it('keeps Jazz, and Custom based on Jazz, through a save and a reload', async () => {
    const first = defaultSettings(themeDesign().defaults)
    const choosing = recordingWorkspace(first)
    expect(choosing.workspace.session.actions.selectPreset('jazz')).toBe(true)
    await flushAsync()
    choosing.workspace.dispose()

    const afterJazz = reloaded(first, choosing.calls)
    const jazz = recordingWorkspace(afterJazz)
    expect(jazz.workspace.session.state.selection).toEqual({ kind: 'preset', presetId: 'jazz' })
    expect(jazz.workspace.session.state.figureLevels).toEqual(JAZZ_FIGURE_LEVELS)

    expect(jazz.workspace.session.actions.setControl('contour', 'Rising')).toBe(true)
    await flushAsync()
    jazz.workspace.dispose()

    const custom = recordingWorkspace(reloaded(afterJazz, jazz.calls)).workspace
    expect(custom.session.state.selection).toEqual({ kind: 'custom', baseId: 'jazz' })
    expect(custom.session.state.figureLevels).toEqual(JAZZ_FIGURE_LEVELS)
    expect(custom.session.state.controls.contour).toBe('Rising')
    custom.dispose()
  })
})
