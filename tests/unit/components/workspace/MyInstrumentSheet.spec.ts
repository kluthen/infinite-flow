/**
 * The My instrument sheet: its form, `Save` disabled with the refusal while the range is refused,
 * what `Save` reports (the instrument, or a close when nothing changed), the delete confirmation
 * asked once, its deletion handed to the host, and Escape as the way back.
 */
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import MyInstrumentSheet from '@/components/workspace/MyInstrumentSheet.vue'
import type { MyInstrumentFormStart } from '@/components/workspace/use-my-instrument'
import { makeMyInstrument } from '@/domain/profile/my-instrument'

const SAVED = makeMyInstrument({
  template: 'bb-tenor',
  name: 'Low tenor',
  clef: 'bass',
  writtenRange: { minMidi: 40, maxMidi: 64 },
  transposition: { octaves: 1, semitones: 2, direction: 'lower' },
})

/** No kept session of my instrument counted. */
const NO_SESSIONS = {
  count: 0,
  reviewed: false,
  withheld: false,
  deletes: () => Promise.resolve([]),
  leave: () => undefined,
  stay: () => undefined,
}

/** Intent: the sheet mounted on the page, opened as `start`, with no session of my instrument. */
function mountSheet(start: MyInstrumentFormStart, selected = false) {
  const remove = vi.fn(() => Promise.resolve('done' as const))
  const saveAndErase = vi.fn(() => Promise.resolve('done' as const))
  const wrapper = mount(MyInstrumentSheet, {
    props: { start, selected, sessions: NO_SESSIONS, saveAndErase, remove },
    attachTo: document.body,
  })
  return Object.assign(wrapper, { remove, saveAndErase })
}

/** Intent: the sheet's action button whose text is `label`. */
function button(wrapper: ReturnType<typeof mountSheet>, label: string) {
  const found = wrapper.findAll('button').find((candidate) => candidate.text() === label)
  if (found === undefined) throw new Error(`no "${label}" button`)
  return found
}

afterEach(() => {
  document.body.innerHTML = ''
})

// @test-link [[req_my_instrument]]
describe('the My instrument sheet', () => {
  // @test-link [[req_my_instrument]]
  it('creating: titled, focus on the template, Save reporting the instrument with the default name', async () => {
    const wrapper = mountSheet({ mode: 'creating', template: 'bb-tenor' })
    expect(wrapper.get('.sheet-title').text()).toBe('Create my instrument')
    expect(document.activeElement?.getAttribute('role')).toBe('radio')
    expect(document.activeElement?.getAttribute('aria-checked')).toBe('true')

    await button(wrapper, 'Save').trigger('click')

    const [[instrument]] = wrapper.emitted('save') as [[ReturnType<typeof makeMyInstrument>]]
    expect(instrument).toMatchObject({
      name: 'My instrument',
      clef: 'treble',
      template: 'bb-tenor',
    })
    wrapper.unmount()
  })

  // @test-link [[rule_my_instrument_range_limits]]
  it('disables Save with the refusal while the range is under two octaves', async () => {
    const wrapper = mountSheet({ mode: 'creating', template: 'c-keyboard' })
    const highest = wrapper.get('[role="spinbutton"][aria-label="Highest note"]')
    await highest.trigger('keydown', { key: 'ArrowDown' })

    expect(wrapper.get('.range-alert').text()).toContain('It has 23.')
    expect(wrapper.find('.profile-range-summary').exists()).toBe(false)
    expect(button(wrapper, 'Save').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  // @test-link [[rule_my_instrument_transposition_named_interval]]
  it('names the interval at each step of the transposition', async () => {
    const wrapper = mountSheet({ mode: 'creating', template: 'bb-tenor' })
    const sounds = wrapper.get('[role="spinbutton"][aria-label="Sounds"]')
    expect(sounds.attributes('aria-valuetext')).toBe('14 semitones lower, a major ninth')
    await sounds.trigger('keydown', { key: 'ArrowUp' })
    await sounds.trigger('keydown', { key: 'ArrowUp' })
    expect(sounds.text()).toContain('12 lower')
    expect(wrapper.text()).toContain('One octave lower: a written C4 sounds as C3.')
    wrapper.unmount()
  })

  // @test-link [[req_my_instrument]]
  it('editing: focus on the name, an unchanged Save only closes, a renamed one is reported', async () => {
    const wrapper = mountSheet({ mode: 'editing', saved: SAVED })
    expect(wrapper.get('.sheet-title').text()).toBe('My instrument')
    expect(wrapper.text()).toContain('Made from: B-flat tenor saxophone')
    expect(document.activeElement?.tagName).toBe('INPUT')

    await button(wrapper, 'Save').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('save')).toBeUndefined()

    await wrapper.get('input').setValue('Tenor two')
    await button(wrapper, 'Save').trigger('click')
    expect((wrapper.emitted('save') as [[{ name: string }]])[0]![0].name).toBe('Tenor two')
    wrapper.unmount()
  })

  // @test-link [[req_my_instrument]]
  it('takes no name text while an input method is composing, and takes it when composition ends', async () => {
    const wrapper = mountSheet({ mode: 'editing', saved: SAVED })
    const input = wrapper.get('input').element as HTMLInputElement

    input.value = 'Tenor t'
    input.dispatchEvent(new InputEvent('input', { isComposing: true }))
    await button(wrapper, 'Save').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('save')).toBeUndefined()

    input.value = 'Tenor two'
    input.dispatchEvent(new CompositionEvent('compositionend', { data: 'two' }))
    await button(wrapper, 'Save').trigger('click')
    expect((wrapper.emitted('save') as [[{ name: string }]])[0]![0].name).toBe('Tenor two')
    wrapper.unmount()
  })

  // @test-link [[req_my_instrument]]
  it('asks once before deleting, and its way back returns to the form', async () => {
    const wrapper = mountSheet({ mode: 'editing', saved: SAVED }, true)
    await button(wrapper, 'Delete my instrument').trigger('click')

    expect(wrapper.get('.sheet-title').text()).toBe('Delete my instrument?')
    expect(wrapper.text()).toContain(
      'Low tenor will be deleted, with its clef, range and transposition. The instrument goes back to B-flat tenor saxophone, the profile it was made from.',
    )
    expect(document.activeElement?.textContent?.trim()).toBe('Cancel')
    await button(wrapper, 'Cancel').trigger('click')
    expect(wrapper.get('.sheet-title').text()).toBe('My instrument')
    expect(wrapper.remove).not.toHaveBeenCalled()

    await button(wrapper, 'Delete my instrument').trigger('click')
    await button(wrapper, 'Delete my instrument').trigger('click')
    expect(wrapper.remove).toHaveBeenCalledExactlyOnceWith(NO_SESSIONS)
    wrapper.unmount()
  })

  // @test-link [[req_my_instrument]]
  it('closes on Escape, saving nothing', async () => {
    const wrapper = mountSheet({ mode: 'editing', saved: SAVED })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('save')).toBeUndefined()
    wrapper.unmount()
  })
})
