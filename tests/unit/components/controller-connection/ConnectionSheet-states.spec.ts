/**
 * The connection sheet's states as the player sees them (screen handoff, States): each state's
 * title, body, actions and tone, and where focus lands on open.
 */
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkWrittenNote } from '@/domain/controller-check/transposition-check'
import { BB_TENOR_PROFILE } from '@/domain/profile/instrument-profiles'
import { createControllerRig, KEYS_A, PAD_B } from '../../midi/midi-controller-rig'
import {
  actionLabels,
  bodyLines,
  closeButton,
  openSheet,
  options,
  primaryLabels,
  title,
} from './connection-sheet-rig'
import { fakeCheckNoteEngraver, resetFakeCheckNoteEngraver } from './fake-check-note-engraver'

vi.mock('@/notation/vexflow-engraver-loader', () => import('./fake-check-note-engraver'))

enableAutoUnmount(afterEach)

beforeEach(() => {
  resetFakeCheckNoteEngraver()
})

afterEach(() => {
  document.body.innerHTML = ''
})

// @test-link [[rule_controller_connects_between_sessions]]
describe('ConnectionSheet Requesting access', () => {
  it('shows Checking while the request resolves with no browser prompt, focus on Close', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.setPermission('granted')
    rig.midi.holdNextRequest()

    const wrapper = await openSheet(rig)

    expect(title(wrapper)).toBe('Connecting…')
    expect(bodyLines(wrapper)).toEqual(['Looking for your controller…'])
    expect(wrapper.find('.sheet-actions').exists()).toBe(false)
    expect(document.activeElement).toBe(closeButton(wrapper))
  })

  it("shows Waiting for your browser while the browser's own prompt waits, focus on Close", async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.holdNextRequest()

    const wrapper = await openSheet(rig)

    expect(title(wrapper)).toBe('Allow MIDI access')
    expect(bodyLines(wrapper)).toEqual([
      'Your browser is asking whether this page may use MIDI devices. Choose Allow in its prompt, near the address bar.',
      'You can also close this and practice without a controller.',
    ])
    expect(wrapper.get('.sheet-body p:last-child').classes()).toContain('sheet-hint')
    expect(wrapper.find('.sheet-actions').exists()).toBe(false)
    expect(document.activeElement).toBe(closeButton(wrapper))
  })

  it('is a modal dialog named by its title, with an always-enabled Close', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.holdNextRequest()

    const wrapper = await openSheet(rig)

    const dialog = wrapper.get('.sheet-backdrop > .sheet')
    expect(dialog.attributes()).toMatchObject({
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'sheet-title',
    })
    expect(wrapper.get('#sheet-title').classes()).toContain('sheet-title')
    expect(closeButton(wrapper).textContent?.trim()).toBe('Close')
    expect(closeButton(wrapper).classList.contains('btn')).toBe(true)
    expect(closeButton(wrapper).disabled).toBe(false)
  })
})

// @test-link [[rule_chromium_only_support]]
describe('ConnectionSheet Unsupported browser', () => {
  it('explains, offers only Continue without a controller as the focused main action', async () => {
    const rig = createControllerRig({ supported: false })

    const wrapper = await openSheet(rig)

    expect(title(wrapper)).toBe("Controller connection isn't available here")
    expect(bodyLines(wrapper)).toEqual([
      "This browser can't see MIDI controllers. Practicing without one works exactly the same.",
      'To use a controller, open Infinite Flow in a Chromium-based browser such as Chrome or Edge.',
    ])
    expect(wrapper.get('.sheet-body p:last-child').classes()).toContain('sheet-hint')
    expect(wrapper.find('.status-dot').exists()).toBe(false)
    expect(actionLabels(wrapper)).toEqual(['Continue without a controller'])
    expect(primaryLabels(wrapper)).toEqual(['Continue without a controller'])
    expect(document.activeElement?.textContent).toBe('Continue without a controller')
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
describe('ConnectionSheet Permission denied', () => {
  it('uses the error tone, explains how to allow, focus on Check again', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.denyNextRequest()

    const wrapper = await openSheet(rig)

    expect(title(wrapper)).toBe('MIDI access is blocked')
    expect(wrapper.get('.sheet-body .inline-alert').classes()).toContain('alert-error')
    expect(bodyLines(wrapper)).toEqual([
      "Your browser has blocked MIDI devices for this page, so the app can't ask again by itself.",
      'To allow it: click the site-settings icon at the left of the address bar, set MIDI devices to Allow, then choose Check again.',
    ])
    expect(actionLabels(wrapper)).toEqual(['Check again', 'Continue without a controller'])
    expect(primaryLabels(wrapper)).toEqual(['Check again'])
    expect(document.activeElement?.textContent).toBe('Check again')
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
describe('ConnectionSheet No device found', () => {
  it('uses a neutral notice, focus on Try again', async () => {
    const rig = createControllerRig()

    const wrapper = await openSheet(rig)

    expect(title(wrapper)).toBe('No controller found')
    expect(wrapper.get('.sheet-body .inline-alert').classes()).toContain('alert-notice')
    expect(bodyLines(wrapper)).toEqual([
      'No MIDI controller is plugged in. Plug one in and switch it on, or continue without one.',
    ])
    expect(actionLabels(wrapper)).toEqual(['Try again', 'Continue without a controller'])
    expect(primaryLabels(wrapper)).toEqual(['Try again'])
    expect(document.activeElement?.textContent).toBe('Try again')
  })
})

// @test-link [[req_midi_controller_input]]
describe('ConnectionSheet Multi-device picker', () => {
  it('lists the inputs in browser order in a labelled group, focus on the first option', async () => {
    const rig = createControllerRig({ devices: [KEYS_A, PAD_B] })

    const wrapper = await openSheet(rig)

    expect(title(wrapper)).toBe('Choose a controller')
    const group = wrapper.get('.device-picker')
    expect(group.attributes('role')).toBe('group')
    const label = wrapper.get(`#${group.attributes('aria-labelledby')}`)
    expect(label.text()).toBe('Several MIDI devices are plugged in. Choose the one you play.')
    expect(options(wrapper).map((option) => option.textContent)).toEqual(['Keys 49', 'Pad 8'])
    expect(actionLabels(wrapper)).toEqual(['Continue without a controller'])
    expect(primaryLabels(wrapper)).toEqual([])
    expect(document.activeElement).toBe(options(wrapper)[0])
  })
})

// @test-link [[rule_controller_transposition_check]]
describe('ConnectionSheet Transposition check prompt', () => {
  it("engraves the profile's check note and asks for it, focus on Close", async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })

    const wrapper = await openSheet(rig, { profile: BB_TENOR_PROFILE })

    expect(title(wrapper)).toBe('Check your controller')
    expect(fakeCheckNoteEngraver.ensureNotationFonts).toHaveBeenCalledOnce()
    const written = checkWrittenNote(BB_TENOR_PROFILE)
    expect(fakeCheckNoteEngraver.engraveCheckNote).toHaveBeenCalledWith(
      wrapper.get('.check-note').element,
      written,
    )
    expect(wrapper.get('.check-note svg').attributes('data-written-midi')).toBe(String(written))
    expect(bodyLines(wrapper)).toEqual([
      'Play this note on your controller.',
      "Playing it here won't start a session.",
    ])
    expect(wrapper.get('.sheet-body p:last-child').classes()).toContain('sheet-hint')
    expect(wrapper.find('.sheet-actions').exists()).toBe(false)
    expect(document.activeElement).toBe(closeButton(wrapper))
    expect(rig.controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
describe('ConnectionSheet Connected', () => {
  it('names the device beside a success dot, focus on Done', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()

    const wrapper = await openSheet(rig, { openAt: 'connected' })

    expect(title(wrapper)).toBe('Controller connected')
    const dot = wrapper.get('.sheet-body .status-dot')
    expect(dot.classes()).toContain('is-success')
    expect(dot.attributes('aria-hidden')).toBe('true')
    expect(bodyLines(wrapper)).toEqual(['Keys 49 is connected.'])
    expect(actionLabels(wrapper)).toEqual(['Done', 'Run check again', 'Disconnect'])
    expect(primaryLabels(wrapper)).toEqual(['Done'])
    expect(document.activeElement?.textContent).toBe('Done')
  })

  it('offers Choose a different device once more than one input has been seen', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()

    const wrapper = await openSheet(rig, { openAt: 'connected', seenDeviceCount: 2 })

    expect(actionLabels(wrapper)).toEqual([
      'Done',
      'Run check again',
      'Choose a different device',
      'Disconnect',
    ])
  })

  it('shows Choose a different device as soon as the seen count passes one', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()
    const wrapper = await openSheet(rig, { openAt: 'connected' })

    await wrapper.setProps({ seenDeviceCount: 2 })

    expect(actionLabels(wrapper)).toContain('Choose a different device')
  })

  it('never uses the error button tone in any action', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()

    const wrapper = await openSheet(rig, { openAt: 'connected', seenDeviceCount: 2 })

    expect(wrapper.findAll('.btn-error')).toHaveLength(0)
    expect(wrapper.findAll('.sheet-actions button').every((b) => b.classes('btn'))).toBe(true)
  })
})
