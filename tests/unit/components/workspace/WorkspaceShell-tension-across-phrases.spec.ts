/**
 * The shell's side of `Tension across phrases`: the "During a session" group's `Off`/`On`
 * control, between `Rising tempo` and `Vary settings` (off at load, set at Idle and in the Review
 * through the controller, read-only during a session and while the controller loads), and the
 * Tension control during a session with it on, which shows the tension the controller says is in
 * effect, never a phrase's step across phrases.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import WorkspaceShell from '@/components/workspace/WorkspaceShell.vue'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import type { SessionSettings } from '@/session/session-types'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation'
import { transportRig } from '../../audio/transport-rig'
import { createControllerRig } from '../../midi/midi-controller-rig'
import { createFakeSessionController } from './fake-session-controller'
import { fakeGenerationSession, readyState } from './fake-generation-session'
import { PHRASE_SCORE_STUB } from './test-workspace'
import { provideSaveSettings } from './recording-save-settings'
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

/** Intent: mount the shell over `session` and `controller` (null while it loads). */
function mountShell(
  session: GenerationSession<WorkspaceSessionResult>,
  controller: SessionController | null,
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

/** Settings a session could show once `Vary settings` has moved Tension to Build: Custom. */
const VARIED_TENSION: SessionSettings = {
  controls: { ...DEFAULT_GENERATION_CONTROLS, tension: 'Build' },
  figureLevels: NEUTRAL_FIGURE_LEVELS,
  selection: { kind: 'custom', baseId: 'neutral' },
  allowedGroups: ALL_GROUPS_ALLOWED,
  rhythmLockOn: false,
  allowedRhythmChanges: [],
}

// @test-link [[req_multi_phrase_tension_arc]]
describe('WorkspaceShell: the Tension across phrases control', () => {
  // @test-link [[req_multi_phrase_tension_arc]]
  it('shows Off at load between Rising tempo and Vary settings, its note naming it, and sets On at Idle', async () => {
    const fake = createFakeSessionController()
    const { session } = fakeGenerationSession(readyState())
    const wrapper = mountShell(session, fake.controller)
    expect(wrapper.findAll('.control-group-session .field-label').map((l) => l.text())).toEqual([
      'Rhythm lock',
      'Rising tempo',
      'Tension across phrases',
      'Vary settings',
    ])
    expect(checked(wrapper, 'Tension across phrases')).toBe('Off')
    const note = wrapper.get(
      `#${group(wrapper, 'Tension across phrases').attributes('aria-describedby')}`,
    )
    expect(note.classes()).toContain('field-note')
    expect(note.text()).toBe(
      'In groups of 4 phrases: your Tension, one step more, your Tension, one step less.',
    )

    await group(wrapper, 'Tension across phrases').findAll('[role="radio"]')[1]!.trigger('click')

    expect(fake.setTensionAcrossPhrases).toHaveBeenCalledExactlyOnceWith(true)
    expect(checked(wrapper, 'Tension across phrases')).toBe('On')
    expect(session.actions.generate).not.toHaveBeenCalled()
    expect(session.actions.regenerate).not.toHaveBeenCalled()
    expect(session.actions.setControl).not.toHaveBeenCalled()
  })

  // @test-link [[req_multi_phrase_tension_arc]]
  // @test-link [[rule_session_settings_locked]]
  // @test-link [[rule_readonly_controls_keep_contrast]]
  it('is read-only during a session and while the controller loads, editable in the Review', async () => {
    const loading = mountShell(fakeGenerationSession(readyState()).session, null)
    expect(group(loading, 'Tension across phrases').attributes('aria-readonly')).toBe('true')
    expect(checked(loading, 'Tension across phrases')).toBe('Off')

    const fake = createFakeSessionController({ tensionAcrossPhrases: true })
    const wrapper = mountShell(fakeGenerationSession(readyState()).session, fake.controller)
    await wrapper.get('.header-actions > button.session-action').trigger('click')
    expect(group(wrapper, 'Tension across phrases').attributes('aria-readonly')).toBe('true')
    await group(wrapper, 'Tension across phrases').findAll('[role="radio"]')[0]!.trigger('click')
    expect(fake.setTensionAcrossPhrases).not.toHaveBeenCalled()
    expect(checked(wrapper, 'Tension across phrases')).toBe('On')

    fake.state.phase = 'running'
    fake.stop()
    await flushPromises()
    expect(fake.state.review?.showing).toBe(true)
    expect(group(wrapper, 'Tension across phrases').attributes('aria-readonly')).toBeUndefined()
    await group(wrapper, 'Tension across phrases').findAll('[role="radio"]')[0]!.trigger('click')
    expect(fake.setTensionAcrossPhrases).toHaveBeenCalledExactlyOnceWith(false)
  })

  // @test-link [[req_multi_phrase_tension_arc]]
  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  // @test-link [[rule_tension_across_phrases_never_marks_custom]]
  it('during a session with it on, the Tension control shows the tension in effect the controller gives, the summary never Custom from it', async () => {
    const fake = createFakeSessionController({ tensionAcrossPhrases: true })
    const wrapper = mountShell(fakeGenerationSession(readyState()).session, fake.controller)
    await wrapper.get('.header-actions > button.session-action').trigger('click')
    fake.state.phase = 'running'
    fake.state.shownSettings = {
      controls: DEFAULT_GENERATION_CONTROLS,
      figureLevels: NEUTRAL_FIGURE_LEVELS,
      selection: DEFAULT_PRESET_SELECTION,
      allowedGroups: ALL_GROUPS_ALLOWED,
      rhythmLockOn: false,
      allowedRhythmChanges: [],
    }
    await nextTick()
    expect(checked(wrapper, 'Tension')).toBe('Lift')
    expect(wrapper.get('.control-summary').text()).toBe('C Ionian · Neutral · Lift · Shaped')

    fake.state.shownSettings = VARIED_TENSION
    await nextTick()
    expect(checked(wrapper, 'Tension')).toBe('Build')

    fake.stop()
    await nextTick()
    expect(checked(wrapper, 'Tension')).toBe('Lift')
    expect(wrapper.get('.control-summary').text()).toBe('C Ionian · Neutral · Lift · Shaped')
    expect(checked(wrapper, 'Tension across phrases')).toBe('On')
  })
})
