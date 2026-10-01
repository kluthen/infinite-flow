import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import WorkspaceHeader from '@/components/workspace/WorkspaceHeader.vue'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import type { ControllerStatusForm } from '@/midi/controller-status'
import { buildWorkspaceSessionResult } from '../../workspace-test-fixtures'
import { createFakeSessionController } from './fake-session-controller'

const UNSUPPORTED_CONTROLS: GenerationControls = {
  ...DEFAULT_GENERATION_CONTROLS,
  noteDensity: 'Quarter',
  silenceDensity: 'Sparse',
  syncopation: 'Active displacement',
}

/** Intent: build a fake session double whose state/actions a test can override piecemeal. */
function fakeSession(overrides: Partial<GenerationSession<WorkspaceSessionResult>['state']> = {}): {
  session: GenerationSession<WorkspaceSessionResult>
  actions: GenerationSession<WorkspaceSessionResult>['actions']
} {
  const actions: GenerationSession<WorkspaceSessionResult>['actions'] = {
    setControl: vi.fn(() => true),
    selectMusicalProfile: vi.fn(() => true),
    selectInstrumentProfile: vi.fn(async () => 'applied' as const),
    setTheme: vi.fn(() => true),
    generate: vi.fn(async () => true),
    regenerate: vi.fn(async () => true),
    retryGeneration: vi.fn(async () => true),
    retryNotation: vi.fn(async () => true),
    reportNotationFailure: vi.fn(() => true),
    reportNotationRecovered: vi.fn(() => true),
  }
  const session: GenerationSession<WorkspaceSessionResult> = {
    state: {
      controls: DEFAULT_GENERATION_CONTROLS,
      profileSelection: DEFAULT_PROFILE_SELECTION,
      presentation: { theme: 'System' },
      latestIntent: null,
      result: null,
      operation: 'idle',
      generationError: null,
      notationError: null,
      resultEngraved: false,
      noteDensityContext: { belowTabletLandscape: false, sessionSteppedDown: false },
      roomNotice: null,
      retriesRunning: false,
      roomNoticeAnnouncements: 0,
      ...overrides,
    },
    actions,
    dispose: vi.fn(),
  }
  return { session, actions }
}

/**
 * Intent: mount the header over `session`, with no session controller loaded unless given, and
 * `controller-status` in its Connect controller form unless given.
 */
function mountHeader(
  session: GenerationSession<WorkspaceSessionResult>,
  controller: SessionController | null = null,
  controllerStatus: ControllerStatusForm = { kind: 'connect' },
) {
  return mount(WorkspaceHeader, {
    props: { session, controller, controllerStatus },
    attachTo: document.body,
  })
}

/** Intent: the phrase action, the header's first action slot, whatever its emphasis. */
function primaryButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('.header-actions > button:not(.session-action)')
}

/** Intent: the session action, the header's second action slot. */
function sessionAction(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('.header-actions > button.session-action')
}

// @test-link [[user_story_controlled_phrase_generation]]
// @test-link [[rule_unsupported_rhythm_settings_block_generation]]
describe('WorkspaceHeader', () => {
  it('renders the brand mark', () => {
    const { session } = fakeSession()
    const wrapper = mountHeader(session)

    expect(wrapper.get('h1.brand-mark').text()).toBe('Infinite Flow')
  })

  it('labels the primary action "Generate phrase" with no prior result or errors', () => {
    const { session } = fakeSession()
    const wrapper = mountHeader(session)

    expect(primaryButton(wrapper).text()).toBe('Generate phrase')
  })

  it('labels the primary action "Regenerate phrase" once a result exists', () => {
    const { session } = fakeSession({ result: buildWorkspaceSessionResult() })
    const wrapper = mountHeader(session)

    expect(primaryButton(wrapper).text()).toBe('Regenerate phrase')
  })

  it('labels the primary action "Retry generation" after a generation error', () => {
    const { session } = fakeSession({ generationError: new Error('boom') })
    const wrapper = mountHeader(session)

    expect(primaryButton(wrapper).text()).toBe('Retry generation')
  })

  it('labels the primary action "Retry notation" after a notation error, even with a generation error present', () => {
    const { session } = fakeSession({
      generationError: new Error('boom'),
      notationError: new Error('notation boom'),
    })
    const wrapper = mountHeader(session)

    expect(primaryButton(wrapper).text()).toBe('Retry notation')
  })

  it('disables the primary action while an operation is running', () => {
    const { session } = fakeSession({ operation: 'generating' })
    const wrapper = mountHeader(session)

    expect(primaryButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('disables Generate under an unsupported rhythm combination', () => {
    const { session } = fakeSession({ controls: UNSUPPORTED_CONTROLS })
    const wrapper = mountHeader(session)

    expect(primaryButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('judges a Sixteenth-only combination on the density generated with: blocked from the width up, allowed below', () => {
    const sixteenthOnly: GenerationControls = {
      ...DEFAULT_GENERATION_CONTROLS,
      noteDensity: 'Sixteenth',
      rhythmicVariety: 'Strict',
      silenceDensity: 'Sparse',
      syncopation: 'Active displacement',
    }
    const wide = fakeSession({ controls: sixteenthOnly }).session
    const narrow = fakeSession({
      controls: sixteenthOnly,
      noteDensityContext: { belowTabletLandscape: true, sessionSteppedDown: false },
    }).session

    expect(primaryButton(mountHeader(wide)).attributes('disabled')).toBeDefined()
    expect(primaryButton(mountHeader(narrow)).attributes('disabled')).toBeUndefined()
  })

  it('does not disable Retry notation for an unsupported rhythm combination', () => {
    const { session } = fakeSession({
      controls: UNSUPPORTED_CONTROLS,
      notationError: new Error('notation boom'),
    })
    const wrapper = mountHeader(session)

    expect(primaryButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('invokes generate() when the primary action is clicked in the generate state', async () => {
    const { session, actions } = fakeSession()
    const wrapper = mountHeader(session)

    await primaryButton(wrapper).trigger('click')

    expect(actions.generate).toHaveBeenCalledOnce()
  })

  it('invokes retryNotation() when the primary action is clicked in the retry-notation state', async () => {
    const { session, actions } = fakeSession({ notationError: new Error('notation boom') })
    const wrapper = mountHeader(session)

    await primaryButton(wrapper).trigger('click')

    expect(actions.retryNotation).toHaveBeenCalledOnce()
  })

  it('never invokes any action when the primary action is clicked while disabled', async () => {
    const { session, actions } = fakeSession({ operation: 'generating' })
    const wrapper = mountHeader(session)

    await primaryButton(wrapper).trigger('click')

    expect(actions.generate).not.toHaveBeenCalled()
    expect(actions.regenerate).not.toHaveBeenCalled()
    expect(actions.retryGeneration).not.toHaveBeenCalled()
    expect(actions.retryNotation).not.toHaveBeenCalled()
  })

  it('calls setTheme on a theme selection, and never generate or notation-reporting actions', async () => {
    const { session, actions } = fakeSession()
    const wrapper = mountHeader(session)

    const themeGroup = wrapper.get('[aria-label="Presentation theme"]')
    await themeGroup.findAll('button')[1]!.trigger('click')

    expect(actions.setTheme).toHaveBeenCalledExactlyOnceWith('Light')
    expect(actions.generate).not.toHaveBeenCalled()
    expect(actions.regenerate).not.toHaveBeenCalled()
    expect(actions.retryNotation).not.toHaveBeenCalled()
  })

  it('has no independently selectable display-notation control', () => {
    const { session } = fakeSession()
    const wrapper = mountHeader(session)

    expect(wrapper.find('[aria-label="Display notation"]').exists()).toBe(false)
  })
})

// @test-link [[rule_staff_needs_room_notice]]
describe('WorkspaceHeader under the room notice', () => {
  // @test-link [[rule_staff_needs_room_notice]]
  it.each(['no_room', 'notes_too_wide'] as const)(
    'offers an enabled "Regenerate phrase" under the %s notice, which has no phrase behind it',
    async (roomNotice) => {
      const { session, actions } = fakeSession({ roomNotice, result: null })
      const wrapper = mountHeader(session)

      const action = primaryButton(wrapper)
      expect(action.text()).toBe('Regenerate phrase')
      expect(action.attributes('disabled')).toBeUndefined()
      await action.trigger('click')

      expect(actions.regenerate).toHaveBeenCalledOnce()
      expect(actions.generate).not.toHaveBeenCalled()
    },
  )

  // @test-link [[rule_staff_needs_room_notice]]
  it('keeps "Retry generation" under the notice while a generation-failure banner shows', async () => {
    const { session, actions } = fakeSession({
      roomNotice: 'no_room',
      result: null,
      generationError: new Error('boom'),
    })
    const wrapper = mountHeader(session)

    const action = primaryButton(wrapper)
    expect(action.text()).toBe('Retry generation')
    expect(action.attributes('disabled')).toBeUndefined()
    await action.trigger('click')

    expect(actions.retryGeneration).toHaveBeenCalledOnce()
  })

  // @test-link [[rule_too_dense_notice_retry_rounds]]
  it('disables the phrase action with is-loading while a round runs under the notice', () => {
    const { session } = fakeSession({
      roomNotice: 'notes_too_wide',
      result: null,
      operation: 'generating',
      retriesRunning: true,
    })
    const wrapper = mountHeader(session)

    const action = primaryButton(wrapper)
    expect(action.text()).toBe('Regenerate phrase')
    expect(action.attributes('disabled')).toBeDefined()
    expect(action.classes()).toContain('is-loading')
  })
})

/** Ready: a phrase engraved on the staff, nothing running. */
const READY = { result: buildWorkspaceSessionResult(), resultEngraved: true } as const

// @test-link [[rule_session_start_conditions]]
// @test-link [[rule_session_settings_locked]]
// @test-link [[rule_stop_ends_session]]
describe('WorkspaceHeader session action', () => {
  it('follows the phrase action as `btn btn-lg session-action`, disabled until the controller loads', () => {
    const wrapper = mountHeader(fakeSession(READY).session, null)

    const buttons = wrapper.findAll('.header-actions > button')
    expect(buttons).toHaveLength(2)
    expect(buttons[1]!.classes()).toEqual(
      expect.arrayContaining(['btn', 'btn-lg', 'session-action']),
    )
    expect(buttons[1]!.text()).toBe('Start session')
    expect(buttons[1]!.attributes('disabled')).toBeDefined()
  })

  it('makes Start session the enabled primary action in Ready, the phrase action secondary', () => {
    const wrapper = mountHeader(
      fakeSession(READY).session,
      createFakeSessionController().controller,
    )

    expect(sessionAction(wrapper).classes()).toContain('btn-primary')
    expect(sessionAction(wrapper).attributes('disabled')).toBeUndefined()
    expect(primaryButton(wrapper).classes()).not.toContain('btn-primary')
    expect(primaryButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('keeps Start session secondary and disabled in Empty, the phrase action primary', () => {
    const controller = createFakeSessionController({ canStart: false, startBlocker: 'no_phrase' })
    const wrapper = mountHeader(fakeSession().session, controller.controller)

    expect(sessionAction(wrapper).classes()).not.toContain('btn-primary')
    expect(sessionAction(wrapper).attributes('disabled')).toBeDefined()
    expect(primaryButton(wrapper).classes()).toContain('btn-primary')
  })

  it('keeps Start session primary but disabled while a phrase loads', () => {
    const controller = createFakeSessionController({
      canStart: false,
      startBlocker: 'generation_running',
    })
    const wrapper = mountHeader(
      fakeSession({ ...READY, operation: 'generating' }).session,
      controller.controller,
    )

    expect(sessionAction(wrapper).classes()).toContain('btn-primary')
    expect(sessionAction(wrapper).attributes('disabled')).toBeDefined()
    expect(primaryButton(wrapper).classes()).not.toContain('btn-primary')
  })

  it('keeps Start session disabled over the phrase the last session played (interim)', () => {
    const controller = createFakeSessionController({
      canStart: false,
      startBlocker: 'phrase_already_played',
    })
    const wrapper = mountHeader(fakeSession(READY).session, controller.controller)

    expect(sessionAction(wrapper).attributes('disabled')).toBeDefined()
    expect(sessionAction(wrapper).classes()).not.toContain('btn-primary')
    expect(primaryButton(wrapper).classes()).toContain('btn-primary')
    expect(primaryButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('asks for a session start on a click, and for nothing while disabled', async () => {
    const ready = mountHeader(fakeSession(READY).session, createFakeSessionController().controller)
    await sessionAction(ready).trigger('click')
    expect(ready.emitted('start-session')).toHaveLength(1)

    const empty = mountHeader(
      fakeSession().session,
      createFakeSessionController({ canStart: false, startBlocker: 'no_phrase' }).controller,
    )
    await sessionAction(empty).trigger('click')
    expect(empty.emitted('start-session')).toBeUndefined()
  })

  // @test-link [[rule_session_settings_locked]]
  it('reads Stop, primary, during a session, with the phrase action disabled and secondary', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountHeader(fakeSession(READY).session, fake.controller)
    fake.start()
    await wrapper.vm.$nextTick()

    expect(sessionAction(wrapper).text()).toBe('Stop')
    expect(sessionAction(wrapper).classes()).toContain('btn-primary')
    expect(sessionAction(wrapper).attributes('disabled')).toBeUndefined()
    expect(primaryButton(wrapper).attributes('disabled')).toBeDefined()
    expect(primaryButton(wrapper).classes()).not.toContain('btn-primary')
    expect(primaryButton(wrapper).classes()).not.toContain('is-loading')

    await sessionAction(wrapper).trigger('click')
    expect(wrapper.emitted('stop-session')).toHaveLength(1)
    expect(wrapper.emitted('start-session')).toBeUndefined()
  })

  // @test-link [[rule_session_settings_locked]]
  it('shows the session tempo in tempo-readout during a session', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountHeader(fakeSession(READY).session, fake.controller)
    fake.start()
    fake.state.sessionTempo = 132
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.tempo-readout').text()).toBe('132 BPM')
  })

  it('moves focus to either action on request', () => {
    const wrapper = mountHeader(
      fakeSession(READY).session,
      createFakeSessionController().controller,
    )
    const exposed = wrapper.vm as unknown as {
      focusSessionAction: () => void
      focusPhraseAction: () => void
    }

    exposed.focusSessionAction()
    expect(document.activeElement).toBe(sessionAction(wrapper).element)
    exposed.focusPhraseAction()
    expect(document.activeElement).toBe(primaryButton(wrapper).element)
    wrapper.unmount()
  })
})

/** Intent: the header's `controller-status` button. */
function controllerStatus(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('.context-group > button.controller-status')
}

const KEYS = { id: 'port-a', name: 'Keys 49', manufacturer: 'Acme' }

// @test-link [[rule_controller_connects_between_sessions]]
// @test-link [[rule_readonly_controls_keep_contrast]]
describe('WorkspaceHeader controller-status', () => {
  it('sits first in context-group, before score-context and theme-control', () => {
    const wrapper = mountHeader(fakeSession().session)
    const children = Array.from(wrapper.get('.context-group').element.children)
    expect(children).toHaveLength(3)
    expect(children[0]!.classList.contains('controller-status')).toBe(true)
    expect(children[1]!.classList.contains('score-context')).toBe(true)
    expect(children[2]!.classList.contains('theme-control')).toBe(true)
  })

  it('shows the form it is given', () => {
    const wrapper = mountHeader(fakeSession().session, null, { kind: 'connected', device: KEYS })
    expect(controllerStatus(wrapper).classes()).toContain('is-badge')
    expect(controllerStatus(wrapper).text()).toBe('Keys 49')
  })

  it('is enabled at Idle, while the controller loads and while a phrase loads', () => {
    const loading = mountHeader(fakeSession({ operation: 'generating' }).session)
    expect(controllerStatus(loading).attributes('disabled')).toBeUndefined()
    const idle = mountHeader(fakeSession(READY).session, createFakeSessionController().controller)
    expect(controllerStatus(idle).attributes('disabled')).toBeUndefined()
  })

  it.each(['count-in', 'running'] as const)(
    'is disabled in the %s, its classes unchanged, and asks for nothing',
    async (phase) => {
      const fake = createFakeSessionController()
      const form: ControllerStatusForm = { kind: 'connected', device: KEYS }
      const wrapper = mountHeader(fakeSession(READY).session, fake.controller, form)
      const idleClasses = controllerStatus(wrapper).classes()
      fake.start()
      fake.state.phase = phase
      await wrapper.vm.$nextTick()

      expect(controllerStatus(wrapper).attributes('disabled')).toBeDefined()
      expect(controllerStatus(wrapper).classes()).toEqual(idleClasses)
      await controllerStatus(wrapper).trigger('click')
      expect(wrapper.emitted('open-connection-sheet')).toBeUndefined()
    },
  )

  it('asks the shell to open the connection sheet on a click', async () => {
    const wrapper = mountHeader(fakeSession().session)
    await controllerStatus(wrapper).trigger('click')
    expect(wrapper.emitted('open-connection-sheet')).toHaveLength(1)
  })

  it('moves focus to controller-status on request', () => {
    const wrapper = mountHeader(fakeSession().session)
    const exposed = wrapper.vm as unknown as { focusControllerStatus: () => void }
    exposed.focusControllerStatus()
    expect(document.activeElement).toBe(controllerStatus(wrapper).element)
    wrapper.unmount()
  })

  it('after the sheet closes, focuses the first enabled of session action, phrase action, controller-status', () => {
    type Exposed = { focusAfterConnectionSheet: () => void }
    const ready = mountHeader(fakeSession(READY).session, createFakeSessionController().controller)
    ;(ready.vm as unknown as Exposed).focusAfterConnectionSheet()
    expect(document.activeElement).toBe(sessionAction(ready).element)
    ready.unmount()

    const empty = mountHeader(fakeSession().session)
    ;(empty.vm as unknown as Exposed).focusAfterConnectionSheet()
    expect(document.activeElement).toBe(primaryButton(empty).element)
    empty.unmount()

    const loading = mountHeader(fakeSession({ operation: 'generating' }).session)
    ;(loading.vm as unknown as Exposed).focusAfterConnectionSheet()
    expect(document.activeElement).toBe(controllerStatus(loading).element)
    loading.unmount()
  })
})
