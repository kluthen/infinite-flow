/**
 * The shell's side of rising tempo (adaptive tempo): the "During a session" group's
 * `Rising tempo` control, first in the group, `Off` at load; unavailable with its reason while no
 * controller is attached (a kept `On` showing as `Off`, which a click on `Off` leaves kept); set at
 * Idle and in the Review through the controller, read-only during a session, when it keeps the
 * availability the session started with. During a session the read-only tempo stepper shows the
 * exact tempo in effect, off its list included, and the player's own tempo again at the end; the
 * tempo field notes the tempo the last rising-tempo session reached.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import WorkspaceShell from '@/components/workspace/WorkspaceShell.vue'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import { transportRig } from '../../audio/transport-rig'
import { createControllerRig } from '../../midi/midi-controller-rig'
import { createFakeSessionController, type FakeSessionController } from './fake-session-controller'
import { fakeGenerationSession, readyState } from './fake-generation-session'
import { PHRASE_SCORE_STUB } from './test-workspace'
import { provideSaveSettings } from './recording-save-settings'

vi.mock('@/components/review/ReviewPanel.vue', () => import('./review-panel-stub'))

afterEach(() => {
  document.body.innerHTML = ''
})

/** The `Rising tempo` note, as the phrase-workspace handoff words it. */
const NOTE =
  'Adds 5 BPM every 2 phrases, up to 240 BPM. The tempo goes back to your setting when the session ends.'

/** Intent: mount the shell over a ready Idle and `controller` (null while it loads). */
function mountShell(controller: SessionController | null) {
  const session: GenerationSession<WorkspaceSessionResult> =
    fakeGenerationSession(readyState()).session
  return mount(WorkspaceShell, {
    props: {
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

/** Intent: the `Rising tempo` radiogroup. */
function group(wrapper: Shell) {
  return wrapper.get('[role="radiogroup"][aria-label="Rising tempo"]')
}

/** Intent: a `Rising tempo` segment by its label. */
function segment(wrapper: Shell, label: 'Off' | 'On') {
  const found = group(wrapper)
    .findAll('[role="radio"]')
    .find((radio) => radio.text() === label)
  if (found === undefined) throw new Error(`no ${label} segment`)
  return found
}

/** Intent: the checked `Rising tempo` segment's label. */
function checked(wrapper: Shell): string | undefined {
  return group(wrapper)
    .findAll('[role="radio"]')
    .find((radio) => radio.attributes('aria-checked') === 'true')
    ?.text()
}

/** Intent: the field-group holding the tempo stepper. */
function tempoField(wrapper: Shell) {
  const field = wrapper
    .findAll('.field-group')
    .find((candidate) => candidate.find('[role="spinbutton"]').exists())
  if (field === undefined) throw new Error('no tempo field')
  return field
}

/** Intent: the tempo stepper's shown value. */
function stepperValue(wrapper: Shell): string {
  return wrapper.get('[role="spinbutton"] .input-stepper-value').text()
}

/** Intent: start a session through the header's session action, as the player does. */
async function startSession(wrapper: Shell, fake: FakeSessionController, hasController: boolean) {
  await wrapper.get('.header-actions > button.session-action').trigger('click')
  fake.state.sessionHasController = hasController
  fake.state.shownSettings = {
    controls: DEFAULT_GENERATION_CONTROLS,
    musicalProfile: DEFAULT_PROFILE_SELECTION,
  }
  await nextTick()
}

/** Intent: end a running session (phrase 1 sounded), opening the Review. */
async function stopSession(fake: FakeSessionController) {
  fake.state.phase = 'running'
  fake.state.sessionHasController = null
  fake.stop()
  await flushPromises()
}

// @test-link [[req_adaptive_tempo]]
// @test-link [[rule_controller_attached_definition]]
describe('WorkspaceShell: the Rising tempo control', () => {
  // @test-link [[req_adaptive_tempo]]
  it('comes first under "During a session", Off at load, unavailable with its reason without a controller', () => {
    const wrapper = mountShell(createFakeSessionController().controller)
    const labels = wrapper
      .findAll('.control-group-session .field-label')
      .map((label) => label.text())
    expect(labels).toEqual(['Rising tempo', 'Tension across phrases', 'Vary settings'])
    expect(checked(wrapper)).toBe('Off')
    expect(wrapper.get(`#${group(wrapper).attributes('aria-describedby')}`).text()).toBe(NOTE)
    expect(segment(wrapper, 'On').attributes('disabled')).toBeDefined()
    const reason = wrapper.get(`#${segment(wrapper, 'On').attributes('aria-describedby')}`)
    expect(reason.classes()).toContain('field-note')
    expect(reason.text()).toBe('Needs a connected controller.')
  })

  // @test-link [[req_adaptive_tempo]]
  it('with a controller attached, has no reason and turns On at Idle through the controller', async () => {
    const fake = createFakeSessionController({ adaptiveTempoAvailable: true })
    const wrapper = mountShell(fake.controller)
    expect(segment(wrapper, 'On').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Needs a connected controller.')

    await segment(wrapper, 'On').trigger('click')

    expect(fake.setAdaptiveTempo).toHaveBeenCalledExactlyOnceWith(true)
    expect(checked(wrapper)).toBe('On')
  })

  // @test-link [[req_adaptive_tempo]]
  it('shows a kept On as Off while unavailable, keeps it through a click on Off, and shows it again once available', async () => {
    const fake = createFakeSessionController({ adaptiveTempo: true })
    const wrapper = mountShell(fake.controller)
    expect(checked(wrapper)).toBe('Off')

    await segment(wrapper, 'Off').trigger('click')
    expect(fake.setAdaptiveTempo).not.toHaveBeenCalled()

    fake.state.adaptiveTempoAvailable = true
    await nextTick()
    expect(checked(wrapper)).toBe('On')
  })

  // @test-link [[req_adaptive_tempo]]
  // @test-link [[rule_readonly_controls_keep_contrast]]
  it('is read-only and unavailable while the controller loads', () => {
    const wrapper = mountShell(null)
    expect(group(wrapper).attributes('aria-readonly')).toBe('true')
    expect(segment(wrapper, 'On').attributes('disabled')).toBeDefined()
  })

  // @test-link [[rule_session_settings_locked]]
  // @test-link [[req_adaptive_tempo]]
  it('during a session is read-only and keeps the availability it started with, then is editable in the Review', async () => {
    const fake = createFakeSessionController({ adaptiveTempo: true, adaptiveTempoAvailable: true })
    const wrapper = mountShell(fake.controller)
    await startSession(wrapper, fake, true)
    expect(group(wrapper).attributes('aria-readonly')).toBe('true')

    // The controller is lost mid-session: the control stays as it was at the start.
    fake.state.adaptiveTempoAvailable = false
    await nextTick()
    expect(checked(wrapper)).toBe('On')
    expect(segment(wrapper, 'On').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Needs a connected controller.')
    await segment(wrapper, 'Off').trigger('click')
    expect(fake.setAdaptiveTempo).not.toHaveBeenCalled()

    // Back at Idle under the Review, availability is judged live again, and the control is editable.
    await stopSession(fake)
    expect(fake.state.review?.showing).toBe(true)
    expect(segment(wrapper, 'On').attributes('disabled')).toBeDefined()
    fake.state.adaptiveTempoAvailable = true
    await nextTick()
    expect(group(wrapper).attributes('aria-readonly')).toBeUndefined()
    await segment(wrapper, 'Off').trigger('click')
    expect(fake.setAdaptiveTempo).toHaveBeenCalledExactlyOnceWith(false)
  })

  // @test-link [[rule_controllerless_session_never_gains_controller]]
  it('in a session started without a controller stays unavailable when one attaches', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountShell(fake.controller)
    await startSession(wrapper, fake, false)

    fake.state.adaptiveTempoAvailable = true
    await nextTick()

    expect(segment(wrapper, 'On').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Needs a connected controller.')
  })
})

// @test-link [[rule_adaptive_tempo_resets_after_session]]
describe('WorkspaceShell: the tempo during and after a rising-tempo session', () => {
  // @test-link [[rule_adaptive_tempo_resets_after_session]]
  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  it("shows the exact tempo in effect, off the stepper's list, then the player's own at the end", async () => {
    const fake = createFakeSessionController({ adaptiveTempo: true, adaptiveTempoAvailable: true })
    const wrapper = mountShell(fake.controller)
    expect(stepperValue(wrapper)).toBe('90 BPM')
    await startSession(wrapper, fake, true)

    fake.state.sessionTempo = 95
    await nextTick()
    expect(stepperValue(wrapper)).toBe('95 BPM')
    expect(wrapper.get('.tempo-readout').text()).toBe('95 BPM')
    expect(wrapper.get('[role="spinbutton"]').attributes('aria-readonly')).toBe('true')

    await stopSession(fake)
    expect(stepperValue(wrapper)).toBe('90 BPM')
    expect(wrapper.get('.tempo-readout').text()).toBe('90 BPM')
  })

  // @test-link [[rule_adaptive_tempo_resets_after_session]]
  // @test-link [[rule_no_grading_or_mismatch_signal]]
  it('notes the tempo the last rising-tempo session reached under the stepper, and nothing else', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountShell(fake.controller)
    expect(tempoField(wrapper).find('.field-note').exists()).toBe(false)

    fake.state.lastSessionReachedTempo = 105
    await nextTick()
    const note = tempoField(wrapper).get('.field-note')
    expect(note.text()).toBe('Last session reached 105 BPM.')
    expect(note.attributes('aria-live')).toBeUndefined()
    expect(note.attributes('role')).toBeUndefined()

    fake.state.lastSessionReachedTempo = null
    await nextTick()
    expect(tempoField(wrapper).find('.field-note').exists()).toBe(false)
  })
})
