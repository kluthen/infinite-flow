/**
 * The connection sheet's `Use and erase` (screens/controller-connection/handoff.md, States: Use for
 * my instrument, In a tab that must be reloaded): when my instrument has kept sessions and the use
 * changes its transposition, the confirmation names them and its action, destructive, waits for
 * its batch with the counted sessions; the way back does nothing while it runs; a refusal keeps it
 * with its error line; saving off returns to the result. In a tab that must be reloaded, the use is
 * not offered and the result says why.
 */
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConnectionSheetSessionsProps } from '@/components/controller-connection/connection-sheet-contract'
import type { MyInstrumentBatchOutcome } from '@/components/workspace/use-my-instrument-sheet'
import type { MyInstrumentSessionCount } from '@/components/workspace/workspace-session-controller-types'
import { checkWrittenNote } from '@/domain/controller-check/transposition-check'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import { makeMyInstrument, type MyInstrument } from '@/domain/profile/my-instrument'
import { createControllerRig, KEYS_A, type ControllerRig } from '../../midi/midi-controller-rig'
import {
  action,
  actionLabels,
  bodyLines,
  clickAction,
  openSheet,
  press,
  resultLines,
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

const USE_THIS = 'Use this for my instrument'
const ERASE = 'Use and erase'

/** A my instrument made from the alto, sounding 9 semitones lower, not selected. */
const HOME_ALTO: MyInstrument = makeMyInstrument({
  template: 'eb-alto',
  name: 'Home alto',
  clef: 'bass',
  writtenRange: { minMidi: 40, maxMidi: 64 },
  transposition: { octaves: 0, semitones: 9, direction: 'lower' },
})

/** Intent: `count` counted sessions of my instrument. */
function sessions(count: number, facts: Partial<MyInstrumentSessionCount> = {}) {
  return {
    count,
    reviewed: false,
    withheld: false,
    deletes: () => Promise.resolve([]),
    leave: () => undefined,
    stay: () => undefined,
    ...facts,
  }
}

/** Intent: play, on KEYS_A, the note `offset` semitones off what `profile` expects; let it react. */
async function playOff(rig: ControllerRig, profile: InstrumentProfile, offset: number) {
  const expected = checkWrittenNote(profile) - profile.transposition.chromatic
  rig.midi.noteOn(KEYS_A.id, expected + offset, 90, rig.at(1))
  await flushPromises()
}

/** Intent: the sheet over HOME_ALTO and `counted`, at a keyboard result 14 semitones low. */
async function atResult(
  counted: MyInstrumentSessionCount,
  outcome: () => Promise<MyInstrumentBatchOutcome> = () => Promise.resolve('done'),
) {
  const rig = createControllerRig({ devices: [KEYS_A] })
  const useAndErase = vi.fn<ConnectionSheetSessionsProps['useAndErase']>(() => outcome())
  const wrapper = await openSheet(rig, {
    profile: C_KEYBOARD_PROFILE,
    myInstrument: HOME_ALTO,
    myInstrumentSessions: counted,
    useAndErase,
  })
  await playOff(rig, C_KEYBOARD_PROFILE, -14)
  return { wrapper, useAndErase }
}

// @test-link [[rule_transposition_check_sets_my_instrument]]
// @test-link [[entity_my_instrument_record]]
describe('ConnectionSheet: Use and erase', () => {
  it('names the three sessions, reads Use and erase, and waits for its batch with them', async () => {
    let settle: (outcome: MyInstrumentBatchOutcome) => void = () => undefined
    const counted = sessions(3, { reviewed: true })
    const { wrapper, useAndErase } = await atResult(
      counted,
      () => new Promise((resolve) => (settle = resolve)),
    )
    await clickAction(wrapper, USE_THIS)

    expect(bodyLines(wrapper).slice(2)).toEqual([
      'Changing the transposition erases the 3 sessions played with my instrument, with their favorite phrases, comments and played notes. The session reviewed on screen is one of them, so its review closes.',
      "This can't be undone.",
      'To keep a session, choose Back, close this sheet, then export it from its review.',
    ])
    expect(actionLabels(wrapper)).toEqual([ERASE, 'Back'])
    expect(action(wrapper, ERASE).classList.contains('btn-error')).toBe(true)
    expect(document.activeElement).toBe(action(wrapper, 'Back'))

    await clickAction(wrapper, ERASE)
    expect(useAndErase).toHaveBeenCalledOnce()
    expect(useAndErase.mock.calls[0]?.[1]).toStrictEqual(counted)
    expect(action(wrapper, ERASE).classList.contains('is-loading')).toBe(true)
    await press('Escape')
    await clickAction(wrapper, 'Back')
    expect(title(wrapper)).toBe('Use this for my instrument?')
    // The host saves my instrument while the batch runs: the result becomes a match, and the
    // confirmation keeps showing what it confirmed.
    const saved = useAndErase.mock.calls[0]?.[0]
    if (saved === undefined) throw new Error('no instrument handed to the batch')
    await wrapper.setProps({ myInstrument: saved })
    await flushPromises()
    expect(actionLabels(wrapper)).toEqual([ERASE, 'Back'])
    expect(bodyLines(wrapper)[2]).toContain('erases the 3 sessions')

    settle('done')
    await flushPromises()
    expect(title(wrapper)).toBe('Controller connected')
    expect(wrapper.emitted('use-for-my-instrument')).toBeUndefined()
  })

  it('refused, stays with its error line and tries again', async () => {
    const { wrapper, useAndErase } = await atResult(sessions(1), () => Promise.resolve('refused'))
    await clickAction(wrapper, USE_THIS)
    expect(bodyLines(wrapper)[2]).toBe(
      'Changing the transposition erases the session played with my instrument, with its favorite phrases, comment and played notes.',
    )

    await clickAction(wrapper, ERASE)
    await flushPromises()
    expect(title(wrapper)).toBe('Use this for my instrument?')
    expect(wrapper.get('.alert-error').text()).toBe(
      "That couldn't be saved, and nothing was erased. Try again.",
    )
    await clickAction(wrapper, ERASE)
    expect(useAndErase).toHaveBeenCalledTimes(2)
  })

  it('saving off returns to the result, focus on Continue', async () => {
    const { wrapper } = await atResult(sessions(2), () => Promise.resolve('saving-off'))
    await clickAction(wrapper, USE_THIS)
    await clickAction(wrapper, ERASE)
    await flushPromises()

    expect(title(wrapper)).toBe('Check your controller')
  })

  it('with no session, or no change of its transposition, the use erases nothing', async () => {
    const { wrapper } = await atResult(sessions(0))
    await clickAction(wrapper, USE_THIS)
    expect(actionLabels(wrapper)).toEqual(['Use for my instrument', 'Back'])
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('in a tab that must be reloaded, the use is not offered and the result says why', async () => {
    const { wrapper } = await atResult(sessions(3, { withheld: true }))

    expect(actionLabels(wrapper)).toEqual(['Continue', 'Run check again'])
    expect(resultLines(wrapper).at(-1)).toBe(
      'To use this for Home alto, reload the page first: changing its transposition would erase the sessions played with my instrument.',
    )
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('the tab turning outdated while the confirmation shows returns to the result, erasing nothing', async () => {
    const { wrapper, useAndErase } = await atResult(sessions(3))
    await clickAction(wrapper, USE_THIS)

    await wrapper.setProps({ myInstrumentSessions: sessions(3, { withheld: true }) })
    await flushPromises()

    expect(title(wrapper)).toBe('Check your controller')
    expect(document.activeElement).toBe(action(wrapper, 'Continue'))
    expect(useAndErase).not.toHaveBeenCalled()
  })
})
