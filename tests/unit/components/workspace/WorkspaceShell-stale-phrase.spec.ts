/**
 * The shell's side of a stale phrase 1: the Start click that the controller answers with the
 * stale-phrase prompt starts nothing and makes no jump, and the prompt, loaded on demand, shows;
 * its `Start with this phrase` starts in its click and leaves focus on the session action, now
 * `Stop`; its `Regenerate phrase` runs the session's Regenerate; a prompt the starting note opens
 * (the controller's state alone) shows too.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import WorkspaceShell from '@/components/workspace/WorkspaceShell.vue'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { transportRig } from '../../audio/transport-rig'
import { createControllerRig } from '../../midi/midi-controller-rig'
import { createFakeSessionController } from './fake-session-controller'
import { fakeGenerationSession, readyState } from './fake-generation-session'
import { PHRASE_SCORE_STUB } from './test-workspace'
import { provideSaveSettings } from './recording-save-settings'
import { noRememberedController, quietSavedData, quietPresetStore } from './quiet-saved-data'

vi.mock('@/components/review/ReviewPanel.vue', () => import('./review-panel-stub'))

// A session's start warms the Review's lazy area, and the prompt is its own chunk: both loaded
// once ahead, so they settle within the test, as they do in the app once loaded.
beforeAll(async () => {
  await import('@/components/workspace/ReviewArea.vue')
  await import('@/components/workspace/StalePhrasePrompt.vue')
})

afterEach(() => {
  document.body.innerHTML = ''
})

/** Intent: mount the shell over `session` and `controller`, the jump's scroll spied. */
function mountShell(
  session: GenerationSession<WorkspaceSessionResult>,
  controller: SessionController,
  scrollBy = vi.fn(),
) {
  return mount(WorkspaceShell, {
    props: {
      savedData: quietSavedData(),
      rememberedController: noRememberedController(),
      presetStore: quietPresetStore(),
      session,
      pendingPhrase: null,
      handleEngraved: () => {},
      handleNotationError: () => {},
      handleSessionStaffFailed: () => {},
      handleLayoutInputs: () => {},
      audio: transportRig().transport,
      midi: createControllerRig().controller,
      controller,
      jumpView: { scrollBy, viewportBlockSize: () => 0 },
      scrollToPageTop: vi.fn(),
    },
    global: { stubs: { PhraseScore: PHRASE_SCORE_STUB }, provide: provideSaveSettings() },
    attachTo: document.body,
  })
}

/** Intent: the header's session action. */
function sessionAction(wrapper: ReturnType<typeof mountShell>) {
  return wrapper.get('.header-actions > button.session-action')
}

/** Intent: the prompt's button labelled `label`, once the prompt is mounted. */
function promptButton(wrapper: ReturnType<typeof mountShell>, label: string) {
  const found = wrapper
    .findAll('[role="alertdialog"] button')
    .find((button) => button.text() === label)
  if (found === undefined) throw new Error(`the prompt shows no ${label}`)
  return found
}

// @test-link [[rule_stale_phrase_prompt_at_start]]
// @test-link [[service_workspace_session_flow]]
describe('WorkspaceShell: a stale phrase 1 at Start', () => {
  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('shows the prompt from the Start click and starts nothing; Start with this phrase starts, focus on Stop', async () => {
    const fake = createFakeSessionController()
    fake.staleOnStart = { opener: 'start', changed: ['tonalCenter'] }
    const { session } = fakeGenerationSession(readyState())
    const wrapper = mountShell(session, fake.controller)

    await sessionAction(wrapper).trigger('click')
    await flushPromises()

    expect(fake.start).toHaveBeenCalledOnce()
    expect(fake.state.phase).toBe('idle')
    expect(wrapper.get('[role="alertdialog"] .sheet-title').text()).toBe(
      'This phrase is from before your changes',
    )
    expect(document.activeElement?.textContent?.trim()).toBe('Regenerate phrase')

    await promptButton(wrapper, 'Start with this phrase').trigger('click')
    await nextTick()

    expect(fake.useStalePhrase).toHaveBeenCalledOnce()
    expect(fake.state.phase).toBe('count-in')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(sessionAction(wrapper).element)
  })

  it('runs the Regenerate from the prompt, nothing starting', async () => {
    const fake = createFakeSessionController({
      stalePhrasePrompt: { opener: 'note', changed: ['register'] },
    })
    const { session } = fakeGenerationSession(readyState())
    const regenerate = vi.spyOn(session.actions, 'regenerate')
    const wrapper = mountShell(session, fake.controller)
    await flushPromises()

    expect(wrapper.find('[role="alertdialog"] .sheet-hint').exists()).toBe(true)
    await promptButton(wrapper, 'Regenerate phrase').trigger('click')
    await nextTick()

    expect(regenerate).toHaveBeenCalledOnce()
    expect(fake.dismissStalePhrase).toHaveBeenCalledOnce()
    expect(fake.useStalePhrase).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })
})
