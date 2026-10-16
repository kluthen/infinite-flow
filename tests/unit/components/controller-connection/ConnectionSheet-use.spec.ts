/**
 * The connection sheet's `Use this for my instrument` (screens/controller-connection/handoff.md,
 * States, Named actions, Focus Management, Check result copy): offered on a result that is not a
 * match and absent when the instrument would sound outside the MIDI note range; the Use for my
 * instrument confirmation and its copy; `Back`, Escape, the backdrop and `Close` returning to the
 * result; and the confirmed use handing my instrument to the host and reaching Connected with its
 * line.
 */
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkWrittenNote } from '@/domain/controller-check/transposition-check'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import { BB_TENOR_PROFILE, C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import { makeMyInstrument, type MyInstrument } from '@/domain/profile/my-instrument'
import { createControllerRig, KEYS_A, type ControllerRig } from '../../midi/midi-controller-rig'
import {
  action,
  actionLabels,
  bodyLines,
  clickAction,
  closeButton,
  closed,
  openSheet,
  press,
  primaryLabels,
  resultLines,
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

const USE_THIS = 'Use this for my instrument'
const USE = 'Use for my instrument'

/** A my instrument made from the alto, under its own name, sounding 9 semitones lower. */
const HOME_ALTO: MyInstrument = makeMyInstrument({
  template: 'eb-alto',
  name: 'Home alto',
  clef: 'bass',
  writtenRange: { minMidi: 40, maxMidi: 64 },
  transposition: { octaves: 0, semitones: 9, direction: 'lower' },
})

/** Intent: play, on KEYS_A, the note `offset` semitones off what `profile` expects; let it react. */
async function playOff(rig: ControllerRig, profile: InstrumentProfile, offset: number) {
  const expected = checkWrittenNote(profile) - profile.transposition.chromatic
  rig.midi.noteOn(KEYS_A.id, expected + offset, 90, rig.at(1))
  await flushPromises()
}

/** Intent: the instruments the sheet handed its host to save, in order. */
function used(wrapper: SheetWrapper): MyInstrument[] {
  return (wrapper.emitted('use-for-my-instrument') ?? []).map(
    ([instrument]) => instrument as MyInstrument,
  )
}

// @test-link [[rule_transposition_check_sets_my_instrument]]
describe('ConnectionSheet: Use this for my instrument on a result', () => {
  it('is offered after Continue on a result that is not a match, as a plain action', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig, { profile: BB_TENOR_PROFILE })

    await playOff(rig, BB_TENOR_PROFILE, 2)

    expect(actionLabels(wrapper)).toEqual(['Continue', USE_THIS, 'Run check again'])
    expect(primaryLabels(wrapper)).toEqual(['Continue'])
    expect(document.activeElement).toBe(action(wrapper, 'Continue'))
  })

  it('is absent on a match', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig, { profile: BB_TENOR_PROFILE })

    await playOff(rig, BB_TENOR_PROFILE, 0)

    expect(actionLabels(wrapper)).toEqual(['Continue', 'Run check again'])
  })

  it('is absent, the result otherwise unchanged, when the instrument would sound above MIDI note 127', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig, { profile: BB_TENOR_PROFILE })

    await playOff(rig, BB_TENOR_PROFILE, 60)

    expect(actionLabels(wrapper)).toEqual(['Continue', 'Run check again'])
    expect(resultLines(wrapper)[0]).toBe(
      'Your controller sounds 5 octaves higher than the B-flat tenor saxophone profile expects.',
    )
  })

  it('with my instrument selected, the result names it', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig, {
      profile: HOME_ALTO.profile,
      clef: 'bass',
      myInstrument: HOME_ALTO,
    })

    await playOff(rig, HOME_ALTO.profile, 2)

    expect(resultLines(wrapper)[0]).toBe(
      'Your controller sounds 2 semitones higher than your instrument, Home alto, expects.',
    )
    expect(actionLabels(wrapper)).toEqual(['Continue', USE_THIS, 'Run check again'])
  })
})

// @test-link [[rule_transposition_check_sets_my_instrument]]
describe('ConnectionSheet: the Use for my instrument confirmation', () => {
  it('the worked example: none yet, the tenor, a controller sending the written note', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig, { profile: BB_TENOR_PROFILE })
    await playOff(rig, BB_TENOR_PROFILE, 14)

    await clickAction(wrapper, USE_THIS)

    expect(title(wrapper)).toBe('Use this for my instrument?')
    expect(wrapper.find('.check-note').exists()).toBe(false)
    expect(bodyLines(wrapper)).toEqual([
      'No transposition: a written C4 will sound as C4.',
      "My instrument will be made from the B-flat tenor saxophone profile, named My instrument, in treble clef, with that profile's range: C4 to C6 in written notes.",
      'You can change it later with Edit my instrument.',
    ])
    expect(wrapper.get('.sheet-body > p:last-child').classes()).toContain('sheet-hint')
    expect(actionLabels(wrapper)).toEqual([USE, 'Back'])
    expect(primaryLabels(wrapper)).toEqual([USE])
    expect(wrapper.findAll('.btn-error')).toHaveLength(0)
    expect(document.activeElement).toBe(action(wrapper, 'Back'))
    expect(used(wrapper)).toEqual([])
  })

  it('names an existing my instrument that is not selected, and that it becomes the selection', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig, { profile: C_KEYBOARD_PROFILE, myInstrument: HOME_ALTO })
    await playOff(rig, C_KEYBOARD_PROFILE, -14)

    await clickAction(wrapper, USE_THIS)

    expect(bodyLines(wrapper)).toEqual([
      'A major ninth lower (an octave and a major second): a written C4 will sound as B♭2.',
      'Home alto keeps its range, E2 to E4 in written notes, and its clef, and becomes the selected instrument.',
    ])
  })

  it('Back returns to the result, nothing changed, focus on Use this for my instrument', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig, { profile: BB_TENOR_PROFILE })
    await playOff(rig, BB_TENOR_PROFILE, 2)
    await clickAction(wrapper, USE_THIS)

    await clickAction(wrapper, 'Back')

    expect(title(wrapper)).toBe('Check your controller')
    expect(resultLines(wrapper)[0]).toBe(
      'Your controller sounds 2 semitones higher than the B-flat tenor saxophone profile expects.',
    )
    expect(document.activeElement).toBe(action(wrapper, USE_THIS))
    expect(used(wrapper)).toEqual([])
    expect(closed(wrapper)).toBe(false)
  })

  it('Escape and Close return to the result too; a second Escape then closes the sheet', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig, { profile: BB_TENOR_PROFILE })
    await playOff(rig, BB_TENOR_PROFILE, 2)
    await clickAction(wrapper, USE_THIS)

    await press('Escape')
    expect(title(wrapper)).toBe('Check your controller')
    expect(closed(wrapper)).toBe(false)

    await clickAction(wrapper, USE_THIS)
    closeButton(wrapper).click()
    await flushPromises()
    expect(title(wrapper)).toBe('Check your controller')
    expect(closed(wrapper)).toBe(false)

    await press('Escape')
    expect(closed(wrapper)).toBe(true)
    expect(used(wrapper)).toEqual([])
  })

  it('Use for my instrument hands my instrument to the host and reaches Connected with its line', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig, { profile: BB_TENOR_PROFILE })
    await playOff(rig, BB_TENOR_PROFILE, 2)
    await clickAction(wrapper, USE_THIS)

    await clickAction(wrapper, USE)

    const [instrument] = used(wrapper)
    expect(used(wrapper)).toHaveLength(1)
    expect(instrument).toMatchObject({
      name: 'My instrument',
      template: 'bb-tenor',
      clef: 'treble',
      writtenRange: { minMidi: 60, maxMidi: 84 },
      transposition: { octaves: 1, semitones: 0, direction: 'lower' },
    })
    expect(title(wrapper)).toBe('Controller connected')
    expect(bodyLines(wrapper)).toEqual([
      'Keys 49 is connected.',
      'My instrument now matches your controller.',
    ])
    expect(document.activeElement).toBe(action(wrapper, 'Done'))
    expect(closed(wrapper)).toBe(false)
  })

  it('a played note does nothing while it shows', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const wrapper = await openSheet(rig, { profile: BB_TENOR_PROFILE })
    await playOff(rig, BB_TENOR_PROFILE, 2)
    await clickAction(wrapper, USE_THIS)

    await playOff(rig, BB_TENOR_PROFILE, 0)

    expect(title(wrapper)).toBe('Use this for my instrument?')
    expect(used(wrapper)).toEqual([])
  })
})
