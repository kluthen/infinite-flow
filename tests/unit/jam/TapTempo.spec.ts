/**
 * `tap-tempo`, the button and its field-note in Jam's Tempo field: "Tap tempo" names its note
 * with `aria-describedby`, the note a polite live region in the words of the state it is given,
 * `is-listening` while listening, no `aria-pressed`. The tap is the press, not the release: a
 * primary pointerdown, an Enter or Space keydown (its repeats ignored, their default prevented), or
 * a click that follows neither (from assistive technology); nothing while disabled. While
 * listening, a pointerdown or key press anywhere else, or the page hidden or left, ends it.
 */
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import TapTempo from '@/jam/TapTempo.vue'
import type { TapTempoNote } from '@/jam/tap-tempo'

/** The props a test mounts with. */
interface Props {
  readonly listening: boolean
  readonly note: TapTempoNote
  readonly controllerConnected: boolean
  readonly disabled: boolean
}

const mounted: { unmount: () => void }[] = []

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

/** Intent: mount `tap-tempo`, at rest, connected and enabled unless told, a button beside it. */
function mountTapTempo(overrides: Partial<Props> = {}) {
  const props: Props = {
    listening: false,
    note: { kind: 'rest' },
    controllerConnected: true,
    disabled: false,
    ...overrides,
  }
  const host = document.createElement('div')
  const elsewhere = document.createElement('button')
  elsewhere.className = 'elsewhere'
  document.body.append(host, elsewhere)
  const wrapper = mount(TapTempo, { props, attachTo: host })
  mounted.push(wrapper)
  return { wrapper, button: wrapper.get('button.tap-tempo').element, elsewhere }
}

/** Intent: a primary pointer's press on `target`. */
function pointerDown(target: Element, init: PointerEventInit = {}): void {
  target.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true, ...init }),
  )
}

/** Intent: a key press on `target`; returns whether its default was prevented. */
function keyDown(target: Element, key: string, repeat = false): boolean {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, repeat })
  target.dispatchEvent(event)
  return event.defaultPrevented
}

/** Intent: a click on `target`, `detail` 1 for a mouse's, 0 for one with no pointer. */
function click(target: Element, detail: number): void {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
}

/** Intent: the page's visibility set to `state`, and its change reported. */
function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

// @test-link [[rule_jam_tap_in_listening]]
describe('TapTempo', () => {
  afterEach(() => {
    setVisibility('visible')
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('shows "Tap tempo" naming its polite field-note, at rest', () => {
    const { wrapper } = mountTapTempo()
    const button = wrapper.get('button')
    expect(button.text()).toBe('Tap tempo')
    expect(button.classes()).toEqual(['btn', 'tap-tempo'])
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-pressed')).toBeUndefined()
    const note = wrapper.get(`#${button.attributes('aria-describedby')}`)
    expect(note.element.tagName).toBe('P')
    expect(note.classes()).toEqual(['field-note'])
    expect(note.attributes('aria-live')).toBe('polite')
    expect(note.text()).toBe('Tap the beat here, or press once and tap on your controller.')
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it("shows listening, and the note's words for the state it is given", async () => {
    const { wrapper } = mountTapTempo({ controllerConnected: false })
    expect(wrapper.get('.field-note').text()).toBe('Tap the beat here.')
    await wrapper.setProps({ listening: true, note: { kind: 'counting' } })
    expect(wrapper.get('button').classes()).toContain('is-listening')
    expect(wrapper.get('.field-note').text()).toBe('Keep tapping: four beats set the tempo.')
    await wrapper.setProps({ note: { kind: 'set', tempo: 110 } })
    expect(wrapper.get('.field-note').text()).toBe('Set to 110 BPM. Keep tapping to correct it.')
    await wrapper.setProps({ listening: false })
    expect(wrapper.get('button').classes()).not.toContain('is-listening')
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('taps on a primary pointer press, not on the click that follows it', () => {
    const { wrapper, button } = mountTapTempo()
    pointerDown(button)
    expect(wrapper.emitted('press')).toHaveLength(1)
    click(button, 1)
    expect(wrapper.emitted('press')).toHaveLength(1)
    pointerDown(button, { button: 2 })
    pointerDown(button, { isPrimary: false })
    expect(wrapper.emitted('press')).toHaveLength(1)
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('taps on Enter or Space pressed, once, its repeats prevented and ignored', () => {
    const { wrapper, button } = mountTapTempo()
    expect(keyDown(button, 'Enter')).toBe(false)
    // Enter's own click, with no pointer.
    click(button, 0)
    expect(wrapper.emitted('press')).toHaveLength(1)
    expect(keyDown(button, 'Enter', true)).toBe(true)
    expect(keyDown(button, ' ', true)).toBe(true)
    expect(wrapper.emitted('press')).toHaveLength(1)
    keyDown(button, ' ')
    click(button, 0)
    expect(wrapper.emitted('press')).toHaveLength(2)
    keyDown(button, 'a')
    expect(wrapper.emitted('press')).toHaveLength(2)
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('taps on a click with no pointer or key press before it, as assistive technology sends', () => {
    const { wrapper, button } = mountTapTempo()
    click(button, 0)
    expect(wrapper.emitted('press')).toHaveLength(1)
    click(button, 1)
    expect(wrapper.emitted('press')).toHaveLength(1)
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('taps nothing while disabled', () => {
    const { wrapper, button } = mountTapTempo({ disabled: true })
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    pointerDown(button)
    keyDown(button, 'Enter')
    click(button, 0)
    expect(wrapper.emitted('press')).toBeUndefined()
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('while listening, ends on a press anywhere else, never on the button', async () => {
    const { wrapper, button, elsewhere } = mountTapTempo()
    pointerDown(elsewhere)
    expect(wrapper.emitted('end'), 'not listening').toBeUndefined()

    await wrapper.setProps({ listening: true, note: { kind: 'counting' } })
    pointerDown(button)
    keyDown(button, 'Enter')
    expect(wrapper.emitted('end')).toBeUndefined()
    pointerDown(elsewhere)
    expect(wrapper.emitted('end')).toHaveLength(1)
    keyDown(elsewhere, 'Tab')
    expect(wrapper.emitted('end')).toHaveLength(2)

    await wrapper.setProps({ listening: false })
    pointerDown(elsewhere)
    expect(wrapper.emitted('end')).toHaveLength(2)
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('while listening, ends when the page is hidden or left', async () => {
    const { wrapper } = mountTapTempo({ listening: true, note: { kind: 'counting' } })
    setVisibility('visible')
    expect(wrapper.emitted('end')).toBeUndefined()
    setVisibility('hidden')
    expect(wrapper.emitted('end')).toHaveLength(1)
    window.dispatchEvent(new Event('pagehide'))
    expect(wrapper.emitted('end')).toHaveLength(2)
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('stops listening to the page once unmounted', () => {
    const removedFromWindow = vi.spyOn(window, 'removeEventListener')
    const removedFromDocument = vi.spyOn(document, 'removeEventListener')
    const { wrapper } = mountTapTempo({ listening: true, note: { kind: 'counting' } })
    wrapper.unmount()
    mounted.splice(0)
    const removed = [...removedFromWindow.mock.calls, ...removedFromDocument.mock.calls].map(
      ([type]) => type,
    )
    expect(removed).toEqual(
      expect.arrayContaining(['pointerdown', 'keydown', 'visibilitychange', 'pagehide']),
    )
    removedFromWindow.mockRestore()
    removedFromDocument.mockRestore()
  })
})
