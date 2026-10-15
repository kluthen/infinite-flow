/**
 * The shell's side of `Vary settings` and of a session's automatic changes: the "During a
 * session" group's `Off`/`On` control (off at load, set at Idle and in the Review through the
 * controller, read-only during a session and while the controller loads); the controls showing
 * what the controller says the sounding phrase was generated with, then the player's own again at
 * the end; and the preset status's announcement off for the whole session, polite again only
 * after the player's values have rendered back.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { nextTick, watch } from 'vue'

import WorkspaceShell from '@/components/workspace/WorkspaceShell.vue'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import type { SessionSettings } from '@/session/session-types'
import { transportRig } from '../../audio/transport-rig'
import { createControllerRig } from '../../midi/midi-controller-rig'
import { createFakeSessionController } from './fake-session-controller'
import { fakeGenerationSession, readyState } from './fake-generation-session'
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

/** Settings a session could show after a profile flip and a leapiness step: Jazz, customized. */
const VARIED: SessionSettings = {
  controls: { ...DEFAULT_GENERATION_CONTROLS, leapiness: 'Angular' },
  musicalProfile: { musicalProfile: 'Jazz', isCustom: true },
}

/** Intent: mount the shell over `session` and `controller` (null while it loads). */
function mountShell(
  session: GenerationSession<WorkspaceSessionResult>,
  controller: SessionController | null,
) {
  return mount(WorkspaceShell, {
    props: {
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
      controller,
      jumpView: { scrollBy: vi.fn(), viewportBlockSize: () => 800 },
      scrollToPageTop: vi.fn(),
    },
    global: { stubs: { PhraseScore: PHRASE_SCORE_STUB }, provide: provideSaveSettings() },
    attachTo: document.body,
  })
}

/** Intent: the radiogroup of a control by its accessible name. */
function group(wrapper: ReturnType<typeof mountShell>, name: string) {
  return wrapper.get(`[role="radiogroup"][aria-label="${name}"]`)
}

/** Intent: the checked segment's label in a radiogroup, or null. */
function checked(wrapper: ReturnType<typeof mountShell>, name: string): string | null {
  const segment = group(wrapper, name)
    .findAll('[role="radio"]')
    .find((radio) => radio.attributes('aria-checked') === 'true')
  return segment === undefined ? null : segment.text()
}

/** Intent: the preset status text in use. */
function presetStatus(wrapper: ReturnType<typeof mountShell>): string {
  return wrapper.get('.preset-status-text:not(.is-reserve)').text()
}

// @test-link [[req_settings_mutation_flag]]
describe('WorkspaceShell: the Vary settings control', () => {
  // @test-link [[req_settings_mutation_flag]]
  it('shows Off at load under "During a session", its note naming it, and sets On at Idle', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountShell(fakeGenerationSession(readyState()).session, fake.controller)
    expect(wrapper.get('.control-group-session > h3').text()).toBe('During a session')
    expect(checked(wrapper, 'Vary settings')).toBe('Off')
    const note = wrapper.get(`#${group(wrapper, 'Vary settings').attributes('aria-describedby')}`)
    expect(note.classes()).toContain('field-note')
    expect(note.text()).toBe(
      'Every 2 to 4 phrases, one setting moves one step. Never the instrument or the tempo. Your settings come back when the session ends.',
    )

    await group(wrapper, 'Vary settings').findAll('[role="radio"]')[1]!.trigger('click')

    expect(fake.setVarySettings).toHaveBeenCalledExactlyOnceWith(true)
    expect(checked(wrapper, 'Vary settings')).toBe('On')
  })

  // @test-link [[req_settings_mutation_flag]]
  // @test-link [[rule_session_settings_locked]]
  // @test-link [[rule_readonly_controls_keep_contrast]]
  it('is read-only during a session and while the controller loads, editable in the Review', async () => {
    const loading = mountShell(fakeGenerationSession(readyState()).session, null)
    expect(group(loading, 'Vary settings').attributes('aria-readonly')).toBe('true')

    const fake = createFakeSessionController({ varySettings: true })
    const wrapper = mountShell(fakeGenerationSession(readyState()).session, fake.controller)
    await wrapper.get('.header-actions > button.session-action').trigger('click')
    expect(group(wrapper, 'Vary settings').attributes('aria-readonly')).toBe('true')
    expect(wrapper.get('.control-group-session .field-group').classes()).toContain('is-readonly')
    await group(wrapper, 'Vary settings').findAll('[role="radio"]')[0]!.trigger('click')
    expect(fake.setVarySettings).not.toHaveBeenCalled()

    fake.state.phase = 'running'
    fake.stop()
    await flushPromises()
    expect(fake.state.review?.showing).toBe(true)
    expect(group(wrapper, 'Vary settings').attributes('aria-readonly')).toBeUndefined()
    await group(wrapper, 'Vary settings').findAll('[role="radio"]')[0]!.trigger('click')
    expect(fake.setVarySettings).toHaveBeenCalledExactlyOnceWith(false)
  })
})

// @test-link [[rule_automatic_change_updates_controls_quietly]]
// @test-link [[rule_mutation_reverts_at_session_end]]
describe("WorkspaceShell: a session's automatic changes", () => {
  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  // @test-link [[rule_mutation_reverts_at_session_end]]
  it("shows the controller's settings during a session, and the player's own again at its end", async () => {
    const fake = createFakeSessionController()
    const idle = fakeGenerationSession(readyState())
    const wrapper = mountShell(idle.session, fake.controller)
    await wrapper.get('.header-actions > button.session-action').trigger('click')
    expect(checked(wrapper, 'Leapiness')).toBe('Shaped')

    fake.state.shownSettings = VARIED
    await nextTick()
    expect(checked(wrapper, 'Leapiness')).toBe('Angular')
    expect(checked(wrapper, 'Musical profile preset')).toBeNull()
    expect(presetStatus(wrapper)).toMatch(/^Custom configuration - Jazz grammar retained/)
    expect(wrapper.get('.control-summary').text()).toBe(
      'C Ionian · Custom (Jazz grammar) · Lift · Angular',
    )

    fake.state.phase = 'running'
    fake.stop()
    await nextTick()
    expect(checked(wrapper, 'Leapiness')).toBe('Shaped')
    expect(checked(wrapper, 'Musical profile preset')).toBe('Neutral')
    expect(presetStatus(wrapper)).toMatch(/^Neutral preset applied/)
    expect(wrapper.get('.control-summary').text()).toBe('C Ionian · Neutral · Lift · Shaped')
  })

  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  it('turns the preset announcement off at the start, and on only after the end has rendered', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountShell(fakeGenerationSession(readyState()).session, fake.controller)
    const status = wrapper.get('.preset-status')
    expect(status.attributes('aria-live')).toBe('polite')

    await wrapper.get('.header-actions > button.session-action').trigger('click')
    expect(status.attributes('aria-live')).toBe('off')
    expect(status.attributes('role')).toBe('status')
    fake.state.shownSettings = VARIED
    await nextTick()
    expect(status.attributes('aria-live')).toBe('off')

    // A post-flush watcher of the test's own runs after the shell's, in the flush that renders
    // the end: the player's values are on screen then, and the status is still silent.
    const atEndRender: string[] = []
    const stopWatching = watch(
      () => fake.state.phase,
      () => atEndRender.push(`${status.attributes('aria-live')} | ${presetStatus(wrapper)}`),
      { flush: 'post' },
    )
    fake.state.phase = 'running'
    fake.stop()
    await nextTick()
    await nextTick()
    stopWatching()

    expect(atEndRender.at(-1)).toMatch(/^off \| Neutral preset applied/)
    expect(status.attributes('aria-live')).toBe('polite')
  })
})
