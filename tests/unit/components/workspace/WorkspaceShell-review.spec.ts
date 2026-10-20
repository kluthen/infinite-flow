/**
 * The shell's side of the last session's Review: `Close review` closes it, scrolls the page
 * instantly to its top and moves focus by the idle state reached (the session action if enabled,
 * else `room-notice`, else the phrase action if enabled, else `controller-status`); `Review last
 * session` shows it again, scrolls to the top and focuses `review-title` once the lazily loaded
 * panel has mounted; finding its session damaged, it lands on the list's title as the notice row
 * apologises, the reports reaching the notices through the shell.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import WorkspaceShell from '@/components/workspace/WorkspaceShell.vue'
import {
  createDamagedSessionReports,
  type DamagedSessionReports,
} from '@/components/workspace/workspace-kept-sessions-seam'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { transportRig } from '../../audio/transport-rig'
import { recordedRecords } from '../review/review-fixtures'
import { createControllerRig } from '../../midi/midi-controller-rig'
import {
  createFakeSessionController,
  fakeReview,
  fakeReviewHistory,
  showingWith,
  type FakeSessionController,
  type FakeSessionControllerState,
} from './fake-session-controller'
import { fakeGenerationSession, readyState, type FakeIdleState } from './fake-generation-session'
import { PHRASE_SCORE_STUB } from './test-workspace'
import { provideSaveSettings } from './recording-save-settings'
import { noRememberedController, quietSavedData } from './quiet-saved-data'

vi.mock('@/components/review/ReviewPanel.vue', () => import('./review-panel-stub'))

// A session's start warms the Review's lazy area; loaded once ahead, so that warm-up settles within
// the test that starts it, as it does in the app once the chunk has loaded, not as the file ends.
beforeAll(async () => {
  await import('@/components/workspace/ReviewArea.vue')
})

afterEach(() => {
  document.body.innerHTML = ''
})

/** Intent: mount the shell over `session` and `fake`, its page scroll a spy. */
function mountShell(
  session: GenerationSession<WorkspaceSessionResult>,
  fake: FakeSessionController,
  damagedSessionReports: DamagedSessionReports | null = null,
) {
  const scrollToPageTop = vi.fn()
  const wrapper = mount(WorkspaceShell, {
    props: {
      damagedSessionReports,
      savedData: quietSavedData(),
      rememberedController: noRememberedController(),
      session,
      pendingPhrase: null,
      handleEngraved: () => {},
      handleNotationError: () => {},
      handleSessionStaffFailed: () => {},
      handleLayoutInputs: () => {},
      audio: transportRig().transport,
      midi: createControllerRig().controller,
      controller: fake.controller,
      jumpView: { scrollBy: vi.fn(), viewportBlockSize: () => 800 },
      scrollToPageTop,
    },
    global: { stubs: { PhraseScore: PHRASE_SCORE_STUB }, provide: provideSaveSettings() },
    attachTo: document.body,
  })
  return { wrapper, scrollToPageTop }
}

/**
 * Intent: a fake controller whose Review shows, as right after a session end; `afterClose` is the
 * start blocker the idle state leaves once it closes (null: Start session enabled).
 */
function showingReview(
  afterClose: FakeSessionControllerState['startBlocker'] = null,
): FakeSessionController {
  const fake = createFakeSessionController({
    canStart: false,
    startBlocker: 'review_showing',
    ...showingWith(fakeReview(fakeReviewHistory(recordedRecords()), true)),
  })
  const close = fake.closeReview.getMockImplementation()
  fake.closeReview.mockImplementation(() => {
    close?.()
    fake.state.canStart = afterClose === null
    fake.state.startBlocker = afterClose
  })
  return fake
}

/** Intent: the header's session action. */
function sessionAction(wrapper: ReturnType<typeof mountShell>['wrapper']) {
  return wrapper.get<HTMLButtonElement>('.header-actions > button.session-action')
}

/** Intent: the header's phrase action. */
function phraseAction(wrapper: ReturnType<typeof mountShell>['wrapper']) {
  return wrapper.get('.header-actions > button:not(.session-action)')
}

// @test-link [[req_last_session_review]]
describe('WorkspaceShell: Close review', () => {
  // @test-link [[req_last_session_review]]
  it.each<[string, string, Partial<FakeIdleState>, FakeSessionControllerState['startBlocker']]>([
    ['Ready', 'session-action', readyState(), null],
    ['Needs more room', 'room-notice', { roomNotice: 'no_room' }, 'room_notice'],
    ['too many notes', 'room-notice', { roomNotice: 'notes_too_wide' }, 'room_notice'],
    [
      'Initial generation error',
      'phrase-action',
      { generationError: new Error('boom') },
      'no_phrase',
    ],
    ['Loading', 'controller-status', { operation: 'generating' }, 'generation_running'],
  ])(
    'closes the Review, scrolls to the top and, in %s, focuses %s',
    async (_state, target, idle, afterClose) => {
      const fake = showingReview(afterClose)
      const { wrapper, scrollToPageTop } = mountShell(fakeGenerationSession(idle).session, fake)
      await flushPromises()
      sessionAction(wrapper).element.focus()

      await sessionAction(wrapper).trigger('click')
      await flushPromises()

      expect(fake.closeReview).toHaveBeenCalledTimes(1)
      expect(scrollToPageTop).toHaveBeenCalledTimes(1)
      expect(wrapper.find('.review-panel').exists()).toBe(false)
      const expected = {
        'session-action': () => sessionAction(wrapper).element,
        'room-notice': () => wrapper.get('.room-notice').element,
        'phrase-action': () => phraseAction(wrapper).element,
        'controller-status': () => wrapper.get('.controller-status').element,
      }[target]
      expect(document.activeElement).toBe(expected?.())
    },
  )
})

// @test-link [[req_last_session_review]]
describe('WorkspaceShell: Review last session', () => {
  // @test-link [[req_last_session_review]]
  it('shows the Review again, scrolls to the top, then focuses review-title once the panel mounts', async () => {
    const fake = showingReview()
    fake.controller.closeReview()
    const { wrapper, scrollToPageTop } = mountShell(
      fakeGenerationSession(readyState()).session,
      fake,
    )
    await flushPromises()

    await wrapper.get('.review-link').trigger('click')
    expect(fake.showReview).toHaveBeenCalledTimes(1)
    expect(scrollToPageTop).toHaveBeenCalledTimes(1)
    await flushPromises()

    expect(document.activeElement).toBe(wrapper.get('.review-title').element)
    expect(sessionAction(wrapper).text()).toBe('Close review')
  })

  // @test-link [[rule_new_session_discards_review]]
  // @test-link [[rule_midi_starting_note]]
  it('moves focus to the session action when a starting note starts a session from review-link', async () => {
    const fake = showingReview()
    fake.controller.closeReview()
    const { wrapper } = mountShell(fakeGenerationSession(readyState()).session, fake)
    await flushPromises()
    wrapper.get<HTMLButtonElement>('.review-link').element.focus()

    // The starting note starts the session from the controller, with no click on the page.
    fake.controller.start()
    await flushPromises()

    expect(wrapper.find('.review-link').exists()).toBe(false)
    expect(document.activeElement).toBe(sessionAction(wrapper).element)
    expect(sessionAction(wrapper).text()).toBe('Stop')
  })

  // @test-link [[rule_new_session_discards_review]]
  it('leaves focus where it is when a session starts with focus elsewhere', async () => {
    const fake = showingReview()
    fake.controller.closeReview()
    const { wrapper } = mountShell(fakeGenerationSession(readyState()).session, fake)
    await flushPromises()
    const status = wrapper.get<HTMLButtonElement>('.controller-status').element
    status.focus()

    fake.controller.start()
    await flushPromises()

    expect(document.activeElement).toBe(status)
  })
})

// @test-link [[module_kept_session_save]]
// @test-link [[req_kept_session_review]]
describe('WorkspaceShell: Review last session finding its session damaged', () => {
  it("shows the list in its place, focus on the list's title, and the notice row apologises", async () => {
    const reports = createDamagedSessionReports()
    const fake = showingReview()
    fake.controller.closeReview()
    fake.showReview.mockImplementation(() => {
      // As the controller lands a damaged session's deletion: told, its row gone, the list shown.
      reports.tell({ status: 'deleted', count: 1 })
      fake.state.keptRows = []
      fake.state.listShowing = true
      return Promise.resolve('damaged')
    })
    const { wrapper, scrollToPageTop } = mountShell(
      fakeGenerationSession(readyState()).session,
      fake,
      reports,
    )
    await flushPromises()
    expect(wrapper.find('.app-notice-row').exists()).toBe(false)

    await wrapper.get('.review-link').trigger('click')
    await flushPromises()

    expect(scrollToPageTop).toHaveBeenCalledTimes(1)
    expect(wrapper.get('.review-title').text()).toBe('All sessions')
    expect(document.activeElement).toBe(wrapper.get('.review-title').element)
    expect(wrapper.get('.app-notice-row').text()).toContain(
      "Sorry: a kept session was damaged and couldn't be read, so it was deleted.",
    )
  })
})
