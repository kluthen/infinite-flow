/**
 * The My instrument sheet with kept sessions of my instrument (screens/my-instrument/handoff.md,
 * States): a range or transposition change opens the erase warning naming them, `Cancel` keeps the
 * edit, `Save and erase` hands exactly the counted sessions to its batch and waits for it; a name
 * or clef change, or no session, saves at once; the delete confirmation names them too; a refusal
 * keeps the warning or confirmation with its error line; saving off returns to the form with the
 * saved range and transposition; in a tab that must be reloaded, the form withholds both changes.
 */
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import MyInstrumentSheet from '@/components/workspace/MyInstrumentSheet.vue'
import type { MyInstrumentBatchOutcome } from '@/components/workspace/use-my-instrument-sheet'
import type { MyInstrumentSessionCount } from '@/components/workspace/workspace-session-controller-types'
import { makeMyInstrument } from '@/domain/profile/my-instrument'

const SAVED = makeMyInstrument({
  template: 'bb-tenor',
  name: 'Low tenor',
  clef: 'bass',
  writtenRange: { minMidi: 40, maxMidi: 64 },
  transposition: { octaves: 1, semitones: 2, direction: 'lower' },
})

/** Intent: `count` counted sessions of my instrument, as the controller counts them. */
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

/** Intent: a batch the test settles when it chooses. */
function held() {
  let settle: (outcome: MyInstrumentBatchOutcome) => void = () => undefined
  const promise = new Promise<MyInstrumentBatchOutcome>((resolve) => {
    settle = resolve
  })
  return { promise, settle }
}

/** Intent: the editing sheet over `counted`, its batches resolving `outcome`. */
function mountSheet(
  counted: MyInstrumentSessionCount = sessions(3),
  outcome: () => Promise<MyInstrumentBatchOutcome> = () => Promise.resolve('done'),
  selected = true,
) {
  const saveAndErase = vi.fn(outcome)
  const remove = vi.fn(outcome)
  const wrapper = mount(MyInstrumentSheet, {
    props: {
      start: { mode: 'editing', saved: SAVED },
      selected,
      sessions: counted,
      saveAndErase,
      remove,
    },
    attachTo: document.body,
  })
  return Object.assign(wrapper, { saveAndErase, remove })
}

type Sheet = ReturnType<typeof mountSheet>

/** Intent: the sheet's button whose text is `label`. */
function button(wrapper: Sheet, label: string) {
  const found = wrapper.findAll('button').find((candidate) => candidate.text() === label)
  if (found === undefined) throw new Error(`no "${label}" button`)
  return found
}

/** Intent: one step of the stepper named `name`, up or down. */
async function step(wrapper: Sheet, name: string, direction: 'up' | 'down'): Promise<void> {
  const stepper = wrapper.get(`[role="spinbutton"][aria-label="${name}"]`)
  await stepper.trigger('keydown', { key: direction === 'up' ? 'ArrowUp' : 'ArrowDown' })
}

/** Intent: the value the stepper named `name` shows. */
function stepperText(wrapper: Sheet, name: string): string | undefined {
  return wrapper.get(`[role="spinbutton"][aria-label="${name}"]`).attributes('aria-valuetext')
}

afterEach(() => {
  document.body.innerHTML = ''
})

// @test-link [[entity_my_instrument_record]]
// @test-link [[req_my_instrument]]
describe('the My instrument sheet with kept sessions of my instrument', () => {
  // @test-link [[entity_my_instrument_record]]
  it('a range change opens the erase warning naming three; Cancel keeps the edit in the form', async () => {
    const wrapper = mountSheet()
    await step(wrapper, 'Highest note', 'up')
    await button(wrapper, 'Save').trigger('click')
    await nextTick()

    expect(wrapper.get('.sheet-title').text()).toBe('Save and erase sessions?')
    expect(wrapper.get('.sheet-body').text()).toContain(
      'Changing the range or the transposition erases the 3 sessions played with this instrument, with their favorite phrases, comments and played notes.',
    )
    expect(wrapper.get('.sheet-body').text()).toContain("This can't be undone.")
    expect(wrapper.get('.sheet-hint').text()).toBe(
      'To keep a session, cancel, then export it from its review first.',
    )
    expect(document.activeElement?.textContent?.trim()).toBe('Cancel')

    await button(wrapper, 'Cancel').trigger('click')
    await nextTick()
    expect(wrapper.get('.sheet-title').text()).toBe('My instrument')
    expect(stepperText(wrapper, 'Highest note')).toBe('F4')
    expect(document.activeElement?.textContent?.trim()).toBe('Save')
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.saveAndErase).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  // @test-link [[entity_my_instrument_record]]
  it('Save and erase hands the counted sessions to the batch, loading and with no way back while it runs', async () => {
    const batch = held()
    const counted = sessions(3, { reviewed: true })
    const wrapper = mountSheet(counted, () => batch.promise)
    await step(wrapper, 'Sounds', 'down')
    await button(wrapper, 'Save').trigger('click')
    await nextTick()
    expect(wrapper.get('.sheet-body').text()).toContain(
      'The session reviewed on screen is one of them, so its review closes.',
    )

    await button(wrapper, 'Save and erase').trigger('click')
    const [[instrument, handed]] = wrapper.saveAndErase.mock.calls as unknown as [
      [ReturnType<typeof makeMyInstrument>, MyInstrumentSessionCount],
    ]
    expect(handed).toStrictEqual(counted)
    expect(instrument.transposition).toEqual({ octaves: 1, semitones: 3, direction: 'lower' })
    expect(button(wrapper, 'Save and erase').classes()).toContain('is-loading')
    await button(wrapper, 'Cancel').trigger('click')
    expect(wrapper.get('.sheet-title').text()).toBe('Save and erase sessions?')

    batch.settle('done')
    wrapper.unmount()
  })

  // @test-link [[entity_my_instrument_record]]
  it('a refused save-and-erase keeps the warning with its error line, and tries again', async () => {
    const wrapper = mountSheet(sessions(1), () => Promise.resolve('refused'))
    await step(wrapper, 'Lowest note', 'down')
    await button(wrapper, 'Save').trigger('click')
    await nextTick()
    expect(wrapper.get('.sheet-body').text()).toContain(
      'Changing the range or the transposition erases the session played with this instrument, with its favorite phrases, comment and played notes.',
    )

    await button(wrapper, 'Save and erase').trigger('click')
    await nextTick()
    expect(wrapper.get('.alert-error').text()).toBe(
      "That couldn't be saved, and nothing was erased. Try again.",
    )
    expect(wrapper.get('.sheet-title').text()).toBe('Save and erase sessions?')
    await button(wrapper, 'Save and erase').trigger('click')
    expect(wrapper.saveAndErase).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('saving off returns to the form, erasing nothing, its range back to the saved one', async () => {
    const wrapper = mountSheet(sessions(3), () => Promise.resolve('saving-off'))
    await step(wrapper, 'Highest note', 'up')
    await button(wrapper, 'Save').trigger('click')
    await nextTick()
    await button(wrapper, 'Save and erase').trigger('click')
    await nextTick()
    await nextTick()

    expect(wrapper.get('.sheet-title').text()).toBe('My instrument')
    expect(stepperText(wrapper, 'Highest note')).toBe('E4')
    expect(document.activeElement?.textContent?.trim()).toBe('Save')
    wrapper.unmount()
  })

  // @test-link [[req_my_instrument]]
  it('a name or clef change, and any change with no session, saves at once', async () => {
    const wrapper = mountSheet()
    await wrapper.get('input.text-input').setValue('Tenor two')
    await wrapper
      .findAll('[role="radio"]')
      .find((radio) => radio.text() === 'Treble clef')
      ?.trigger('click')
    await button(wrapper, 'Save').trigger('click')
    expect(wrapper.emitted('save')).toHaveLength(1)
    wrapper.unmount()

    const none = mountSheet(sessions(0))
    await step(none, 'Highest note', 'up')
    await button(none, 'Save').trigger('click')
    expect(none.emitted('save')).toHaveLength(1)
    expect(none.get('.sheet-title').text()).toBe('My instrument')
    none.unmount()
  })

  // @test-link [[entity_my_instrument_record]]
  it('the delete confirmation names the sessions that go; a refusal keeps it with its error line', async () => {
    const wrapper = mountSheet(sessions(3, { reviewed: true }), () => Promise.resolve('refused'))
    await button(wrapper, 'Delete my instrument').trigger('click')
    await nextTick()

    expect(wrapper.get('.sheet-body p').text()).toBe(
      'Low tenor will be deleted, with its clef, range and transposition. The 3 sessions played with it go too, with their favorite phrases, comments and played notes. The session reviewed on screen is one of them, so its review closes. The instrument goes back to B-flat tenor saxophone, the profile it was made from.',
    )
    expect(wrapper.get('.sheet-hint').text()).toBe(
      'To keep a session, cancel, then export it from its review first.',
    )

    await button(wrapper, 'Delete my instrument').trigger('click')
    await nextTick()
    expect(wrapper.get('.alert-error').text()).toBe("That couldn't be deleted. Try again.")
    expect(wrapper.get('.sheet-title').text()).toBe('Delete my instrument?')
    wrapper.unmount()
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('in a tab that must be reloaded: the reload line, the steppers disabled, no Delete', () => {
    const wrapper = mountSheet(sessions(3, { withheld: true }))

    expect(wrapper.get('.alert-notice').text()).toBe(
      "Reload this page to change the range or the transposition, or to delete Low tenor: either would erase the sessions played with this instrument, and this page can't delete anything until it is reloaded.",
    )
    expect(
      wrapper
        .findAll('.stepper-button')
        .every((stepper) => stepper.attributes('disabled') !== undefined),
    ).toBe(true)
    expect(wrapper.find('.sheet-actions-destructive').exists()).toBe(false)
    wrapper.unmount()
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('the tab turning outdated while the warning is open returns to the form, its sound back to the saved one', async () => {
    const wrapper = mountSheet()
    await step(wrapper, 'Highest note', 'up')
    await button(wrapper, 'Save').trigger('click')
    await nextTick()

    await wrapper.setProps({ sessions: sessions(3, { withheld: true }) })
    await nextTick()

    expect(wrapper.get('.sheet-title').text()).toBe('My instrument')
    expect(stepperText(wrapper, 'Highest note')).toBe('E4')
    expect(wrapper.find('.sheet-actions-destructive').exists()).toBe(false)
    expect(wrapper.saveAndErase).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
