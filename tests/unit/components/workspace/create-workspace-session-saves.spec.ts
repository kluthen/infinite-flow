/**
 * The workspace session saves the player's changes through the visit's save policy: Idle's control
 * actions and the screen's saver write through it, and each session controller holds the saves
 * from an accepted start to its end.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { composeWorkspaceSession } from '@/components/workspace/create-workspace-session'
import { resetFakeEngraver } from '../../notation/fake-vexflow-engraver-loader'
import { recordingPolicy, type PolicyCall } from '../../storage/recording-save-policy'
import { fakeDependencies, fakeSavedData, generateAndEngrave } from './fake-workspace-dependencies'

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

/** Intent: the calls that reached a recording policy, each save as the setting keys it wrote. */
function policyCalls(calls: readonly PolicyCall[]): unknown[] {
  return calls.map((call) =>
    call.method === 'save'
      ? { save: call.changes.map((change) => (change.kind === 'write' ? change.key : change)) }
      : call.method,
  )
}

// @test-link [[rule_settings_saved_on_change]]
// @test-link [[rule_no_save_during_session]]
describe("composeWorkspaceSession: saving the player's changes", () => {
  it("saves Idle's changes and the screen's through the visit's policy, held while a session runs", async () => {
    const { policy, calls } = recordingPolicy()
    const savedData = { ...fakeSavedData(), savePolicy: Promise.resolve(policy) }
    const workspace = composeWorkspaceSession({ ...fakeDependencies(), savedData })
    const controller = await workspace.createSessionController()
    expect(await generateAndEngrave(workspace)).toBe(true)

    workspace.session.actions.setTheme('Dark')
    workspace.saveSettings({ 'mix.clickOn': false })
    controller.start()
    workspace.saveSettings({ 'mix.clickVolume': 0.5 })
    controller.stop()

    expect(policyCalls(calls)).toEqual([
      { save: ['theme'] },
      { save: ['mix.clickOn'] },
      'hold',
      { save: ['mix.clickVolume'] },
      'release',
    ])
    controller.dispose()
    workspace.dispose()
  })
})
