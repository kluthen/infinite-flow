import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ScorePanel from '@/components/workspace/ScorePanel.vue'
import { createMixVolumePopover } from '@/components/workspace/mix-volume-popover'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
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
