import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'

import WorkspaceShell from '@/components/workspace/WorkspaceShell.vue'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { BUILT_IN_PRESETS, DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import type { SessionJumpView } from '@/components/workspace/session-start-jump'
import { createTestWorkspace, PHRASE_SCORE_STUB } from './test-workspace'
import { createFakeSessionController } from './fake-session-controller'
import { buildWorkspaceSessionResult } from '../../workspace-test-fixtures'
import { themeMixTokens, transportRig } from '../../audio/transport-rig'
import { createControllerRig } from '../../midi/midi-controller-rig'
import { provideSaveSettings } from './recording-save-settings'
import { noRememberedController, quietSavedData, quietPresetStore } from './quiet-saved-data'

// A session end once phrase 1 has sounded opens the Review: its lazy panel is swapped for a stand-in.
vi.mock('@/components/review/ReviewPanel.vue', () => import('./review-panel-stub'))

// A session's start warms the Review's lazy area; loaded once ahead, so that warm-up settles within
// the test that starts it, as it does in the app once the chunk has loaded, not as the file ends.
beforeAll(async () => {
  await import('@/components/workspace/ReviewArea.vue')
})

const MOUNT_OPTIONS = {
  global: { stubs: { PhraseScore: PHRASE_SCORE_STUB }, provide: provideSaveSettings() },
}

/** Intent: build a fake session double whose state/actions a test can override piecemeal. */
function fakeSession(overrides: Partial<GenerationSession<WorkspaceSessionResult>['state']> = {}): {
  session: GenerationSession<WorkspaceSessionResult>
  actions: GenerationSession<WorkspaceSessionResult>['actions']
} {
  const actions: GenerationSession<WorkspaceSessionResult>['actions'] = {
    setControl: vi.fn(() => true),
    selectPreset: vi.fn(() => true),
    setFigureLevel: vi.fn(() => true),
    selectInstrumentProfile: vi.fn(async () => 'applied' as const),
    saveMyInstrument: vi.fn(async () => 'saved' as const),
    saveAndSelectMyInstrument: vi.fn(async () => 'saved' as const),
    deleteMyInstrument: vi.fn(async () => 'saved' as const),
    setTheme: vi.fn(() => true),
    generate: vi.fn(async () => true),
    regenerate: vi.fn(async () => true),
    retryGeneration: vi.fn(async () => true),
    retryNotation: vi.fn(async () => true),
    reportNotationFailure: vi.fn(() => true),
    reportNotationRecovered: vi.fn(() => true),
    startFreshPhrase: vi.fn(async () => true),
    replacePlayerPresets: vi.fn(),
  }
  const session: GenerationSession<WorkspaceSessionResult> = {
    state: {
      controls: DEFAULT_GENERATION_CONTROLS,
      figureLevels: NEUTRAL_FIGURE_LEVELS,
      selection: DEFAULT_PRESET_SELECTION,
      presets: BUILT_IN_PRESETS,
      presentation: { theme: 'System' },
      myInstrument: null,
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

/** Intent: mount the shell over `session`, with no session controller loaded unless given. */
function mountShell(
  session: GenerationSession<WorkspaceSessionResult>,
  controller: SessionController | null = null,
  jumpView: SessionJumpView = { scrollBy: vi.fn(), viewportBlockSize: () => 800 },
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
      jumpView,
    },
    ...MOUNT_OPTIONS,
    attachTo: document.body,
  })
}

/** Intent: the header's phrase action, whatever its emphasis. */
function phraseAction(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('.header-actions > button:not(.session-action)')
}

describe('WorkspaceShell', () => {
  it('forwards a control-panel set-control event to session.actions.setControl', async () => {
    const { session, actions } = fakeSession()
    const wrapper = mountShell(session)

    const tempoGroup = wrapper.get('[aria-label="Tempo"]')
    await tempoGroup.get('button[aria-label="Increase tempo"]').trigger('click')

    expect(actions.setControl).toHaveBeenCalledWith('tempo', expect.any(Number))
  })

  it('forwards a select-instrument-profile event to session.actions.selectInstrumentProfile', async () => {
    const { session, actions } = fakeSession()
    const wrapper = mountShell(session)

    const profileGroup = wrapper.get('[aria-label="Instrument profile"]')
    await profileGroup.findAll('button')[1]!.trigger('click')

    expect(actions.selectInstrumentProfile).toHaveBeenCalledExactlyOnceWith('bb-tenor')
  })

  it('forwards choosing Jazz in the preset box to session.actions.selectPreset, the phrase staying', async () => {
    const { session, actions } = fakeSession(READY)
    const wrapper = mountShell(session)

    await wrapper.get('select.preset-select').setValue('jazz')

    expect(actions.selectPreset).toHaveBeenCalledExactlyOnceWith('jazz')
    expect(actions.generate).not.toHaveBeenCalled()
    expect(actions.regenerate).not.toHaveBeenCalled()
    expect(actions.startFreshPhrase).not.toHaveBeenCalled()
    expect(wrapper.find('.phrase-score-stub').exists()).toBe(true)
  })

  it('marks the control panel read-only while an operation is running', () => {
    const { session } = fakeSession({ operation: 'generating' })
    const wrapper = mountShell(session)

    // The presentation-theme control in the header is never read-only, so this targets a
    // ControlPanel radiogroup specifically rather than the first radiogroup in the whole shell.
    const radiogroup = wrapper.get('[aria-label="Written key"]')
    expect(radiogroup.attributes('aria-readonly')).toBe('true')
  })

  // @test-link [[rule_sixteenth_unavailable_below_tablet_width]]
  it("hands the session's note-density context to the rhythm controls", () => {
    const { session } = fakeSession({
      controls: { ...DEFAULT_GENERATION_CONTROLS, noteDensity: 'Sixteenth' },
      noteDensityContext: { belowTabletLandscape: true, sessionSteppedDown: false },
    })
    const wrapper = mountShell(session)

    const density = wrapper.get('[role="radiogroup"][aria-label="Note density"]')
    const segments = density.findAll('[role="radio"]')
    expect(segments[2]!.attributes('disabled')).toBeDefined()
    expect(segments[1]!.attributes('aria-checked')).toBe('true')
  })

  it('leaves the control panel selectable when idle', () => {
    const { session } = fakeSession()
    const wrapper = mountShell(session)

    const radiogroup = wrapper.get('[aria-label="Written key"]')
    expect(radiogroup.attributes('aria-readonly')).toBeUndefined()
  })

  // @test-link [[rule_unsupported_rhythm_settings_block_generation]]
  // @test-link [[module_rhythm_variety_grammar]]
  it.each([
    {
      noteDensity: 'Sixteenth' as const,
      silenceDensity: 'Sparse' as const,
      syncopation: 'Active displacement' as const,
      blockedVariety: 'Strict' as const,
      unblockedVariety: 'Slightly varied' as const,
    },
    {
      noteDensity: 'Quarter' as const,
      silenceDensity: 'Sparse' as const,
      syncopation: 'Active displacement' as const,
      blockedVariety: 'Slightly varied' as const,
      unblockedVariety: 'Heavily varied' as const,
    },
  ])(
    'toggles the blocked state, live-region text, and phrase-action disabled state on a rhythmic-variety-only change ($noteDensity/$silenceDensity/$syncopation)',
    ({ noteDensity, silenceDensity, syncopation, blockedVariety, unblockedVariety }) => {
      const baseControls: GenerationControls = {
        ...DEFAULT_GENERATION_CONTROLS,
        noteDensity,
        silenceDensity,
        syncopation,
      }

      const blockedSession = fakeSession({
        controls: { ...baseControls, rhythmicVariety: blockedVariety },
      }).session
      const blockedWrapper = mountShell(blockedSession)
      const blockedRhythmGroup = blockedWrapper
        .findAll('.control-group')
        .find((group) => group.get('h3').text() === 'Rhythm')!
      const blockedStatus = blockedRhythmGroup.get('[role="status"]')
      expect(blockedStatus.classes()).toContain('inline-alert')
      expect(blockedStatus.text()).not.toBe('')
      expect(phraseAction(blockedWrapper).attributes('disabled')).toBeDefined()

      const unblockedSession = fakeSession({
        controls: { ...baseControls, rhythmicVariety: unblockedVariety },
      }).session
      const unblockedWrapper = mountShell(unblockedSession)
      const unblockedRhythmGroup = unblockedWrapper
        .findAll('.control-group')
        .find((group) => group.get('h3').text() === 'Rhythm')!
      const unblockedStatus = unblockedRhythmGroup.get('[role="status"]')
      expect(unblockedStatus.classes()).not.toContain('inline-alert')
      expect(unblockedStatus.text()).toBe('')
      expect(phraseAction(unblockedWrapper).attributes('disabled')).toBeUndefined()
    },
  )

  it('always renders the portrait orientation notice alongside the layout root', () => {
    const { session } = fakeSession()
    const wrapper = mountShell(session)

    expect(wrapper.find('.orientation-notice').exists()).toBe(true)
    expect(wrapper.find('.layout-app').exists()).toBe(true)
  })

  it('drives a full generate-to-ready cycle end to end through the real session and coordinator', async () => {
    const workspace = createTestWorkspace()
    const wrapper = mount(WorkspaceShell, {
      props: {
        savedData: quietSavedData(),
        rememberedController: noRememberedController(),
        presetStore: quietPresetStore(),
        session: workspace.session,
        pendingPhrase: workspace.pendingPhrase.value,
        handleEngraved: workspace.handleEngraved,
        handleNotationError: workspace.handleNotationError,
        handleSessionStaffFailed: workspace.handleSessionStaffFailed,
        handleLayoutInputs: workspace.handleLayoutInputs,
        audio: workspace.audio,
        midi: createControllerRig().controller,
        controller: null,
      },
      ...MOUNT_OPTIONS,
    })

    await phraseAction(wrapper).trigger('click')
    // The phrase is published only once its fit check passes, a few ticks after generation.
    await vi.waitFor(() => expect(workspace.pendingPhrase.value).not.toBeNull())
    await wrapper.setProps({ pendingPhrase: workspace.pendingPhrase.value })
    wrapper.getComponent({ name: 'PhraseScore' }).vm.$emit('engraved', {
      staffSpacePx: 1,
      widthPx: 1,
      heightPx: 1,
      requiredUnits: 1,
      systemCount: 1,
    })
    await vi.waitFor(() => expect(workspace.session.state.operation).toBe('idle'))

    expect(workspace.session.state.result).not.toBeNull()
  })
})

/** Ready: a phrase engraved on the staff, nothing running. */
const READY = { result: buildWorkspaceSessionResult(), resultEngraved: true } as const

/** Intent: the header's session action. */
function sessionAction(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('.header-actions > button.session-action')
}

/** The `--mix-*` design tokens the volume popover reads from the page's computed style. */
const MIX_TOKENS = [
  '--mix-backing-volume-min',
  '--mix-click-volume-min',
  '--mix-volume-max',
  '--mix-volume-step',
  '--mix-backing-volume-default',
  '--mix-click-volume-default',
]

/** Intent: put the stylesheet's mix tokens on the root, where the popover reads them in jsdom. */
function applyMixTokens(): void {
  const tokens = themeMixTokens()
  for (const name of MIX_TOKENS) {
    document.documentElement.style.setProperty(name, tokens.getPropertyValue(name))
  }
}

afterEach(() => {
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('style')
})

// @test-link [[service_session_controller]]
// @test-link [[rule_session_settings_locked]]
// @test-link [[rule_readonly_controls_keep_contrast]]
describe('WorkspaceShell session', () => {
  it('starts the session in the Start click, then makes the one jump for the layout it holds', async () => {
    const fake = createFakeSessionController()
    const scrollBy = vi.fn()
    const wrapper = mountShell(fakeSession(READY).session, fake.controller, {
      scrollBy,
      viewportBlockSize: () => 0,
    })

    await sessionAction(wrapper).trigger('click')

    expect(fake.start).toHaveBeenCalledOnce()
    // jsdom lays nothing out: every box is at 0, so the staff's top edge is outside a 0 px
    // viewport and the one-system rule scrolls to the workspace top, itself at 0: no scroll.
    expect(scrollBy).not.toHaveBeenCalled()
  })

  it('closes an open volume popover at the start', async () => {
    applyMixTokens()
    const fake = createFakeSessionController()
    const wrapper = mountShell(fakeSession(READY).session, fake.controller)
    const volume = wrapper.get('.mix-controls .mix-volume > .btn')
    await volume.trigger('click')
    expect(volume.attributes('aria-expanded')).toBe('true')

    await sessionAction(wrapper).trigger('click')

    expect(volume.attributes('aria-expanded')).toBe('false')
  })

  // @test-link [[rule_session_settings_locked]]
  it('locks every musical control, tempo included, during a session; the theme stays live', async () => {
    const fake = createFakeSessionController()
    const { session, actions } = fakeSession(READY)
    const wrapper = mountShell(session, fake.controller)
    expect(wrapper.get('[aria-label="Written key"]').attributes('aria-readonly')).toBeUndefined()

    await sessionAction(wrapper).trigger('click')

    expect(wrapper.get('[aria-label="Written key"]').attributes('aria-readonly')).toBe('true')
    await wrapper.get('[aria-label="Tempo"] button[aria-label="Increase tempo"]').trigger('click')
    expect(actions.setControl).not.toHaveBeenCalled()
    const themeGroup = wrapper.get('[aria-label="Presentation theme"]')
    expect(themeGroup.attributes('aria-readonly')).toBeUndefined()
    await themeGroup.findAll('button')[2]!.trigger('click')
    expect(actions.setTheme).toHaveBeenCalledExactlyOnceWith('Dark')
  })

  // @test-link [[rule_stop_ends_session]]
  it('stops the session from the header Stop and from the compact Stop', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountShell(fakeSession(READY).session, fake.controller)
    await sessionAction(wrapper).trigger('click')

    await sessionAction(wrapper).trigger('click')
    expect(fake.stop).toHaveBeenCalledOnce()

    fake.start()
    await nextTick()
    await wrapper.get('.session-cue-actions .btn-primary').trigger('click')
    expect(fake.stop).toHaveBeenCalledTimes(2)
  })

  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it('moves focus to the session action after an end during the count-in', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountShell(fakeSession(READY).session, fake.controller)
    fake.start()
    await nextTick()
    ;(phraseAction(wrapper).element as HTMLButtonElement).focus()

    fake.stop()
    await nextTick()
    await nextTick()

    expect(document.activeElement).toBe(sessionAction(wrapper).element)
    expect(sessionAction(wrapper).text()).toBe('Start session')
  })

  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it('moves focus to room-notice when the end leaves the staff without room', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountShell(
      fakeSession({ roomNotice: 'no_room', result: null }).session,
      fake.controller,
    )
    fake.start()
    await nextTick()

    fake.stop()
    await nextTick()
    await nextTick()

    expect(document.activeElement).toBe(wrapper.get('.room-notice').element)
  })

  // @test-link [[rule_stop_ends_session]]
  // @test-link [[req_last_session_review]]
  it('moves focus to the session action, which closes the Review, once phrase 1 has sounded', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountShell(fakeSession(READY).session, fake.controller)
    fake.start()
    fake.state.phase = 'running'
    await nextTick()

    fake.stop()
    await nextTick()
    await nextTick()

    expect(document.activeElement).toBe(sessionAction(wrapper).element)
  })

  /**
   * Intent: a Ready workspace whose Idle state a test can change after mounting, as the staff's
   * re-engraving at a new window size does once a session has ended.
   */
  function liveReadySession() {
    const { session } = fakeSession(READY)
    const state = reactive({ ...session.state })
    return { session: { ...session, state }, state }
  }

  /** Intent: end the fake's session the way a window change does, in its current phase. */
  function endForWindow(fake: ReturnType<typeof createFakeSessionController>): void {
    fake.stop()
    const ended = fake.state.lastEnd
    if (ended === null) throw new Error('the fake recorded no end')
    fake.state.lastEnd = { ...ended, cause: 'staff-not-shown' }
  }

  // @test-link [[rule_count_in_ending_returns_to_idle]]
  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('moves focus to room-notice when Needs more room lands after a window end in the count-in', async () => {
    const fake = createFakeSessionController()
    const live = liveReadySession()
    const wrapper = mountShell(live.session, fake.controller)
    fake.start()
    await nextTick()

    endForWindow(fake)
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(sessionAction(wrapper).element)

    // The staff re-engraves at the new size after the end, and finds no room there.
    live.state.roomNotice = 'no_room'
    live.state.result = null
    live.state.resultEngraved = false
    await nextTick()
    await nextTick()

    expect(document.activeElement).toBe(wrapper.get('.room-notice').element)
  })

  // @test-link [[req_last_session_review]]
  it('leaves focus on the session action when Needs more room lands after a window end once phrase 1 has sounded', async () => {
    const fake = createFakeSessionController()
    const live = liveReadySession()
    const wrapper = mountShell(live.session, fake.controller)
    fake.start()
    fake.state.phase = 'running'
    await nextTick()

    endForWindow(fake)
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(sessionAction(wrapper).element)

    live.state.roomNotice = 'no_room'
    live.state.result = null
    live.state.resultEngraved = false
    await nextTick()
    await nextTick()

    expect(document.activeElement).toBe(sessionAction(wrapper).element)
  })

  // @test-link [[rule_count_in_ending_returns_to_idle]]
  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('moves focus to room-notice when the notice is set right after the end, before it renders', async () => {
    const fake = createFakeSessionController()
    const live = liveReadySession()
    const wrapper = mountShell(live.session, fake.controller)
    fake.start()
    await nextTick()

    endForWindow(fake)
    // The staff's engraving at the new size settles in a microtask right after the end's.
    queueMicrotask(() => {
      live.state.roomNotice = 'no_room'
      live.state.result = null
      live.state.resultEngraved = false
    })
    await flushPromises()

    expect(document.activeElement).toBe(wrapper.get('.room-notice').element)
  })

  // @test-link [[rule_stop_ends_session]]
  it('leaves focus alone when the room notice shows later after a Stop', async () => {
    const fake = createFakeSessionController()
    const live = liveReadySession()
    const wrapper = mountShell(live.session, fake.controller)
    fake.start()
    await nextTick()
    fake.stop()
    await nextTick()
    await nextTick()
    ;(phraseAction(wrapper).element as HTMLButtonElement).focus()

    live.state.roomNotice = 'no_room'
    live.state.result = null
    await nextTick()
    await nextTick()

    expect(document.activeElement).toBe(phraseAction(wrapper).element)
  })

  // @test-link [[rule_stop_ends_session]]
  it.each(['before', 'after'] as const)(
    'moves no focus and throws nothing when the session ends as the shell unmounts, %s the end',
    async (order) => {
      const fake = createFakeSessionController()
      const live = liveReadySession()
      const wrapper = mountShell(live.session, fake.controller)
      fake.start()
      await nextTick()
      const outside = document.createElement('button')
      document.body.append(outside)
      outside.focus()

      if (order === 'before') wrapper.unmount()
      endForWindow(fake)
      if (order === 'after') wrapper.unmount()
      live.state.roomNotice = 'no_room'
      await flushPromises()

      expect(document.activeElement).toBe(outside)
    },
  )

  it('closes a popover the compact Volume opened when the session ends', async () => {
    applyMixTokens()
    const fake = createFakeSessionController()
    const wrapper = mountShell(fakeSession(READY).session, fake.controller)
    fake.start()
    await nextTick()
    await wrapper.get('.session-cue-actions .mix-volume > .btn').trigger('click')
    expect(wrapper.find('.session-cue-actions [aria-expanded="true"]').exists()).toBe(true)

    fake.stop()
    await nextTick()

    expect(wrapper.find('[aria-expanded="true"]').exists()).toBe(false)
  })
})
