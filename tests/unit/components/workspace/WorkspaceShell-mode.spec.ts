/**
 * The workspace shell's side of the workspace's mode, over a hand-settled loader of Jam's code:
 * session mode at mount, reported not held; the first press of `Jam` holds session mode at once
 * (reported synchronously), the controls read-only and both header actions disabled; once loaded,
 * Jam's view takes the staff's place, the session staff out of sight and inert but still mounted;
 * `Session` brings session mode back as it was. The score title reads `Jam` once Jam's view shows,
 * `Four-measure phrase` otherwise, while Jam's code loads included. A failed load shows Jam's
 * load-failure notice, focus on its `Try again`, which loads again, unless a sheet is open as the
 * wait ends, when focus stays in the sheet (a load succeeding moves none either); `Dismiss`
 * removes it, focus to the fallback. Jam's
 * view is given Jam's settings and reports what its staff shows: a notation error makes the
 * header's phrase action `Retry notation`, which reaches Jam's view's `retryNotation()`.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import ControlPanel from '@/components/controls/ControlPanel.vue'
import ConnectionSheet from '@/components/controller-connection/ConnectionSheet.vue'
import WorkspaceShell from '@/components/workspace/WorkspaceShell.vue'
import type { JamModeModule } from '@/components/workspace/load-jam-mode'
import JamControls from '@/jam/JamControls.vue'
import { createJamSettings, jamFigureLevels, jamGenerationControls } from '@/jam/jam-settings'
import { useKeptDoodle } from '@/jam/use-kept-doodle'
import { createTapTempo } from '@/jam/use-tap-tempo'
import { createTestWorkspace, PHRASE_SCORE_STUB } from './test-workspace'
import { createControllerRig } from '../../midi/midi-controller-rig'
import { provideSaveSettings, recordingSaveSettings } from './recording-save-settings'
import { noRememberedController, quietSavedData, quietPresetStore } from './quiet-saved-data'

/** Every load of Jam's code asked for, settled by the test. */
const loader = vi.hoisted(() => ({
  pending: [] as { resolve: (loaded: unknown) => void; reject: (cause: unknown) => void }[],
}))

// The connection sheet engraves its check note; jsdom has no fonts nor canvas for VexFlow.
vi.mock(
  '@/notation/vexflow-engraver-loader',
  () => import('../controller-connection/fake-check-note-engraver'),
)

vi.mock('@/components/workspace/load-jam-mode', () => ({
  loadJamMode: () =>
    new Promise((resolve, reject) => {
      loader.pending.push({ resolve, reject })
    }),
}))

/** The props Jam's stand-in view last rendered with. */
const reporting = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }))
/** The stand-in view's `retryNotation()`. */
const retryNotation = vi.fn()

/**
 * A stand-in for Jam's code entry: a view whose root is its own staff viewport, which takes Jam's
 * props, reports a notation error on its button and exposes `retryNotation()`; and Jam's own
 * settings, controls, kept doodle and tap tempo, the real ones.
 */
const FAKE_JAM_MODULE = {
  JamControls,
  createJamSettings,
  jamFigureLevels,
  jamGenerationControls,
  useKeptDoodle,
  createTapTempo,
  JamWorkspace: defineComponent({
    name: 'JamWorkspaceStub',
    props: {
      tonalCenter: { type: String, required: true },
      collection: { type: String, required: true },
      instrumentProfileId: { type: String, required: true },
      myInstrument: { type: Object, default: null },
      systemPositionUnits: { type: Number, required: true },
    },
    emits: ['staff-state'],
    setup(props, { emit, expose }) {
      expose({ retryNotation })
      return () => {
        reporting.props = { ...props }
        return h('div', { class: 'staff-viewport jam-stub' }, [
          h('button', {
            class: 'report-error',
            onClick: () => emit('staff-state', 'notation-error'),
          }),
        ])
      }
    },
  }),
} as unknown as JamModeModule

const JAM_LOAD_FAILED =
  "Jam mode couldn't open because part of the app didn't load. Check that you're online, then try again."

beforeEach(() => {
  loader.pending.length = 0
  reporting.props = null
  retryNotation.mockClear()
})

afterEach(() => {
  document.body.innerHTML = ''
})

/** Intent: mount the shell over a test workspace at Idle, no session controller loaded. */
function mountShell(saving = recordingSaveSettings()) {
  const workspace = createTestWorkspace()
  return mount(WorkspaceShell, {
    props: {
      savedData: quietSavedData(),
      rememberedController: noRememberedController(),
      presetStore: quietPresetStore(),
      session: workspace.session,
      pendingPhrase: null,
      handleEngraved: () => {},
      handleNotationError: () => {},
      handleSessionStaffFailed: () => {},
      handleLayoutInputs: () => {},
      audio: workspace.audio,
      midi: createControllerRig().controller,
      controller: null,
    },
    global: {
      stubs: { PhraseScore: PHRASE_SCORE_STUB },
      provide: provideSaveSettings(saving.saveSettings),
    },
    attachTo: document.body,
  })
}

type ShellWrapper = ReturnType<typeof mountShell>

/** Intent: the mode switch's segment named `label`. */
function segment(wrapper: ShellWrapper, label: 'Session' | 'Jam') {
  const found = wrapper.findAll('.mode-switch .segment').find((each) => each.text() === label)
  if (found === undefined) throw new Error(`no ${label} segment`)
  return found
}

/** Intent: the latest load of Jam's code asked for. */
function lastLoad() {
  const load = loader.pending.at(-1)
  if (load === undefined) throw new Error('no load of Jam code was asked for')
  return load
}

/** Intent: the score title, which also names the staff frame. */
function scoreTitle(wrapper: ShellWrapper): string {
  return wrapper.get('#score-panel-title').text()
}

/**
 * Intent: open the connection sheet from `controller-status`, let it load and render, and return
 * it, focus moved inside it as it opens.
 */
async function openConnectionSheet(wrapper: ShellWrapper) {
  await wrapper.get('.context-group > button.controller-status').trigger('click')
  await flushPromises()
  const sheet = wrapper.getComponent(ConnectionSheet).get('.sheet[role="dialog"]')
  expect(sheet.element.contains(document.activeElement)).toBe(true)
  return sheet
}

/** Intent: the session's staff viewport, the score panel's first. */
function sessionStaff(wrapper: ShellWrapper) {
  return wrapper.get('.score-panel .staff-viewport:not(.jam-stub)')
}

// @test-link [[module_workspace_mode]]
describe('WorkspaceShell and the workspace mode', () => {
  // @test-link [[rule_app_opens_in_session_mode]]
  // @test-link [[rule_jam_code_loaded_on_demand]]
  // @test-link [[rule_leaving_jam_mode_keeps_session_mode]]
  it('opens Jam mode over a held session mode, and leaves it with session mode as it was', async () => {
    const wrapper = mountShell()
    expect(wrapper.emitted('session-mode-held-change')).toEqual([[false]])
    expect(segment(wrapper, 'Session').attributes('aria-checked')).toBe('true')

    await segment(wrapper, 'Jam').trigger('click')
    expect(wrapper.emitted('session-mode-held-change')).toEqual([[false], [true]])
    expect(loader.pending).toHaveLength(1)
    expect(wrapper.get('.mode-switch').attributes('aria-busy')).toBe('true')
    expect(wrapper.getComponent(ControlPanel).props('readonly')).toBe(true)
    for (const action of wrapper.findAll('.header-actions > button'))
      expect(action.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.jam-stub').exists()).toBe(false)

    lastLoad().resolve(FAKE_JAM_MODULE)
    await flushPromises()
    expect(wrapper.find('.jam-stub').exists()).toBe(true)
    expect(sessionStaff(wrapper).classes()).toContain('is-out-of-sight')
    expect(sessionStaff(wrapper).attributes('inert')).toBeDefined()
    expect(wrapper.findComponent(ControlPanel).exists()).toBe(false)
    expect(wrapper.getComponent(JamControls).props('readonly')).toBe(false)

    await segment(wrapper, 'Session').trigger('click')
    expect(wrapper.emitted('session-mode-held-change')).toEqual([[false], [true], [false]])
    expect(wrapper.find('.jam-stub').exists()).toBe(false)
    expect(sessionStaff(wrapper).classes()).not.toContain('is-out-of-sight')
    expect(sessionStaff(wrapper).attributes('inert')).toBeUndefined()
    expect(wrapper.findComponent(JamControls).exists()).toBe(false)
    expect(wrapper.getComponent(ControlPanel).props('readonly')).toBe(false)
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('shows the load-failure notice on a failed load, focus on Try again, which loads again', async () => {
    const wrapper = mountShell()
    await segment(wrapper, 'Jam').trigger('click')

    lastLoad().reject(new Error('offline'))
    await flushPromises()
    const notice = wrapper.get('.app-notice-row .app-notice')
    expect(notice.get('p').text()).toBe(JAM_LOAD_FAILED)
    expect(segment(wrapper, 'Session').attributes('aria-checked')).toBe('true')
    const tryAgain = notice.findAll('button').find((button) => button.text() === 'Try again')
    expect(document.activeElement).toBe(tryAgain?.element)
    expect(wrapper.emitted('session-mode-held-change')).toEqual([[false], [true], [false]])

    await tryAgain!.trigger('click')
    expect(loader.pending).toHaveLength(2)
    lastLoad().resolve(FAKE_JAM_MODULE)
    await flushPromises()
    expect(wrapper.find('.app-notice-row').exists()).toBe(false)
    expect(wrapper.find('.jam-stub').exists()).toBe(true)
  })

  // @test-link [[module_workspace_mode]]
  it('titles the score Jam while Jam mode shows, and Four-measure phrase while its code loads', async () => {
    const wrapper = mountShell()
    expect(scoreTitle(wrapper)).toBe('Four-measure phrase')

    await segment(wrapper, 'Jam').trigger('click')
    expect(segment(wrapper, 'Jam').attributes('aria-checked')).toBe('true')
    expect(scoreTitle(wrapper)).toBe('Four-measure phrase')

    lastLoad().resolve(FAKE_JAM_MODULE)
    await flushPromises()
    expect(scoreTitle(wrapper)).toBe('Jam')

    await segment(wrapper, 'Session').trigger('click')
    expect(scoreTitle(wrapper)).toBe('Four-measure phrase')
    await segment(wrapper, 'Jam').trigger('click')
    expect(scoreTitle(wrapper)).toBe('Jam')
  })

  // @test-link [[module_workspace_mode]]
  it('keeps focus in a sheet open as the load fails, the notice showing all the same', async () => {
    const wrapper = mountShell()
    await segment(wrapper, 'Jam').trigger('click')
    const sheet = await openConnectionSheet(wrapper)
    const focused = document.activeElement

    lastLoad().reject(new Error('offline'))
    await flushPromises()

    expect(wrapper.get('.app-notice-row .app-notice p').text()).toBe(JAM_LOAD_FAILED)
    expect(segment(wrapper, 'Session').attributes('aria-checked')).toBe('true')
    expect(document.activeElement).toBe(focused)
    expect(sheet.element.contains(document.activeElement)).toBe(true)
  })

  // @test-link [[module_workspace_mode]]
  it('keeps focus in a sheet open as the load succeeds, Jam mode showing under it', async () => {
    const wrapper = mountShell()
    await segment(wrapper, 'Jam').trigger('click')
    await openConnectionSheet(wrapper)
    const focused = document.activeElement

    lastLoad().resolve(FAKE_JAM_MODULE)
    await flushPromises()

    expect(wrapper.find('.jam-stub').exists()).toBe(true)
    expect(document.activeElement).toBe(focused)
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('removes the load-failure notice on Dismiss, session mode unchanged', async () => {
    const wrapper = mountShell()
    await segment(wrapper, 'Jam').trigger('click')
    lastLoad().reject(new Error('offline'))
    await flushPromises()

    const dismiss = wrapper
      .findAll('.app-notice-row button')
      .find((button) => button.text() === 'Dismiss')
    await dismiss!.trigger('click')

    expect(wrapper.find('.app-notice-row').exists()).toBe(false)
    expect(segment(wrapper, 'Session').attributes('aria-checked')).toBe('true')
    expect(loader.pending).toHaveLength(1)
    // The workspace's fallback: no controller loaded, so the phrase action, the first enabled.
    expect(document.activeElement).toBe(
      wrapper.get('.header-actions > button:not(.session-action)').element,
    )
  })

  // @test-link [[module_workspace_mode]]
  it("gives Jam's view its settings, and retries its notation from the header", async () => {
    const wrapper = mountShell()
    await segment(wrapper, 'Jam').trigger('click')
    lastLoad().resolve(FAKE_JAM_MODULE)
    await flushPromises()
    const controls = wrapper.props('session').state.controls
    expect(reporting.props).toEqual({
      tonalCenter: controls.tonalCenter,
      collection: controls.collection,
      instrumentProfileId: controls.instrumentProfileId,
      myInstrument: null,
      systemPositionUnits: 160,
    })
    /** Intent: the header's phrase action, the first action slot. */
    const phraseAction = () => wrapper.get('.header-actions > button:not(.session-action)')
    expect(phraseAction().text()).toBe('Generate phrase')

    await wrapper.get('.jam-stub .report-error').trigger('click')
    expect(phraseAction().text()).toBe('Retry notation')
    expect(phraseAction().attributes('disabled')).toBeUndefined()
    await phraseAction().trigger('click')
    expect(retryNotation).toHaveBeenCalledOnce()

    await segment(wrapper, 'Session').trigger('click')
    await segment(wrapper, 'Jam').trigger('click')
    await flushPromises()
    expect(phraseAction().text()).toBe('Generate phrase')
  })

  // @test-link [[module_workspace_mode]]
  it("shows Jam's controls in Jam mode, saving Jam's changes apart and sharing the instrument", async () => {
    const saving = recordingSaveSettings()
    const wrapper = mountShell(saving)
    await segment(wrapper, 'Jam').trigger('click')
    lastLoad().resolve(FAKE_JAM_MODULE)
    await flushPromises()
    const session = wrapper.props('session')
    const before = session.state.controls
    const jam = wrapper.getComponent(JamControls)
    expect(jam.get('h2').text()).toBe('Shape your Jam')
    expect(jam.props('readings')).toBeNull()
    saving.saves.length = 0

    jam.vm.$emit('change', { drift: 'Free', tonalCenter: 'G' })
    await flushPromises()
    expect(saving.saves).toEqual([{ 'jam.tonalCenter': 'G', 'jam.drift': 'Free' }])
    expect(session.state.controls).toBe(before)
    expect(jam.props('settings')).toMatchObject({ drift: 'Free', tonalCenter: 'G' })
    expect(reporting.props).toMatchObject({ tonalCenter: 'G' })

    jam.vm.$emit('select-instrument-profile', 'eb-alto')
    await flushPromises()
    expect(session.state.controls.instrumentProfileId).toBe('eb-alto')
    expect(jam.props('instrumentProfileId')).toBe('eb-alto')

    await segment(wrapper, 'Session').trigger('click')
    expect(wrapper.getComponent(ControlPanel).props('controls').tonalCenter).toBe(
      before.tonalCenter,
    )
  })
})
