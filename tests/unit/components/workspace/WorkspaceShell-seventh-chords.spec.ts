/**
 * The shell's side of the Seventh chords control: a segment chosen at Idle reaches the Idle
 * session's one level action for the seventh-chords family; the control shows the player's level
 * at Idle and, during a session, read-only, the level the controller says the phrase now sounding
 * was generated with, the player's own again at the end.
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
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation'
import { transportRig } from '../../audio/transport-rig'
import { createControllerRig } from '../../midi/midi-controller-rig'
import { createFakeSessionController, type FakeSessionController } from './fake-session-controller'
import { fakeGenerationSession, readyState } from './fake-generation-session'
import { noRememberedController, quietPresetStore, quietSavedData } from './quiet-saved-data'
import { provideSaveSettings } from './recording-save-settings'
import { PHRASE_SCORE_STUB } from './test-workspace'

vi.mock('@/components/review/ReviewPanel.vue', () => import('./review-panel-stub'))

// A session's start warms the Review's lazy area; loaded once ahead, as in the app.
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

type Shell = ReturnType<typeof mountShell>

/** Intent: the Seventh chords radiogroup. */
function group(wrapper: Shell) {
  return wrapper.get('[role="radiogroup"][aria-label="Seventh chords"]')
}

/** Intent: the checked Seventh chords segment's label. */
function checked(wrapper: Shell): string | undefined {
  return group(wrapper)
    .findAll('[role="radio"]')
    .find((radio) => radio.attributes('aria-checked') === 'true')
    ?.text()
}

/** Intent: a running session showing a phrase generated at Sometimes. */
async function startSession(wrapper: Shell, fake: FakeSessionController) {
  await wrapper.get('.header-actions > button.session-action').trigger('click')
  fake.state.shownSettings = {
    controls: DEFAULT_GENERATION_CONTROLS,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    chordFamilies: { 'seventh-chords': 'sometimes' },
    selection: DEFAULT_PRESET_SELECTION,
    allowedGroups: ALL_GROUPS_ALLOWED,
    rhythmLockOn: false,
    allowedRhythmChanges: [],
  }
  await nextTick()
}

// @test-link [[req_seventh_chords_level]]
describe('WorkspaceShell: the Seventh chords control', () => {
  // @test-link [[module_seventh_chords_level_options]]
  it("shows the Idle session's level and sends a chosen segment to its level action", async () => {
    const fake = fakeGenerationSession({
      ...readyState(),
      chordFamilies: { 'seventh-chords': 'favored' },
    })
    const wrapper = mountShell(fake.session, createFakeSessionController().controller)
    expect(checked(wrapper)).toBe('Often')

    await group(wrapper).findAll('[role="radio"]')[3]!.trigger('click')

    expect(fake.session.actions.setChordFamilyLevel).toHaveBeenCalledExactlyOnceWith(
      'seventh-chords',
      'stronglyFavored',
    )
    expect(fake.session.actions.setControl).not.toHaveBeenCalled()
    expect(fake.session.actions.setFigureLevel).not.toHaveBeenCalled()
  })

  // @test-link [[rule_session_settings_locked]]
  it("during a session shows the sounding phrase's level, read-only, and the player's at the end", async () => {
    const idle = fakeGenerationSession(readyState())
    const fake = createFakeSessionController()
    const wrapper = mountShell(idle.session, fake.controller)
    expect(checked(wrapper)).toBe('Off')

    await startSession(wrapper, fake)
    expect(checked(wrapper)).toBe('Sometimes')
    expect(group(wrapper).attributes('aria-readonly')).toBe('true')
    await group(wrapper).findAll('[role="radio"]')[2]!.trigger('click')
    expect(idle.session.actions.setChordFamilyLevel).not.toHaveBeenCalled()

    fake.state.phase = 'running'
    fake.stop()
    await flushPromises()
    expect(checked(wrapper)).toBe('Off')
  })
})
