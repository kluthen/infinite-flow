/**
 * The shell's side of `Vary settings` and of a session's automatic changes: the "During a
 * session" group's `Off`/`On` control (off at load, set at Idle and in the Review through the
 * controller, read-only during a session and while the controller loads); the controls showing
 * what the controller says the sounding phrase was generated with, then the player's own again at
 * the end; the preset box turning Custom while the description line keeps the start settings'
 * text; and nothing in the preset bar announced, before, during or after a session.
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

/**
 * Settings a session could show after a figure step and a Tension move from Neutral: the
 * appoggiatura from Off to As today, Tension from Lift to Build, Custom based on Neutral.
 */
const VARIED: SessionSettings = {
  controls: { ...DEFAULT_GENERATION_CONTROLS, tension: 'Build' },
  figureLevels: { ...NEUTRAL_FIGURE_LEVELS, appoggiatura: 'asToday' },
  selection: { kind: 'custom', baseId: 'neutral' },
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

/** Intent: the text the preset box shows: its selected option's. */
function presetBox(wrapper: ReturnType<typeof mountShell>): string {
  const select = wrapper.get('select.preset-select').element as HTMLSelectElement
  return select.selectedOptions[0]?.text.trim() ?? ''
}

/** Intent: the preset bar's description line. */
function presetDescription(wrapper: ReturnType<typeof mountShell>): string {
  return wrapper.get('.preset-bar .field-note').text()
}

const NEUTRAL_DESCRIPTION = "Plain lines in the key, in quarter notes: the app's starting point."

/** The settings a session starts with from the player's defaults: Neutral, C Ionian. */
const START: SessionSettings = {
  controls: DEFAULT_GENERATION_CONTROLS,
  figureLevels: NEUTRAL_FIGURE_LEVELS,
  selection: { kind: 'preset', presetId: 'neutral' },
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
  // @test-link [[rule_vary_settings_marks_custom]]
  // @test-link [[rule_mutation_reverts_at_session_end]]
  it("shows the controller's settings during a session, Custom once a step moved, and the player's own again at its end", async () => {
    const fake = createFakeSessionController()
    const idle = fakeGenerationSession(readyState())
    const wrapper = mountShell(idle.session, fake.controller)
    await wrapper.get('.header-actions > button.session-action').trigger('click')
    fake.state.startSettings = START
    await nextTick()
    expect(checked(wrapper, 'Tension')).toBe('Lift')
    expect(presetBox(wrapper)).toBe('Neutral')
    expect(wrapper.get('.control-summary').text()).toBe('C Ionian · Neutral · Lift · Shaped')

    // The instant the moved phrase starts sounding, the controller shows the settings it was
    // generated with.
    fake.state.shownSettings = VARIED
    await nextTick()
    expect(checked(wrapper, 'Tension')).toBe('Build')
    expect(presetBox(wrapper)).toBe('Custom, based on Neutral')
    expect(wrapper.get('select.preset-select').attributes('aria-readonly')).toBe('true')
    expect(presetDescription(wrapper)).toBe(NEUTRAL_DESCRIPTION)
    expect(wrapper.get('.control-summary').text()).toBe(
      'C Ionian · Custom, based on Neutral · Build · Shaped',
    )

    fake.state.phase = 'running'
    fake.stop()
    await nextTick()
    expect(checked(wrapper, 'Tension')).toBe('Lift')
    expect(presetBox(wrapper)).toBe('Neutral')
    expect(presetDescription(wrapper)).toBe(NEUTRAL_DESCRIPTION)
    expect(wrapper.get('.control-summary').text()).toBe('C Ionian · Neutral · Lift · Shaped')
    expect(idle.state.selection).toEqual({ kind: 'preset', presetId: 'neutral' })
    expect(idle.state.figureLevels).toEqual(NEUTRAL_FIGURE_LEVELS)
  })

  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  it('announces nothing in the preset bar before, during and after a session', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountShell(fakeGenerationSession(readyState()).session, fake.controller)
    /** Intent: whether the preset bar holds no live region and no status role. */
    const silent = () =>
      !wrapper.get('.preset-bar').find('[aria-live]').exists() &&
      !wrapper.get('.preset-bar').find('[role="status"]').exists()
    expect(silent()).toBe(true)

    await wrapper.get('.header-actions > button.session-action').trigger('click')
    fake.state.startSettings = START
    fake.state.shownSettings = VARIED
    await nextTick()
    expect(presetBox(wrapper)).toBe('Custom, based on Neutral')
    expect(silent()).toBe(true)

    fake.state.phase = 'running'
    fake.stop()
    await nextTick()
    expect(presetBox(wrapper)).toBe('Neutral')
    expect(silent()).toBe(true)
  })
})
