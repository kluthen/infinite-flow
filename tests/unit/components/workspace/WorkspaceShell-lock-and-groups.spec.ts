/**
 * The shell's side of session mode's rhythm lock, its allowed rhythm changes and Vary settings'
 * allowed groups: the "During a session" group shows what the session controller holds, whether
 * Vary settings has a move included, forwards each of the player's changes to it and saves it once
 * accepted, and is read-only during a session.
 */
import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import WorkspaceShell from '@/components/workspace/WorkspaceShell.vue'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation-scales'
import { transportRig } from '../../audio/transport-rig'
import { createControllerRig } from '../../midi/midi-controller-rig'
import { createFakeSessionController } from './fake-session-controller'
import { fakeGenerationSession, readyState } from './fake-generation-session'
import { PHRASE_SCORE_STUB } from './test-workspace'
import { provideSaveSettings, recordingSaveSettings } from './recording-save-settings'
import { noRememberedController, quietSavedData, quietPresetStore } from './quiet-saved-data'

vi.mock('@/components/review/ReviewPanel.vue', () => import('./review-panel-stub'))

// A session's start warms the Review's lazy area; loaded once ahead, so that warm-up settles within
// the test that starts it, as it does in the app once the chunk has loaded, not as the file ends.
beforeAll(async () => {
  await import('@/components/workspace/ReviewArea.vue')
})

afterEach(() => {
  document.body.innerHTML = ''
})

/** Intent: mount the shell over a ready Idle and `controller`, recording what it saves. */
function mountShell(controller: SessionController) {
  const { saveSettings, saves } = recordingSaveSettings()
  const wrapper = mount(WorkspaceShell, {
    props: {
      savedData: quietSavedData(),
      rememberedController: noRememberedController(),
      presetStore: quietPresetStore(),
      session: fakeGenerationSession(readyState()).session,
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
    global: {
      stubs: { PhraseScore: PHRASE_SCORE_STUB },
      provide: provideSaveSettings(saveSettings),
    },
    attachTo: document.body,
  })
  return { wrapper, saves }
}

type Shell = ReturnType<typeof mountShell>['wrapper']

/** Intent: the segment `text` of the radiogroup named `name`. */
function segment(wrapper: Shell, name: string, text: 'Off' | 'On') {
  const found = wrapper
    .get(`[role="radiogroup"][aria-label="${name}"]`)
    .findAll('[role="radio"]')
    .find((radio) => radio.text() === text)
  if (found === undefined) throw new Error(`no ${text} segment in ${name}`)
  return found
}

/** Intent: the toggle whose name starts with `name` in the "During a session" group. */
function toggle(wrapper: Shell, name: string) {
  const found = wrapper
    .findAll('.control-group-session .toggle-button')
    .find((button) => button.text().startsWith(name))
  if (found === undefined) throw new Error(`no ${name} toggle`)
  return found
}

// @test-link [[req_rhythm_lock]]
// @test-link [[rule_allowed_rhythm_changes]]
// @test-link [[rule_vary_settings_allowed_groups]]
describe('WorkspaceShell: the rhythm lock and the allowed groups', () => {
  // @test-link [[req_rhythm_lock]]
  // @test-link [[rule_allowed_rhythm_changes]]
  // @test-link [[rule_settings_saved_on_change]]
  it('forwards the lock and an allowed rhythm change to the controller, then saves each', async () => {
    const fake = createFakeSessionController()
    const { wrapper, saves } = mountShell(fake.controller)

    await segment(wrapper, 'Rhythm lock', 'On').trigger('click')
    await toggle(wrapper, 'Split a note').trigger('click')

    expect(fake.setRhythmLockOn).toHaveBeenCalledExactlyOnceWith(true)
    expect(fake.setAllowedRhythmChanges).toHaveBeenCalledExactlyOnceWith(['split_note'])
    expect(saves).toEqual([
      { 'sessionOptions.rhythmLockOn': true },
      { 'sessionOptions.allowedRhythmChanges': ['split_note'] },
    ])
    expect(toggle(wrapper, 'Split a note').attributes('aria-pressed')).toBe('true')
  })

  // @test-link [[rule_vary_settings_allowed_groups]]
  // @test-link [[rule_settings_saved_on_change]]
  it('forwards an allowed group to the controller, then saves the six', async () => {
    const fake = createFakeSessionController({ varySettings: true })
    const { wrapper, saves } = mountShell(fake.controller)

    await toggle(wrapper, 'Harmony').trigger('click')

    const groups = { ...ALL_GROUPS_ALLOWED, harmony: false }
    expect(fake.setAllowedGroups).toHaveBeenCalledExactlyOnceWith(groups)
    expect(saves).toEqual([{ 'sessionOptions.allowedGroups': groups }])
    expect(toggle(wrapper, 'Harmony').attributes('aria-pressed')).toBe('false')
  })

  // @test-link [[rule_vary_settings_needs_legal_move]]
  it('shows Vary settings unavailable while the controller finds no move, What may vary with it', async () => {
    const fake = createFakeSessionController({ varySettings: true })
    const { wrapper } = mountShell(fake.controller)
    expect(segment(wrapper, 'Vary settings', 'On').attributes('disabled')).toBeUndefined()

    fake.state.varySettingsAvailable = false
    await nextTick()

    expect(segment(wrapper, 'Vary settings', 'On').attributes('disabled')).toBeDefined()
    expect(segment(wrapper, 'Vary settings', 'Off').attributes('aria-checked')).toBe('true')
    expect(toggle(wrapper, 'Harmony').exists()).toBe(true)
  })

  // @test-link [[rule_session_settings_locked]]
  // @test-link [[rule_readonly_controls_keep_contrast]]
  it('is read-only during a session, every toggle refusing a change', async () => {
    const fake = createFakeSessionController({ rhythmLockOn: true, varySettings: true })
    const { wrapper, saves } = mountShell(fake.controller)

    await wrapper.get('.header-actions > button.session-action').trigger('click')
    await nextTick()
    const lists = wrapper.findAll('.control-group-session .toggle-list')
    expect(lists).toHaveLength(2)
    for (const list of lists) expect(list.classes()).toContain('is-readonly')

    await toggle(wrapper, 'Move a note').trigger('click')
    await toggle(wrapper, 'Harmony').trigger('click')

    expect(fake.setAllowedRhythmChanges).not.toHaveBeenCalled()
    expect(fake.setAllowedGroups).not.toHaveBeenCalled()
    expect(saves).toEqual([])
  })
})
