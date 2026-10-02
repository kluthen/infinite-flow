/**
 * The workspace shell's side of the controller connection: the header `controller-status` click
 * (the audio-unlock click and the MIDI request, in that order, inside the click), the lazily
 * loaded connection sheet it opens and what it hands it, where focus goes when the sheet closes,
 * and the session-end focus that lands on `controller-status` while phrase 1 regenerates.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive, toRaw } from 'vue'

import ConnectionSheet from '@/components/controller-connection/ConnectionSheet.vue'
import WorkspaceShell from '@/components/workspace/WorkspaceShell.vue'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import type { AudioTransport } from '@/audio/audio-transport'
import type { MidiController } from '@/midi/midi-controller-state'
import { createTestWorkspace, PHRASE_SCORE_STUB } from './test-workspace'
import { createFakeSessionController } from './fake-session-controller'
import { createControllerRig, KEYS_A, PAD_B } from '../../midi/midi-controller-rig'

// The opened sheet engraves its check note; jsdom has no fonts nor canvas for VexFlow.
vi.mock(
  '@/notation/vexflow-engraver-loader',
  () => import('../controller-connection/fake-check-note-engraver'),
)

/** Intent: a real workspace whose Idle state a test can edit after mounting. */
function liveWorkspace() {
  const workspace = createTestWorkspace()
  const state = reactive({ ...workspace.session.state })
  return { workspace, session: { ...workspace.session, state }, state }
}

/** Intent: wrap the transport and the controller so every click-time call lands in `calls`. */
function recorded(audio: AudioTransport, midi: MidiController) {
  const calls: string[] = []
  const recordedAudio: AudioTransport = {
    ...audio,
    unlock: () => {
      calls.push('unlock')
      audio.unlock()
    },
  }
  const recordedMidi: MidiController = {
    ...midi,
    permission: () => {
      calls.push('permission')
      return midi.permission()
    },
    connect: () => {
      calls.push('connect')
      return midi.connect()
    },
  }
  return { calls, audio: recordedAudio, midi: recordedMidi }
}

/** Intent: mount the shell over a live workspace, `midi` and an optional session controller. */
function mountShell(
  live: ReturnType<typeof liveWorkspace>,
  options: {
    readonly midi: MidiController
    readonly audio?: AudioTransport
    readonly controller?: SessionController | null
  },
) {
  const { workspace, session } = live
  return mount(WorkspaceShell, {
    props: {
      session,
      pendingPhrase: null,
      handleEngraved: () => {},
      handleNotationError: () => {},
      handleSessionStaffFailed: () => {},
      handleLayoutInputs: () => {},
      audio: options.audio ?? workspace.audio,
      midi: options.midi,
      controller: options.controller ?? null,
      jumpView: { scrollBy: vi.fn(), viewportBlockSize: () => 800 },
    },
    global: { stubs: { PhraseScore: PHRASE_SCORE_STUB } },
    attachTo: document.body,
  })
}

type ShellWrapper = ReturnType<typeof mountShell>

/** Intent: the header's `controller-status` button. */
function controllerStatus(wrapper: ShellWrapper) {
  return wrapper.get('.context-group > button.controller-status')
}

/** Intent: the header's phrase action. */
function phraseAction(wrapper: ShellWrapper) {
  return wrapper.get('.header-actions > button:not(.session-action)')
}

/** Intent: the header's session action. */
function sessionAction(wrapper: ShellWrapper) {
  return wrapper.get('.header-actions > button.session-action')
}

/** Intent: click `controller-status`, then let the lazy sheet load and render. */
async function openSheet(wrapper: ShellWrapper) {
  await controllerStatus(wrapper).trigger('click')
  await flushPromises()
  return wrapper.getComponent(ConnectionSheet)
}

/** Intent: close the open sheet from its own Close button, then let the focus move run. */
async function closeSheet(wrapper: ShellWrapper): Promise<void> {
  await wrapper.get('.sheet-close').trigger('click')
  await nextTick()
  await nextTick()
}

afterEach(() => {
  document.body.innerHTML = ''
})

// @test-link [[rule_audio_unlocked_by_player_click]]
// @test-link [[rule_controller_connects_between_sessions]]
describe('WorkspaceShell controller-status click', () => {
  it('unlocks the audio, then reads the permission, then connects, all inside the click', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const live = liveWorkspace()
    const spies = recorded(live.workspace.audio, rig.controller)
    const wrapper = mountShell(live, { midi: spies.midi, audio: spies.audio })

    await controllerStatus(wrapper).trigger('click')

    expect(spies.calls).toEqual(['unlock', 'permission', 'connect'])
    expect(live.workspace.audio.isUnlocked()).toBe(true)
    expect(wrapper.vm.connectionSheetOpen).toBe(true)
  })

  it('opens the sheet at requesting, with the connect attempt, the profile and the devices seen', async () => {
    const rig = createControllerRig({ devices: [KEYS_A, PAD_B] })
    await rig.controller.connect()
    const live = liveWorkspace()
    const wrapper = mountShell(live, { midi: rig.controller })

    const sheet = await openSheet(wrapper)

    expect(sheet.props('openAt')).toBe('requesting')
    const connecting = sheet.props('connecting')
    expect(connecting).not.toBeNull()
    await expect(connecting?.settled).resolves.toBeUndefined()
    await expect(connecting?.permission).resolves.toBe('granted')
    expect(sheet.props('profile').id).toBe(live.state.controls.instrumentProfileId)
    expect(sheet.props('seenDeviceCount')).toBe(2)
    expect(toRaw(sheet.props('midi'))).toBe(rig.controller)
  })

  it('opens the connected badge at connected, with no connect and no unlock', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()
    const live = liveWorkspace()
    const spies = recorded(live.workspace.audio, rig.controller)
    const wrapper = mountShell(live, { midi: spies.midi, audio: spies.audio })
    expect(controllerStatus(wrapper).classes()).toContain('is-badge')

    const sheet = await openSheet(wrapper)

    expect(spies.calls).toEqual([])
    expect(sheet.props('openAt')).toBe('connected')
    expect(sheet.props('connecting')).toBeNull()
  })

  it('in a browser without Web MIDI, unlocks the audio and opens the sheet with no connect', async () => {
    const rig = createControllerRig({ supported: false })
    const live = liveWorkspace()
    const spies = recorded(live.workspace.audio, rig.controller)
    const wrapper = mountShell(live, { midi: spies.midi, audio: spies.audio })

    const sheet = await openSheet(wrapper)

    expect(spies.calls).toEqual(['unlock'])
    expect(sheet.props('openAt')).toBe('requesting')
    expect(sheet.props('connecting')).toBeNull()
  })

  it('asks again from the MIDI-blocked badge', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.denyNextRequest()
    await rig.controller.connect()
    const live = liveWorkspace()
    const wrapper = mountShell(live, { midi: rig.controller })
    expect(controllerStatus(wrapper).text()).toBe('MIDI access blocked')

    const sheet = await openSheet(wrapper)

    expect(sheet.props('openAt')).toBe('requesting')
    expect(rig.midi.requestCount()).toBe(2)
  })

  // @test-link [[rule_midi_never_blocks_session]]
  it('keeps the header form a session started with until it ends', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.denyNextRequest()
    rig.midi.holdNextRequest()
    const fake = createFakeSessionController()
    const live = liveWorkspace()
    const wrapper = mountShell(live, { midi: rig.controller, controller: fake.controller })
    await openSheet(wrapper)
    await closeSheet(wrapper)
    fake.start()
    await nextTick()

    rig.midi.releaseHeldRequest()
    await flushPromises()
    expect(controllerStatus(wrapper).text()).toBe('Connect controller')
    expect(controllerStatus(wrapper).attributes('disabled')).toBeDefined()

    fake.stop()
    await nextTick()
    expect(controllerStatus(wrapper).text()).toBe('MIDI access blocked')
    expect(controllerStatus(wrapper).attributes('disabled')).toBeUndefined()
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
describe('WorkspaceShell connection sheet close', () => {
  it('hides the sheet and moves focus to the session action when it is enabled', async () => {
    const rig = createControllerRig({ supported: false })
    const live = liveWorkspace()
    const fake = createFakeSessionController()
    const wrapper = mountShell(live, { midi: rig.controller, controller: fake.controller })
    await openSheet(wrapper)

    await closeSheet(wrapper)

    expect(wrapper.findComponent(ConnectionSheet).exists()).toBe(false)
    expect(wrapper.vm.connectionSheetOpen).toBe(false)
    expect(document.activeElement).toBe(sessionAction(wrapper).element)
  })

  it('moves focus to the phrase action when Start session is disabled', async () => {
    const rig = createControllerRig({ supported: false })
    const live = liveWorkspace()
    const fake = createFakeSessionController({ canStart: false, startBlocker: 'no_phrase' })
    const wrapper = mountShell(live, { midi: rig.controller, controller: fake.controller })
    await openSheet(wrapper)

    await closeSheet(wrapper)

    expect(document.activeElement).toBe(phraseAction(wrapper).element)
  })

  it('moves focus back to controller-status when both header actions are disabled', async () => {
    const rig = createControllerRig({ supported: false })
    const live = liveWorkspace()
    const wrapper = mountShell(live, { midi: rig.controller })
    await openSheet(wrapper)
    live.state.operation = 'generating'

    await closeSheet(wrapper)

    expect(document.activeElement).toBe(controllerStatus(wrapper).element)
  })
})

/**
 * Intent: record every error the page would report from now on: console errors (a Vue handler's
 * error in production) and uncaught errors (a Vue handler's error in development).
 */
function watchErrors(): { readonly errors: unknown[]; readonly stop: () => void } {
  const errors: unknown[] = []
  const consoleError = vi.spyOn(console, 'error').mockImplementation((...args) => {
    errors.push(args)
  })
  const onError = (event: ErrorEvent): void => {
    event.preventDefault()
    errors.push(event.error)
  }
  window.addEventListener('error', onError)
  return {
    errors,
    stop: () => {
      consoleError.mockRestore()
      window.removeEventListener('error', onError)
    },
  }
}

/** Intent: the open sheet's action button with this label; a missing one fails the test. */
function sheetAction(wrapper: ShellWrapper, label: string): HTMLButtonElement {
  const found = wrapper.findAll('.sheet-actions button').find((button) => button.text() === label)
  if (found === undefined) throw new Error(`no sheet action labeled "${label}"`)
  return found.element as HTMLButtonElement
}

// @test-link [[rule_controller_connects_between_sessions]]
describe('WorkspaceShell connection sheet closes once', () => {
  it('Disconnect closes the sheet once, with no error, and shows the no-controller badge', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()
    const live = liveWorkspace()
    const wrapper = mountShell(live, { midi: rig.controller })
    const sheet = await openSheet(wrapper)
    const watched = watchErrors()

    sheetAction(wrapper, 'Disconnect').click()
    await flushPromises()
    watched.stop()

    expect(watched.errors).toEqual([])
    expect(sheet.emitted('close')).toHaveLength(1)
    expect(wrapper.findComponent(ConnectionSheet).exists()).toBe(false)
    expect(wrapper.vm.connectionSheetOpen).toBe(false)
    expect(controllerStatus(wrapper).text()).toBe('No controller')
  })

  it('a controller change right after Close does not close the sheet again', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const live = liveWorkspace()
    const wrapper = mountShell(live, { midi: rig.controller })
    const sheet = await openSheet(wrapper)
    const watched = watchErrors()

    ;(wrapper.get('.sheet-close').element as HTMLButtonElement).click()
    rig.midi.plug(PAD_B, 10)
    await flushPromises()
    watched.stop()

    expect(watched.errors).toEqual([])
    expect(sheet.emitted('close')).toHaveLength(1)
    expect(wrapper.findComponent(ConnectionSheet).exists()).toBe(false)
  })

  it('a note played right after Done does not close the sheet again', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()
    const live = liveWorkspace()
    const wrapper = mountShell(live, { midi: rig.controller })
    const sheet = await openSheet(wrapper)
    const watched = watchErrors()

    sheetAction(wrapper, 'Done').click()
    rig.midi.noteOn(KEYS_A.id, 60, 100, 10)
    await flushPromises()
    watched.stop()

    expect(watched.errors).toEqual([])
    expect(sheet.emitted('close')).toHaveLength(1)
    expect(wrapper.findComponent(ConnectionSheet).exists()).toBe(false)
  })
})

// @test-link [[rule_count_in_ending_returns_to_idle]]
describe('WorkspaceShell session-end focus on controller-status', () => {
  it('moves focus to controller-status after a count-in end that regenerates phrase 1', async () => {
    const rig = createControllerRig({ supported: false })
    const live = liveWorkspace()
    const fake = createFakeSessionController()
    const wrapper = mountShell(live, { midi: rig.controller, controller: fake.controller })
    fake.start()
    await nextTick()
    ;(sessionAction(wrapper).element as HTMLButtonElement).focus()

    fake.stop()
    live.state.operation = 'generating'
    await nextTick()
    await nextTick()

    expect(document.activeElement).toBe(controllerStatus(wrapper).element)
  })
})

// @test-link [[rule_controller_loss_mid_session]]
// @test-link [[rule_controller_reconnection_window]]
describe('WorkspaceShell controller lost in a session', () => {
  it("shows the disconnected badge, disabled, while the lost controller's countdown runs", async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()
    const live = liveWorkspace()
    const fake = createFakeSessionController()
    const wrapper = mountShell(live, { midi: rig.controller, controller: fake.controller })
    fake.start()
    await nextTick()
    expect(controllerStatus(wrapper).text()).toContain(KEYS_A.name)

    fake.state.controllerLost = { secondsLeft: 30 }
    await nextTick()
    const badge = controllerStatus(wrapper)
    expect(badge.text()).toBe('Controller disconnected')
    expect(badge.classes()).toEqual(expect.arrayContaining(['is-badge', 'is-error']))
    expect(badge.attributes('disabled')).toBeDefined()

    fake.state.controllerLost = null
    await nextTick()
    expect(controllerStatus(wrapper).text()).toContain(KEYS_A.name)
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
// @test-link [[rule_midi_starting_note]]
describe('WorkspaceShell connection sheet flag', () => {
  it('reports the sheet closed at setup, open inside the click, and closed again at once', async () => {
    const rig = createControllerRig({ supported: false })
    const live = liveWorkspace()
    const wrapper = mountShell(live, { midi: rig.controller })
    expect(wrapper.emitted('connection-sheet-open-change')).toEqual([[false]])

    ;(controllerStatus(wrapper).element as HTMLButtonElement).click()
    expect(wrapper.emitted('connection-sheet-open-change')).toEqual([[false], [true]])

    await flushPromises()
    ;(wrapper.get('.sheet-close').element as HTMLButtonElement).click()
    expect(wrapper.emitted('connection-sheet-open-change')).toEqual([[false], [true], [false]])
  })
})
