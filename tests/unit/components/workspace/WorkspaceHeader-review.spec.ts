/**
 * The header while the last session's Review shows: the session action reads `Close review`,
 * primary and always enabled, and asks the shell to close the Review; the phrase action is
 * disabled in place, keeping its label; the connection sheet's close lands on `Close review`.
 * Once the Review is kept, not showing, the header is back to its idle form.
 */
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import WorkspaceHeader from '@/components/workspace/WorkspaceHeader.vue'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import {
  createFakeSessionController,
  fakeReview,
  fakeReviewHistory,
  type FakeSessionController,
} from './fake-session-controller'
import { fakeGenerationSession, readyState, type FakeIdleState } from './fake-generation-session'

/** Intent: mount the header over `session` and `fake`, attached so focus can move. */
function mountHeader(
  session: GenerationSession<WorkspaceSessionResult>,
  fake: FakeSessionController,
) {
  return mount(WorkspaceHeader, {
    props: { session, controller: fake.controller, controllerStatus: { kind: 'connect' } },
    attachTo: document.body,
  })
}

/** Intent: a fake controller whose Review shows, as right after a session end. */
function showingReview(): FakeSessionController {
  return createFakeSessionController({
    canStart: false,
    startBlocker: 'review_showing',
    review: fakeReview(fakeReviewHistory(), true),
  })
}

/** Intent: the phrase action, the header's first action slot. */
function phraseAction(wrapper: ReturnType<typeof mountHeader>) {
  return wrapper.get('.header-actions > button:not(.session-action)')
}

/** Intent: the session action, the header's second action slot. */
function sessionAction(wrapper: ReturnType<typeof mountHeader>) {
  return wrapper.get('.header-actions > button.session-action')
}

afterEach(() => {
  document.body.innerHTML = ''
})

// @test-link [[req_last_session_review]]
describe('WorkspaceHeader while the Review shows', () => {
  // @test-link [[req_last_session_review]]
  it.each<[string, Partial<FakeIdleState>]>([
    ['Ready', readyState()],
    ['Loading', { operation: 'generating' }],
    ['Needs more room', { roomNotice: 'no_room' }],
    ['Empty', {}],
  ])(
    'reads Close review, primary and enabled, over %s, the phrase action disabled in place',
    (_name, idle) => {
      const wrapper = mountHeader(fakeGenerationSession(idle).session, showingReview())

      expect(sessionAction(wrapper).text()).toBe('Close review')
      expect(sessionAction(wrapper).classes()).toEqual([
        'btn',
        'btn-lg',
        'session-action',
        'btn-primary',
      ])
      expect(sessionAction(wrapper).attributes('disabled')).toBeUndefined()
      expect(phraseAction(wrapper).attributes('disabled')).toBeDefined()
      expect(phraseAction(wrapper).classes()).not.toContain('btn-primary')
    },
  )

  // @test-link [[req_last_session_review]]
  it('keeps the phrase action label it would have at Idle', () => {
    const wrapper = mountHeader(fakeGenerationSession(readyState()).session, showingReview())

    expect(phraseAction(wrapper).text()).toBe('Regenerate phrase')
  })

  // @test-link [[req_last_session_review]]
  it('asks the shell to close the Review on a click, never to start or stop a session', async () => {
    const { session } = fakeGenerationSession(readyState())
    const wrapper = mountHeader(session, showingReview())

    await sessionAction(wrapper).trigger('click')
    await phraseAction(wrapper).trigger('click')

    expect(wrapper.emitted('close-review')).toHaveLength(1)
    expect(wrapper.emitted('start-session')).toBeUndefined()
    expect(wrapper.emitted('stop-session')).toBeUndefined()
    expect(session.actions.regenerate).not.toHaveBeenCalled()
  })

  // @test-link [[req_last_session_review]]
  // @test-link [[rule_controller_connects_between_sessions]]
  it('focuses Close review when the connection sheet closes', () => {
    const wrapper = mountHeader(
      fakeGenerationSession({ operation: 'generating' }).session,
      showingReview(),
    )
    const exposed = wrapper.vm as unknown as { focusAfterConnectionSheet: () => void }

    exposed.focusAfterConnectionSheet()

    expect(document.activeElement).toBe(sessionAction(wrapper).element)
  })

  // @test-link [[req_last_session_review]]
  it('gives the session action its idle label and emphasis back once the Review is closed', async () => {
    const fake = showingReview()
    const wrapper = mountHeader(fakeGenerationSession(readyState()).session, fake)

    fake.controller.closeReview()
    await nextTick()

    expect(sessionAction(wrapper).text()).toBe('Start session')
    expect(sessionAction(wrapper).attributes('disabled')).toBeUndefined()
    expect(phraseAction(wrapper).attributes('disabled')).toBeUndefined()
    await sessionAction(wrapper).trigger('click')
    expect(wrapper.emitted('start-session')).toHaveLength(1)
    expect(wrapper.emitted('close-review')).toBeUndefined()
  })

  // @test-link [[req_last_session_review]]
  it('tells the shell whether each action is enabled', async () => {
    const fake = showingReview()
    const wrapper = mountHeader(fakeGenerationSession(readyState()).session, fake)
    const exposed = wrapper.vm as unknown as {
      sessionActionEnabled: boolean
      phraseActionEnabled: boolean
    }
    expect([exposed.sessionActionEnabled, exposed.phraseActionEnabled]).toEqual([true, false])

    fake.state.review = fakeReview(fakeReviewHistory(), false)
    fake.state.canStart = false
    fake.state.startBlocker = 'room_notice'
    await nextTick()

    expect([exposed.sessionActionEnabled, exposed.phraseActionEnabled]).toEqual([false, true])
  })
})
