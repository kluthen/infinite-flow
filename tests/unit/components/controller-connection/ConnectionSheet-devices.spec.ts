/**
 * The connection sheet's device picker (roving tab stop, arrows, choosing, the device in use) and
 * how the sheet follows the inputs the browser reports while it is open (screen handoff, Device
 * changes while the sheet is open).
 */
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createControllerRig, KEYS_A, KEYS_A2, PAD_B } from '../../midi/midi-controller-rig'
import {
  action,
  bodyLines,
  closeButton,
  openSheet,
  optionLabels,
  options,
  press,
  title,
  type SheetWrapper,
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

/** Intent: each option's tabindex, in markup order. */
function tabStops(wrapper: SheetWrapper): (string | null)[] {
  return options(wrapper).map((option) => option.getAttribute('tabindex'))
}

/** Intent: click the picker option at `index`, then let the sheet react. */
async function choose(wrapper: SheetWrapper, index: number): Promise<void> {
  const option = options(wrapper)[index]
  if (option === undefined) throw new Error(`no picker option at ${index}`)
  option.click()
  await flushPromises()
}

// @test-link [[req_midi_controller_input]]
describe('ConnectionSheet device picker keyboard', () => {
  it('moves one roving tab stop with the arrows, never past the ends, never choosing', async () => {
    const rig = createControllerRig({ devices: [KEYS_A, KEYS_A2, PAD_B] })
    const wrapper = await openSheet(rig)
    const [first, second, third] = options(wrapper)
    expect(tabStops(wrapper)).toEqual(['0', '-1', '-1'])

    await press('ArrowDown')
    expect(document.activeElement).toBe(second)
    expect(tabStops(wrapper)).toEqual(['-1', '0', '-1'])
    await press('ArrowRight')
    expect(document.activeElement).toBe(third)
    await press('ArrowDown')
    expect(document.activeElement).toBe(third)
    await press('ArrowUp')
    expect(document.activeElement).toBe(second)
    await press('ArrowLeft')
    expect(document.activeElement).toBe(first)
    await press('ArrowUp')
    expect(document.activeElement).toBe(first)

    expect(title(wrapper)).toBe('Choose a controller')
    expect(rig.controller.state()).toEqual({ kind: 'choosing' })
  })

  it('a click chooses the option and goes straight to its check, selecting it', async () => {
    const rig = createControllerRig({ devices: [KEYS_A, PAD_B] })
    const wrapper = await openSheet(rig)

    await choose(wrapper, 1)

    expect(title(wrapper)).toBe('Check your controller')
    expect(rig.controller.state()).toEqual({ kind: 'connected', device: PAD_B })
    expect(document.activeElement).toBe(closeButton(wrapper))
  })
})

// @test-link [[req_midi_controller_input]]
describe('ConnectionSheet device picker from Connected', () => {
  it('marks the device in use, which holds the tab stop; choosing it re-runs its check', async () => {
    const rig = createControllerRig({ devices: [KEYS_A, PAD_B] })
    await rig.controller.connect()
    await rig.controller.select(PAD_B.id)
    const wrapper = await openSheet(rig, { openAt: 'connected', seenDeviceCount: 2 })
    action(wrapper, 'Choose a different device').click()
    await flushPromises()

    expect(optionLabels(wrapper)).toEqual(['Keys 49', 'Pad 8 (in use)'])
    expect(options(wrapper).map((o) => o.classList.contains('is-selected'))).toEqual([false, true])
    expect(tabStops(wrapper)).toEqual(['-1', '0'])
    const opens = rig.midi.openCount(PAD_B.id)

    await choose(wrapper, 1)

    expect(title(wrapper)).toBe('Check your controller')
    expect(rig.midi.openCount(PAD_B.id)).toBe(opens)
  })
})

// @test-link [[rule_same_controller_reattaches]]
describe('ConnectionSheet device changes in the picker', () => {
  it('appends a device plugged in at the end', async () => {
    const rig = createControllerRig({ devices: [KEYS_A, PAD_B] })
    const wrapper = await openSheet(rig)

    rig.midi.plug(KEYS_A2)
    await flushPromises()

    expect(optionLabels(wrapper)).toEqual(['Keys 49', 'Pad 8', 'Keys 49'])
    expect(document.activeElement).toBe(options(wrapper)[0])
  })

  it('moves focus to the next option when the focused one is unplugged', async () => {
    const rig = createControllerRig({ devices: [KEYS_A, KEYS_A2, PAD_B] })
    const wrapper = await openSheet(rig)
    await press('ArrowDown')

    rig.midi.unplug(KEYS_A2.id, rig.at(1))
    await flushPromises()

    expect(optionLabels(wrapper)).toEqual(['Keys 49', 'Pad 8'])
    expect(document.activeElement).toBe(options(wrapper)[1])
    expect(tabStops(wrapper)).toEqual(['-1', '0'])
  })

  it('moves focus to the previous option when the focused last one is unplugged', async () => {
    const rig = createControllerRig({ devices: [KEYS_A, KEYS_A2, PAD_B] })
    const wrapper = await openSheet(rig)
    await press('ArrowDown')
    await press('ArrowDown')

    rig.midi.unplug(PAD_B.id, rig.at(1))
    await flushPromises()

    expect(optionLabels(wrapper)).toEqual(['Keys 49', 'Keys 49'])
    expect(document.activeElement).toBe(options(wrapper)[1])
  })

  it('leaves focus alone when an unfocused option is unplugged, and keeps a one-option picker', async () => {
    const rig = createControllerRig({ devices: [KEYS_A, PAD_B] })
    const wrapper = await openSheet(rig)

    rig.midi.unplug(PAD_B.id, rig.at(1))
    await flushPromises()

    expect(title(wrapper)).toBe('Choose a controller')
    expect(optionLabels(wrapper)).toEqual(['Keys 49'])
    expect(document.activeElement).toBe(options(wrapper)[0])
  })

  it('becomes No device found once the last option is unplugged, focus on Try again', async () => {
    const rig = createControllerRig({ devices: [KEYS_A, PAD_B] })
    const wrapper = await openSheet(rig)

    rig.midi.unplug(KEYS_A.id, rig.at(1))
    rig.midi.unplug(PAD_B.id, rig.at(1))
    await flushPromises()

    expect(title(wrapper)).toBe('No controller found')
    expect(document.activeElement).toBe(action(wrapper, 'Try again'))
  })
})

// @test-link [[rule_same_controller_reattaches]]
describe('ConnectionSheet device changes around the chosen device', () => {
  it('No device found moves on by itself when a device is plugged in', async () => {
    const rig = createControllerRig()
    const wrapper = await openSheet(rig)

    rig.midi.plug(KEYS_A)
    await flushPromises()

    expect(title(wrapper)).toBe('Check your controller')
    expect(rig.controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })

  it('unplugged mid-check: the picker with the device-change line; back: the check again', async () => {
    const rig = createControllerRig({ devices: [KEYS_A, PAD_B] })
    const wrapper = await openSheet(rig)
    await choose(wrapper, 0)

    rig.midi.unplug(KEYS_A.id, rig.at(1))
    await flushPromises()
    expect(title(wrapper)).toBe('Choose a controller')
    const line = wrapper.get('.sheet-body > :first-child')
    expect(line.classes()).toEqual(['inline-alert', 'alert-notice'])
    expect(line.text()).toBe('Keys 49 was unplugged.')
    expect(optionLabels(wrapper)).toEqual(['Pad 8'])
    expect(document.activeElement).toBe(options(wrapper)[0])

    rig.midi.plug(KEYS_A)
    await flushPromises()
    expect(title(wrapper)).toBe('Check your controller')
    expect(bodyLines(wrapper)).toEqual([
      'Play this note on your controller.',
      "Playing it here won't start a session.",
    ])
  })

  it('unplugged at Connected with none left: No device found with the line; back: Connected', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()
    const wrapper = await openSheet(rig, { openAt: 'connected' })

    rig.midi.unplug(KEYS_A.id, rig.at(1))
    await flushPromises()
    expect(title(wrapper)).toBe('No controller found')
    expect(bodyLines(wrapper)).toEqual([
      'Keys 49 was unplugged.',
      'No MIDI controller is plugged in. Plug one in and switch it on, or continue without one.',
    ])
    expect(document.activeElement).toBe(action(wrapper, 'Try again'))

    rig.midi.plug(KEYS_A)
    await flushPromises()
    expect(title(wrapper)).toBe('Controller connected')
    expect(bodyLines(wrapper)).toEqual(['Keys 49 is connected.'])
    expect(document.activeElement).toBe(action(wrapper, 'Done'))
  })

  it('shows no change at Connected when another device is plugged in', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()
    const wrapper = await openSheet(rig, { openAt: 'connected' })
    const before = wrapper.html()

    rig.midi.plug(PAD_B)
    await flushPromises()

    expect(wrapper.html()).toBe(before)
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
describe('ConnectionSheet device changes before access resolves', () => {
  it('Permission denied ignores a device plugged in', async () => {
    const rig = createControllerRig()
    rig.midi.denyNextRequest()
    const wrapper = await openSheet(rig)

    rig.midi.plug(KEYS_A)
    await flushPromises()

    expect(title(wrapper)).toBe('MIDI access is blocked')
  })

  it('Requesting access resolves with the inputs present when access is granted', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.holdNextRequest()
    const wrapper = await openSheet(rig)

    rig.midi.plug(PAD_B)
    await flushPromises()
    expect(title(wrapper)).toBe('Allow MIDI access')

    rig.midi.releaseHeldRequest()
    await flushPromises()
    expect(title(wrapper)).toBe('Choose a controller')
    expect(optionLabels(wrapper)).toEqual(['Keys 49', 'Pad 8'])
  })
})
