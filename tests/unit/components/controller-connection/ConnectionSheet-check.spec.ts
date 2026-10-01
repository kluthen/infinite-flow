/**
 * The connection sheet's transposition check (screen handoff, Transposition check and Check result
 * copy): the first played note gives the result, Continue and Run check again, and a played note
 * doing nothing else while the sheet is open.
 */
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkWrittenNote } from '@/domain/controller-check/transposition-check'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import { BB_TENOR_PROFILE, C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import { createControllerRig, KEYS_A, type ControllerRig } from '../../midi/midi-controller-rig'
import {
  action,
  actionLabels,
  bodyLines,
  clickAction,
  closeButton,
  closed,
  openSheet,
  primaryLabels,
  resultLines,
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

/** Intent: the concert pitch a correctly set controller sends for the profile's check note. */
function expectedConcert(profile: InstrumentProfile): number {
  return checkWrittenNote(profile) - profile.transposition.chromatic
}

/** Intent: play one note on KEYS_A, then let the sheet react and move focus. */
async function play(rig: ControllerRig, pitch: number, at = 1): Promise<void> {
  rig.midi.noteOn(KEYS_A.id, pitch, 90, rig.at(at))
  await flushPromises()
}

// @test-link [[rule_controller_transposition_check]]
describe('ConnectionSheet check result', () => {
  it('shows a match with its result, actions Continue and Run check again, focus on Continue', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig)

    await play(rig, expectedConcert(C_KEYBOARD_PROFILE))

    expect(title(wrapper)).toBe('Check your controller')
    expect(wrapper.find('.check-note').exists()).toBe(true)
    expect(resultLines(wrapper)).toEqual([
      'Your controller matches the C MIDI keyboard profile.',
      "Nothing to change — you're ready to play.",
    ])
    expect(wrapper.findAll('.sheet-body > .inline-alert')).toHaveLength(1)
    expect(bodyLines(wrapper)).toHaveLength(1)
    expect(actionLabels(wrapper)).toEqual(['Continue', 'Run check again'])
    expect(primaryLabels(wrapper)).toEqual(['Continue'])
    expect(document.activeElement).toBe(action(wrapper, 'Continue'))
  })

  it('words an offset with the other profile that would match (tenor, untransposed controller)', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig, { profile: BB_TENOR_PROFILE })

    await play(rig, checkWrittenNote(BB_TENOR_PROFILE))

    expect(resultLines(wrapper)).toEqual([
      'Your controller sounds 14 semitones (1 octave and 2) higher than the B-flat tenor saxophone profile expects.',
      "Change your controller's transpose setting so it plays 14 semitones (1 octave and 2) lower, then run the check again.",
      'If you actually play the C MIDI keyboard, choose the C MIDI keyboard instrument profile instead — no controller change needed.',
    ])
    expect(actionLabels(wrapper)).toEqual(['Continue', 'Run check again'])
  })

  it('words whole octaves with no profile suggestion', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig)

    await play(rig, expectedConcert(C_KEYBOARD_PROFILE) - 12)

    expect(resultLines(wrapper)).toEqual([
      'Your controller sounds 1 octave lower than the C MIDI keyboard profile expects.',
      "Change your controller's octave setting so it plays 1 octave higher, then run the check again.",
    ])
  })

  it('takes only the first played note; a later one changes nothing', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig)
    await play(rig, expectedConcert(C_KEYBOARD_PROFILE))

    await play(rig, expectedConcert(C_KEYBOARD_PROFILE) + 3, 2)

    expect(resultLines(wrapper)[0]).toBe('Your controller matches the C MIDI keyboard profile.')
  })
})

// @test-link [[rule_controller_transposition_check]]
describe('ConnectionSheet check actions', () => {
  it('Continue goes to Connected, focus on Done', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig)
    await play(rig, expectedConcert(C_KEYBOARD_PROFILE))

    await clickAction(wrapper, 'Continue')

    expect(title(wrapper)).toBe('Controller connected')
    expect(bodyLines(wrapper)).toEqual(['Keys 49 is connected.'])
    expect(document.activeElement).toBe(action(wrapper, 'Done'))
  })

  it('Run check again returns to the prompt for the same device, then takes a new note', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig)
    await play(rig, expectedConcert(C_KEYBOARD_PROFILE) + 2)

    await clickAction(wrapper, 'Run check again')
    expect(bodyLines(wrapper)).toEqual([
      'Play this note on your controller.',
      "Playing it here won't start a session.",
    ])
    expect(document.activeElement).toBe(closeButton(wrapper))

    await play(rig, expectedConcert(C_KEYBOARD_PROFILE), 2)
    expect(resultLines(wrapper)[0]).toBe('Your controller matches the C MIDI keyboard profile.')
  })

  it('Run check again from Connected asks for nothing and re-checks the connected device', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()
    const wrapper = await openSheet(rig, { openAt: 'connected' })
    const requests = rig.midi.requestCount()
    const opens = rig.midi.openCount(KEYS_A.id)

    await clickAction(wrapper, 'Run check again')

    expect(title(wrapper)).toBe('Check your controller')
    expect(fakeCheckNoteEngraver.engraveCheckNote).toHaveBeenCalledOnce()
    expect(rig.midi.requestCount()).toBe(requests)
    expect(rig.midi.openCount(KEYS_A.id)).toBe(opens)
    expect(document.activeElement).toBe(closeButton(wrapper))
  })
})

// @test-link [[rule_controller_transposition_check]]
describe('ConnectionSheet played notes', () => {
  it('consumes a note only for the check: at Connected a played note changes nothing', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()
    const wrapper = await openSheet(rig, { openAt: 'connected' })
    const before = wrapper.html()

    await play(rig, 60)

    expect(wrapper.html()).toBe(before)
    expect(closed(wrapper)).toBe(false)
  })

  it('turns the check note into its result only, emitting nothing to the host', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig)

    await play(rig, expectedConcert(C_KEYBOARD_PROFILE))

    expect(resultLines(wrapper)).toHaveLength(2)
    expect(wrapper.emitted('close')).toBeUndefined()
  })
})
