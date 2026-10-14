import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ScorePanel from '@/components/workspace/ScorePanel.vue'
import { createMixVolumePopover } from '@/components/workspace/mix-volume-popover'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import type { SessionStaff } from '@/components/notation/session-staff'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import { NotationError } from '@/notation/notation-error'
import type { ScoreOverlays } from '@/notation/score-overlays'
import type { StartingNote } from '@/session/starting-note'
import { createFakeSessionController } from './fake-session-controller'
import { reachTooManyNotesNotice } from './score-panel-harness'
import { createTestWorkspace, PHRASE_SCORE_STUB, type TestWorkspace } from './test-workspace'
import { provideSaveSettings } from './recording-save-settings'

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
    global: { stubs: { PhraseScore: PHRASE_SCORE_STUB }, provide: provideSaveSettings() },
    attachTo: document.body,
  })
}

// @test-link [[service_session_controller]]
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
// @test-link [[service_session_controller]]
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

/** Intent: a starting note at `identity` (a fresh object each call, as the controller recomputes it). */
function startingNoteAt(identity: ExpectedNoteIdentity): StartingNote {
  return { identity: { ...identity }, concertPitch: makeConcertPitch(60), label: 'C4' }
}

const FIRST_NOTE: ExpectedNoteIdentity = { phraseNumber: 1, measureIndex: 0, eventIndex: 0 }
const SECOND_NOTE: ExpectedNoteIdentity = { phraseNumber: 1, measureIndex: 0, eventIndex: 1 }

// @test-link [[module_notation_note_identity_overlays]]
describe('ScorePanel score overlays', () => {
  /** Intent: the overlays the panel hands PhraseScore now. */
  function overlaysOf(wrapper: ReturnType<typeof mountPanel>): ScoreOverlays {
    return wrapper.getComponent({ name: 'PhraseScore' }).props('overlays') as ScoreOverlays
  }

  it('marks nothing before the controller has loaded', () => {
    expect(overlaysOf(mountPanel(createTestWorkspace(), null))).toEqual({
      startMarker: null,
      playheadMeasure: null,
      acknowledged: [],
    })
  })

  // @test-link [[rule_starting_note_named]]
  // @test-link [[rule_acknowledgement_highlights_expected_note_only]]
  it("hands PhraseScore the controller's start marker, then its acknowledged notes", async () => {
    const fake = createFakeSessionController({ startingNote: startingNoteAt(FIRST_NOTE) })
    const wrapper = mountPanel(createTestWorkspace(), fake.controller)
    expect(overlaysOf(wrapper).startMarker).toEqual(FIRST_NOTE)

    const acknowledged = [FIRST_NOTE, SECOND_NOTE]
    fake.state.startingNote = null
    fake.state.acknowledged = acknowledged
    await flushPromises()

    expect(overlaysOf(wrapper)).toEqual({ startMarker: null, playheadMeasure: null, acknowledged })
  })
})
