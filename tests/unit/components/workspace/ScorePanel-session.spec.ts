import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ScorePanel from '@/components/workspace/ScorePanel.vue'
import { createMixVolumePopover } from '@/components/workspace/mix-volume-popover'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import type { SessionStaff } from '@/components/notation/session-staff'
import { NotationError } from '@/notation/notation-error'
import { createFakeSessionController } from './fake-session-controller'
import { reachTooManyNotesNotice } from './score-panel-harness'
import { createTestWorkspace, PHRASE_SCORE_STUB, type TestWorkspace } from './test-workspace'

/** Intent: mount the panel on `workspace` over `controller`, attached so focus can move. */
function mountPanel(workspace: TestWorkspace, controller: SessionController | null) {
  return mount(ScorePanel, {
    props: {
      session: workspace.session,
      pendingPhrase: null,
      handleEngraved: workspace.handleEngraved,
      handleNotationError: workspace.handleNotationError,
      handleSessionStaffFailed: workspace.handleSessionStaffFailed,
      handleLayoutInputs: workspace.handleLayoutInputs,
      audio: workspace.audio,
      mixPopover: createMixVolumePopover('mix-volume-popover'),
      controller,
      matchesPhoneLayout: () => false,
    },
    global: { stubs: { PhraseScore: PHRASE_SCORE_STUB } },
    attachTo: document.body,
  })
}

// @test-link [[service_workspace_session_flow]]
// @test-link [[rule_stop_ends_session]]
describe('ScorePanel session cue row', () => {
  it('places session-cue-row after the banner position and right before staff-viewport', () => {
    const wrapper = mountPanel(createTestWorkspace(), null)

    const children = [...wrapper.get('.score-panel').element.children].map((el) => el.className)
    expect(children).toEqual(['score-toolbar', 'session-cue-row', 'staff-viewport'])
    wrapper.unmount()
  })

  it('passes the compact Stop on as a stop request', async () => {
    const fake = createFakeSessionController({ phase: 'count-in' })
    const wrapper = mountPanel(createTestWorkspace(), fake.controller)

    await wrapper.get('.session-cue-actions .btn-primary').trigger('click')

    expect(wrapper.emitted('stop-session')).toHaveLength(1)
    wrapper.unmount()
  })

  it('focuses room-notice on request', async () => {
    const workspace = createTestWorkspace()
    const wrapper = mountPanel(workspace, null)
    await reachTooManyNotesNotice(workspace)
    await flushPromises()

    ;(wrapper.vm as unknown as { focusRoomNotice: () => void }).focusRoomNotice()

    expect(document.activeElement).toBe(wrapper.get('.room-notice').element)
    wrapper.unmount()
  })
})

// @test-link [[module_session_rolling_display]]
// @test-link [[service_workspace_session_flow]]
describe('ScorePanel session staff', () => {
  // @test-link [[module_session_rolling_display]]
  it('hands PhraseScore the session staff while a session runs, and none at Idle', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountPanel(createTestWorkspace(), fake.controller)
    const score = wrapper.getComponent({ name: 'PhraseScore' })
    expect(score.props('session')).toBeNull()

    const staff: SessionStaff = { layout: 'split', top: null, bottom: null, playhead: null }
    fake.state.sessionStaff = staff
    await flushPromises()
    expect(score.props('session')).toEqual(staff)

    fake.state.sessionStaff = null
    await flushPromises()
    expect(score.props('session')).toBeNull()
    wrapper.unmount()
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('forwards a session staff failure to the session handler, never to Idle', async () => {
    const workspace = createTestWorkspace()
    const wrapper = mountPanel(workspace, createFakeSessionController().controller)
    const error = new NotationError('notation_engraving_failed', 'failed', {})

    wrapper.getComponent({ name: 'PhraseScore' }).vm.$emit('session-staff-failed', error)
    await flushPromises()

    expect(workspace.sessionStaffFailures).toEqual([error])
    expect(workspace.session.state.notationError).toBeNull()
    wrapper.unmount()
  })
})
