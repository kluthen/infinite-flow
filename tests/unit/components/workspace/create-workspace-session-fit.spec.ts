/**
 * `composeWorkspaceSession`'s fit and room checks, over fake dependencies and a fake engraver
 * planner: each phrase is checked against the staff's latest layout inputs before it is drawn, a
 * phrase too wide is never drawn (fresh attempts, then the too-many-notes notice), the room check
 * reruns on each layout report under the no-room notice, and a phrase checked before the staff
 * reported any inputs stays a retryable notation error.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { composeWorkspaceSession } from '@/components/workspace/create-workspace-session'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import { fakeEngraver, resetFakeEngraver } from '../../notation/fake-vexflow-engraver-loader'
import { fakeDependencies, generateAndEngrave, STAFF_INPUTS } from './fake-workspace-dependencies'

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
      viewport: { layout: 'one-system', heightBudgetPx: null },
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
