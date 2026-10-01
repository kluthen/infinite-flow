/**
 * The connection sheet as a modal dialog: every dismiss path (Close, Escape, backdrop, Continue
 * without a controller, Done, Disconnect), the focus trap, and focus following every state change
 * (screen handoff, Named actions and Focus Management).
 */
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createControllerRig, KEYS_A, PAD_B } from '../../midi/midi-controller-rig'
import {
  action,
  clickAction,
  closeButton,
  closed,
  openSheet,
  options,
  press,
  title,
} from './connection-sheet-rig'
import { resetFakeCheckNoteEngraver } from './fake-check-note-engraver'

vi.mock('@/notation/vexflow-engraver-loader', () => import('./fake-check-note-engraver'))

enableAutoUnmount(afterEach)

beforeEach(() => {
  resetFakeCheckNoteEngraver()
})

afterEach(() => {
  document.body.innerHTML = ''
})

// @test-link [[rule_controller_connects_between_sessions]]
describe('ConnectionSheet dismiss paths', () => {
  it('closes from the Close button', async () => {
    const rig = createControllerRig()
    const wrapper = await openSheet(rig)

    closeButton(wrapper).click()
    await flushPromises()

    expect(closed(wrapper)).toBe(true)
  })

  it('closes on Escape', async () => {
    const rig = createControllerRig()
    const wrapper = await openSheet(rig)

    await press('Escape')

    expect(closed(wrapper)).toBe(true)
  })

  it('closes on a click on the backdrop itself, never on a click inside the sheet', async () => {
    const rig = createControllerRig()
    const wrapper = await openSheet(rig)

    await wrapper.get('.sheet-body').trigger('click')
    await wrapper.get('.sheet').trigger('click')
    expect(closed(wrapper)).toBe(false)

    await wrapper.get('.sheet-backdrop').trigger('click')
    expect(closed(wrapper)).toBe(true)
  })

  it('closes from Continue without a controller', async () => {
    const rig = createControllerRig()
    const wrapper = await openSheet(rig)

    await clickAction(wrapper, 'Continue without a controller')

    expect(closed(wrapper)).toBe(true)
  })

  it('abandons the attempt when closed while the browser prompt waits: a late allow selects nothing', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.holdNextRequest()
    const wrapper = await openSheet(rig)

    await press('Escape')
    expect(closed(wrapper)).toBe(true)
    rig.midi.releaseHeldRequest()
    await flushPromises()

    expect(rig.controller.state()).toEqual({ kind: 'choosing' })
  })

  it('Done closes and keeps the connection', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()
    const wrapper = await openSheet(rig, { openAt: 'connected' })

    await clickAction(wrapper, 'Done')

    expect(closed(wrapper)).toBe(true)
    expect(rig.controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })

  it('Disconnect releases the device and closes', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()
    const wrapper = await openSheet(rig, { openAt: 'connected' })

    await clickAction(wrapper, 'Disconnect')

    expect(closed(wrapper)).toBe(true)
    expect(rig.controller.state().kind).not.toBe('connected')
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
describe('ConnectionSheet focus trap', () => {
  it('cycles Tab through Close and the actions, wrapping both ways', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()
    const wrapper = await openSheet(rig, { openAt: 'connected', seenDeviceCount: 2 })
    const order = [
      closeButton(wrapper),
      action(wrapper, 'Done'),
      action(wrapper, 'Run check again'),
      action(wrapper, 'Choose a different device'),
      action(wrapper, 'Disconnect'),
    ]
    expect(document.activeElement).toBe(order[1])

    for (const expected of [order[2], order[3], order[4], order[0], order[1]]) {
      await press('Tab')
      expect(document.activeElement).toBe(expected)
    }
    for (const expected of [order[0], order[4], order[3]]) {
      await press('Tab', { shiftKey: true })
      expect(document.activeElement).toBe(expected)
    }
  })

  it('includes the picker tab stop between Close and the actions', async () => {
    const rig = createControllerRig({ devices: [KEYS_A, PAD_B] })
    const wrapper = await openSheet(rig)
    const [first] = options(wrapper)

    await press('Tab')
    expect(document.activeElement).toBe(action(wrapper, 'Continue without a controller'))
    await press('Tab')
    expect(document.activeElement).toBe(closeButton(wrapper))
    await press('Tab')
    expect(document.activeElement).toBe(first)
  })

  it('keeps Close the only stop when the state has no action', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.holdNextRequest()
    const wrapper = await openSheet(rig)

    await press('Tab')
    expect(document.activeElement).toBe(closeButton(wrapper))
    await press('Tab', { shiftKey: true })
    expect(document.activeElement).toBe(closeButton(wrapper))
  })

  it('brings focus that left the sheet back into it', async () => {
    const rig = createControllerRig()
    const wrapper = await openSheet(rig)
    ;(document.activeElement as HTMLElement).blur()

    await press('Tab')

    expect(wrapper.get('.sheet').element.contains(document.activeElement)).toBe(true)
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
describe('ConnectionSheet focus on state changes', () => {
  it('Check again goes back to Requesting access (focus on Close), then on to the result state', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.denyNextRequest()
    const wrapper = await openSheet(rig)
    rig.midi.setPermission('granted')
    rig.midi.holdNextRequest()

    await clickAction(wrapper, 'Check again')
    expect(title(wrapper)).toBe('Connecting…')
    expect(document.activeElement).toBe(closeButton(wrapper))
    expect(rig.midi.requestCount()).toBe(2)

    rig.midi.releaseHeldRequest()
    await flushPromises()
    expect(title(wrapper)).toBe('Check your controller')
    expect(document.activeElement).toBe(closeButton(wrapper))
  })

  it('Check again lands back on Permission denied when the browser still refuses', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.denyNextRequest()
    const wrapper = await openSheet(rig)
    rig.midi.denyNextRequest()

    await clickAction(wrapper, 'Check again')

    expect(title(wrapper)).toBe('MIDI access is blocked')
    expect(document.activeElement).toBe(action(wrapper, 'Check again'))
  })

  it('Try again with still nothing plugged in returns to No device found, focus on Try again', async () => {
    const rig = createControllerRig()
    const wrapper = await openSheet(rig)

    await clickAction(wrapper, 'Try again')

    expect(title(wrapper)).toBe('No controller found')
    expect(document.activeElement).toBe(action(wrapper, 'Try again'))
  })

  it('Choose a different device opens the picker, focus on its tab stop', async () => {
    const rig = createControllerRig({ devices: [KEYS_A, PAD_B] })
    await rig.controller.connect()
    await rig.controller.select(PAD_B.id)
    const wrapper = await openSheet(rig, { openAt: 'connected', seenDeviceCount: 2 })

    await clickAction(wrapper, 'Choose a different device')

    expect(title(wrapper)).toBe('Choose a controller')
    expect(document.activeElement).toBe(options(wrapper)[1])
  })
})
