/**
 * The kept doodle's bar (`jam-bar`, flows/jam/handoff.md, Routing Rules; the phrase workspace's
 * handoff, The kept doodle's bar): its sentence, never in the tab order, then `New doodle`, a plain
 * button disabled in Loading and held disabled during a session, then the key and mode suggestion
 * as Jam's Idle shows it: offered while Jam's key and mode are not among the close answers and the
 * doodle's suggestion is not declined, never in its no-fit form; `Jam in {answer}` then says it is
 * set, focused, until Jam's key or mode changes again, the doodle changes, or a session started on
 * it has ended; `Keep {key} {mode}` asks to decline, and focus moves to the bar's sentence as the
 * row leaves. During a session the bar is held still, its buttons disabled. Nothing in it is a live
 * region.
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import JamBar from '@/jam/JamBar.vue'
import type { JamKeyAndMode } from '@/jam/key-suggestion/key-suggestion'

import { beatsDoodle, WORKED_EXAMPLE } from './key-suggestion/key-suggestion-doodles'

/** The worked example: D E F G A C A D, which sounds like D Minor against C Major. */
const D_MINOR_DOODLE = beatsDoodle(WORKED_EXAMPLE)

/** A chromatic run C to G, a beat each: no mode holds 80 % of it. */
const CHROMATIC = beatsDoodle([60, 61, 62, 63, 64, 65, 66, 67].map((pitch) => [pitch, 1] as const))

const C_MAJOR: JamKeyAndMode = { tonalCenter: 'C', collection: 'Major' }
const D_MINOR: JamKeyAndMode = { tonalCenter: 'D', collection: 'Minor' }
const A_MAJOR: JamKeyAndMode = { tonalCenter: 'A', collection: 'Major' }

const SENTENCE = 'Jamming again on your doodle: phrase 1 continues it. Leaving Jam mode lets it go.'

const mounted: VueWrapper[] = []

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
})

/** The props a test may set; the rest: the D-minor doodle, Jam in C Major, at Idle. */
interface BarOptions {
  readonly doodle?: QuantizedDoodle
  readonly jam?: JamKeyAndMode
  readonly declined?: boolean
  readonly loading?: boolean
  readonly held?: boolean
}

/** Intent: mount the bar attached to the document, so focus can be checked. */
function mountBar(options: BarOptions = {}) {
  const wrapper = mount(JamBar, {
    props: {
      doodle: options.doodle ?? D_MINOR_DOODLE,
      jam: options.jam ?? C_MAJOR,
      instrument: C_KEYBOARD_PROFILE,
      declined: options.declined ?? false,
      loading: options.loading ?? false,
      held: options.held ?? false,
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

type Wrapper = ReturnType<typeof mountBar>

/** Intent: the bar's own sentence. */
function sentence(wrapper: Wrapper) {
  return wrapper.get('.jam-bar > p')
}

/** Intent: `New doodle`. */
function newDoodle(wrapper: Wrapper) {
  return wrapper.get('.jam-bar > button')
}

/** Intent: the suggestion row's sentence and buttons' words, or null when it is absent. */
function row(wrapper: Wrapper): { sentence: string; buttons: string[] } | null {
  const found = wrapper.find('.jam-bar > .suggestion-row')
  if (!found.exists()) return null
  return {
    sentence: found.get(':scope > p').text(),
    buttons: found.findAll(':scope > button').map((button) => button.text()),
  }
}

/** Intent: the suggestion row's buttons. */
function rowButtons(wrapper: Wrapper) {
  return wrapper.findAll('.suggestion-row > button')
}

// @test-link [[module_kept_doodle]]
describe('the kept doodle’s bar', () => {
  // @test-link [[module_kept_doodle]]
  it('says the doodle is kept, never in the tab order, then New doodle, a plain button, and no live region', () => {
    const wrapper = mountBar()

    const bar = wrapper.get('.jam-bar')
    expect(sentence(wrapper).text()).toBe(SENTENCE)
    expect(sentence(wrapper).attributes('tabindex')).toBe('-1')
    expect(newDoodle(wrapper).text()).toBe('New doodle')
    expect(newDoodle(wrapper).classes()).toEqual(['btn'])
    expect(newDoodle(wrapper).attributes('type')).toBe('button')
    expect(newDoodle(wrapper).attributes('disabled')).toBeUndefined()
    expect(bar.findAll('[aria-live], [role="status"], [role="alert"]')).toHaveLength(0)
    expect(bar.attributes('aria-live')).toBeUndefined()
    expect(bar.element.children[2]?.classList.contains('suggestion-row')).toBe(true)
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('asks for a new doodle on New doodle, with no confirmation', async () => {
    const wrapper = mountBar()

    await newDoodle(wrapper).trigger('click')

    expect(wrapper.emitted('new-doodle')).toEqual([[]])
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('disables New doodle in Loading', () => {
    expect(newDoodle(mountBar({ loading: true })).attributes('disabled')).toBeDefined()
  })

  // @test-link [[module_kept_doodle]]
  it('is held still during a session: unchanged, every button disabled', () => {
    const wrapper = mountBar({ held: true })

    expect(sentence(wrapper).text()).toBe(SENTENCE)
    expect(row(wrapper)?.buttons).toEqual(['Jam in D Minor', 'Keep C Major'])
    expect(newDoodle(wrapper).attributes('disabled')).toBeDefined()
    expect(rowButtons(wrapper).every((button) => button.attributes('disabled') !== undefined)).toBe(
      true,
    )
  })
})

// @test-link [[req_key_and_mode_suggestion]]
describe('the kept doodle’s bar: the suggestion at Idle', () => {
  // @test-link [[req_key_and_mode_suggestion]]
  it('offers the answer while Jam’s key and mode are not among the close answers', () => {
    expect(row(mountBar())).toEqual({
      sentence: 'Your doodle sounds like D Minor.',
      buttons: ['Jam in D Minor', 'Keep C Major'],
    })
  })

  // @test-link [[rule_suggestion_withheld]]
  it('offers nothing while Jam’s key and mode are a close answer', () => {
    expect(row(mountBar({ jam: D_MINOR }))).toBeNull()
  })

  // @test-link [[rule_suggestion_keep_mine]]
  it('offers nothing once the doodle’s suggestion is declined', () => {
    expect(row(mountBar({ declined: true }))).toBeNull()
  })

  // @test-link [[req_key_and_mode_suggestion]]
  it('disables Jam in and Keep in Loading, the row in place', () => {
    const wrapper = mountBar({ loading: true })

    expect(row(wrapper)?.buttons).toEqual(['Jam in D Minor', 'Keep C Major'])
    expect(rowButtons(wrapper).every((button) => button.attributes('disabled') !== undefined)).toBe(
      true,
    )
  })

  // @test-link [[rule_doodle_outside_modes_told]]
  it('shows no row, never the no-fit form, for a doodle that fits no mode', () => {
    expect(row(mountBar({ doodle: CHROMATIC }))).toBeNull()
  })
})

// @test-link [[rule_suggestion_use_it]]
describe('the kept doodle’s bar: Jam in {answer}', () => {
  /** Intent: press `Jam in {answer}` and let Jam take the answer, as its settings do. */
  async function jamInAnswer(wrapper: Wrapper): Promise<void> {
    await rowButtons(wrapper)[0]!.trigger('click')
    await wrapper.setProps({ jam: D_MINOR })
    await nextTick()
  }

  // @test-link [[rule_suggestion_use_it]]
  it('asks for the answer, then says it is set, focused, with no button', async () => {
    const wrapper = mountBar()

    await jamInAnswer(wrapper)

    expect(wrapper.emitted('use')).toEqual([[D_MINOR]])
    expect(row(wrapper)).toEqual({ sentence: 'Jams now play in D Minor.', buttons: [] })
    const set = wrapper.get('.suggestion-row > p')
    expect(set.attributes('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(set.element)
  })

  // @test-link [[rule_suggestion_use_it]]
  it('says it is set until Jam’s key or mode changes again, then judges the doodle afresh', async () => {
    const wrapper = mountBar()
    await jamInAnswer(wrapper)

    await wrapper.setProps({ jam: A_MAJOR })

    expect(row(wrapper)).toEqual({
      sentence: 'Your doodle sounds like D Minor.',
      buttons: ['Jam in D Minor', 'Keep A Major'],
    })
  })

  // @test-link [[rule_suggestion_use_it]]
  it('holds the set sentence still during a session on the doodle, absent once it has ended', async () => {
    const wrapper = mountBar()
    await jamInAnswer(wrapper)

    await wrapper.setProps({ held: true })
    expect(row(wrapper)?.sentence).toBe('Jams now play in D Minor.')

    await wrapper.setProps({ held: false })
    expect(row(wrapper)).toBeNull()
  })

  // @test-link [[rule_suggestion_use_it]]
  it('says nothing set for another doodle kept in its place', async () => {
    const wrapper = mountBar()
    await jamInAnswer(wrapper)

    await wrapper.setProps({ doodle: beatsDoodle(WORKED_EXAMPLE) })

    expect(row(wrapper)).toBeNull()
  })
})

// @test-link [[rule_suggestion_keep_mine]]
describe('the kept doodle’s bar: Keep {key} {mode}', () => {
  // @test-link [[rule_suggestion_keep_mine]]
  it('asks to decline, and moves focus to the bar’s sentence as the row leaves', async () => {
    const wrapper = mountBar()
    ;(rowButtons(wrapper)[1]!.element as HTMLButtonElement).focus()

    await rowButtons(wrapper)[1]!.trigger('click')
    await wrapper.setProps({ declined: true })
    await nextTick()

    expect(wrapper.emitted('keep')).toEqual([[]])
    expect(wrapper.emitted('use')).toBeUndefined()
    expect(row(wrapper)).toBeNull()
    expect(document.activeElement).toBe(sentence(wrapper).element)
  })
})

// @test-link [[module_kept_doodle]]
describe('the kept doodle’s bar: focus', () => {
  // @test-link [[rule_suggestion_use_it]]
  it('moves focus to the bar’s sentence when the set sentence gives way to the offering', async () => {
    const wrapper = mountBar()
    await rowButtons(wrapper)[0]!.trigger('click')
    await wrapper.setProps({ jam: D_MINOR })
    await nextTick()

    await wrapper.setProps({ jam: A_MAJOR })
    await nextTick()

    expect(row(wrapper)?.buttons).toEqual(['Jam in D Minor', 'Keep A Major'])
    expect(document.activeElement).toBe(sentence(wrapper).element)
  })

  // @test-link [[rule_suggestion_use_it]]
  it('moves focus to the bar’s sentence when the held set sentence goes at the session’s end', async () => {
    const wrapper = mountBar()
    await rowButtons(wrapper)[0]!.trigger('click')
    await wrapper.setProps({ jam: D_MINOR })
    await nextTick()
    await wrapper.setProps({ held: true })

    await wrapper.setProps({ held: false })
    await nextTick()

    expect(row(wrapper)).toBeNull()
    expect(document.activeElement).toBe(sentence(wrapper).element)
  })

  // @test-link [[module_kept_doodle]]
  it('moves focus to the bar’s sentence when the row is rebuilt for another doodle', async () => {
    const wrapper = mountBar()
    ;(rowButtons(wrapper)[1]!.element as HTMLButtonElement).focus()

    await wrapper.setProps({ doodle: beatsDoodle(WORKED_EXAMPLE) })
    await nextTick()

    expect(row(wrapper)?.buttons).toEqual(['Jam in D Minor', 'Keep C Major'])
    expect(document.activeElement).toBe(sentence(wrapper).element)
  })

  // @test-link [[module_kept_doodle]]
  it('asks for focus on the session action when a session starts with one of its buttons focused', async () => {
    const wrapper = mountBar()
    ;(newDoodle(wrapper).element as HTMLButtonElement).focus()
    await wrapper.setProps({ held: true })
    await nextTick()
    expect(wrapper.emitted('focus-session-action')).toEqual([[]])

    await wrapper.setProps({ held: false })
    ;(rowButtons(wrapper)[0]!.element as HTMLButtonElement).focus()
    await wrapper.setProps({ held: true })
    await nextTick()
    expect(wrapper.emitted('focus-session-action')).toEqual([[], []])
  })

  // @test-link [[module_kept_doodle]]
  it('asks for nothing when a session starts with focus outside its buttons', async () => {
    const wrapper = mountBar()
    ;(sentence(wrapper).element as HTMLElement).focus()

    await wrapper.setProps({ held: true })
    await nextTick()

    expect(wrapper.emitted('focus-session-action')).toBeUndefined()
  })
})
